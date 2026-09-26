import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motoModels } from '../../../base44/shared/motoPricingRules';

const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function MotoPricingRulesEditor({ rules, disabled, onChange, values }) {
  const patch = (index, change) => onChange(previous => previous.map((item, i) => i === index ? { ...item, ...change } : item));
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 font-heading font-semibold">Ajuste individual por moto e ano-modelo</legend>
    <p className="text-sm text-muted-foreground">Esta porcentagem ajusta somente a faixa base da moto selecionada, antes dos fatores de horário, demanda e urgência. Não é uma porcentagem da FIPE. Para um único ano-modelo, repita o ano nos dois campos; para vários anos, informe uma faixa. Outras motos continuam com a faixa normal.</p>
    {!rules.length && <p className="text-sm text-muted-foreground">Sem regras individuais. A faixa geral continua valendo para todas as motos.</p>}
    {rules.map((rule, index) => {
      const percent = Number(rule.percent_adjustment);
      const hasPercent = rule.percent_adjustment !== '' && rule.percent_adjustment != null && Number.isFinite(percent) && percent >= -90 && percent <= 500;
      return <div key={index} className="rounded-xl border border-border bg-background p-4 space-y-3">
        <div className="flex items-center justify-between"><strong>Regra {index + 1}{rule.make && rule.model ? ` · ${rule.make} ${rule.model}` : ''}</strong><Button type="button" variant="ghost" size="icon" aria-label={`Remover regra de moto ${index + 1}`} onClick={() => onChange(previous => previous.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Montadora<select className="mt-1 w-full min-h-[40px] rounded-md border border-input bg-background px-3" value={rule.make || ''} onChange={e => patch(index, { make: e.target.value, model: '' })}><option value="">Selecione</option>{Object.keys(motoModels).map(make => <option key={make}>{make}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Modelo<select className="mt-1 w-full min-h-[40px] rounded-md border border-input bg-background px-3" value={rule.model || ''} onChange={e => patch(index, { model: e.target.value })}><option value="">Selecione</option>{(motoModels[rule.make] || []).map(model => <option key={model}>{model}</option>)}</select></label>
          <label className="text-xs text-muted-foreground">Ano-modelo inicial<Input className="mt-1" type="number" min="1980" max={new Date().getFullYear() + 1} value={rule.year_start ?? ''} onChange={e => patch(index, { year_start: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Ano-modelo final<Input className="mt-1" type="number" min={Number(rule.year_start) || 1980} max={new Date().getFullYear() + 1} value={rule.year_end ?? ''} onChange={e => patch(index, { year_end: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Ajuste da mão de obra (%)<Input className="mt-1" type="number" min="-90" max="500" step="0.01" placeholder="Ex.: 10 ou -5" value={rule.percent_adjustment ?? ''} onChange={e => patch(index, { percent_adjustment: e.target.value })} /></label>
          {hasPercent && <div className="text-xs text-muted-foreground sm:self-end">Faixa base geral {money(values.base_min)}–{money(values.base_max)} → com este ajuste {money(values.base_min * (1 + percent / 100))}–{money(values.base_max * (1 + percent / 100))}. O cálculo do chamado ainda aplica horário, oferta, clima e catálogo de chaves.</div>}
        </div>
      </div>;
    })}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled || rules.length >= 1000} onClick={() => onChange(previous => [...previous, { make: '', model: '', year_start: '', year_end: '', percent_adjustment: '' }])}><Plus className="h-4 w-4" />Adicionar moto ou faixa</Button><Button type="submit" disabled={disabled}>Salvar regras de moto</Button></div>
    <p className="text-xs text-muted-foreground">Faixas do mesmo modelo não podem se sobrepor. Preços de chaves continuam vinculados às fichas do Catálogo de chaves por moto e ano-modelo.</p>
  </fieldset>;
}
