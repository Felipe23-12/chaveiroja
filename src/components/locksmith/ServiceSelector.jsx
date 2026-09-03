import React, { useState, useEffect } from "react";
import { Check, Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG } from "@/lib/pricing";

// Mapeamento de ícones e cores por serviço
const SERVICE_STYLES = {
  abertura_residencial: { color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  abertura_automotiva: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  abertura_tetra: { color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  abertura_eletronica: { color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  confeccao_chave_carro: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

export default function ServiceSelector({ locksmith, onUpdate }) {
  const [selected, setSelected] = useState(locksmith?.services || []);
  const [saving, setSaving] = useState(false);

  // Sincroniza estado local quando o perfil externo muda
  useEffect(() => {
    setSelected(locksmith?.services || []);
  }, [locksmith?.id, locksmith?.services?.length]);

  const toggle = (serviceId) => {
    setSelected((prev) =>
      prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ services: selected });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...selected].sort()) !== JSON.stringify([...(locksmith?.services || [])].sort());

  return (
    <div className="rounded-2xl border border-border bg-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary" />
        <div>
          <h3 className="font-heading font-semibold text-base text-foreground">Serviços que você atende</h3>
          <p className="text-xs text-muted-foreground">
            Selecione apenas os serviços que você realiza. Você só receberá solicitações destes tipos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {SERVICE_CATALOG.map((s) => {
          const isSelected = selected.includes(s.id);
          const style = SERVICE_STYLES[s.id] || {};
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? `${style.border || "border-primary"} ${style.bg || "bg-primary/5"}`
                  : "border-border bg-white hover:border-primary/30"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-primary border-primary" : "border-border"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{s.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg">
          Você não selecionou nenhum serviço. Em branco, você atende todos os serviços por padrão.
        </p>
      )}

      <Button onClick={handleSave} disabled={saving || !hasChanges} className="w-full">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
        {hasChanges ? "Salvar serviços" : "Serviços salvos"}
      </Button>
    </div>
  );
}