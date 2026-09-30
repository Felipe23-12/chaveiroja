import React, { useEffect, useState } from 'react';
import { findVehicleKeyCatalog } from '@/lib/vehicleKeyCatalog';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';
import { motoModels, motoServiceBaseRange, motoYearRanges } from '../../../base44/shared/motoPricingRules';

const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
function MotoCatalogReference({ make, model, year }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    let active = true;
    setResult(null);
    if (!make || !model || !year) return () => { active = false; };
    findVehicleKeyCatalog(make, model, year, 'moto').then(row => { if (active) setResult({ row, make, model, year }); }).catch(() => { if (active) setResult({ row: null, make, model, year }); });
    return () => { active = false; };
  }, [make, model, year]);
  if (!make || !model || !year || result?.make !== make || result?.model !== model || result?.year !== year) return null;
  const row = result.row;
  return <p className="text-xs text-muted-foreground">{row ? `Catálogo para ${make} ${model} ${year}: original simples ${Number(row.original_simple_price) > 0 ? money(row.original_simple_price) : money(50)} · original presença ${Number(row.original_proximity_price) > 0 ? money(row.original_proximity_price) : Number(row.original_price) > 0 ? money(row.original_price) : 'sem preço'} · paralela simples ${Number(row.parallel_simple_price) > 0 ? money(row.parallel_simple_price) : money(50)} · presença paralela ${Number(row.parallel_proximity_price) > 0 ? money(row.parallel_proximity_price) : 'sem preço'}.` : `Sem ficha ativa de chave para ${make} ${model} ${year}.`} Os valores das chaves são editados no Catálogo de chaves.</p>;
}

export default function MotoPricingRulesEditor({ rules, disabled, onChange, values }) {
  const [previewKeys, setPreviewKeys] = useState({});
  const patch = (index, change) => onChange(previous => previous.map((item, i) => i === index ? { ...item, ...change } : item));
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 font-heading font-semibold">Ajuste individual por moto e ano-modelo</legend>
    <p className="text-sm text-muted-foreground">Esta porcentagem ajusta somente a faixa base da moto selecionada, antes dos fatores de horário, demanda e urgência. Não é uma porcentagem da FIPE. Para um único ano-modelo, repita o ano nos dois campos; para vários anos, informe uma faixa. Outras motos continuam com a faixa normal.</p>
    {!rules.length && <p className="text-sm text-muted-foreground">Sem regras individuais. A faixa geral continua valendo para todas as motos.</p>}
    {rules.map((rule, index) => {
      const yearRange = motoYearRanges[rule.make]?.[rule.model];
      const percent = Number(rule.percent_adjustment);
      const hasPercent = rule.percent_adjustment !== '' && rule.percent_adjustment != null && Number.isFinite(percent) && percent >= -90 && percent <= 500;
      const selectedYear = Number(rule.year_start);
      const premium = ['PCX 160', 'SH 150 / SH 300', 'NMAX 160', 'XMAX 250'].includes(rule.model);
      const previewKey = !premium ? 'simples' : selectedYear > 2022 && previewKeys[index] !== 'presenca_com_senha' ? 'presenca_sem_senha' : previewKeys[index] || 'simples';
      const selectedRange = rule.model && yearRange && selectedYear >= yearRange[0] && selectedYear <= Math.min(yearRange[1], new Date().getFullYear() + 1)
        ? motoServiceBaseRange({ model: rule.model, year: selectedYear }, previewKey, previewKey === 'presenca_com_senha') : null;
      const previewRange = selectedRange && [Math.max(0, selectedRange[0] + Number(values.base_min) - 200), Math.max(0, selectedRange[1] + Number(values.base_max) - 500)];
      if (previewRange) previewRange[1] = Math.max(previewRange[0], previewRange[1]);
      return <div key={index} className="rounded-xl border border-border bg-background p-4 space-y-3">
        <div className="flex items-center justify-between"><strong>Regra {index + 1}{rule.make && rule.model ? ` · ${rule.make} ${rule.model}` : ''}</strong><Button type="button" variant="ghost" size="icon" aria-label={`Remover regra de moto ${index + 1}`} onClick={() => onChange(previous => previous.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">Montadora<NativeSelectDrawer label="Montadora" className="mt-1" disabled={disabled} value={rule.make || ''} onChange={next => patch(index, { make: next, model: '', year_start: '', year_end: '' })} options={[{ value: '', label: 'Selecione' }, ...Object.keys(motoModels).map(make => ({ value: make, label: make }))]} /></label>
          <label className="text-xs text-muted-foreground">Modelo<NativeSelectDrawer label="Modelo" className="mt-1" disabled={disabled} value={rule.model || ''} onChange={next => patch(index, { model: next, year_start: '', year_end: '' })} options={[{ value: '', label: 'Selecione' }, ...(motoModels[rule.make] || []).filter(model => motoYearRanges[rule.make]?.[model]).map(model => ({ value: model, label: model }))]} /></label>
          <label className="text-xs text-muted-foreground sm:col-span-2">Ano-modelo específico (opcional)<NativeSelectDrawer label="Ano-modelo específico (opcional)" className="mt-1" disabled={disabled} value={rule.year_start !== '' && rule.year_start != null && Number(rule.year_start) === Number(rule.year_end) ? String(rule.year_start) : ''} onChange={next => patch(index, { year_start: next, year_end: next })} options={[{ value: '', label: 'Escolha um ano ou preencha a faixa abaixo' }, ...(yearRange ? Array.from({ length: Math.max(0, Math.min(yearRange[1], new Date().getFullYear() + 1) - yearRange[0] + 1) }, (_, offset) => ({ value: String(yearRange[0] + offset), label: String(yearRange[0] + offset) })) : [])]} /></label>
          <label className="text-xs text-muted-foreground">Ano-modelo inicial<Input className="mt-1" type="number" min={yearRange?.[0] || 1980} max={Math.min(yearRange?.[1] || 2200, new Date().getFullYear() + 1)} value={rule.year_start ?? ''} onChange={e => patch(index, { year_start: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Ano-modelo final<Input className="mt-1" type="number" min={Math.max(Number(rule.year_start) || 1980, yearRange?.[0] || 1980)} max={Math.min(yearRange?.[1] || 2200, new Date().getFullYear() + 1)} value={rule.year_end ?? ''} onChange={e => patch(index, { year_end: e.target.value })} /></label>
          {yearRange && <p className="text-xs text-muted-foreground sm:col-span-2">Anos-modelo observados para este modelo: {yearRange[0]}–{Math.min(yearRange[1], new Date().getFullYear() + 1)}.</p>}
          <label className="text-xs text-muted-foreground">Ajuste da mão de obra (%)<Input className="mt-1" type="number" min="-90" max="500" step="0.01" placeholder="Ex.: 10 ou -5" value={rule.percent_adjustment ?? ''} onChange={e => patch(index, { percent_adjustment: e.target.value })} /></label>
          {selectedRange && <label className="text-xs text-muted-foreground">Tipo de chave para a prévia<NativeSelectDrawer label="Tipo de chave para a prévia" className="mt-1" disabled={disabled} value={previewKey} onChange={next => setPreviewKeys(previous => ({ ...previous, [index]: next }))} options={[...(!premium || selectedYear <= 2022 ? [{ value: 'simples', label: 'Simples' }] : []), ...(premium ? [{ value: 'presenca_com_senha', label: 'Presença com senha' }, { value: 'presenca_sem_senha', label: 'Presença sem senha' }] : [])]} /></label>}
          {hasPercent && previewRange && <div className="text-xs text-muted-foreground sm:self-end">Faixa para {rule.make} {rule.model} {selectedYear}: {money(previewRange[0])}–{money(previewRange[1])} → após este ajuste {money(previewRange[0] * (1 + percent / 100))}–{money(previewRange[1] * (1 + percent / 100))}. Horário, demanda, urgência, chuva e catálogo de chaves são calculados separadamente.</div>}
        </div>
        <MotoCatalogReference make={rule.make} model={rule.model} year={rule.year_start} />
      </div>;
    })}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled || rules.length >= 1000} onClick={() => onChange(previous => [...previous, { make: '', model: '', year_start: '', year_end: '', percent_adjustment: '' }])}><Plus className="h-4 w-4" />Adicionar moto ou faixa</Button><Button type="submit" disabled={disabled}>Salvar regras de moto</Button></div>
    <p className="text-xs text-muted-foreground">Faixas do mesmo modelo não podem se sobrepor. Chave simples usa R$ 50 quando não houver valor manual para o tipo escolhido. Preços editados nas fichas do Catálogo de chaves por moto e ano-modelo têm prioridade.</p>
  </fieldset>;
}