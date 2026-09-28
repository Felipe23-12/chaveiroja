import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import VehicleMakeModelFields from '@/components/locksmith/VehicleMakeModelFields';
import { getVehicleYearRange } from '../../../base44/shared/vehicleModelYears';
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const empty = () => ({ make: '', model: '', version: '', year_start: '', year_end: '', base_price: '', lishi_percent: '' });
export default function VehicleOpeningRulesEditor({ rules, savedRules, values, savedVersion, disabled, onChange }) {
  const [active, setActive] = useState(null);
  useEffect(() => { setActive(null); }, [savedVersion]);
  const rule = active == null ? null : rules[active];
  const range = rule && getVehicleYearRange(rule.make, rule.model);
  const percent = rule?.lishi_percent === '' || rule?.lishi_percent == null ? Number(values.lishi_percent ?? 40) : Number(rule.lishi_percent);
  const patch = update => onChange(prev => {
    const current = prev[active];
    const identityChanged = ('make' in update && update.make !== current.make) || ('model' in update && update.model !== current.model);
    const reset = identityChanged ? { year_start: '', year_end: '', version: '', base_price: '', lishi_percent: '', ...('make' in update ? { model: '' } : {}) } : {};
    const next = prev.map((item, i) => i === active ? { ...item, ...reset, ...update } : item);
    if (identityChanged) {
      const originals = savedRules.filter(item => item.make === current.make && item.model === current.model);
      for (const original of originals) if (!next.some(item => item.make === original.make && item.model === original.model && item.version === original.version && Number(item.year_start) === original.year_start && Number(item.year_end) === original.year_end)) next.push(original);
    }
    return next;
  });
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 font-semibold">Abertura por veículo</legend>
    <p className="text-sm text-muted-foreground">Defina o valor base da abertura simples e o adicional Lishi para um carro e ano-modelo, ou uma faixa de anos. Campos de preço em branco seguem a tabela geral. Os carros sem regra individual mantêm o cálculo atual.</p>
    <p className="text-xs text-muted-foreground">Horário, chuva, deslocamento, condição da fechadura, ano do veículo, urgência e demais regras continuam valendo. A Lishi é aplicada uma única vez sobre o total final, após esses ajustes e eventual desconto. Ao trocar montadora/modelo, os valores são limpos e a regra anteriormente salva é preservada.</p>
    {rules.map((item, index) => index === active ? null : <div key={index} className="flex items-center justify-between gap-2 border rounded-lg p-3 text-sm"><span>{item.make || 'Nova montadora'} {item.model || 'Novo modelo'} {item.version || ''} · {item.year_start || '—'}–{item.year_end || '—'} · Base: {item.base_price === '' || item.base_price == null ? 'tabela geral' : money(item.base_price)} · Lishi: {item.lishi_percent === '' || item.lishi_percent == null ? 'padrão geral' : `${item.lishi_percent}%`}</span><Button type="button" variant="outline" onClick={() => setActive(index)}>Editar</Button></div>)}
    {rule && <div className="space-y-3 border rounded-xl p-3">
      <VehicleMakeModelFields vehicleInfo={rule} updateVehicle={(key, value) => patch({ [key]: value })} />
      <label className="block text-sm">Versão/geração (opcional)<Input value={rule.version || ''} maxLength={80} placeholder="Em branco: todas as versões" onChange={e => patch({ version: e.target.value })} /></label>
      <p className="text-xs text-muted-foreground">Uma regra com versão tem prioridade quando o cliente informa a mesma versão. Uma regra sem versão atende as demais versões do modelo.</p>
      <div className="grid gap-3 sm:grid-cols-2">{[['year_start', 'Ano-modelo inicial'], ['year_end', 'Ano-modelo final']].map(([key, label]) => <label key={key} className="text-sm">{label}<Input type="number" min={range?.min} max={Math.min(range?.max || 2200, new Date().getFullYear() + 1)} value={rule[key] ?? ''} onChange={e => patch({ [key]: e.target.value })} /></label>)}</div>
      <p className="text-xs text-muted-foreground">{range?.min ? `Anos permitidos: ${range.min} a ${Math.min(range.max, new Date().getFullYear() + 1)}. Repita o ano nos dois campos para editar somente um ano.` : 'Escolha um modelo com faixa de anos confirmada.'}</p>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Base da abertura simples (R$)<Input type="number" min="0" max="100000" step="0.01" value={rule.base_price ?? ''} placeholder="Usar regras antigas" onChange={e => patch({ base_price: e.target.value })} /></label>
      <label className="text-sm">Adicional Lishi deste veículo (%)<Input type="number" min="0" max="500" step="0.01" value={rule.lishi_percent ?? ''} placeholder={`Usar padrão: ${values.lishi_percent ?? 40}%`} onChange={e => patch({ lishi_percent: e.target.value })} /></label></div>
      {rule.base_price !== '' && rule.base_price != null && <p className="rounded-lg bg-muted p-3 text-sm">Prévia sem outros ajustes: simples {money(rule.base_price)} · Lishi {money(Number(rule.base_price) * (1 + percent / 100))} (+{percent}%). O total real inclui as regras do atendimento.</p>}
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { onChange(prev => prev.filter((_, i) => i !== active)); setActive(null); }}>Remover regra e voltar à tabela geral</Button><Button type="submit">Salvar tabela</Button></div>
    </div>}
    <Button type="button" variant="outline" disabled={disabled || rules.length >= 1000} onClick={() => { onChange(prev => [...prev, empty()]); setActive(rules.length); }}>Adicionar veículo</Button>
    <p className="text-xs text-muted-foreground">As alterações entram em vigor ao salvar. O formulário é recolhido após o salvamento; use Editar para reabrir.</p>
  </fieldset>;
}
