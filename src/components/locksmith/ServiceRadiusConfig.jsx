import React, { useState, useEffect } from "react";
import { Radar, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NativeSelectDrawer from "@/components/ui/NativeSelectDrawer";

export const DEFAULT_SERVICE_RADIUS_KM = 15;

const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 20, 30, 40, 50].map((km) => ({
  value: String(km),
  label: `${km} km`,
}));

/**
 * Raio de atendimento do chaveiro. A alteração só passa a valer após
 * salvar — e fica guardada no perfil, mesmo saindo e voltando ao app.
 */
export default function ServiceRadiusConfig({ locksmith, onSave, saving }) {
  const saved = locksmith?.service_radius_km || DEFAULT_SERVICE_RADIUS_KM;
  const [radius, setRadius] = useState(saved);

  useEffect(() => {
    setRadius(saved);
  }, [saved]);

  const dirty = Number(radius) !== Number(saved);

  return (
    <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Radar className="w-4 h-4 text-primary" />
        <div>
          <p className="font-medium text-foreground">Raio de atendimento</p>
          <p className="text-xs text-muted-foreground">
            Você só recebe chamados de clientes dentro desta distância.
          </p>
        </div>
      </div>

      <NativeSelectDrawer
        label="Raio de atendimento"
        value={String(radius)}
        onChange={(v) => setRadius(Number(v))}
        options={RADIUS_OPTIONS}
      />

      {dirty ? (
        <Button onClick={() => onSave(Number(radius))} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
          Salvar raio de {radius} km
        </Button>
      ) : (
        <p className="text-xs text-success font-medium flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Raio salvo: {saved} km
        </p>
      )}
    </div>
  );
}