import React from 'react';
import { Input } from '@/components/ui/input';

export default function PricingFieldGroup({ group, values, onChange, disabled }) {
  const generalFipe = group.title === 'Mão de obra sobre a FIPE';
  const fields = <div className="grid gap-4 sm:grid-cols-2">
    {group.fields.map(field => <label key={field.key} className="space-y-1.5 text-sm">
      <span className="block text-muted-foreground">{field.label}</span>
      <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" required step="0.01" min={field.min} max={field.max} value={values[field.key] ?? ''} onChange={e => onChange(field.key, e.target.value)} className="min-h-[44px]" /><span className="shrink-0 text-xs text-muted-foreground">{field.unit}</span></div>
    </label>)}
  </div>;
  if (generalFipe) return <details className="rounded-xl border border-border bg-card p-4 space-y-4">
    <summary className="cursor-pointer font-semibold">Percentuais gerais da FIPE · apenas veículos sem regra individual</summary>
    <p className="py-3 text-xs text-muted-foreground">Esses campos afetam todos os carros sem regra individual. Para alterar somente um modelo ou ano, use as regras por veículo acima.</p>
    <fieldset disabled>{fields}</fieldset>
    <p className="text-xs text-muted-foreground">Valores gerais de referência, somente leitura. Use “Adicionar veículo” acima para definir uma porcentagem exclusiva.</p>
  </details>;
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 text-sm font-semibold">{group.title}</legend>
    {fields}
  </fieldset>;
}