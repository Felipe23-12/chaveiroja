import React from "react";
import { Navigation, X } from "lucide-react";
import AddressAutocomplete from "@/components/locksmith/AddressAutocomplete";

/**
 * Barra de busca do mapa: permite ao cliente procurar chaveiros por
 * bairro ou rua, recentralizando o mapa no local pesquisado.
 * Sem busca ativa, o mapa segue usando a localização automática (proximidade).
 */
export default function MapLocationSearch({ label, onSelect, onClear }) {
  return (
    <div className="space-y-1.5">
      <AddressAutocomplete
        value={label}
        onChange={(v) => { if (!v) onClear(); }}
        onSelect={({ address, lat, lng }) => onSelect({ address, lat, lng })}
        placeholder="Buscar por bairro ou rua…"
      />
      {label ? (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <X className="w-3.5 h-3.5" /> Voltar para chaveiros perto de mim
        </button>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Navigation className="w-3.5 h-3.5" /> Mostrando chaveiros perto da sua localização atual
        </p>
      )}
    </div>
  );
}