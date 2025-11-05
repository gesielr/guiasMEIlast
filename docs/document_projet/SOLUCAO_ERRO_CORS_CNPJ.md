# 🚨 SOLUÇÕES PARA ERRO CORS - FETCH CNPJ

## Problema Identificado
```
Access to fetch at 'https://idvfhgznofvubscjycvt.supabase.co/functions/v1/fetch-cnpj'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Causa:** Edge Function não está deployada ou versão antiga sem CORS no Supabase.

---

## ✅ SOLUÇÃO 1: Deploy da Edge Function (PERMANENTE)

### Passo 1: Instalar Supabase CLI
```powershell
npm install -g supabase
```

### Passo 2: Fazer Deploy
```powershell
cd "c:\Users\carlo\OneDrive\Área de Trabalho\Curso\Projetos Pessoais\Inss - Guias\guiasMEI"

# Linkar ao projeto
supabase link --project-ref idvfhgznofvubscjycvt

# Deploy da função
supabase functions deploy fetch-cnpj --no-verify-jwt
```

### Passo 3: Testar
Recarregue a página e digite novamente o CNPJ: **59.910.672/0001-87**

---

## ✅ SOLUÇÃO 2: Usar Backend Próprio (ALTERNATIVA)

Criar endpoint no Backend Node.js para buscar CNPJ:

### apps/backend/routes/cnpj.js (NOVO)
```javascript
const fetch = require('node-fetch');

module.exports = async function (fastify) {
  fastify.get('/api/cnpj/:cnpj', async (request, reply) => {
    const { cnpj } = request.params;
    
    try {
      const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
      const data = await response.json();
      return data;
    } catch (error) {
      reply.code(500).send({ error: 'Erro ao buscar CNPJ' });
    }
  });
};
```

### Mudar frontend para usar backend local:
```javascript
// Em CadastroPageMei.jsx, linha 55
const url = `http://localhost:3333/api/cnpj/${doc}`;
// Remover headers apikey/Authorization
```

---

## ✅ SOLUÇÃO 3: Modo Manual (TEMPORÁRIA)

**Desabilitar busca automática** e preencher manualmente:

1. Usuário digita CNPJ
2. Preenche Razão Social manualmente
3. Preenche Nome manualmente
4. Cadastro funciona normalmente

Não requer alteração de código - já funciona assim se houver erro na API.

---

## ✅ SOLUÇÃO 4: API Alternativa (SEM DEPLOY)

Usar API pública diretamente do frontend (não recomendado - sem CORS control):

```javascript
// Alternativa: BrasilAPI (tem CORS configurado)
const url = `https://brasilapi.com.br/api/cnpj/v1/${doc}`;
const response = await fetch(url); // Sem headers necessários
```

---

## 📊 COMPARAÇÃO DAS SOLUÇÕES

| Solução | Tempo | Permanente | Recomendado |
|---------|-------|------------|-------------|
| 1. Deploy Edge Function | 5 min | ✅ Sim | ⭐⭐⭐⭐⭐ |
| 2. Backend Próprio | 10 min | ✅ Sim | ⭐⭐⭐⭐ |
| 3. Modo Manual | 0 min | ❌ Temporário | ⭐⭐ |
| 4. API Alternativa | 2 min | ⚠️ Depende de 3º | ⭐⭐⭐ |

---

## 🎯 RECOMENDAÇÃO FINAL

**Para teste imediato:** Use **Solução 4** (BrasilAPI)  
**Para produção:** Use **Solução 1** (Deploy Edge Function)

---

## 🛠️ Implementar Solução 4 Agora (2 minutos)

Execute este comando para atualizar o código:

```powershell
# Isso criará um arquivo de patch
notepad "apps\web\src\features\auth\CadastroPageMei.jsx"
```

**Linha 55**, mude de:
```javascript
const url = `${supabaseUrl}/functions/v1/fetch-cnpj?cnpj=${doc}`;
```

Para:
```javascript
const url = `https://brasilapi.com.br/api/cnpj/v1/${doc}`;
```

**Linhas 56-60**, remova os headers:
```javascript
const response = await fetch(url); // Sem headers!
```

**Linha 64**, ajuste o campo de resposta:
```javascript
if (data && data.razao_social) { // BrasilAPI usa razao_social
  setFormData((prev) => ({
    ...prev,
    business_name: data.nome_fantasia || data.razao_social || "",
    name: data.razao_social || "",
  }));
```

Salve, e recarregue a página! ✅
