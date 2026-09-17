import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function VehicleKeyCatalogSearch({ value, onChange, count }) {
  return (
    <div className="space-y-2">
      <label htmlFor="vehicle-key-catalog-search" className="block text-sm font-medium">Pesquisar por montadora ou modelo</label>
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="vehicle-key-catalog-search" type="search" placeholder="Ex.: Renault, Sandero ou Toyota Corolla" value={value} onChange={(event) => onChange(event.target.value)} className="min-h-[44px] pl-10 pr-12 [&::-webkit-search-cancel-button]:hidden" />
        {value && <Button type="button" variant="ghost" size="icon" aria-label="Limpar pesquisa" onClick={() => onChange("")} className="absolute right-0 top-0 min-h-[44px] min-w-[44px]"><X className="h-4 w-4" /></Button>}
      </div>
      {value.trim() && <p role="status" className="text-xs text-muted-foreground">{count === 0 ? "Nenhum modelo ou montadora encontrado. Tente outro nome." : `${count} ${count === 1 ? "ficha encontrada" : "fichas encontradas"}`}</p>}
    </div>
  );
}