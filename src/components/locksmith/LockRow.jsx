import React from "react";
import { Trash2 } from "lucide-react";
import NativeSelectDrawer from "@/components/ui/NativeSelectDrawer";
import { LOCK_MODELS, getLockModel } from "@/lib/locks";

/**
 * Uma fechadura da solicitação: modelo + necessidade de troca de miolo.
 */
export default function LockRow({ lock, index, onChange, onRemove, canRemove }) {
  const model = getLockModel(lock.model);

  return (
    <div className="rounded-xl border border-border bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Fechadura {index + 1}</span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10"
            aria-label="Remover fechadura"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <NativeSelectDrawer
        label="Modelo da fechadura"
        value={lock.model}
        onChange={(v) => onChange({ ...lock, model: v })}
        options={LOCK_MODELS.map((m) => ({ value: m.id, label: m.label }))}
        placeholder="Escolha o modelo"
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={!!lock.miolo}
          onChange={(e) => onChange({ ...lock, miolo: e.target.checked })}
          className="w-4 h-4 accent-primary"
        />
        <span className="text-sm text-foreground flex-1">Trocar o miolo desta fechadura</span>
        <span className="text-xs text-muted-foreground">Conforme tabela vigente</span>
      </label>

      {index > 0 && <p className="text-xs text-muted-foreground">Abertura adicional incluída na cotação conforme a tabela vigente.</p>}
      {model.custom && (
        <p className="text-xs text-warning">
          O chaveiro avalia este modelo no local e informa o valor antes de iniciar.
        </p>
      )}
    </div>
  );
}