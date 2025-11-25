// src/features/admin/PrecosETaxasAdminPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';

const PrecosETaxasAdminPage = () => {
  const [configuracoes, setConfiguracoes] = useState({
    valorAtivacaoAutonomo: '150.00',
    valorCertificadoMei: '150.00',
    porcentagemTaxaGps: '6',
    porcentagemComissaoParceiro: '30',
    taxaNfsePorNota: '3.00'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const verificarAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/admin/login');
        return;
      }

      // Verificar user_type na tabela profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData || profileData.user_type !== 'admin') {
        // Também verificar user_metadata como fallback
        if (user.user_metadata?.user_type !== 'admin') {
          navigate('/admin/login');
          return;
        }
      }
      carregarConfiguracoes();
    };
    verificarAdmin();
  }, [navigate]);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
      const response = await fetch(`${apiUrl}/system-config`);
      
      if (response.ok) {
        const data = await response.json();
        const configs = data.configs || {};
        
        setConfiguracoes({
          valorAtivacaoAutonomo: configs.valor_ativacao_autonomo?.value?.toString() || '150.00',
          valorCertificadoMei: configs.valor_certificado_mei?.value?.toString() || '150.00',
          porcentagemTaxaGps: configs.porcentagem_taxa_gps?.value?.toString() || '6',
          porcentagemComissaoParceiro: configs.porcentagem_comissao_parceiro?.value?.toString() || '30',
          taxaNfsePorNota: configs.taxa_nfse_por_nota?.value?.toString() || '3.00'
        });
      }
    } catch (err) {
      setError('Erro ao carregar configurações: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracoes = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
      
      const updates = [
        { key: 'valor_ativacao_autonomo', value: parseFloat(configuracoes.valorAtivacaoAutonomo) },
        { key: 'valor_certificado_mei', value: parseFloat(configuracoes.valorCertificadoMei) },
        { key: 'porcentagem_taxa_gps', value: parseFloat(configuracoes.porcentagemTaxaGps) },
        { key: 'porcentagem_comissao_parceiro', value: parseFloat(configuracoes.porcentagemComissaoParceiro) },
        { key: 'taxa_nfse_por_nota', value: parseFloat(configuracoes.taxaNfsePorNota) }
      ];

      for (const update of updates) {
        const response = await fetch(`${apiUrl}/system-config/${update.key}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value: update.value })
        });

        if (!response.ok) {
          throw new Error(`Erro ao salvar ${update.key}`);
        }
      }

      setSuccess('Configurações de preços e taxas salvas com sucesso!');
      // Recarregar após 2 segundos
      setTimeout(() => {
        carregarConfiguracoes();
      }, 2000);
    } catch (err) {
      setError('Erro ao salvar configurações: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (campo, valor) => {
    setConfiguracoes(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  if (loading) {
    return <div style={styles.centered}><div style={styles.spinner}></div></div>;
  }

  return (
    <div style={styles.dashboardContainer}>
      <aside style={styles.sidebar}>
        <img src={logo} alt="GuiasMEI Logo" style={styles.logo} />
        <nav style={styles.nav}>
          <button style={styles.navLink} onClick={() => navigate('/dashboard/admin')}>
            <span style={{ fontSize: '20px', lineHeight: '1', minWidth: '24px' }}>🏠</span>
            <span style={{ flex: 1 }}>Dashboard</span>
          </button>
          <button style={{...styles.navLink, ...styles.activeNavLink}}>
            <span style={{ fontSize: '20px', lineHeight: '1', minWidth: '24px' }}>💰</span>
            <span style={{ flex: 1 }}>Preços e Taxas</span>
          </button>
          <button style={styles.navLink} onClick={() => navigate('/admin/nfse/configuracoes')}>
            <span style={{ fontSize: '20px', lineHeight: '1', minWidth: '24px' }}>⚙️</span>
            <span style={{ flex: 1 }}>Config. NFSe</span>
          </button>
        </nav>
        <div style={styles.logoutButton} onClick={() => supabase.auth.signOut().then(() => navigate('/'))}>
          <span>🚪</span> Sair
        </div>
      </aside>

      <main style={styles.mainContent}>
        <div style={styles.header}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0', lineHeight: '1.2' }}>💰 Preços e Taxas</h2>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>Configure valores e porcentagens do sistema. Alterações aqui afetam todos os novos usuários e transações.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Valores de Ativação */}
        <div style={styles.configCard}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>💳 Valores de Ativação</h3>
          <p style={styles.cardDescription}>
            Valores pagos uma única vez para ativar o sistema. Esses valores são cobrados uma vez por ano.
          </p>
          <div style={styles.configGrid}>
            <div style={styles.configGroup}>
              <label style={styles.configLabel}>
                Ativação Autônomo (R$): <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={configuracoes.valorAtivacaoAutonomo}
                onChange={(e) => handleChange('valorAtivacaoAutonomo', e.target.value)}
                style={styles.configInput}
                placeholder="150.00"
              />
              <small style={styles.helpText}>
                Valor pago uma vez por ano para ativar o sistema para Autônomos
              </small>
            </div>
            <div style={styles.configGroup}>
              <label style={styles.configLabel}>
                Certificado Digital MEI (R$): <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={configuracoes.valorCertificadoMei}
                onChange={(e) => handleChange('valorCertificadoMei', e.target.value)}
                style={styles.configInput}
                placeholder="150.00"
              />
              <small style={styles.helpText}>
                Valor do certificado digital ICP-Brasil para MEI (pagamento único)
              </small>
            </div>
          </div>
        </div>

        {/* Taxas por Uso */}
        <div style={styles.configCard}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>📊 Taxas por Uso</h3>
          <p style={styles.cardDescription}>
            Taxas cobradas sobre cada serviço utilizado. Essas taxas são aplicadas em cada transação.
          </p>
          <div style={styles.configGrid}>
            <div style={styles.configGroup}>
              <label style={styles.configLabel}>
                Taxa GPS (%): <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={configuracoes.porcentagemTaxaGps}
                onChange={(e) => handleChange('porcentagemTaxaGps', e.target.value)}
                style={styles.configInput}
                placeholder="6"
              />
              <small style={styles.helpText}>
                Porcentagem cobrada sobre o valor de cada guia GPS emitida (Ex: 6 = 6%)
              </small>
            </div>
            <div style={styles.configGroup}>
              <label style={styles.configLabel}>
                Taxa NFS-e por Nota (R$): <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={configuracoes.taxaNfsePorNota}
                onChange={(e) => handleChange('taxaNfsePorNota', e.target.value)}
                style={styles.configInput}
                placeholder="3.00"
              />
              <small style={styles.helpText}>
                Valor fixo cobrado por cada nota fiscal NFS-e emitida
              </small>
            </div>
          </div>
        </div>

        {/* Comissões */}
        <div style={styles.configCard}>
          <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 12px 0' }}>🤝 Comissões de Parceiros</h3>
          <p style={styles.cardDescription}>
            Porcentagem de comissão paga aos parceiros (contabilidades) sobre as taxas dos clientes vinculados.
          </p>
          <div style={styles.configGrid}>
            <div style={styles.configGroup}>
              <label style={styles.configLabel}>
                Comissão Parceiro (%): <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={configuracoes.porcentagemComissaoParceiro}
                onChange={(e) => handleChange('porcentagemComissaoParceiro', e.target.value)}
                style={styles.configInput}
                placeholder="30"
              />
              <small style={styles.helpText}>
                Porcentagem de comissão sobre as taxas dos clientes vinculados ao parceiro (Ex: 30 = 30%)
              </small>
            </div>
          </div>
        </div>

        {/* Aviso Importante */}
        <div style={styles.warningCard}>
          <h4 style={styles.warningTitle}>⚠️ Importante</h4>
          <ul style={styles.warningList}>
            <li>Alterações aqui afetam <strong>apenas novos usuários e transações futuras</strong></li>
            <li>Usuários já cadastrados e transações já realizadas não são afetados</li>
            <li>As mensagens do WhatsApp serão atualizadas automaticamente com os novos valores</li>
            <li>Recomenda-se avisar os usuários sobre mudanças significativas de valores</li>
          </ul>
        </div>

        {/* Botões de Ação */}
        <div style={styles.actionsCard}>
          <button 
            style={styles.saveButton}
            onClick={salvarConfiguracoes}
            disabled={saving}
          >
            {saving ? '💾 Salvando...' : '💾 Salvar Configurações'}
          </button>
          <button 
            style={styles.cancelButton}
            onClick={carregarConfiguracoes}
            disabled={saving}
          >
            🔄 Restaurar Valores
          </button>
        </div>
      </main>
    </div>
  );
};

const styles = {
  dashboardContainer: { 
    display: 'flex', 
    minHeight: '100vh', 
    fontFamily: '"Inter", sans-serif', 
    backgroundColor: '#f8f9fa' 
  },
  sidebar: { 
    width: '280px', 
    backgroundColor: '#fff', 
    padding: '32px 20px', 
    display: 'flex', 
    flexDirection: 'column', 
    borderRight: '1px solid #e5e7eb',
    boxShadow: '2px 0 8px rgba(0,0,0,0.02)'
  },
  logo: { 
    height: '50px', 
    marginBottom: '40px', 
    alignSelf: 'center' 
  },
  nav: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '10px', 
    flexGrow: 1 
  },
  navLink: { 
    textDecoration: 'none', 
    color: '#374151', 
    padding: '14px 16px', 
    borderRadius: '10px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '14px', 
    fontWeight: 500, 
    transition: 'all 0.2s ease', 
    background: 'none', 
    border: 'none', 
    cursor: 'pointer', 
    textAlign: 'left',
    fontSize: '15px',
    width: '100%'
  },
  activeNavLink: { 
    backgroundColor: '#eff6ff', 
    color: '#2563eb',
    fontWeight: 600
  },
  logoutButton: { 
    padding: '12px 15px', 
    borderRadius: '8px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px', 
    fontWeight: 500, 
    color: '#dc3545', 
    cursor: 'pointer' 
  },
  mainContent: { 
    flex: 1, 
    padding: '48px 56px', 
    overflowY: 'auto',
    maxWidth: '1400px',
    width: '100%'
  },
  header: { 
    marginBottom: '40px' 
  },
  error: { 
    color: '#dc3545', 
    backgroundColor: '#f8d7da', 
    padding: '12px', 
    borderRadius: '8px', 
    marginBottom: '20px' 
  },
  success: { 
    color: '#0f5132', 
    backgroundColor: '#d1e7dd', 
    padding: '12px', 
    borderRadius: '8px', 
    marginBottom: '20px' 
  },
  configCard: { 
    backgroundColor: '#fff', 
    padding: '32px', 
    borderRadius: '16px', 
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #f0f0f0',
    marginBottom: '24px' 
  },
  cardDescription: {
    color: '#6c757d',
    marginBottom: '20px',
    fontSize: '14px'
  },
  configGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
    gap: '20px' 
  },
  configGroup: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '8px' 
  },
  configLabel: { 
    fontWeight: '600', 
    color: '#495057', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px' 
  },
  configInput: { 
    padding: '10px', 
    border: '1px solid #ced4da', 
    borderRadius: '6px', 
    fontSize: '14px' 
  },
  helpText: { 
    color: '#6c757d', 
    fontSize: '12px' 
  },
  warningCard: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  warningTitle: {
    color: '#856404',
    margin: '0 0 10px 0',
    fontSize: '16px'
  },
  warningList: {
    color: '#856404',
    margin: 0,
    paddingLeft: '20px',
    lineHeight: '1.8'
  },
  actionsCard: { 
    backgroundColor: '#fff', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
    display: 'flex', 
    gap: '15px', 
    flexWrap: 'wrap' 
  },
  saveButton: { 
    padding: '12px 24px', 
    backgroundColor: '#28a745', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontSize: '14px', 
    fontWeight: '500' 
  },
  cancelButton: { 
    padding: '12px 24px', 
    backgroundColor: '#6c757d', 
    color: 'white', 
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontSize: '14px', 
    fontWeight: '500' 
  },
  centered: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: '100vh' 
  },
  spinner: { 
    border: '4px solid #f3f3f3', 
    borderTop: '4px solid #007bff', 
    borderRadius: '50%', 
    width: '40px', 
    height: '40px', 
    animation: 'spin 1s linear infinite' 
  }
};

export default PrecosETaxasAdminPage;

