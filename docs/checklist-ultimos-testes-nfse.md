# Checklist dos Últimos Testes – NFSe Nacional

## Objetivo
Este documento lista todas as pendências e etapas finais para validar a integração real do backend GuiasMEI com a API Nacional de NFSe, garantindo conformidade, robustez e operação em ambiente homologação/produção.

---

## Checklist Técnico

- [ ] **Confirmar endpoint de homologação/produção**
  - Validar se o endpoint oficial está ativo e correto (consultar manual, canais oficiais ou suporte).
  - Atualizar variável `NFSE_API_URL` no `.env` conforme endpoint válido.

- [ ] **Testar emissão real**
  - Executar o fluxo completo de emissão usando certificado digital válido.
  - Validar request, payload, XML assinado e compressão GZIP/Base64.

- [ ] **Validar resposta da API Nacional**
  - Checar se retorna protocolo, chave de acesso, status e PDF/DANFSe.
  - Registrar logs detalhados de request/response para análise.

- [ ] **Testar polling de status e download de DANFSe**
  - Consultar status da emissão via protocolo.
  - Baixar PDF/DANFSe e validar integridade.

- [ ] **Testar fallback e tratamento de erros**
  - Simular falhas de rede, certificado expirado, payload inválido e garantir logs e mensagens claras.

- [ ] **Atualizar documentação e exemplos de `.env`**
  - Registrar endpoints, variáveis e exemplos reais usados nos testes.

---

## Pendências Operacionais

- [ ] **Registrar evidências dos testes**
  - Salvar XML assinado, payload enviado, resposta da API e PDF gerado.
  - Documentar eventuais erros ou divergências para abertura de chamado.

- [ ] **Validar conformidade com o manual oficial**
  - Conferir se todos os campos obrigatórios e regras de negócio estão presentes no XML DPS.

- [ ] **Ajustar logs e monitoramento**
  - Garantir que todos os passos críticos estão logados e rastreáveis.

---

## Referências Rápidas
- Manual oficial: Guia EmissorPúblicoNacionalWEB_SNNFSe-ERN - v1.2.txt
- Documentação técnica: https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica
- Canais de atendimento: https://www.gov.br/nfse/pt-br/canais_atendimento/contact-info
- Soluções para erros comuns: https://forms.office.com/pages/responsepage.aspx?id=Q6pJbyqCIEyWcNt3AL8esBCkyHOnOPREghYY6BgquENUOU5FTk0yNjVCUDE3VlBSWlMySUxITU1aUiQlQCN0PWcu

---

## Orientações Finais
- Registre todos os resultados dos testes, inclusive logs e evidências.
- Em caso de erro, consulte o manual, canais oficiais ou abra chamado com evidências.
- Atualize este checklist conforme novas pendências ou etapas forem identificadas.

---

---

## Checklist dos Últimos Testes – Emissão de Guias INSS (Backend Python)

### Ajustes pendentes para testes finais:
- [ ] **Revisar e atualizar dependências Python**
  - Remover pacotes obsoletos (`gotrue`) do ambiente virtual e do `requirements.txt`.
  - Instalar corretamente `supabase` e `supabase_auth` (>=2.22.3).
  - Recomenda-se excluir `.venv` e criar novo ambiente virtual antes de instalar dependências.

- [ ] **Ajustar configurações Pydantic V2**
  - Garantir uso de `SettingsConfigDict` e `from_attributes = True` nos modelos.
  - Validar campo `twilio_whatsapp_number` com prefixo `whatsapp:`.

- [ ] **Refatorar Supabase Client**
  - Cliente Supabase deve ser criado via `create_client(str(settings.supabase_url), settings.supabase_key)` sem argumentos extras.
  - Centralizar operações Supabase (CRUD, storage, uploads de PDF) usando métodos assíncronos e `asyncio.to_thread`.

- [ ] **Ajustar integração WhatsApp**
  - Validar serviço WhatsApp para registro de conversas e envio de PDFs.
  - PDFs gerados devem ser enviados ao Supabase Storage e o link público retornado para envio via WhatsApp.

- [ ] **Testar endpoints e ambiente de desenvolvimento**
  - Rodar backend: `cd apps/backend/inss/app` e `uvicorn main:app --reload`.
  - Testar endpoints via Swagger (`/docs`) e comandos como `curl` ou `Invoke-RestMethod`.

- [ ] **Validar boas práticas de manutenção**
  - Após alterações em `requirements.txt`, executar `pip install -r requirements.txt`.
  - Usar `pip list` para garantir que apenas os pacotes necessários estão presentes.

### Pendências operacionais e de validação:
- [ ] **Testar emissão real de guia INSS**
  - Validar cálculo, geração de PDF, integração Supabase e envio via WhatsApp.
  - Registrar logs detalhados e evidências dos testes.

- [ ] **Documentar eventuais erros ou divergências**
  - Salvar payload, resposta, PDF gerado e logs para abertura de chamado, se necessário.

---
*Documento gerado em 29/10/2025 para acompanhamento dos testes finais NFSe Nacional e INSS.*
