import { useState } from "react";
import { Link } from "react-router-dom";
import { validateCNPJ } from "../../utils/validators.js";
import { encryptData } from "../../utils/encryption.js";
import logo from "../../assets/logo.png";
import { useAuth } from "../../providers/auth-provider.jsx";
import { useSearchParams } from "react-router-dom";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? process.env.REACT_APP_SUPABASE_ANON_KEY;

const CadastroPage = () => {
  const [formData, setFormData] = useState({
    document: "",
    email: "",
    phone: "",
    business_name: "",
    name: "",
    password: "",
  });

  const safe = {
    document: formData.document || "",
    email: formData.email || "",
    phone: formData.phone || "",
    business_name: formData.business_name || "",
    name: formData.name || "",
    password: formData.password || "",
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const { register } = useAuth();
  const [searchParams] = useSearchParams();
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "5548991117268";

  const handleDocumentChange = async (event) => {
    const doc = event.target.value.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, document: doc }));

    if (doc.length === 14) {
      if (!supabaseUrl || !supabaseAnonKey) {
        // modo mock: usa dados fictícios para testes locais
        setFormData((prev) => ({
          ...prev,
          business_name: `Empresa MEI ${doc.slice(-4)}`,
          name: `Responsável ${doc.slice(-3)}`,
        }));
        setError("");
        return;
      }
      setLoading(true);
      try {
        // Usando BrasilAPI temporariamente (resolve CORS)
        const url = `https://brasilapi.com.br/api/cnpj/v1/${doc}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Erro ao buscar CNPJ.");

        const data = await response.json();
        if (data && data.razao_social) {
          setFormData((prev) => ({
            ...prev,
            business_name: data.nome_fantasia || data.razao_social || "",
            name: data.razao_social || "",
          }));
          setError("");
        } else {
          setError("CNPJ não encontrado ou inválido.");
        }
      } catch (_err) {
        setError("Erro ao buscar CNPJ.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validateCNPJ(formData.document)) {
      setError("CNPJ inválido.");
      return;
    }
    if (!formData.email || !formData.phone || !formData.password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!consentGiven) {
      setError("É necessário aceitar a Política de Privacidade e os Termos de Uso.");
      return;
    }

    setLoading(true);
    try {
      const encryptedDocument = await encryptData(formData.document);

     const referralCode = searchParams.get("ref") ?? undefined;
      const response = await register({
        role: "mei",
        email: formData.email,
        password: formData.password,
        name: formData.name || formData.business_name,
        phone: formData.phone,
        document: encryptedDocument,
        businessName: formData.business_name,
        referralCode
      });

     const whatsappLink = response?.whatsappLink
        ?? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Quero ativar minha conta GuiasMEI")}`;


     window.location.href = whatsappLink;
    } catch (err) {
      setError("Erro no cadastro: " + (err.message || "Erro desconhecido"));
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.formSection}>
        <div style={styles.formContainer}>
          <Link to="/" style={styles.backLink}>
            <span style={styles.backIcon}>{"\u2190"}</span>
            <span>Voltar para a Home</span>
          </Link>
          <div style={styles.logoWrapper}>
            <div style={styles.logoBadge}>
              <img src={logo} alt="Logo GuiaMei" style={styles.logo} />
            </div>
            <h2 style={styles.title}>Cadastro MEI</h2>
            <p style={styles.subtitle}>Informe seu CNPJ para buscarmos sua Razão Social automaticamente.</p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div>
              <label style={styles.label}>CNPJ</label>
              <input
                type="text"
                value={safe.document}
                onChange={handleDocumentChange}
                placeholder="00.000.000/0000-00"
                required
                style={styles.input}
              />
              {loading && <span style={styles.loadingText}>Buscando dados do CNPJ...</span>}
            </div>

            <div>
              <label style={styles.label}>Razão Social</label>
              <input
                type="text"
                value={safe.name}
                readOnly
                placeholder="Buscando automaticamente..."
                style={{
                  ...styles.input,
                  backgroundColor: "#e9ecef",
                  cursor: "not-allowed",
                }}
              />
            </div>

            <div>
              <label style={styles.label}>E-mail</label>
              <input
                type="email"
                value={safe.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                required
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>WhatsApp (com DDD)</label>
              <input
                type="tel"
                value={safe.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                placeholder="Ex: 11999999999"
                required
                style={styles.input}
              />
            </div>

            <div>
              <label style={styles.label}>Senha</label>
              <input
                type="password"
                value={safe.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.consentContainer}>
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(event) => setConsentGiven(event.target.checked)}
                style={styles.checkbox}
              />
              <label style={styles.consentLabel}>
                Eu li e aceito a <Link to="/politica-privacidade" style={styles.link}>Política de Privacidade</Link> e os Termos de Uso.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !consentGiven}
              style={{
                ...styles.submitButton,
                opacity: loading || !consentGiven ? 0.7 : 1,
              }}
            >
              {loading ? "Cadastrando..." : "Finalizar Cadastro"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    display: "flex",
    minHeight: "100vh",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
    fontFamily: '"Inter", sans-serif',
    padding: "24px",
  },
  formSection: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  formContainer: {
    maxWidth: "480px",
    width: "100%",
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  backLink: {
    textDecoration: "none",
    color: "#6c757d",
    marginBottom: "12px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "500",
  },
  backIcon: {
    fontSize: "18px",
    lineHeight: "1",
  },
  logoWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px",
  },
  logoBadge: {
    width: "88px",
    height: "88px",
    borderRadius: "26px",
    background: "linear-gradient(160deg, #ebf2ff 0%, #dbe8ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "52px",
    height: "52px",
    objectFit: "contain",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#212529",
    margin: 0,
  },
  subtitle: {
    color: "#6c757d",
    margin: 0,
    fontSize: "15px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  label: {
    fontWeight: "500",
    marginBottom: "5px",
    display: "block",
    color: "#495057",
  },
  input: {
    padding: "12px 15px",
    fontSize: "16px",
    border: "1px solid #ced4da",
    borderRadius: "8px",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  submitButton: {
    padding: "15px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "8px",
    transition: "background-color 0.2s, opacity 0.2s",
  },
  error: {
    color: "#dc3545",
    backgroundColor: "#f8d7da",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #f5c6cb",
    fontSize: "14px",
  },
  loadingText: {
    fontSize: "12px",
    color: "#6c757d",
    fontStyle: "italic",
    marginTop: "5px",
    display: "block",
  },
  consentContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginTop: "15px",
  },
  checkbox: {
    width: "16px",
    height: "16px",
  },
  consentLabel: {
    fontSize: "14px",
    lineHeight: "1.4",
    color: "#495057",
  },
  link: {
    color: "#007bff",
    textDecoration: "none",
    fontWeight: "500",
  },
};

export default CadastroPage;


