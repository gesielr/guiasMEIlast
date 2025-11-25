import { useState } from "react";

const PisHelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Ajuda rápida: PIS/NIS (11 dígitos)</h3>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>
        <div style={styles.content}>
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>O que é:</h4>
            <p style={styles.text}>Seu identificador de trabalhador no governo.</p>
          </div>

          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Formato:</h4>
            <p style={styles.text}>11 dígitos, apenas números (sem pontos ou traços).</p>
          </div>

          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Onde encontrar:</h4>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Carteira de Trabalho Digital (app)</strong><br />
                Entre com gov.br → "Perfil" ou "Dados pessoais" → veja "NIS/PIS/PASEP".
              </li>
              <li style={styles.listItem}>
                <strong>App FGTS (CAIXA)</strong><br />
                Acesse → "Meu cadastro" ou "Extratos" → "PIS/NIS".
              </li>
              <li style={styles.listItem}>
                <strong>Meu INSS (app/site)</strong><br />
                Acesse → "Meu Cadastro" ou "Extrato de Contribuição (CNIS)" → "NIT/PIS".
              </li>
              <li style={styles.listItem}>
                <strong>Cartão Cidadão e holerite/contracheque</strong><br />
                O número costuma aparecer impresso ou no cabeçalho dos dados.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e5e7eb",
  },
  title: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111827",
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "32px",
    color: "#6b7280",
    cursor: "pointer",
    lineHeight: "1",
    padding: 0,
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: "24px",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 8px 0",
  },
  text: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
    lineHeight: "1.6",
  },
  list: {
    margin: 0,
    paddingLeft: "20px",
  },
  listItem: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "16px",
    lineHeight: "1.6",
  },
};

export default PisHelpModal;


