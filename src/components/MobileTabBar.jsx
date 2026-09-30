import React from "react";
import useMobileTabNavigation, { isTabActive } from '@/hooks/useMobileTabNavigation';
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
import { useChatUnread } from "@/lib/chatUnreadStore";

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
  const currentPath = location.pathname;
  const chatUnread = useChatUnread();
  const { destination, onClick } = useMobileTabNavigation(location, tabs, `${user?.id || 'anonymous'}:${accountType}`);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
      <div className="flex">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = isTabActive(t.path, currentPath);
          return (
            <Link
              key={t.path}
              to={destination(t.path)}
              onClick={(event) => onClick(event, t.path)}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-heading font-semibold transition-all active:bg-accent active:scale-[0.98] select-none touch-manipulation ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {t.path === "/painel-chaveiro" && chatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {chatUnread > 9 ? "9+" : chatUnread}
                  </span>
                )}
              </div>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}