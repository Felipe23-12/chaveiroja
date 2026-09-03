import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  Clock,
  MapPin,
  RadioTower,
  Wallet,
  Briefcase,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// Abas fixas na parte inferior, visíveis apenas no mobile (< 768px).
// As abas se adaptam ao tipo de conta do usuário.
const TABS_BY_ROLE = {
  cliente: [
    { label: "Início", path: "/", icon: HomeIcon },
    { label: "Mapa", path: "/mapa", icon: MapPin },
    { label: "Histórico", path: "/historico", icon: Clock },
  ],
  chaveiro: [
    { label: "Início", path: "/painel-chaveiro", icon: RadioTower },
    { label: "Financeiro", path: "/painel-financeiro", icon: Wallet },
    { label: "Perfil", path: "/modo-trabalho", icon: Briefcase },
  ],
  admin: [
    { label: "Início", path: "/painel-admin", icon: ShieldCheck },
    { label: "Financeiro", path: "/painel-financeiro-admin", icon: Wallet },
  ],
};

export default function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuth();
  const accountType =
    user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const tabs = TABS_BY_ROLE[accountType] || TABS_BY_ROLE.cliente;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
      <div className="flex">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = location.pathname === t.path;
          return (
            <Link
              key={t.path}
              to={t.path}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[11px] font-medium transition-colors select-none touch-manipulation ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}