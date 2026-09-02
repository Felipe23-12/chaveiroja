import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ServiceSearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Buscar por cliente, chaveiro ou tipo de serviço"}
        className="pl-10 pr-10 h-11 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}