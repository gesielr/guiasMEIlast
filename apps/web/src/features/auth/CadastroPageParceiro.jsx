import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/auth-provider.jsx";
import { AuthContext } from "../../auth/AuthProvider.jsx"; // Import the second context
import { encryptData } from "../../utils/encryption";
import logo from "../../assets/logo.png";

const CadastroPageParceiro = () => {
  const appMode = import.meta.env.VITE_APP_MODE ?? "mock";
  const [formData, setFormData] = useState({
    company_name: "",
    document: "",
    crc: "",
    email: "",
    phone: "",
    password: ""
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { register } = useAuth();
  const { setUser } = useContext(AuthContext); // Get setUser from the second provider

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!consentGiven) {
      setError("É necessário aceitar os Termos e a Política de Privacidade.");
      return;
    }

    if (!formData.company_name || !formData.document || !formData.crc || !formData.email || !formData.password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      const encryptedDocument = await encryptData(formData.document.replace(/\D/g, ""));
      const response = await register({
        role: "partner",
        email: formData.email,
        password: formData.password,
        name: formData.company_name,
        phone: formData.phone,
        document: encryptedDocument,
        businessName: formData.company_name
      });

      // Manually set the user in the second provider to avoid race condition
      if (response.session?.user) {
        setUser(response.session.user);
      }

      // Após cadastro de parceiro, levar diretamente ao dashboard do parceiro
      const redirectTarget = response?.redirectTo || "/parceiro/dashboard";
      navigate(redirectTarget, { replace: true });

      
    } catch (err) {
      setError(err.message ?? "Erro ao criar cadastro de parceiro.");
    } finally {
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
              <img src={logo} alt="Logo GuiasMEI" style={styles.logo} />
            </div>
            <h2 style={styles.title}>Cadastro Parceiro Contábil</h2>
            <p style={styles.subtitle}>
              Informe os dados da sua contabilidade para oferecer os serviços GuiasMEI aos seus clientes.
            </p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Nome da Contabilidade
              <input
                style={styles.input}
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Contabilidade ABC"
                required
              />
            </label>
            <label style={styles.label}>
              CPF/CNPJ
              <input
                style={styles.input}
                name="document"
                value={formData.document}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, document: event.target.value.replace(/\D/g, "") }))
                }
                placeholder="00.000.000/0000-00"
                required
              />
            </label>
            <label style={styles.label}>
              Número do CRC
              <input
                style={styles.input}
                name="crc"
                value={formData.crc}
                onChange={handleChange}
                placeholder="CRC-000000/UF"
                required
              />
            </label>
            <label style={styles.label}>
              E-mail
              <input
                style={styles.input}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contato@contabilidade.com"
                required
              />
            </label>
            <label style={styles.label}>
              WhatsApp
              <input
                style={styles.input}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="11999999999"
              />
            </label>
            <label style={styles.label}>
              Senha
              <input
                style={styles.input}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Crie uma senha segura"
                required
              />
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(event) => setConsentGiven(event.target.checked)}
              />
              <span>
                Declaro que li e concordo com os <Link to="/politica-privacidade" style={styles.link}>Termos de Uso</Link> e a Política de Privacidade.
              </span>
            </label>

             <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? "Enviando..." : "Cadastrar"}
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
    fontFamily: '"Inter", sans-serif',
    padding: "24px"
  },
  formSection: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  formContainer: {
    width: "100%",
    maxWidth: "580px",
    backgroundColor: "#fff",
    padding: "48px",
    borderRadius: "24px",
    boxShadow: "0 28px 60px rgba(15, 23, 42, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "28px"
  },
  logoWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px"
  },
  logoBadge: {
    width: "72px",
    height: "72px",
    backgroundColor: "#dbeafe",
    borderRadius: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: "48px",
    height: "48px",
    objectFit: "contain"
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1f2937",
    margin: 0
  },
  subtitle: {
    fontSize: "16px",
    color: "#475569",
    margin: 0,
 
  },
  error: {
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: "12px",
    borderRadius: "12px",
    textAlign: "center"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "14px",
    color: "#1f2937",
    fontWeight: "600"
  },
  input: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
    outline: "none"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "14px",
    color: "#475569"
  },
  link: {
    color: "#2563eb",
    textDecoration: "none",
    fontWeight: 600
  },
  submitButton: {
    marginTop: "12px",
    padding: "16px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer"
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    color: "#475569",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500"
  },
  backIcon: {
    fontSize: "18px"
  }
};

export default CadastroPageParceiro;
