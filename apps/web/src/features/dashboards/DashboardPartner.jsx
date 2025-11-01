// src/features/dashboards/DashboardPartner.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabase/client';
import { useNavigate } from 'react-router-dom';
import { decryptData } from '../../utils/encryption';
import logo from '../../assets/logo.png';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const DashboardPartner = () => {
  const [partner, setPartner] = useState(null);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({ total_nfse: 0, total_gps: 0, total_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newClient, setNewClient] = useState({ document: '', name: '', documentType: 'cpf' });
  const [activeSection, setActiveSection] = useState('overview');
  const [inviteLink, setInviteLink] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const navigate = useNavigate();

  const averageCommission = useMemo(() => {
    if (!clients.length) return 0;
    return stats.total_revenue / clients.length;
  }, [clients.length, stats.total_revenue]);

  const commissionHistory = useMemo(() => {
    if (!clients.length) return [];
    return clients.map((client, index) => ({
      id: client.client_id ?? `client-${index}`,
      name: client.profile?.name ?? 'Cliente sem nome',
      amount: Number.isFinite(averageCommission) ? averageCommission : 0,
      date: client.created_at ? new Date(client.created_at).toLocaleDateString('pt-BR') : 'N/D',
      status: client.profile?.onboarding_completed ? 'Pago' : 'Pendente'
    }));
  }, [clients, averageCommission]);

  const totalCommission = useMemo(() => {
    if (Number.isFinite(stats.total_revenue)) return stats.total_revenue;
    return 0;
  }, [stats.total_revenue]);

  const sectionMeta = useMemo(() => ({
    overview: {
      title: `Olá, ${partner?.company_name ?? 'Contabilidade'}!`,
      description: 'Gerencie seus clientes e acompanhe suas comissões.'
    },
    clients: {
      title: 'Meus Clientes',
      description: 'Visualize e gerencie toda a base de clientes atendidos pela sua contabilidade.'
    },
    commissions: {
      title: 'Minhas Comissões',
      description: 'Acompanhe o histórico de comissões geradas pelos serviços prestados aos clientes.'
    }
  }), [partner?.company_name]);

  const calculateStats = useCallback(async (clientList) => {
    if (!clientList?.length || !supabaseConfigured) {
      setStats({ total_nfse: clientList?.length ?? 0, total_gps: 0, total_revenue: clientList?.length ? clientList.length * 120 : 0 });
      return;
    }

    const clientIds = clientList.map((c) => c.client_id);
    const { data: nfseData } = await supabase.from('nfse_emissions').select('id').in('user_id', clientIds).eq('status', 'issued');
    const { data: gpsData } = await supabase.from('gps_emissions').select('value').in('user_id', clientIds).eq('status', 'issued');

    const nfseCount = nfseData?.length || 0;
    const gpsTotalValue = gpsData?.reduce((sum, gps) => sum + gps.value, 0) || 0;
    const totalRevenue = (nfseCount * 3.0) + (gpsTotalValue * 0.06);

    setStats({
      total_nfse: nfseCount,
      total_gps: gpsData?.length || 0,
      total_revenue: totalRevenue
    });
  }, []);

  const fetchPartnerData = useCallback(async () => {
    try {
      if (!supabaseConfigured) {
        const mockClients = [
          {
            client_id: 'mock-client-1',
            created_at: new Date().toISOString(),
            profile: {
              name: 'Cliente Exemplo 1',
              document: '12345678901',
              document_type: 'cpf',
              onboarding_completed: true
            }
          },
          {
            client_id: 'mock-client-2',
            created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
            profile: {
              name: 'Cliente Exemplo 2',
              document: '12345678000199',
              document_type: 'cnpj',
              onboarding_completed: false
            }
          }
        ];

        setPartner({ company_name: 'Contabilidade Demo', email: 'contato@demo.com' });
        setClients(mockClients);
        await calculateStats(mockClients);
        setLoading(false);
        return;
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const meta = authUser?.user_metadata ?? {};
      const isPartner = meta.user_type === 'partner' || meta.user_type === 'parceiro' || meta.role === 'partner' || meta.role === 'parceiro';
      if (!authUser || !isPartner) {
        navigate('/login');
        return;
      }

      const { data: partnerData, error: partnerError } = await supabase.from('partners').select('*').eq('id', authUser.id).single();
      if (partnerError) throw partnerError;
      setPartner(partnerData);

      const { data: clientData, error: clientError } = await supabase
        .from('partner_clients')
        .select('client_id, created_at, profile:profiles!inner(*)')
        .eq('partner_id', authUser.id);
      if (clientError) throw clientError;

      const decryptedClients = await Promise.all(
        clientData.map(async (client) => {
          const decryptedDocument = client.profile.document ? await decryptData(client.profile.document) : '';
          const cleanDocument = decryptedDocument.replace(/\D/g, '');
          const documentType = client.profile.document_type ?? detectDocumentType(cleanDocument);
          return {
            ...client,
            profile: {
              ...client.profile,
              document: cleanDocument,
              document_type: documentType
            }
          };
        })
      );

      setClients(decryptedClients);
      await calculateStats(decryptedClients);
      setLoading(false);
    } catch (err) {
      setError('Erro ao carregar dados: ' + err.message);
      setLoading(false);
    }
  }, [calculateStats, navigate]);

  useEffect(() => {
    fetchPartnerData();
  }, [fetchPartnerData]);

  const handleAddClient = async (event) => {
    event.preventDefault();
    setClientFeedback('');
    setInviteLink('');

    if (!newClient.name.trim() || !newClient.document.trim()) {
      setClientFeedback('Preencha o nome e o documento do cliente.');
      return;
    }

    const cleanDocument = newClient.document.replace(/\D/g, '');
    const inferredType =
      newClient.documentType ??
      (cleanDocument.length > DOCUMENT_LENGTH.cpf ? 'cnpj' : 'cpf');
    const expectedLength = DOCUMENT_LENGTH[inferredType];
    const docType = detectDocumentType(cleanDocument);

    if (!docType || cleanDocument.length !== expectedLength) {
      const label = inferredType === 'cnpj' ? 'CNPJ' : 'CPF';
      setClientFeedback(`Informe um ${label} valido com ${expectedLength} digitos.`);
      return;
    }

    if (!supabaseConfigured) {
      const id = `mock-client-${Date.now()}`;
      const created_at = new Date().toISOString();
      const newEntry = {
        client_id: id,
        created_at,
        profile: {
          name: newClient.name,
          document: cleanDocument,
          document_type: docType,
          onboarding_completed: false
        }
      };

      setClients((previous) => {
        const updated = [...previous, newEntry];
        void calculateStats(updated);
        return updated;
      });

      const baseUrl = window.location?.origin ?? 'https://guiasmei.local';
      const generatedLink = `${baseUrl}${buildInviteRoute(docType)}?ref=${encodeURIComponent(id)}`;
      setInviteLink(generatedLink);
      const targetLabel = docType === 'cnpj' ? 'MEI' : 'Autonomo';
      setClientFeedback(`Link de convite gerado para o cadastro ${targetLabel}. Copie e envie para o cliente concluir o processo.`);
      setNewClient({ name: '', document: '', documentType: 'cpf' });
      setActiveSection('clients');
      return;
    }

    // TODO: integrar com API real quando disponivel
    const docLabel = docType === 'cnpj' ? 'CNPJ' : 'CPF';
    setClientFeedback(`Integracao com API ainda nao implementada neste ambiente para documentos do tipo ${docLabel}.`);
  };

  const DOCUMENT_LENGTH = { cpf: 11, cnpj: 14 };

  const detectDocumentType = (value) => {
    const cleanValue = value?.replace?.(/\D/g, '') ?? '';
    if (cleanValue.length === DOCUMENT_LENGTH.cnpj) return 'cnpj';
    if (cleanValue.length === DOCUMENT_LENGTH.cpf) return 'cpf';
    return null;
  };

  const maskDocument = (value, typeHint) => {
    const cleanValue = value?.replace?.(/\D/g, '') ?? '';
    const type = typeHint ?? detectDocumentType(cleanValue);
    if (type === 'cpf' && cleanValue.length === DOCUMENT_LENGTH.cpf) {
      return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (type === 'cnpj' && cleanValue.length === DOCUMENT_LENGTH.cnpj) {
      return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cleanValue;
  };

  const buildInviteRoute = (docType) =>
    docType === 'cpf' ? '/cadastro/autonomo' : '/cadastro/mei';

  const formatDocumentWithLabel = (value, typeHint) => {
    const type = typeHint ?? detectDocumentType(value);
    const masked = maskDocument(value, type);
    if (!masked) return 'N/D';
    if (type === 'cnpj') return `${masked} (CNPJ)`;
    if (type === 'cpf') return `${masked} (CPF)`;
    return masked;
  };

  const currentMeta = sectionMeta[activeSection] ?? sectionMeta.overview;

  const renderAddClientCard = () => (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>➕ Adicionar Novo Cliente</h3>
        <p style={styles.cardSubtitle}>Cadastre um novo cliente e gere o link de convite</p>
      </div>
      <form onSubmit={handleAddClient} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>Nome Completo do Cliente</label>
          <input
            type="text"
            placeholder="Ex: João da Silva"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            style={styles.input}
            required
          />
        </div>
        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>CPF ou CNPJ</label>
          <input
            type="text"
            placeholder="Digite apenas números"
            value={newClient.document}
            inputMode="numeric"
            maxLength={DOCUMENT_LENGTH.cnpj}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, '');
              const provisionalType = digitsOnly.length > DOCUMENT_LENGTH.cpf ? 'cnpj' : 'cpf';
              const limit = DOCUMENT_LENGTH[provisionalType];
              const limited = digitsOnly.slice(0, limit);
              const resolvedType = limited.length > DOCUMENT_LENGTH.cpf ? 'cnpj' : 'cpf';
              setNewClient((previous) => ({
                ...previous,
                document: limited,
                documentType: resolvedType
              }));
            }}
            style={styles.input}
            required
          />
          <div style={styles.helperText}>
            {newClient.documentType === 'cnpj'
              ? `📋 CNPJ - Restam ${Math.max(DOCUMENT_LENGTH.cnpj - newClient.document.length, 0)} dígitos`
              : `👤 CPF - Restam ${Math.max(DOCUMENT_LENGTH.cpf - newClient.document.length, 0)} dígitos`}
          </div>
        </div>
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? '⏳ Processando...' : '🚀 Gerar Link de Convite'}
        </button>
      </form>
      {(clientFeedback || inviteLink) && (
        <div style={styles.feedbackBox}>
          {clientFeedback && (
            <div style={styles.feedbackMessage}>
              <span style={styles.feedbackIcon}>ℹ️</span>
              <p style={styles.feedbackText}>{clientFeedback}</p>
            </div>
          )}
          {inviteLink && (
            <div style={styles.inviteSection}>
              <h4 style={styles.inviteTitle}>🔗 Link de Convite Gerado</h4>
              <div style={styles.inviteWrapper}>
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  style={styles.inviteInput}
                  onFocus={(event) => event.target.select()}
                />
                <button
                  type="button"
                  style={styles.copyButton}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteLink);
                      setClientFeedback('✅ Link copiado para a área de transferência!');
                    } catch (_error) {
                      setClientFeedback('⚠️ Não foi possível copiar automaticamente. Copie manualmente o link abaixo.');
                    }
                  }}
                >
                  📋 Copiar Link
                </button>
              </div>
              <p style={styles.inviteInstructions}>
                Envie este link para seu cliente completar o cadastro
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderQuickActionsCard = () => (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>⚡ Ações Rápidas</h3>
        <p style={styles.cardSubtitle}>Ferramentas para gerenciar seus clientes</p>
      </div>
      <div style={styles.quickActionsGrid}>
        <button type="button" style={styles.quickActionButton}>
          <span style={styles.actionIcon}>🔗</span>
          <div style={styles.actionContent}>
            <strong>Gerar Link</strong>
            <small>Criar novo convite</small>
          </div>
        </button>
        <button type="button" style={styles.quickActionButton}>
          <span style={styles.actionIcon}>📧</span>
          <div style={styles.actionContent}>
            <strong>Enviar Lembrete</strong>
            <small>Pagamentos pendentes</small>
          </div>
        </button>
        <button type="button" style={styles.quickActionButton}>
          <span style={styles.actionIcon}>📊</span>
          <div style={styles.actionContent}>
            <strong>Relatórios</strong>
            <small>Exportar dados</small>
          </div>
        </button>
        <button type="button" style={styles.quickActionButton}>
          <span style={styles.actionIcon}>📱</span>
          <div style={styles.actionContent}>
            <strong>WhatsApp</strong>
            <small>Contato direto</small>
          </div>
        </button>
      </div>
    </div>
  );

  const renderClientsTable = () => (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>👥 Meus Clientes</h3>
        <p style={styles.cardSubtitle}>Lista completa dos seus clientes cadastrados</p>
      </div>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Documento</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Cadastrado em</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((item) => (
              <tr key={item.client_id} style={styles.tableRow}>
                <td style={styles.td}>
                  <div style={styles.clientInfo}>
                    <div style={styles.clientAvatar}>
                      {item.profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{item.profile.name}</strong>
                      <br />
                      <small style={styles.clientType}>
                        {item.profile.document_type === 'cnpj' ? '🏢 MEI' : '👤 Autônomo'}
                      </small>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <code style={styles.documentCode}>
                    {formatDocumentWithLabel(item.profile.document, item.profile.document_type)}
                  </code>
                </td>
                <td style={styles.td}>
                  <span style={styles.statusBadge(item.profile.onboarding_completed)}>
                    {item.profile.onboarding_completed ? '✅ Ativo' : '⏳ Pendente'}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={styles.dateText}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : 'N/D'}
                  </span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button style={styles.actionBtn} title="Visualizar">
                      👁️
                    </button>
                    <button style={styles.actionBtn} title="Editar">
                      ✏️
                    </button>
                    <button style={styles.actionBtn} title="Contatar">
                      📱
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!clients.length && (
              <tr>
                <td style={styles.emptyState} colSpan={5}>
                  <div style={styles.emptyStateContent}>
                    <span style={styles.emptyIcon}>👥</span>
                    <h4>Nenhum cliente cadastrado ainda</h4>
                    <p>Comece adicionando seu primeiro cliente usando o formulário acima</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  if (loading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      <aside style={styles.sidebar}>
        <img src={logo} alt="Logo GuiasMEI" style={styles.logo} />
        <nav style={styles.nav}>
          <button
            style={{ ...styles.navLink, ...(activeSection === 'overview' ? styles.activeNavLink : {}) }}
            onClick={() => setActiveSection('overview')}
          >
            <span>📊</span> Dashboard
          </button>
          <button
            style={{ ...styles.navLink, ...(activeSection === 'clients' ? styles.activeNavLink : {}) }}
            onClick={() => setActiveSection('clients')}
          >
            <span>👥</span> Meus Clientes
          </button>
          <button
            style={{ ...styles.navLink, ...(activeSection === 'commissions' ? styles.activeNavLink : {}) }}
            onClick={() => setActiveSection('commissions')}
          >
            <span>💰</span> Minhas Comissões
          </button>
        </nav>
        <div
          style={styles.logoutButton}
          onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
        >
          <span>🚪</span> Sair
        </div>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.header}>
          <h2>{currentMeta.title}</h2>
          <p>{currentMeta.description}</p>
        </header>

        {activeSection === 'overview' && (
          <>
            <section style={styles.statsGrid}>
              <StatCard title="Receita Total" value={`R$ ${stats.total_revenue.toFixed(2)}`} icon="R$" />
              <StatCard title="Notas Fiscais Emitidas" value={stats.total_nfse} icon="NF" />
              <StatCard title="Guias GPS Emitidas" value={stats.total_gps} icon="GPS" />
              <StatCard title="Total de Clientes" value={clients.length} icon="CL" />
            </section>

            <section style={styles.grid2Cols}>
              {renderAddClientCard()}
              {renderQuickActionsCard()}
            </section>

            {renderClientsTable()}
          </>
        )}

        {activeSection === 'clients' && (
          <>
            <section style={styles.gridSingle}>
              {renderAddClientCard()}
            </section>
            {renderClientsTable()}
          </>
        )}

        {activeSection === 'commissions' && (
          <>
            <section style={styles.statsGrid}>
              <StatCard title="Receita Total" value={`R$ ${totalCommission.toFixed(2)}`} icon="R$" />
              <StatCard title="Clientes Ativos" value={clients.length} icon="CL" />
              <StatCard title="Notas Emitidas" value={stats.total_nfse} icon="NF" />
            </section>

            <section style={styles.card}>
              <h3>Histórico de Comissões</h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Cliente</th>
                    <th style={styles.th}>Valor</th>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionHistory.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>{item.name}</td>
                      <td style={styles.td}>R$ {item.amount.toFixed(2)}</td>
                      <td style={styles.td}>{item.date}</td>
                      <td style={styles.td}>
                        <span style={styles.statusBadge(item.status === 'Pago')}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                  {!commissionHistory.length && (
                    <tr>
                      <td style={styles.emptyState} colSpan={4}>
                        Nenhuma comissão registrada até o momento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div style={styles.statCard}>
    <div style={styles.statIcon}>{icon}</div>
    <div>
      <p style={styles.statValue}>{value}</p>
      <h4 style={styles.statTitle}>{title}</h4>
    </div>
  </div>
);

const styles = {
  dashboardContainer: { display: 'flex', minHeight: '100vh', fontFamily: '"Inter", sans-serif', backgroundColor: '#f8f9fa' },
  sidebar: { width: '280px', backgroundColor: '#fff', padding: '30px 20px', display: 'flex', flexDirection: 'column', borderRight: '1px solid #e5e7eb', boxShadow: '2px 0 10px rgba(0,0,0,0.05)' },
  logo: { height: '60px', marginBottom: '40px', alignSelf: 'center' },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 },
  navLink: { textDecoration: 'none', color: '#6b7280', padding: '14px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500, transition: 'all 0.3s ease', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '15px' },
  activeNavLink: { backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe' },
  logoutButton: { padding: '14px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 500, color: '#dc2626', cursor: 'pointer', transition: 'all 0.3s ease', backgroundColor: '#fef2f2', border: '1px solid #fecaca' },
  mainContent: { flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#f8f9fa' },
  header: { marginBottom: '40px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' },
  statCard: { display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#fff', padding: '28px', borderRadius: '16px', boxShadow: '0 4px 25px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6', transition: 'all 0.3s ease' },
  statIcon: { fontSize: '2.5rem', opacity: 0.8 },
  statValue: { fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#1f2937' },
  statTitle: { fontSize: '14px', color: '#6b7280', margin: 0, fontWeight: 500 },
  grid2Cols: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' },
  gridSingle: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '40px' },
  card: { backgroundColor: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 25px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6' },
  cardHeader: { marginBottom: '24px' },
  cardTitle: { fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 8px 0' },
  cardSubtitle: { fontSize: '14px', color: '#6b7280', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  inputLabel: { fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px' },
  input: { padding: '14px 16px', fontSize: '16px', border: '2px solid #e5e7eb', borderRadius: '10px', transition: 'all 0.3s ease', backgroundColor: '#fff', '&:focus': { borderColor: '#3b82f6', outline: 'none', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' } },
  helperText: { fontSize: '13px', color: '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' },
  button: { padding: '14px 24px', fontSize: '16px', fontWeight: '600', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { backgroundColor: '#2563eb', transform: 'translateY(-1px)' }, '&:disabled': { backgroundColor: '#9ca3af', cursor: 'not-allowed' } },
  quickActionsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' },
  quickActionButton: { padding: '20px 16px', borderRadius: '12px', border: '2px solid #f3f4f6', backgroundColor: '#fff', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', '&:hover': { borderColor: '#3b82f6', backgroundColor: '#eff6ff', transform: 'translateY(-2px)' } },
  actionIcon: { fontSize: '24px' },
  actionContent: { textAlign: 'center', 'strong': { display: 'block', fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }, 'small': { fontSize: '12px', color: '#6b7280' } },
  feedbackBox: { marginTop: '20px', padding: '20px', borderRadius: '12px', backgroundColor: '#f0f9ff', border: '2px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: '16px' },
  feedbackMessage: { display: 'flex', alignItems: 'center', gap: '12px' },
  feedbackIcon: { fontSize: '18px' },
  feedbackText: { margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: '500' },
  inviteSection: { backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' },
  inviteTitle: { fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0 0 12px 0' },
  inviteWrapper: { display: 'flex', gap: '12px', alignItems: 'center' },
  inviteInput: { flex: 1, padding: '12px 16px', borderRadius: '8px', border: '2px solid #d1d5db', fontSize: '14px', backgroundColor: '#fff', fontFamily: 'monospace' },
  copyButton: { padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: '#fff', fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease', '&:hover': { backgroundColor: '#047857' } },
  inviteInstructions: { fontSize: '13px', color: '#6b7280', margin: '8px 0 0 0', fontStyle: 'italic' },
  tableContainer: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb' },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' },
  tableRow: { transition: 'all 0.2s ease', '&:hover': { backgroundColor: '#f9fafb' } },
  th: { textAlign: 'left', padding: '16px', backgroundColor: '#f8fafc', fontWeight: '600', color: '#374151', fontSize: '14px', borderBottom: '2px solid #e5e7eb' },
  td: { padding: '16px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
  clientInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  clientAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  clientType: { color: '#6b7280', fontSize: '12px' },
  documentCode: { backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px', color: '#374151' },
  dateText: { color: '#6b7280', fontSize: '14px' },
  actionButtons: { display: 'flex', gap: '8px' },
  actionBtn: { padding: '6px 8px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', cursor: 'pointer', transition: 'all 0.2s ease', fontSize: '14px', '&:hover': { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' } },
  emptyState: { padding: '40px', textAlign: 'center', color: '#6b7280' },
  emptyStateContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  emptyIcon: { fontSize: '48px', opacity: 0.5 },
  statusBadge: (isCompleted) => ({
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: isCompleted ? '#dcfce7' : '#fef3c7',
    color: isCompleted ? '#166534' : '#92400e',
    border: isCompleted ? '1px solid #bbf7d0' : '1px solid #fde68a'
  }),
  centered: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' },
  spinner: { border: '4px solid #f3f4f6', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' },
  '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
};

export default DashboardPartner;
