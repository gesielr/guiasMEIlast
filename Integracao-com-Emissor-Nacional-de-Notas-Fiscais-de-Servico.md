# Integração com Emissor Nacional de Notas Fiscais de Serviço

## Visão geral
Esta documentação consolida todo o processo de integração do projeto `guiasMEI` com o Emissor Nacional de NFS-e (SEFIN Nacional). O objetivo é permitir que futuros mantenedores reproduzam a configuração do zero, compreendam os módulos envolvidos e saibam como solucionar problemas típicos de emissão. O fluxo atual consome o manual oficial **“Manual Contribuintes Emissor Público API - Sistema Nacional NFS-e v1.2 out2025”** como referência normativa.

## Arquitetura e módulos principais
1. **Front/WhatsApp Flow:** `apps/backend/src/services/whatsapp/nfse-emission-flow.service.ts`. Orchestra o diálogo com o usuário, coleta dados do tomador, escolhe o serviço adequado e monta o DTO da DPS.
2. **Template DPS XML:** `apps/backend/src/nfse/templates/dps-template.ts`. Converte o DTO em XML compatível com o XSD nacional. Trata formatação de datas, IDs, códigos de município, etc.
3. **Service Resolver (CNAE → LC116):** `apps/backend/src/nfse/domain/services-resolver.ts` com dependências (`cnae-map.ts`, `lc116-labels.ts`, `text-match.ts`, `cnae-descriptions.ts`, `lc116-catalog.ts`). Resolve até duas sugestões por CNAE combinando seed, regras léxicas e fallback por texto livre.
4. **Serviços complementares:** 
   - `apps/backend/src/nfse/services/municipal-params.service.ts` (consulta parâmetros /serviços habilitados por município – tolera indisponibilidade 4xx/5xx).
   - `apps/backend/src/nfse/services/nfse.service.ts` (envio da DPS para `/SefinNacional/nfse` com retries).
   - `apps/backend/src/services/nfse/auto-map-servicos.service.ts` (gera lista inicial de LC116 a partir dos CNAEs do perfil).
   - `apps/backend/src/nfse/domain/services-telemetry.ts` (persistência de escolhas de serviço para melhoria contínua).
5. **Persistência:** Supabase (auth users + tabelas `profiles`, `service_choices`, `servicos_mapeados`). Verificar migrações em `supabase/migrations`.

## Pré-requisitos e configuração inicial
1. **Ambiente Node.js** compatível com o monorepo (interpretar `package.json` raiz). Instalar dependências com `pnpm install` ou `npm install` conforme configuração do projeto.
2. **Variáveis de ambiente principais:**
   - `NFSE_ENDPOINT` ou equivalentes definidos em `apps/backend/src/nfse/services/helpers/adn-client.ts` (base URLs para `https://sefin.nfse.gov.br` em produção).
   - `NFSE_CLIENT_ID`, `NFSE_CLIENT_SECRET` ou `NFSE_CREDENTIAL_SECRET` se exigidos pela API (ver `NfseService`).
   - `CERTIFICADO_PFX_B64` (certificado A1 codificado base64) + senha correspondente (ex.: `CERTIFICADO_PFX_PASSWORD`).
   - Credenciais Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
   - `OPENAI_API_KEY` se o fluxo conversa com IA (não impacta emissão).
3. **Supabase:** aplicar migrações em `supabase/migrations/` (em especial `20241211000001_add_servicos_mapeados.sql` e `20241211000002_add_service_choices.sql`). Assegurar que os schemas `profiles`, `service_choices` e eventuais tabelas de parceiros existam.
4. **Certificado digital:** armazenado em `.env` com a key base64; a senha não deve conter quebras de linha. Validar que o CNPJ do certificado coincide com o prestador.

## Fluxo de emissão passo a passo
1. **Coleta de dados via WhatsApp:**
   - Usuário inicia com o comando “emitir nota”.
   - O fluxo (`nfse-emission-flow.service.ts`) captura o CPF/CNPJ do tomador, dados de endereço, valor e descrição.
   - Busca serviços disponíveis com `services-resolver` (CNAE principal + secundários, histórico de perfil, fallback texto livre).
2. **Seleção do serviço:**
   - `services-resolver` retorna objetos `{code, source}`.
   - `resolutionsToServices` converte cada subitem LC116 em código de 6 dígitos (`subitemToCodigoServico`), attach da descrição (`labelFor`) e item LC116.
   - O usuário escolhe uma opção (1..N) ou o fallback “Nenhum”.
   - A escolha é registrada com telemetria (`services-telemetry.ts` → tabela `service_choices`).
3. **Montagem do DTO (`CreateDpsDto`):**
   - Campos críticos:
     - `prestador.codigoMunicipio`: IBGE do prestador (obtido do perfil; fallback via ReceitaWS + IBGE API).
     - `servico.codigoTributacaoMunicipio`: código de 6 dígitos (ex.: `171102`).
     - `servico.itemListaLc116`: primeiros dois dígitos (`17`).
     - `servico.descricao`: texto exibido ao usuário (ex.: “Fornecimento de alimentos preparados…”).
     - `identification.serie`: “900” (padrão municipal).
     - `identification.numero`: dígitos derivados do timestamp (não pode começar com zero).
     - `identification.competencia`: `YYYY-MM` (mês vigente).
     - `identification.dataEmissao`: ISO atual (utilizado no XML).
     - `servico.codigoCnae`: CNAE principal do perfil.
     - `servico.aliquota`: 0.05 (MEI).
4. **Geração do XML (`buildDpsXml`):**
   - `formatDateTimeUTC` garante fuso UTC-3 sem milissegundos (`YYYY-MM-DDTHH:MM:SS-03:00`).
   - `formatCompetenciaData` converte `competencia` + `dataEmissao` em `dCompet` (usa o mesmo dia da emissão; fallback = último dia do mês).
   - `generateDpsId` monta o ID único `DPS` + município + documento.
   - `normalizeCodigoTributacao` normaliza código para 6 dígitos.
   - `CODIGOS_SERVICO_VALIDADOS` lista códigos confirmados para Garopaba (`171102`, `140100`, `140101`). Este registro gera logs, mas a validação final é feita pela API Nacional.
   - A assinatura XML é adicionada pelo `NfseService` utilizando o certificado A1 (RSA-SHA1).
5. **Envio à API Nacional (`NfseService.performEmission`):**
   - Compressão GZip + Base64.
   - POST em `/SefinNacional/nfse`.
   - Retries exponenciais (3 tentativas). Logs detalhados de request/response (evitar em produção publicar payload).
6. **Tratamento de erros específicos:**
   - `E0310` / `E0312`: código não administrado (Geral / competência). O fluxo agora consulta `MunicipalParamsService` e oferece opções alternativas.
   - `E0178`: regime especial incompatível (MEI). Informa o usuário para escolher outro serviço.
   - `E999` e conexões: monitora logs e retenta via `emitirComRetry`.
   - Em caso de falha, o fluxo reverte para `waiting_descricao` mantendo o contexto do tomador.

## Boas práticas de mapeamento CNAE → LC116
1. **Seed minimalista:** apenas CNAEs com códigos confirmados. Evitar manter códigos inválidos localmente (ex.: `07.xx` para Garopaba). O seed fica em `cnae-map.ts`.
2. **Lexical rules:** `services-resolver` consulta `lc116-catalog.ts` + `cnae-descriptions.ts`. Expandir keywords quando necessário.
3. **Fallback texto livre:** se nenhum código automático for encontrado, o usuário descreve o serviço; `servicesByFreeText` sugere novamente 2 opções.
4. **Telemetria:** as escolhas do usuário são gravadas para análise. Estratégia futura: promover escolhas frequentes ao seed.
5. **Atualização de `CODIGOS_SERVICO_VALIDADOS`:** somente incluir códigos confirmados no município. Ex.: Garopaba usa `171102` para bufê/alimentação.

## Integração com fontes externas
1. **ReceitaWS:** busca dados cadastrais (endereço prestador / CNAEs). `nfse-emission-flow` tem fallback se a chamada falhar.
2. **IBGE API:** converte nome do município em código IBGE (ex.: `GAROPABA` → `4205704`).
3. **API Municipal `/parametros_municipais/{municipio}/{codigoServico}`:**
   - Chamado via `MunicipalParamsService`.
   - Usa path params (não query string).
   - Timeout de 60s; se retornar 404/4xx/5xx, o fluxo não bloqueia (supõe indisponibilidade e delega à API Nacional a validação final).

## Certificado digital A1
1. Armazenado em base64 via `CERTIFICADO_PFX_B64`.
2. Extraído usando `pfx-utils` (ver logs `[pfx-utils]`).
3. Assegure que o CNPJ do certificado corresponda ao prestador. O fluxo ajusta o CNPJ do XML para o do certificado em caso de divergência.
4. Caso precise trocar o certificado:
   - Atualizar `.env`.
   - Reiniciar backend.
   - Validar logs `[NFSe] Certificado PFX carregado` e `[NFSe] Validação do certificado contra prestador`.

## Testes e validações
1. **Teste local:** use ngrok para expor o webhook do WhatsApp e seguir o fluxo completo.
2. **Monitorar logs:** `apps/backend` imprime logs estruturados (pid, reqId, etc.). Filtrar por `[NFSE FLOW]`, `[NFSe]`, `[Municipal Params]`.
3. **XML comparativo:** quando a API rejeitar, analisar o log `XML FINAL` e comparar com XML de sucesso (ex.: `xDescServ`, `cTribNac`, `dCompet`).
4. **Validação manual:** é possível reproduzir o POST com `curl` usando o XML assinado (ver logs `[NFSe] XML COMPLETO`).
5. **Competência:** confirmar que `dCompet` coincide com a data real da emissão (evita E0312). Ajustado em novembro/2025.

## Solução de problemas comuns
1. **E0312 depois de alterar códigos:** verifique `CODIGOS_SERVICO_VALIDADOS` e se o mapeamento do CNAE aponta para código habilitado. Se retornar opções erradas, ajuste `cnae-map.ts` e as labels.
2. **API municipal indisponível:** comportamento esperado. Logs devem mostrar `status: 'unavailable'`; a emissão prossegue. Apenas reportar ao usuário que a verificação municipal falhou.
3. **CNPJ divergente do perfil:** o fluxo usa o CNPJ do certificado como fonte de verdade. Confirme se o perfil Supabase está correto.
4. **Série/Número inválidos:** série deve ser `900`; número não pode iniciar com zero. Ambos são configurados na montagem do DTO.
5. **Falha de assinatura:** garantir que a senha do PFX está correta e que o arquivo não foi corrompido ao codificar base64.
6. **Mensagens no WhatsApp não exibem descrições completas:** `services-resolver` agora usa `labelFor`. Se estiver faltando rótulo, adicione em `lc116-labels.ts`.

## Atualizações futuras
1. **Novos municípios:** incorporar novas validações em `CODIGOS_SERVICO_VALIDADOS` e adaptar o seed para códigos habilitados localmente.
2. **Módulo Admin:** considerar painel para editar mapping CNAE ⇄ LC116 sem deploy.
3. **Melhorias de IA:** utilizar `service_choices` para promover serviços mais escolhidos por CNAE.
4. **Logs sensíveis:** revisar os níveis de log antes de produção (não logar XML completo com dados pessoais).
5. **Desacoplamento do WhatsApp:** em ambientes sem Whatsapp, replicar a coleta de dados via web/CLI chamando os mesmos serviços de domínio.

## Checklist final para reinstalar integração
1. Configurar `.env` com Supabase + certificado + URLs NFSe.
2. Aplicar migrações Supabase e confirmar colunas (`servicos_mapeados`, `service_choices`).
3. Validar que `cnae-map.ts` contem apenas serviços habilitados confirmados.
4. Rodar backend e testar fluxo de emissão (incluir tomador real, valor simbólico e verificar que `dCompet` = data atual).
5. Coletar logs da primeira emissão e comparar com XML de sucesso para garantir conformidade (`cTribNac`, `xDescServ`, `tpAmb`, `dhEmi`, `Signature`).
6. Documentar qualquer novo código aprovado no município e atualizar seed/labels.

Seguindo estas etapas será possível reconstruir a integração completa com o Emissor Nacional NFS-e, garantindo aderência ao manual oficial e aos requisitos específicos de Garopaba/SC.

