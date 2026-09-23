import React from "react";
import { LayoutDashboard, Flag, KeyRound, Users, Wallet, ClipboardList, MessageSquare } from "lucide-react";

const tabs = [
  ["overview", "Visão geral", LayoutDashboard],
  ["reports", "Denúncias", Flag],
  ["catalog", "Catálogo de chaves", KeyRound],
  ["pricing", "Preços e percentuais", Wallet],
  ["areas", "Áreas de atendimento", LayoutDashboard],
  ["people", "Usuários", Users],
  ["finance", "Financeiro", Wallet],
  ["requests", "Chamados", ClipboardList],
  ["feedback", "Sugestões e problemas", MessageSquare],
];

export default function AdminPanelTabs({ value, onChange }) {
  return <div className="sticky top-0 z-30 -mx-4 overflow-x-auto border-y border-border bg-background/95 px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur md:rounded-xl md:border md:top-0">
    <div className="flex min-w-max gap-2">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => onChange(id)} className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${value === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}><Icon className="h-4 w-4" />{label}</button>)}</div>
  </div>;
}