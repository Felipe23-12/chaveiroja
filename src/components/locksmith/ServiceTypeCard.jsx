import React from "react";
import { Home, Car, Building, AlertTriangle } from "lucide-react";

const config = {
  Residencial: { icon: Home, color: "text-blue-600", bg: "bg-blue-50", desc: "Casas, apartamentos e fechaduras" },
  Automotivo: { icon: Car, color: "text-amber-600", bg: "bg-amber-50", desc: "Carros, motos e veículos" },
  Comercial: { icon: Building, color: "text-violet-600", bg: "bg-violet-50", desc: "Lojas, escritórios e empresas" },
  Emergencial: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", desc: "Situação urgente 24h" },
};

export default function ServiceTypeCard({ type, selected, onClick }) {
  const c = config[type];
  const Icon = c.icon;
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-2xl border-2 transition-all ${
        selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
      }`}
    >
      <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${c.color}`} />
      </div>
      <p className="font-heading font-semibold text-foreground">{type}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
    </button>
  );
}