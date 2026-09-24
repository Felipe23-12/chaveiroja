import React from "react";
import { Navigation, X } from "lucide-react";
import AddressAutocomplete from "@/components/locksmith/AddressAutocomplete";

/**
 * Barra de busca do mapa: permite ao cliente procurar chaveiros por
 * bairro ou rua, recentralizando o mapa no local pesquisado.
 * Sem busca ativa, o mapa segue usando a localização automática (proximidade).
 */
export default function MapLocationSearch({ label, location, onSelect, onClear, onEdit }) {
  return (
    <div className="space-y-1.5">
      <AddressAutocomplete
        value={label}
        onChange={(v) => { if (onEdit) onEdit(v); else if (!v) onClear(); }}
        onSelect={({ address, label: placeLabel, lat, lng }) => onSelect({ address: placeLabel || address, lat, lng })}
                 placeholder="Buscar rua, bairro ou estabelecimento…"
                 includePlaces
                 location={location}
      />
      {label ? (
        <button
          onClick={onClear}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-primary hover:underline active:opacity-70"
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