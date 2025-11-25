import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../providers/auth-provider";
import logo from "../../assets/logo.png";

interface Link {
  to: string;
  label: string;
}

const links: Link[] = [
  { to: "/dashboard/mei", label: "Dashboard MEI" },
  { to: "/dashboard/autonomo", label: "Dashboard Autônomo" },
  { to: "/dashboard/parceiro", label: "Dashboard Parceiro" },
  { to: "/dashboard/admin", label: "Admin" },
  { to: "/nfse/nova", label: "Nova NFS-e" },
  { to: "/gps/gerar", label: "Gerar GPS" },
  { to: "/historico", label: "Histórico" },
  { to: "/pagamentos", label: "Pagamentos" },
  { to: "/configuracoes", label: "Configurações" },
];

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-72 flex-col border-r border-slate-200 bg-white p-6 md:flex">
        <img src={logo} alt="GuiasMEI" className="mb-8 h-10 w-auto" />
        <nav className="flex flex-1 flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="mt-8 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          <LogOut size={16} />
          Sair
        </button>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
