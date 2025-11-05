# Resultados dos Testes Sicoob (PIX) — 31/10/2025

Este documento consolida os resultados reais dos testes executados contra a API PIX do Sicoob seguindo o padrão Bacen PADI.

## Ambiente e Configuração

- Ambiente: sandbox
- Auth URL: https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token
- PIX Base URL: https://api.sicoob.com.br/pix/api/v2
- Boleto Base URL: https://api.sicoob.com.br/cobranca-bancaria/v3
- mTLS: certificado e chave PEM válidos configurados
- Chave PIX: EVP real do recebedor definida em `SICOOB_PIX_CHAVE`

Variáveis de ambiente utilizadas (trecho):

```env
SICOOB_ENVIRONMENT=sandbox
SICOOB_PIX_BASE_URL=https://api.sicoob.com.br/pix/api/v2
SICOOB_AUTH_URL=https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token
SICOOB_CLIENT_ID=<seu_client_id>
SICOOB_CERT_PATH=apps/backend/certificates/sicoob-cert.pem
SICOOB_KEY_PATH=apps/backend/certificates/chave_privada.pem
SICOOB_PIX_CHAVE=<sua_evp_ou_cnpj>
```

Observação: o script de testes aceita `SICOOB_PIX_BASE_URL` (preferencial) ou `SICOOB_API_BASE_URL` como base.

## Resultados dos Testes

### 1) Autenticação OAuth2 + mTLS
- Status: OK (token emitido, expiração ~300s)
- Certificados mTLS: válidos; handshake completo

### 2) Criar cobrança PIX imediata — POST /cob
- Status: 201 Created
- Resultado: cobrança criada com sucesso, status ATIVA
- TXID: PHB7MFTILK1NFV813678801761920911096
- Payload mínimo enviado (PADI):
  - calendario.expiracao: 3600
  - valor.original: "100.00"
  - chave: EVP real
  - solicitacaoPagador: "Teste de cobrança PIX imediata"

### 3) Listar cobranças — GET /cob
- Janela: 6 dias (exigência PADI: diferença < 7 dias)
- Parâmetros: inicio=YYYY-MM-DD, fim=YYYY-MM-DD, paginacao.paginaAtual=1, paginacao.itensPorPagina=10
- Status: 200 OK
- Resultado: 0 registros retornados (sem cobranças no período)

### 4) Criar cobrança com vencimento — POST /cobv
- Status: 405 Method Not Allowed
- Observação: provável limitação do sandbox para o recurso /cobv neste ambiente

### 5) Consultar por TXID — GET /cob/{txid}
- Para TXID inexistente: 404 Not Found (comportamento esperado)
- Para o TXID criado, a consulta não foi executada nesta rodada (apenas criação e listagem)

### 6) Logging no Supabase
- Tentativa de registro: falhou por tabela ausente
- Erro: tabela `public.sicoob_test_logs` não encontrada
- Ação sugerida: criar a tabela antes de reexecutar o script ou desativar o log

## Limitações e Observações Importantes

- Janela de listagem: o intervalo deve ser estritamente menor que 7 dias; com 7 dias retorna 422
- Chave PIX: deve pertencer ao recebedor configurado; chaves inválidas retornam erro de validação
- /cobv em sandbox: retornou 405, sugerindo indisponibilidade do recurso neste ambiente
- Rate limit: pode retornar 429; observar headers `x-ratelimit-*`

## Próximos Passos (PIX)

- [Pausado] Continuar após documentação: manter foco em outras frentes e retornar ao PIX quando necessário
- Opcional: implementar consulta do TXID recém-criado para fechar ciclo (criar→consultar)
- Opcional: provisionar tabela no Supabase (`sicoob_test_logs`) para persistir respostas de teste

Estrutura sugerida para a tabela de logs (PostgreSQL/Supabase):

```sql
create table if not exists public.sicoob_test_logs (
  id bigint generated always as identity primary key,
  timestamp timestamptz not null default now(),
  ambiente text not null,
  categoria text not null,
  tipo_teste text not null,
  dados_resposta jsonb not null
);
```

---

Registro final: os objetivos de “testar primeiro” foram atendidos para cobrança imediata e listagem conforme PADI. Recurso de vencimento permaneceu bloqueado no sandbox nesta rodada.
