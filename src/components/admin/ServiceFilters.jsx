import React, { useState } from "react";
import { Search, Calendar, Filter, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import NativeSelectDrawer from "@/components/ui/NativeSelectDrawer";
import { Button } from "@/components/ui/button";

export const SERVICE_TYPES = [
  "Abertura Residencial",
  "Abertura Automotiva",
  "Abertura Fechadura Tetra",
  "Abertura Fechadura Eletrônica",
  "Confecção de Chave de Carro",
];

export const SERVICE_STATUSES = [
  { value: "pending", label: "Pendentes" },
  { value: "in_progress", label: "Em andamento" },
  { value: "completed", label: "Concluídos" },
  { value: "cancelled", label: "Cancelados" },
];

const STATUS_GROUPS = {
  pending: ["searching", "ringing"],
  in_progress: ["accepted", "on_the_way"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

export function filterRequests(requests, { date, serviceType, status, locksmithName, search }, customerNameMap) {
  const q = (search || "").trim().toLowerCase();
  return requests.filter((r) => {
    if (date) {
      const d = new Date(r.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (key !== date) return false;
    }
    if (serviceType && r.service_type !== serviceType) return false;
    if (status && !STATUS_GROUPS[status]?.includes(r.status)) return false;
    if (locksmithName) {
      const name = (r.locksmith_name || "").toLowerCase();
      if (!name.includes(locksmithName.toLowerCase())) return false;
    }
    if (q) {
      const haystack = [
        r.service_type,
        r.locksmith_name,
        r.address,
        r.description,
        customerNameMap ? customerNameMap[r.created_by_id] : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export default function ServiceFilters({ filters, onChange, onClear }) {
  const hasFilters = filters.date || filters.serviceType || filters.status || filters.locksmithName;
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fields = (
    <>
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
      <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="w-3 h-3" /> Status
        </label>
        <NativeSelectDrawer
          label="Status"
          placeholder="Todos os status"
          value={filters.status || "all"}
          onChange={(v) => onChange({ ...filters, status: v === "all" ? "" : v })}
          options={[
            { value: "all", label: "Todos os status" },
            ...SERVICE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
          ]}
        />
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Filter className="w-3 h-3" /> Tipo de serviço
        </label>
        <NativeSelectDrawer
          label="Tipo de serviço"
          placeholder="Todos os tipos"
          value={filters.serviceType || "all"}
          onChange={(v) => onChange({ ...filters, serviceType: v === "all" ? "" : v })}
          options={[
            { value: "all", label: "Todos os tipos" },
            ...SERVICE_TYPES.map((t) => ({ value: t, label: t })),
          ]}
        />
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
        <Button variant="ghost" size="icon" onClick={onClear} title="Limpar filtros" className="sm:min-h-0 min-h-[44px]">
          <X className="w-4 h-4" />
        </Button>
      )}
    </>
  );

  return (
    <div>
      {/* Botão "Filtros" exclusivo do mobile */}
      <Button
        variant="outline"
        onClick={() => setFiltersOpen((v) => !v)}
        className="sm:hidden w-full min-h-[44px] justify-between"
        aria-expanded={filtersOpen}
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
          {hasFilters && (
            <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-primary" aria-label="Há filtros ativos" />
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
      </Button>

      {/* Container de filtros: no mobile respeita filtersOpen; no desktop sempre visível em linha */}
      <div
        className={`${filtersOpen ? "flex" : "hidden"} sm:flex flex-col sm:flex-row gap-2 items-end flex-wrap mt-2 sm:mt-0`}
      >
        {fields}
      </div>
    </div>
  );
}