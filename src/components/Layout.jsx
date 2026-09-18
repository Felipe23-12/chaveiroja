import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home as HomeIcon, Clock, LogOut, Briefcase, MapPin, RadioTower, Wallet, Landmark, User, ShieldCheck, Menu, X, Trash2, Camera, CreditCard, Info, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import DarkModeToggle from "@/components/DarkModeToggle";
import GlobalLocksmithRequestAlert from "@/components/locksmith/GlobalLocksmithRequestAlert";
import GlobalChatAlert from "@/components/locksmith/GlobalChatAlert";
import LocksmithChatFab from "@/components/locksmith/LocksmithChatFab";
import ServiceFinishAlert from "@/components/client/ServiceFinishAlert";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import UserPhotoModal from "@/components/profile/UserPhotoModal";
import MobileTabBar from "@/components/MobileTabBar";
import BlockedContactsButton from "@/components/moderation/BlockedContactsButton";
import ReportCaseCenter from "@/components/moderation/ReportCaseCenter";
import { useChatUnread } from "@/lib/chatUnreadStore";
import PageTransition from "@/components/PageTransition";
import ChargeCalculationsLink from "@/components/admin/ChargeCalculationsLink";
import { getEffectiveRole, canAccess } from "@/lib/accessControl";

const ALL_NAV = [
  { label: "Início", path: "/", icon: HomeIcon, roles: ["cliente"] },
  { label: "Mapa", path: "/mapa", icon: MapPin, roles: ["cliente"] },
  { label: "Histórico", path: "/historico", icon: Clock, roles: ["cliente"] },
  { label: "Pagamentos", path: "/pagamentos", icon: CreditCard, roles: ["cliente"] },
  { label: "Painel Chaveiro", path: "/painel-chaveiro", icon: RadioTower, roles: ["chaveiro"] },
  { label: "Financeiro", path: "/painel-financeiro", icon: Wallet, roles: ["chaveiro"] },
  { label: "Modo de Trabalho", path: "/modo-trabalho", icon: Briefcase, roles: ["chaveiro"] },
  { label: "Painel Admin", path: "/painel-admin", icon: ShieldCheck, roles: ["admin"] },
  { label: "Financeiro (Admin)", path: "/painel-financeiro-admin", icon: Landmark, roles: ["admin"] },
];

function SidebarContent({ onNavigate }) {
  const location = useLocation();
  const { user } = useAuth();
  const effectiveRole = getEffectiveRole(user);
  const navItems = ALL_NAV.filter((i) => canAccess(user, i.roles));
  const homePath = effectiveRole === "chaveiro" ? "/painel-chaveiro" : effectiveRole === "admin" ? "/painel-admin" : "/";

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = "/login";
  };

  const roleLabel = effectiveRole === "chaveiro" ? "Chaveiro" : effectiveRole === "admin" ? "Admin" : "Cliente";
  const chatUnread = useChatUnread();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar_url || "");

  return (
    <>
      <div className="p-3 border-b border-border">
        <Link to={homePath} onClick={onNavigate} className="flex items-center gap-2">
          <Image
            src="https://media.base44.com/images/public/6a975d266a8000184833026a/d4717d1d4_ChatGPTImage4desetde202604_02_02.png"
            alt="Chaveiro Já"
            fittingType="fit"
            className="w-8 h-8 rounded-lg"
          />
          <div className="leading-tight">
            <p className="font-heading font-bold text-sm text-foreground">Chaveiro Já</p>
            <p className="text-[10px] text-muted-foreground">Socorro na hora</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-1.5 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`relative flex min-h-[44px] md:min-h-[36px] items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all active:scale-[0.98] ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{item.label}</span>
              {item.path === "/painel-chaveiro" && chatUnread > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              )}
            </Link>
          );
        })}
        <ChargeCalculationsLink onNavigate={onNavigate} />
      </nav>

      <div className="p-2 border-t border-border pb-safe">
        {user && (
          <div className="flex items-center gap-2 px-1.5 py-1 mb-0.5">
            <button
              onClick={() => setPhotoOpen(true)}
              className="w-6 h-6 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center shrink-0"
              title="Alterar foto de perfil"
            >
              {avatar ? (
                <Image src={avatar} alt="Minha foto" className="w-full h-full" />
              ) : (
                <User className="w-3 h-3 text-primary" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{user.full_name || user.email}</p>
              <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
            </div>
            <DarkModeToggle />
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent transition-colors min-h-[36px]"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>
        <Link
          to="/termos-privacidade"
          onClick={onNavigate}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent transition-colors min-h-[36px]"
        >
          <ShieldCheck className="w-3 h-3" />
          Termos e Privacidade
        </Link>
        <Link to="/about" onClick={onNavigate} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent min-h-[36px]">
          <Info className="w-3 h-3" /> Sobre
        </Link>
        <Link to="/contact" onClick={onNavigate} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent min-h-[36px]">
          <Mail className="w-3 h-3" /> Contato
        </Link>
        <button
          onClick={() => setPhotoOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent transition-colors min-h-[36px]"
        >
          <Camera className="w-3 h-3" />
          Foto de perfil
        </button>
        <BlockedContactsButton />
        <button
          onClick={() => setDeleteOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[36px]"
        >
          <Trash2 className="w-3 h-3" />
          Excluir conta
        </button>
      </div>

      <DeleteAccountModal open={deleteOpen} onOpenChange={setDeleteOpen} />
      <UserPhotoModal open={photoOpen} onOpenChange={setPhotoOpen} onSaved={setAvatar} />
    </>
  );
}

function MobileTopBar({ onMenu }) {
  const location = useLocation();
  const { user } = useAuth();
  const effectiveRole = getEffectiveRole(user);
  const navItems = ALL_NAV.filter((i) => canAccess(user, i.roles));
  const current = navItems.find((i) => i.path === location.pathname);
  return (
    <div className="md:hidden sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-border bg-card px-4 pt-safe">
      <Link to={effectiveRole === "chaveiro" ? "/painel-chaveiro" : effectiveRole === "admin" ? "/painel-admin" : "/"} className="flex items-center gap-2">
        <Image
          src="https://media.base44.com/images/public/6a975d266a8000184833026a/d4717d1d4_ChatGPTImage4desetde202604_02_02.png"
          alt="Chaveiro Já"
          fittingType="fit"
          className="w-8 h-8 rounded-lg"
        />
        <span className="font-heading font-bold text-foreground text-sm">Chaveiro Já</span>
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline">{current?.label || ""}</span>
        <DarkModeToggle />
        <button
          onClick={onMenu}
          className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-muted-foreground hover:bg-accent active:bg-accent"
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
      <aside className="relative flex h-[100dvh] w-72 max-w-[80vw] flex-col border-r border-border bg-card pt-safe pb-safe animate-slide-in-left">
        <div className="flex min-h-[56px] items-center justify-between p-4 border-b border-border">
          <span className="font-heading font-semibold text-foreground">Menu</span>
          <button onClick={onClose} className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-muted-foreground hover:bg-accent active:bg-accent" aria-label="Fechar">
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
  const location = useLocation();
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background md:flex-row">
      <GlobalLocksmithRequestAlert />
      <GlobalChatAlert />
      <LocksmithChatFab />
      <ReportCaseCenter />
      <ServiceFinishAlert />
      <MobileTopBar onMenu={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <aside className="hidden md:flex md:w-64 md:min-h-screen bg-card border-r border-border flex-col sticky top-0 md:h-screen">
        <SidebarContent onNavigate={() => {}} />
      </aside>
      <main className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <MobileTabBar />
    </div>
  );
}