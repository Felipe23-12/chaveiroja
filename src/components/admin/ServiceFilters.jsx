import React from "react";
import { Search, Calendar, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const SERVICE_TYPES = [
  "Abertura Residencial",
  "Abertura Automotiva",
  "Abertura Fechadura Tetra",
  "Abertura Fechadura Eletrônica",
  "Confecção de Chave de Carro",
];

export function filterRequests(requests, { date, serviceType, locksmithName }) {
  return requests.filter((r) => {
    if (date) {
      const d = new Date(r.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (key !== date) return false;
    }
    if (serviceType && r.service_type !== serviceType) return false;
    if (locksmithName) {
      const name = (r.locksmith_name || "").toLowerCase();
      if (!name.includes(locksmithName.toLowerCase())) return false;
    }
    return true;
  });
}

export default function ServiceFilters({ filters, onChange, onClear }) {
  const hasFilters = filters.date || filters.serviceType || filters.locksmithName;
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-end">
      <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Data
        </label>
        <Input
          type="date"
          value={filters.date || ""}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="w-3 h-3" /> Tipo de serviço
        </label>
        <Select
          value={filters.serviceType || "all"}
          onValueChange={(v) => onChange({ ...filters, serviceType: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {SERVICE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Search className="w-3 h-3" /> Chaveiro
        </label>
        <Input
          placeholder="Nome do chaveiro"
          value={filters.locksmithName || ""}
          onChange={(e) => onChange({ ...filters, locksmithName: e.target.value })}
        />
      </div>
      {hasFilters && (
        <Button variant="ghost" size="icon" onClick={onClear} title="Limpar filtros">
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}