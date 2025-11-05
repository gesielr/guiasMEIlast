# 🔄 Guia de Restauração - GuiasMEI

## 📌 Ponto de Restauração Criado

**Data:** 02/11/2025  
**Branch de Backup:** `backup-refactor-v2`  
**Commit Base:** HEAD antes das alterações

---

## 🚨 Como Restaurar o Código Anterior

Se algo der errado após as alterações, você pode restaurar o código anterior de duas formas:

### Opção 1: Restaurar via Branch de Backup (Recomendado)

```bash
# Ver todas as branches disponíveis
git branch -a

# Restaurar para o backup
git checkout backup-refactor-v2

# Se quiser criar uma nova branch a partir do backup
git checkout -b nova-branch-restaurada backup-refactor-v2

# Ou sobrescrever a branch main (CUIDADO!)
git checkout main
git reset --hard backup-refactor-v2
```

### Opção 2: Reverter Commits Específicos

```bash
# Ver histórico de commits
git log --oneline

# Reverter o último commit
git revert HEAD

# Reverter múltiplos commits
git revert HEAD~3..HEAD

# Resetar para um commit específico (CUIDADO: perde alterações)
git reset --hard <commit-hash>
```

### Opção 3: Restaurar Arquivos Específicos

```bash
# Restaurar um arquivo específico do backup
git checkout backup-refactor-v2 -- caminho/do/arquivo.jsx

# Restaurar uma pasta inteira
git checkout backup-refactor-v2 -- apps/web/src/components/
```

---

## 📋 Alterações Realizadas

### 1. **Arquivos Movidos para `.archive/`**
- ✅ Arquivos temporários XML/JSON movidos para `.archive/temp-files/`
- ✅ Relatórios de teste movidos para `.archive/test-reports/`
- ✅ Arquivos: `decoded_payload*.json`, `payload*.json`, `temp-run.*`, etc.

### 2. **Configurações Adicionadas**
- ✅ `apps/web/tsconfig.json` - Configuração TypeScript
- ✅ `apps/web/tsconfig.node.json` - Configuração TypeScript para Vite
- ✅ `apps/web/.eslintrc.json` - Configuração ESLint
- ✅ `apps/web/.prettierrc` - Configuração Prettier
- ✅ `.gitignore` - Atualizado com novos padrões

### 3. **Nova Estrutura de Pastas**

```
apps/web/src/
├── types/                    # ✨ NOVO - Tipos TypeScript
│   ├── database.types.ts
│   ├── auth.types.ts
│   └── index.ts
├── components/
│   └── ui/                   # ✨ NOVO - Componentes UI reutilizáveis
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       ├── LoadingSpinner.tsx
│       ├── Alert.tsx
│       └── index.ts
├── services/                 # ✨ NOVO - Camada de serviços
│   ├── profileService.ts
│   ├── paymentService.ts
│   ├── nfseService.ts
│   ├── gpsService.ts
│   └── index.ts
└── hooks/                    # ✨ NOVO - Hooks customizados
    ├── useProfile.ts
    ├── usePayments.ts
    ├── useDebounce.ts
    ├── useLocalStorage.ts
    └── index.ts
```

### 4. **Arquivos Criados**

#### Tipos TypeScript
- `apps/web/src/types/database.types.ts` - Tipos para entidades do banco
- `apps/web/src/types/auth.types.ts` - Tipos para autenticação
- `apps/web/src/types/index.ts` - Exportações centralizadas

#### Componentes UI
- `apps/web/src/components/ui/Button.tsx` - Botão reutilizável
- `apps/web/src/components/ui/Input.tsx` - Input reutilizável
- `apps/web/src/components/ui/Card.tsx` - Card reutilizável
- `apps/web/src/components/ui/LoadingSpinner.tsx` - Spinner de loading
- `apps/web/src/components/ui/Alert.tsx` - Componente de alerta
- `apps/web/src/components/ui/index.ts` - Exportações centralizadas

#### Serviços
- `apps/web/src/services/profileService.ts` - Serviço de perfis
- `apps/web/src/services/paymentService.ts` - Serviço de pagamentos
- `apps/web/src/services/nfseService.ts` - Serviço de NFS-e
- `apps/web/src/services/gpsService.ts` - Serviço de GPS
- `apps/web/src/services/index.ts` - Exportações centralizadas

#### Hooks
- `apps/web/src/hooks/useProfile.ts` - Hook para perfis
- `apps/web/src/hooks/usePayments.ts` - Hook para pagamentos
- `apps/web/src/hooks/useDebounce.ts` - Hook de debounce
- `apps/web/src/hooks/useLocalStorage.ts` - Hook para localStorage
- `apps/web/src/hooks/index.ts` - Exportações centralizadas

---

## ⚠️ Arquivos NÃO Modificados (Ainda)

Os seguintes arquivos **NÃO foram alterados** nesta fase:

- ❌ Componentes existentes em `apps/web/src/features/` (ainda em .jsx)
- ❌ Componentes existentes em `apps/web/src/auth/` (ainda em .jsx)
- ❌ Providers em `apps/web/src/providers/` (ainda em .jsx)
- ❌ `App.jsx` e `main.jsx` (ainda em .jsx)

**Próxima Fase:** Migração gradual desses arquivos para TypeScript.

---

## 🔍 Verificar Integridade

Após restaurar, execute os seguintes comandos para verificar:

```bash
# Verificar status do git
git status

# Verificar diferenças
git diff backup-refactor-v2

# Verificar se o projeto compila
cd apps/web
npm install
npm run dev

# Verificar backend
cd ../backend
npm install
npm run dev
```

---

## 📞 Suporte

Se encontrar problemas durante a restauração:

1. **Verifique o branch de backup existe:**
   ```bash
   git branch -a | grep backup
   ```

2. **Verifique o histórico de commits:**
   ```bash
   git log --oneline --graph --all
   ```

3. **Crie um backup adicional antes de restaurar:**
   ```bash
   git branch backup-antes-restauracao
   ```

---

## ✅ Checklist de Restauração

- [ ] Verificar que o branch `backup-refactor-v2` existe
- [ ] Criar backup adicional da situação atual (se necessário)
- [ ] Executar comando de restauração escolhido
- [ ] Verificar que os arquivos foram restaurados corretamente
- [ ] Executar `npm install` em ambos os projetos
- [ ] Testar se o projeto compila e executa
- [ ] Verificar funcionalidades críticas

---

**⚠️ IMPORTANTE:** Sempre crie um backup antes de fazer alterações significativas!

**📝 Nota:** Este documento foi gerado automaticamente durante o processo de refatoração.
