import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Home as HomeIcon, Clock, LogOut, Briefcase, MapPin, RadioTower, Wallet, User, ShieldCheck, Menu, X, Trash2, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Image } from "@/components/ui/image";
import DarkModeToggle from "@/components/DarkModeToggle";
import GlobalLocksmithRequestAlert from "@/components/locksmith/GlobalLocksmithRequestAlert";
import GlobalChatAlert from "@/components/locksmith/GlobalChatAlert";
import ServiceFinishAlert from "@/components/client/ServiceFinishAlert";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import UserPhotoModal from "@/components/profile/UserPhotoModal";
import MobileTabBar from "@/components/MobileTabBar";
import { useChatUnread } from "@/lib/chatUnreadStore";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";

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
  const chatUnread = useChatUnread();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar_url || "");

  return (
    <>
      <div className="p-3 border-b border-border">
        <Link to={homePath} onClick={onNavigate} className="flex items-center gap-2">
          <Image
            src="https://media.base44.com/images/public/6a975d266a8000184833026a/dd1b4ee70_ChatGPTImage3desetde202614_01_55.png"
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
              className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
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
        <button
          onClick={() => setPhotoOpen(true)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent transition-colors min-h-[36px]"
        >
          <Camera className="w-3 h-3" />
          Foto de perfil
        </button>
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
  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const navItems = ALL_NAV.filter((i) => accountType === "admin" || i.roles.includes(accountType));
  const current = navItems.find((i) => i.path === location.pathname);
  return (
    <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-card border-b border-border pt-safe">
      <Link to={accountType === "chaveiro" ? "/painel-chaveiro" : accountType === "admin" ? "/painel-admin" : "/"} className="flex items-center gap-2">
        <Image
          src="https://media.base44.com/images/public/6a975d266a8000184833026a/dd1b4ee70_ChatGPTImage3desetde202614_01_55.png"
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
  const location = useLocation();
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <GlobalLocksmithRequestAlert />
      <GlobalChatAlert />
      <ServiceFinishAlert />
      <MobileTopBar onMenu={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <aside className="hidden md:flex md:w-64 md:min-h-screen bg-card border-r border-border flex-col sticky top-0 md:h-screen">
        <SidebarContent onNavigate={() => {}} />
      </aside>
      <main className="flex-1 md:h-screen md:overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <MobileTabBar />
    </div>
  );
}