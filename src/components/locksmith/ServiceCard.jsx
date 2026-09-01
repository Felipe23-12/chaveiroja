import React from "react";
import { Home, Car, KeyRound, Fingerprint } from "lucide-react";

const iconMap = {
  abertura_residencial: Home,
  abertura_automotiva: Car,
  abertura_tetra: KeyRound,
  abertura_eletronica: Fingerprint,
};

const colorMap = {
  abertura_residencial: { color: "text-blue-600", bg: "bg-blue-50" },
  abertura_automotiva: { color: "text-amber-600", bg: "bg-amber-50" },
  abertura_tetra: { color: "text-violet-600", bg: "bg-violet-50" },
  abertura_eletronica: { color: "text-teal-600", bg: "bg-teal-50" },
};

export default function ServiceCard({ service, selected, onClick }) {
  const Icon = iconMap[service.id];
  const c = colorMap[service.id];
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
      <p className="font-heading font-semibold text-foreground">{service.label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
      <p className="text-xs font-medium text-foreground mt-2">
        a partir de R$ {service.baseRange[0]}
      </p>
    </button>
  );
}