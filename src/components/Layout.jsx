import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home as HomeIcon, Clock, Wrench, LogOut, Briefcase, MapPin, RadioTower, Wallet } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "Início", path: "/", icon: HomeIcon },
  { label: "Mapa", path: "/mapa", icon: MapPin },
  { label: "Histórico", path: "/historico", icon: Clock },
  { label: "Painel Chaveiro", path: "/painel-chaveiro", icon: RadioTower },
  { label: "Financeiro", path: "/painel-financeiro", icon: Wallet },
  { label: "Modo de Trabalho", path: "/modo-trabalho", icon: Briefcase },
];

function Sidebar() {
  const location = useLocation();

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  return (
    <aside className="w-full md:w-64 md:min-h-screen bg-white border-r border-border flex flex-col">
      <div className="p-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
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

      <div className="p-3 border-t border-border hidden md:block">
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