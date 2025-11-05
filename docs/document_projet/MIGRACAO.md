# 🚀 Guia de Migração - GuiasMEI Frontend

## 📋 Visão Geral

Este guia explica como usar a nova estrutura do projeto e como migrar componentes existentes para TypeScript.

---

## 🎯 Nova Estrutura do Projeto

```
apps/web/src/
├── types/                    # Tipos TypeScript compartilhados
│   ├── database.types.ts     # Tipos das entidades do banco
│   ├── auth.types.ts         # Tipos de autenticação
│   └── index.ts              # Exportações centralizadas
│
├── components/
│   └── ui/                   # Componentes UI reutilizáveis
│       ├── Button.tsx        # Botão com variantes
│       ├── Input.tsx         # Input com validação
│       ├── Card.tsx          # Card container
│       ├── LoadingSpinner.tsx # Spinner de loading
│       ├── Alert.tsx         # Alertas coloridos
│       └── index.ts          # Exportações centralizadas
│
├── services/                 # Camada de serviços (API)
│   ├── profileService.ts     # CRUD de perfis
│   ├── paymentService.ts     # CRUD de pagamentos
│   ├── nfseService.ts        # CRUD de NFS-e
│   ├── gpsService.ts         # CRUD de GPS
│   └── index.ts              # Exportações centralizadas
│
├── hooks/                    # Hooks customizados
│   ├── useProfile.ts         # Hook para perfis
│   ├── usePayments.ts        # Hook para pagamentos
│   ├── useDebounce.ts        # Hook de debounce
│   ├── useLocalStorage.ts    # Hook para localStorage
│   └── index.ts              # Exportações centralizadas
│
├── features/                 # Funcionalidades (páginas)
├── auth/                     # Autenticação
├── providers/                # Context providers
├── lib/                      # Bibliotecas e utilitários
└── utils/                    # Funções utilitárias
```

---

## 🔧 Como Usar os Novos Componentes

### 1. **Componentes UI**

#### Button
```tsx
import { Button } from "@/components/ui";

// Variantes
<Button variant="primary">Salvar</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="danger">Excluir</Button>
<Button variant="ghost">Fechar</Button>

// Tamanhos
<Button size="sm">Pequeno</Button>
<Button size="md">Médio</Button>
<Button size="lg">Grande</Button>

// Loading
<Button isLoading>Carregando...</Button>

// Full width
<Button fullWidth>Botão Largo</Button>
```

#### Input
```tsx
import { Input } from "@/components/ui";

<Input
  label="Nome"
  placeholder="Digite seu nome"
  required
  error={errors.name?.message}
  helperText="Seu nome completo"
/>
```

#### Card
```tsx
import { Card } from "@/components/ui";

<Card title="Meu Card" padding="md">
  <p>Conteúdo do card</p>
</Card>
```

#### LoadingSpinner
```tsx
import { LoadingSpinner } from "@/components/ui";

<LoadingSpinner size="md" />
```

#### Alert
```tsx
import { Alert } from "@/components/ui";

<Alert variant="success">Operação realizada com sucesso!</Alert>
<Alert variant="error">Ocorreu um erro!</Alert>
<Alert variant="warning">Atenção!</Alert>
<Alert variant="info">Informação importante</Alert>
```

---

### 2. **Serviços**

#### Profile Service
```tsx
import { profileService } from "@/services";

// Buscar perfil
const profile = await profileService.getProfile(userId);

// Atualizar perfil
await profileService.updateProfile(userId, { name: "Novo Nome" });

// Completar onboarding
await profileService.completeOnboarding(userId);

// Aceitar contrato
await profileService.acceptContract(userId);
```

#### Payment Service
```tsx
import { paymentService } from "@/services";

// Buscar pagamentos
const payments = await paymentService.getPayments(userId);

// Buscar pagamento específico
const payment = await paymentService.getPaymentById(paymentId);

// Criar pagamento
await paymentService.createPayment({
  user_id: userId,
  amount: 100,
  status: "pending"
});

// Atualizar status
await paymentService.updatePaymentStatus(paymentId, "completed");
```

---

### 3. **Hooks Customizados**

#### useProfile
```tsx
import { useProfile, useUpdateProfile } from "@/hooks";

function MyComponent() {
  const { data: profile, isLoading, error } = useProfile(userId);
  const updateProfile = useUpdateProfile();

  const handleUpdate = () => {
    updateProfile.mutate({
      userId,
      updates: { name: "Novo Nome" }
    });
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  return <div>{profile.name}</div>;
}
```

#### usePayments
```tsx
import { usePayments, useCreatePayment } from "@/hooks";

function PaymentsPage() {
  const { data: payments, isLoading } = usePayments(userId);
  const createPayment = useCreatePayment();

  const handleCreate = () => {
    createPayment.mutate({
      user_id: userId,
      amount: 100,
      status: "pending"
    });
  };

  return (
    <div>
      {payments?.map(payment => (
        <div key={payment.id}>{payment.amount}</div>
      ))}
    </div>
  );
}
```

#### useDebounce
```tsx
import { useDebounce } from "@/hooks";
import { useState } from "react";

function SearchComponent() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);

  // debouncedSearch só atualiza 500ms após parar de digitar
  useEffect(() => {
    // Fazer busca com debouncedSearch
  }, [debouncedSearch]);

  return <Input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

#### useLocalStorage
```tsx
import { useLocalStorage } from "@/hooks";

function MyComponent() {
  const [theme, setTheme] = useLocalStorage("theme", "light");

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      Tema: {theme}
    </button>
  );
}
```

---

## 🔄 Como Migrar Componentes Existentes

### Passo 1: Renomear arquivo `.jsx` para `.tsx`

```bash
# Exemplo
mv src/features/HomePage/HomePage.jsx src/features/HomePage/HomePage.tsx
```

### Passo 2: Adicionar tipos para props

**Antes (JavaScript):**
```jsx
function MyComponent({ title, onSave }) {
  return <div>{title}</div>;
}
```

**Depois (TypeScript):**
```tsx
interface MyComponentProps {
  title: string;
  onSave: () => void;
}

function MyComponent({ title, onSave }: MyComponentProps) {
  return <div>{title}</div>;
}
```

### Passo 3: Substituir estilos inline por Tailwind

**Antes:**
```jsx
const styles = {
  container: {
    display: 'flex',
    padding: '20px',
    backgroundColor: '#fff'
  }
};

<div style={styles.container}>Conteúdo</div>
```

**Depois:**
```tsx
<div className="flex p-5 bg-white">Conteúdo</div>
```

### Passo 4: Usar componentes UI reutilizáveis

**Antes:**
```jsx
<button
  style={{
    backgroundColor: '#4F46E5',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px'
  }}
  onClick={handleClick}
>
  Salvar
</button>
```

**Depois:**
```tsx
import { Button } from "@/components/ui";

<Button variant="primary" onClick={handleClick}>
  Salvar
</Button>
```

### Passo 5: Usar serviços ao invés de Supabase direto

**Antes:**
```jsx
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**Depois:**
```tsx
import { profileService } from "@/services";

const profile = await profileService.getProfile(userId);
```

### Passo 6: Usar hooks customizados

**Antes:**
```jsx
const [profile, setProfile] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  }
  fetchProfile();
}, [userId]);
```

**Depois:**
```tsx
import { useProfile } from "@/hooks";

const { data: profile, isLoading } = useProfile(userId);
```

---

## 📦 Instalação de Dependências

```bash
cd apps/web
npm install
```

Isso instalará:
- TypeScript
- ESLint + plugins
- Prettier
- @types/node
- @types/react
- @types/react-dom

---

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build com verificação de tipos
npm run build

# Verificar tipos sem compilar
npm run type-check

# Lint
npm run lint

# Lint com correção automática
npm run lint:fix

# Formatar código
npm run format

# Testes
npm run test
```

---

## 🎨 Tailwind CSS - Classes Principais

### Layout
```
flex, grid, block, inline-block, hidden
justify-center, items-center, gap-4
w-full, h-screen, min-h-screen
```

### Espaçamento
```
p-4 (padding), m-4 (margin)
px-4 (horizontal), py-4 (vertical)
pt-4, pr-4, pb-4, pl-4 (individual)
```

### Cores (do tailwind.config.js)
```
bg-primary, text-primary
bg-secondary, text-secondary
bg-danger, text-danger
bg-success, text-success
bg-warning, text-warning
```

### Tipografia
```
text-sm, text-base, text-lg, text-xl
font-normal, font-medium, font-semibold, font-bold
text-left, text-center, text-right
```

### Bordas
```
border, border-2, border-4
rounded, rounded-lg, rounded-full
border-gray-300, border-primary
```

### Sombras
```
shadow-sm, shadow, shadow-md, shadow-lg
```

---

## 🔍 Path Aliases Configurados

```tsx
import { Button } from "@/components/ui";
import { profileService } from "@/services";
import { useProfile } from "@/hooks";
import { Profile } from "@/types";
import { formatCurrency } from "@/utils";
import { supabase } from "@/supabase/client";
```

---

## ✅ Checklist de Migração

Para cada componente:

- [ ] Renomear `.jsx` para `.tsx`
- [ ] Adicionar tipos para props
- [ ] Adicionar tipos para state
- [ ] Substituir estilos inline por Tailwind
- [ ] Usar componentes UI reutilizáveis
- [ ] Usar serviços ao invés de Supabase direto
- [ ] Usar hooks customizados
- [ ] Remover código duplicado
- [ ] Testar funcionalidade
- [ ] Verificar tipos com `npm run type-check`
- [ ] Verificar lint com `npm run lint`

---

## 🆘 Problemas Comuns

### Erro: "Cannot find module '@/components/ui'"

**Solução:** Verifique se o `tsconfig.json` está configurado corretamente com os path aliases.

### Erro: "Property 'xxx' does not exist on type 'yyy'"

**Solução:** Adicione o tipo correto ou use `as` para type assertion (com cuidado).

### Erro: ESLint não está funcionando

**Solução:** Execute `npm install` novamente e reinicie o editor.

---

## 📚 Recursos

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)

---

**🎉 Boa sorte com a migração!**
