import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home as HomeIcon, Clock, Wrench, LogOut, Briefcase, MapPin, RadioTower, Wallet, User, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const ALL_NAV = [
  { label: "Início", path: "/", icon: HomeIcon, roles: ["cliente"] },
  { label: "Mapa", path: "/mapa", icon: MapPin, roles: ["cliente"] },
  { label: "Histórico", path: "/historico", icon: Clock, roles: ["cliente"] },
  { label: "Painel Chaveiro", path: "/painel-chaveiro", icon: RadioTower, roles: ["chaveiro"] },
  { label: "Financeiro", path: "/painel-financeiro", icon: Wallet, roles: ["chaveiro"] },
  { label: "Modo de Trabalho", path: "/modo-trabalho", icon: Briefcase, roles: ["chaveiro"] },
  { label: "Painel Admin", path: "/painel-admin", icon: ShieldCheck, roles: ["admin"] },
];

function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const navItems = ALL_NAV.filter((i) => accountType === "admin" || i.roles.includes(accountType));
  const homePath = accountType === "chaveiro" ? "/painel-chaveiro" : accountType === "admin" ? "/painel-admin" : "/";

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  const roleLabel = accountType === "chaveiro" ? "Chaveiro" : accountType === "admin" ? "Admin" : "Cliente";

  return (
    <aside className="w-full md:w-64 md:min-h-screen bg-white border-r border-border flex flex-col">
      <div className="p-5 border-b border-border">
        <Link to={homePath} className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-heading font-bold text-foreground">ChaveiroJá</p>
            <p className="text-[11px] text-muted-foreground">Socorro na hora</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 flex md:flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 md:flex-none ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        {user && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.full_name || user.email}</p>
              <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 md:h-screen md:overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}