import React from "react";
import { Smartphone, MapPin } from "lucide-react";

const OPTIONS = [
  {
    id: "app",
    icon: Smartphone,
    title: "Modo Aplicativo",
    desc: "Solicite um serviço, veja o preço calculado e acompanhe o chaveiro em tempo real",
  },
  {
    id: "livre",
    icon: MapPin,
    title: "Modo Livre",
    desc: "Encontre chaveiros online no mapa e converse direto com o profissional para combinar o serviço",
  },
];

export default function ModuleSelector({ module, setModule }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = module === o.id;
        return (
          <button
            key={o.id}
            onClick={() => setModule(o.id)}
            className={`text-left p-4 rounded-2xl border-2 transition-all ${
              active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-heading font-semibold text-foreground">{o.title}</p>
            </div>
            <p className="text-xs text-muted-foreground">{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}