import { Routes, Route } from "react-router-dom";
import HomePage from "./features/HomePage";
import CadastroPage from "./features/auth/CadastroPage";
import CadastroPageMei from "./features/auth/CadastroPageMei";
import CadastroPageGps from "./features/auth/CadastroPageGps";
import CadastroPageParceiro from "./features/auth/CadastroPageParceiro";
import LoginPage from "./features/auth/LoginPage";
import AdminLoginPage from "./features/auth/AdminLoginPage";
import AdminDashboard from "./features/dashboards/AdminDashboard";
import DashboardUser from "./features/dashboards/DashboardUser";
import DashboardPartner from "./features/dashboards/DashboardPartner";
import EmitirNotaPage from "./features/nfse/EmitirNotaPage";
import EmitirGpsPage from "./features/gps/EmitirGpsPage";
import PaymentPage from "./features/pagamentos/PaymentPage";
import PoliticaPrivacidade from "./features/legal/PoliticaPrivacidade";
import CertificadoFlowPage from "./features/certificado/CertificadoFlowPage";

// Importar páginas NFSe administrativas
import CertificadosAdminPage from "./features/admin/nfse/CertificadosAdminPage";
import EmissoesAdminPage from "./features/admin/nfse/EmissoesAdminPage";
import RelatoriosAdminPage from "./features/admin/nfse/RelatoriosAdminPage";
import ConfiguracoesAdminPage from "./features/admin/nfse/ConfiguracoesAdminPage";
import LogsAdminPage from "./features/admin/nfse/LogsAdminPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/cadastro/mei" element={<CadastroPageMei />} />
      <Route path="/cadastro/autonomo" element={<CadastroPageGps />} />
      <Route path="/cadastro/parceiro" element={<CadastroPageParceiro />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      {/* Rotas bloqueadas para MEI/Autônomo - devem usar WhatsApp */}
      <Route path="/emitir-nota" element={<ProtectedRoute><EmitirNotaPage /></ProtectedRoute>} />
      <Route path="/emitir-gps" element={<ProtectedRoute><EmitirGpsPage /></ProtectedRoute>} />
      <Route path="/pagamentos" element={<PaymentPage />} />
      <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
      <Route path="/certificado" element={<ProtectedRoute><CertificadoFlowPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<DashboardUser />} />
      <Route path="/dashboard/usuario" element={<DashboardUser />} />
      <Route path="/dashboard/parceiro" element={<DashboardPartner />} />
      <Route path="/dashboard-parceiro" element={<DashboardPartner />} />
      <Route path="/dashboard/admin" element={<AdminDashboard />} />
      <Route path="/parceiro/dashboard" element={<DashboardPartner />} />
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Rotas NFSe Administrativas - Acesso apenas para administradores */}
      <Route path="/admin/nfse/certificados" element={<CertificadosAdminPage />} />
      <Route path="/admin/nfse/emissoes" element={<EmissoesAdminPage />} />
      <Route path="/admin/nfse/relatorios" element={<RelatoriosAdminPage />} />
      <Route path="/admin/nfse/configuracoes" element={<ConfiguracoesAdminPage />} />
      <Route path="/admin/nfse/logs" element={<LogsAdminPage />} />
    </Routes>
  );
}
