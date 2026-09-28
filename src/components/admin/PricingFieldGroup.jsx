import React from 'react';
import { NEIGHBORHOOD_TIERS } from '../../../base44/shared/neighborhoodPricing';
import { Input } from '@/components/ui/input';

export default function PricingFieldGroup({ group, values, onChange, disabled }) {
  const generalFipe = group.title === 'Mão de obra sobre a FIPE';
  const fields = <div className="grid gap-4 sm:grid-cols-2">
    {group.fields.filter(field => !['simple_fixed', 'opening_medium', 'opening_high'].includes(field.key)).map(field => <label key={field.key} className="space-y-1.5 text-sm">
      <span className="block text-muted-foreground">{field.label}</span>
      <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" required disabled={disabled} step="0.01" min={field.min} max={field.max} value={values[field.key] ?? ''} onChange={e => onChange(field.key, e.target.value)} className="min-h-[44px]" /><span className="shrink-0 text-xs text-muted-foreground">{field.unit}</span></div>
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
    {group.title === 'Cobrança por bairro' && <div className="space-y-2 text-xs text-muted-foreground"><p>Aplica-se à mão de obra, por serviço. Valor negativo reduz; 0% mantém. Bairro não identificado não altera o preço. Lista existente de São Paulo e entorno, identificada pelo nome completo no endereço.</p>{Object.entries(NEIGHBORHOOD_TIERS).map(([key, item]) => <details key={key}><summary className="cursor-pointer">{item.label}: bairros cadastrados</summary><p>{[...new Set(item.neighborhoods)].join(', ')}</p></details>)}</div>}
  </fieldset>;
}