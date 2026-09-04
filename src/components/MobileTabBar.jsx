import React, { useEffect, useRef } from "react";
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

// Cache de posição de rolagem por caminho — persiste entre trocas de aba
// (sobrevive a remontagens pois vive no escopo do módulo) para que o usuário
// não perca seu lugar ao voltar para uma aba visitada anteriormente.
const scrollCache = {};

// A aba está ativa também quando o usuário está numa sub-rota dela
// (ex: /chat/123 pertence à aba Início do cliente).
const TAB_SUBROUTES = {
  "/": ["/chat", "/chaveiro", "/acompanhamento"],
};

function isTabActive(tabPath, currentPath) {
  if (currentPath === tabPath) return true;
  return (TAB_SUBROUTES[tabPath] || []).some(
    (p) => currentPath === p || currentPath.startsWith(`${p}/`)
  );
}

export default function MobileTabBar() {
  const location = useLocation();
  const { user } = useAuth();
  const accountType =
    user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const tabs = TABS_BY_ROLE[accountType] || TABS_BY_ROLE.cliente;
  const currentPath = location.pathname;
  const lastPath = useRef(currentPath);
  const chatUnread = useChatUnread();

  // Ao trocar de rota: salva a rolagem da rota anterior e restaura a da nova.
  // O rAF cobre a renderização inicial; o timeout curto cobre conteúdo
  // carregado de forma assíncrona (listas, mapas).
  useEffect(() => {
    if (lastPath.current === currentPath) return;
    scrollCache[lastPath.current] = window.scrollY;
    lastPath.current = currentPath;
    const saved = scrollCache[currentPath];
    if (saved == null) return;
    const raf = requestAnimationFrame(() => window.scrollTo(0, saved));
    const t = setTimeout(() => window.scrollTo(0, saved), 220);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [currentPath]);

  const handleTabClick = (path) => {
    // Já na aba (rota raiz): apenas volta ao topo, como num app nativo.
    if (path === currentPath) {
      scrollCache[path] = 0;
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Aba ativa numa sub-rota (ex: /chat/123): volta à raiz da aba
    // descartando a rolagem antiga da sub-rota.
    if (isTabActive(path, currentPath)) {
      delete scrollCache[currentPath];
      scrollCache[path] = 0;
      return;
    }
    // Salva a rolagem atual antes de navegar para a nova aba.
    scrollCache[currentPath] = window.scrollY;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border pb-safe">
      <div className="flex">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = isTabActive(t.path, currentPath);
          return (
            <Link
              key={t.path}
              to={t.path}
              onClick={() => handleTabClick(t.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 min-h-[44px] text-[11px] font-heading font-semibold transition-colors select-none touch-manipulation ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="w-3.5 h-3.5" />
                {t.path === "/painel-chaveiro" && chatUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
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