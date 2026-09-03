import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home as HomeIcon, Clock, LogOut, Briefcase, MapPin, RadioTower, Wallet, User, ShieldCheck, Menu, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";

const ALL_NAV = [
  { label: "Início", path: "/", icon: HomeIcon, roles: ["cliente"] },
  { label: "Mapa", path: "/mapa", icon: MapPin, roles: ["cliente"] },
  { label: "Histórico", path: "/historico", icon: Clock, roles: ["cliente"] },
  { label: "Painel Chaveiro", path: "/painel-chaveiro", icon: RadioTower, roles: ["chaveiro"] },
  { label: "Financeiro", path: "/painel-financeiro", icon: Wallet, roles: ["chaveiro"] },
  { label: "Modo de Trabalho", path: "/modo-trabalho", icon: Briefcase, roles: ["chaveiro"] },
  { label: "Painel Admin", path: "/painel-admin", icon: ShieldCheck, roles: ["admin"] },
  { label: "Financeiro", path: "/painel-financeiro-admin", icon: Wallet, roles: ["admin"] },
];

function SidebarContent({ onNavigate }) {
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
    <>
      <div className="p-5 border-b border-border">
        <Link to={homePath} onClick={onNavigate} className="flex items-center gap-2">
          <Image
            src="https://media.base44.com/images/public/6a975d266a8000184833026a/9589e6a99_generated_image.png"
            alt="Chaveiro Já"
            fittingType="fit"
            className="w-10 h-10 rounded-xl"
          />
          <div className="leading-tight">
            <p className="font-heading font-bold text-foreground">Chaveiro Já</p>
            <p className="text-[11px] text-muted-foreground">Socorro na hora</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 md:flex-none ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{item.label}</span>
              <span className="md:hidden">{item.label.split(" ")[0]}</span>
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
    </>
  );
}

function MobileTopBar({ onMenu }) {
  const location = useLocation();
  const { user } = useAuth();
  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const navItems = ALL_NAV.filter((i) => accountType === "admin" || i.roles.includes(accountType));
  const current = navItems.find((i) => i.path === location.pathname);
  return (
    <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
      <Link to={accountType === "chaveiro" ? "/painel-chaveiro" : accountType === "admin" ? "/painel-admin" : "/"} className="flex items-center gap-2">
        <Image
          src="https://media.base44.com/images/public/6a975d266a8000184833026a/9589e6a99_generated_image.png"
          alt="Chaveiro Já"
          fittingType="fit"
          className="w-8 h-8 rounded-lg"
        />
        <span className="font-heading font-bold text-foreground text-sm">Chaveiro Já</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline">{current?.label || ""}</span>
        <button
          onClick={onMenu}
          className="p-2 rounded-lg text-muted-foreground hover:bg-accent"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function MobileDrawer({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative w-72 max-w-[80vw] bg-card border-r border-border flex flex-col animate-slide-in-left">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-heading font-semibold text-foreground">Menu</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <MobileTopBar onMenu={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <aside className="hidden md:flex md:w-64 md:min-h-screen bg-card border-r border-border flex-col sticky top-0 md:h-screen">
        <SidebarContent onNavigate={() => {}} />
      </aside>
      <main className="flex-1 md:h-screen md:overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}