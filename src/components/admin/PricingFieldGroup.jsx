import React from 'react';
import { Input } from '@/components/ui/input';

export default function PricingFieldGroup({ group, values, onChange, disabled }) {
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 text-sm font-semibold">{group.title}</legend>
    <div className="grid gap-4 sm:grid-cols-2">
      {group.fields.map(field => <label key={field.key} className="space-y-1.5 text-sm">
        <span className="block text-muted-foreground">{field.label}</span>
        <div className="flex items-center gap-2"><Input type="number" inputMode="decimal" required step="0.01" min={field.min} max={field.max} value={values[field.key] ?? ''} onChange={e => onChange(field.key, e.target.value)} className="min-h-[44px]" /><span className="shrink-0 text-xs text-muted-foreground">{field.unit}</span></div>
      </label>)}
    </div>
  </fieldset>;
}