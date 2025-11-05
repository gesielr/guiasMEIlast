# 🏗️ Estrutura do Projeto - Frontend GuiasMEI

## 📁 Organização de Pastas

```
apps/web/src/
│
├── 📂 types/                    # Tipos TypeScript compartilhados
│   ├── database.types.ts        # Tipos das entidades do banco de dados
│   ├── auth.types.ts            # Tipos relacionados à autenticação
│   └── index.ts                 # Exportações centralizadas
│
├── 📂 components/
│   ├── 📂 ui/                   # Componentes UI reutilizáveis (NOVOS)
│   │   ├── Button.tsx           # Botão com variantes (primary, secondary, danger, ghost)
│   │   ├── Input.tsx            # Input com label, error e helperText
│   │   ├── Card.tsx             # Container card com título opcional
│   │   ├── LoadingSpinner.tsx   # Spinner de loading animado
│   │   ├── Alert.tsx            # Alertas coloridos (info, success, warning, error)
│   │   └── index.ts             # Exportações centralizadas
│   │
│   └── 📂 layout/               # Componentes de layout (existentes)
│       ├── Sidebar.jsx
│       └── Header.jsx
│
├── 📂 services/                 # Camada de serviços (NOVA)
│   ├── profileService.ts        # CRUD de perfis de usuário
│   ├── paymentService.ts        # CRUD de pagamentos
│   ├── nfseService.ts           # CRUD de emissões de NFS-e
│   ├── gpsService.ts            # CRUD de emissões de GPS
│   └── index.ts                 # Exportações centralizadas
│
├── 📂 hooks/                    # Hooks customizados (NOVOS)
│   ├── useProfile.ts            # Hook para gerenciar perfis
│   ├── usePayments.ts           # Hook para gerenciar pagamentos
│   ├── useDebounce.ts           # Hook de debounce
│   ├── useLocalStorage.ts       # Hook para localStorage
│   └── index.ts                 # Exportações centralizadas
│
├── 📂 features/                 # Funcionalidades/Páginas (existentes)
│   ├── HomePage/
│   ├── dashboards/
│   ├── nfse/
│   ├── gps/
│   ├── pagamentos/
│   └── certificado/
│
├── 📂 auth/                     # Componentes de autenticação (existentes)
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   └── TwoFactorPage.jsx
│
├── 📂 providers/                # Context providers (existentes)
│   ├── auth-provider.jsx
│   └── sdk-provider.jsx
│
├── 📂 lib/                      # Bibliotecas e utilitários (existentes)
│   ├── formatters.js
│   └── helpers.js
│
├── 📂 utils/                    # Funções utilitárias (existentes)
│   ├── encryption.js
│   └── validators.js
│
├── 📂 supabase/                 # Configuração Supabase (existente)
│   └── client.js
│
├── 📂 styles/                   # Estilos globais (existente)
│   └── global.css
│
├── App.jsx                      # Componente principal com rotas
└── main.jsx                     # Ponto de entrada da aplicação
```

---

## 🎯 Convenções de Nomenclatura

### Arquivos
- **Componentes React:** `PascalCase.tsx` (ex: `Button.tsx`, `LoginPage.tsx`)
- **Hooks:** `camelCase.ts` com prefixo `use` (ex: `useProfile.ts`)
- **Serviços:** `camelCase.ts` com sufixo `Service` (ex: `profileService.ts`)
- **Tipos:** `camelCase.types.ts` (ex: `database.types.ts`)
- **Utilitários:** `camelCase.ts` (ex: `formatters.ts`)

### Código
- **Componentes:** `PascalCase` (ex: `Button`, `LoginPage`)
- **Funções:** `camelCase` (ex: `getProfile`, `formatCurrency`)
- **Constantes:** `UPPER_SNAKE_CASE` (ex: `API_URL`, `MAX_RETRIES`)
- **Interfaces/Types:** `PascalCase` (ex: `Profile`, `ButtonProps`)

---

## 🔧 Configurações

### TypeScript (`tsconfig.json`)
- ✅ Strict mode habilitado
- ✅ Path aliases configurados (`@/components`, `@/services`, etc.)
- ✅ JSX configurado para React

### ESLint (`.eslintrc.json`)
- ✅ Regras para React e React Hooks
- ✅ Suporte a TypeScript
- ✅ Avisos para console.log

### Prettier (`.prettierrc`)
- ✅ Formatação automática
- ✅ Semicolons habilitados
- ✅ Single quotes desabilitado
- ✅ Print width: 100

### Tailwind CSS (`tailwind.config.js`)
- ✅ Cores customizadas (primary, secondary, danger, etc.)
- ✅ Fontes configuradas
- ✅ Plugins habilitados

---

## 📦 Dependências Principais

### Produção
- **React 18** - Framework UI
- **React Router DOM** - Roteamento
- **TanStack Query** - Gerenciamento de estado assíncrono
- **Supabase** - Backend e autenticação
- **Zod** - Validação de schemas
- **React Hook Form** - Formulários
- **Tailwind CSS** - Estilização
- **Axios** - Cliente HTTP
- **date-fns** - Manipulação de datas
- **Lucide React** - Ícones

### Desenvolvimento
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **ESLint** - Linting
- **Prettier** - Formatação
- **Vitest** - Testes

---

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                 # Inicia servidor de desenvolvimento

# Build
npm run build              # Compila para produção (com type-check)
npm run preview            # Preview da build de produção

# Qualidade de Código
npm run type-check         # Verifica tipos TypeScript
npm run lint               # Executa ESLint
npm run lint:fix           # Corrige problemas do ESLint automaticamente
npm run format             # Formata código com Prettier

# Testes
npm run test               # Executa testes com Vitest
npm run test:e2e           # Executa testes E2E
```

---

## 🎨 Sistema de Design

### Cores (Tailwind)
```
primary:    #4F46E5 (Indigo)
secondary:  #10B981 (Green)
danger:     #EF4444 (Red)
warning:    #F59E0B (Amber)
success:    #10B981 (Green)
```

### Componentes UI Disponíveis
- ✅ **Button** - 4 variantes, 3 tamanhos, loading state
- ✅ **Input** - Com label, error, helperText
- ✅ **Card** - Container com título opcional
- ✅ **LoadingSpinner** - 3 tamanhos
- ✅ **Alert** - 4 variantes (info, success, warning, error)

---

## 🔄 Fluxo de Dados

```
Componente → Hook → Service → Supabase → Database
    ↓          ↓        ↓
  UI State   Cache   API Call
```

### Exemplo:
```tsx
// 1. Componente usa hook
const { data: profile } = useProfile(userId);

// 2. Hook usa TanStack Query + Service
const { data } = useQuery({
  queryKey: ["profile", userId],
  queryFn: () => profileService.getProfile(userId)
});

// 3. Service faz chamada ao Supabase
const { data, error } = await supabase
  .from("profiles")
  .select("*")
  .eq("id", userId)
  .single();
```

---

## 📝 Padrões de Código

### 1. Componentes Funcionais com TypeScript
```tsx
interface MyComponentProps {
  title: string;
  onSave: () => void;
}

export function MyComponent({ title, onSave }: MyComponentProps) {
  return <div>{title}</div>;
}
```

### 2. Hooks Customizados
```tsx
export function useMyHook(param: string) {
  const [state, setState] = useState<string>("");
  
  useEffect(() => {
    // lógica
  }, [param]);
  
  return { state, setState };
}
```

### 3. Serviços
```tsx
export const myService = {
  async getData(id: string): Promise<Data> {
    const { data, error } = await supabase
      .from("table")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  }
};
```

### 4. Estilos com Tailwind
```tsx
// ✅ BOM
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <Button variant="primary">Salvar</Button>
</div>

// ❌ EVITAR
<div style={{ display: 'flex', padding: '24px' }}>
  <button style={{ backgroundColor: '#4F46E5' }}>Salvar</button>
</div>
```

---

## 🧪 Testes

### Estrutura de Testes
```
src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── Button.test.tsx
├── hooks/
│   ├── useProfile.ts
│   └── useProfile.test.ts
└── services/
    ├── profileService.ts
    └── profileService.test.ts
```

### Exemplo de Teste
```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
});
```

---

## 🔐 Segurança

- ✅ Variáveis de ambiente para chaves sensíveis
- ✅ Criptografia de dados sensíveis (CPF, PIS)
- ✅ Row Level Security (RLS) no Supabase
- ✅ Validação de schemas com Zod
- ✅ Sanitização de inputs

---

## 📚 Recursos

- [Guia de Migração](./MIGRACAO.md) - Como migrar componentes existentes
- [Guia de Restauração](./RESTAURACAO.md) - Como restaurar código anterior
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)

---

## 🤝 Contribuindo

1. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
2. Siga os padrões de código estabelecidos
3. Execute `npm run lint` e `npm run type-check` antes de commitar
4. Escreva testes para novas funcionalidades
5. Faça commit com mensagens descritivas
6. Abra um Pull Request

---

## 📞 Suporte

Se tiver dúvidas ou problemas:
1. Consulte o [Guia de Migração](./MIGRACAO.md)
2. Verifique o [Guia de Restauração](./RESTAURACAO.md)
3. Entre em contato com a equipe de desenvolvimento

---

**Última atualização:** 02/11/2025  
**Versão:** 2.0.0 (Refatoração TypeScript)
