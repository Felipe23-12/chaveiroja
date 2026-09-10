import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SCORE_LOW } from "@/lib/locksmithScore";

export default function LocksmithQualityFilters({ search, mode, onSearch, onMode, count, total }) {
  return <div className="mb-3 space-y-2">
    <div className="flex flex-col sm:flex-row gap-2">
      <Input aria-label="Buscar chaveiro pelo nome" placeholder="Buscar chaveiro pelo nome..." value={search} onChange={(event) => onSearch(event.target.value)} className="sm:flex-1" />
      <select aria-label="Filtrar qualidade dos chaveiros" value={mode} onChange={(event) => onMode(event.target.value)} className="min-h-11 rounded-md border border-input bg-background text-foreground px-3 text-sm sm:max-w-xs">
        <option value="all">Todos os chaveiros</option>
        <option value="lowest">Menor pontuação primeiro</option>
        <option value="low">Pontuação baixa (até {SCORE_LOW} pontos)</option>
        <option value="suspended">Suspensão ativa</option>
      </select>
      {(search || mode !== "all") && <Button variant="outline" onClick={() => { onSearch(""); onMode("all"); }}>Limpar filtros</Button>}
    </div>
    <p className="text-xs text-muted-foreground" role="status">{count} de {total} chaveiros · Pontuação profissional de 0 a 10</p>
  </div>;
}