import React from 'react';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VehicleMakeModelFields from '@/components/locksmith/VehicleMakeModelFields';

export default function VehicleFipeRateRow({ rule, index, onChange, onRemove }) {
  return <div className="rounded-xl border border-border bg-background p-4 space-y-3">
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-semibold">Veículo {index + 1}</h4><Button type="button" variant="ghost" size="icon" aria-label={`Remover regra ${index + 1}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <VehicleMakeModelFields vehicleInfo={rule} updateVehicle={(key, value) => onChange({ [key]: value, ...(key === 'make' ? { model: '' } : {}) })} />
      <label className="text-xs text-muted-foreground">Ano do modelo<Input className="mt-1" type="number" min="1900" max="2200" step="1" required placeholder="Ex.: 2020" value={rule.year} onChange={e => onChange({ year: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Mão de obra (% da FIPE)<Input className="mt-1" type="number" min="0" max="10" step="0.01" required placeholder="Ex.: 1,3" value={rule.percent} onChange={e => onChange({ percent: e.target.value })} /></label>
    </div>
  </div>;
}