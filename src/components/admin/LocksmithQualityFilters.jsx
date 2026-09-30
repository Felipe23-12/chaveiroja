import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SCORE_LOW } from "@/lib/locksmithScore";
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';

export default function LocksmithQualityFilters({ search, mode, onSearch, onMode, count, total }) {
  return <div className="mb-3 space-y-2">
    <div className="flex flex-col sm:flex-row gap-2">
      <Input aria-label="Buscar chaveiro pelo nome" placeholder="Buscar chaveiro pelo nome..." value={search} onChange={(event) => onSearch(event.target.value)} className="sm:flex-1" />
      <NativeSelectDrawer label="Filtrar qualidade dos chaveiros" value={mode} onChange={onMode} className="sm:max-w-xs" options={[
        { value: 'all', label: 'Todos os chaveiros' },
        { value: 'lowest', label: 'Menor pontuação primeiro' },
        { value: 'low', label: `Pontuação baixa (até ${SCORE_LOW} pontos)` },
        { value: 'suspended', label: 'Suspensão ativa' },
      ]} />
      {(search || mode !== "all") && <Button variant="outline" onClick={() => { onSearch(""); onMode("all"); }}>Limpar filtros</Button>}
    </div>
    <p className="text-xs text-muted-foreground" role="status">{count} de {total} chaveiros · Pontuação profissional de 0 a 10</p>
  </div>;
}