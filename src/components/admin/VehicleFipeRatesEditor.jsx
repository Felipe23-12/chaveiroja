import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VehicleFipeRateRow from '@/components/admin/VehicleFipeRateRow';

export default function VehicleFipeRatesEditor({ rules, savedRules = [], values, savedVersion, disabled, onChange }) {
  const [activeIndex, setActiveIndex] = useState(null);
  useEffect(() => { setActiveIndex(null); }, [savedVersion]);
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 font-heading font-semibold">FIPE por montadora, modelo e ano</legend>
    <p className="text-sm text-muted-foreground">Para configurar um único ano-modelo, repita o ano nos campos inicial e final. Para vários anos consecutivos com a mesma porcentagem, informe o primeiro e o último ano. Você pode editar a montadora e o modelo. Ao trocar um veículo já salvo, a regra anterior é preservada e uma nova regra é iniciada para o veículo escolhido. Preencha ano-modelo e porcentagem antes de salvar.</p>
    <p className="text-xs text-muted-foreground">Esta regra define o percentual da FIPE e, opcionalmente, o preço da chave para a faixa de anos. Preço de chave simples em branco usa o catálogo ou R$ 50; um valor manual substitui esse padrão. Não há adicional fixo de R$ 120 na mão de obra. Piso mínimo, outros adicionais e fatores dinâmicos continuam valendo. Remover a regra restaura o percentual geral após salvar.</p>
    {!rules.length && <p className="text-sm text-muted-foreground">Nenhuma regra específica. Todos os veículos usam os percentuais gerais abaixo.</p>}
    {rules.length > 0 && <div className="space-y-2"><p className="text-sm font-medium">Regras cadastradas ({rules.length})</p>{rules.map((rule, index) => index === activeIndex ? null : <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span>{rule.make || 'Nova montadora'} {rule.model || 'Novo modelo'} · {rule.year_start ?? rule.year ?? '—'}{(rule.year_end ?? rule.year) !== (rule.year_start ?? rule.year) ? `–${rule.year_end ?? rule.year ?? '—'}` : ''} · {rule.percent === '' || rule.percent == null ? 'porcentagem pendente' : `${rule.percent}% da FIPE`}</span><Button type="button" variant="outline" size="sm" onClick={() => setActiveIndex(index)}>Editar</Button></div>)}</div>}
    {rules.map((rule, index) => index === activeIndex && <VehicleFipeRateRow key={index} rule={rule} values={values} index={index} onChange={patch => onChange(prev => {
      const current = prev[index];
      const changedVehicle = ('make' in patch && patch.make !== current.make) || ('model' in patch && patch.model !== current.model);
      const saved = changedVehicle && savedRules.filter(item => item.make === current.make && item.model === current.model);
      const preserve = saved?.length > 0;
      const updated = prev.map((item, i) => i === index ? { ...item, ...patch, ...(preserve ? { year_start: '', year_end: '', percent: '', ...Object.fromEntries(['simple_price', 'original_flip_price', 'parallel_flip_price', 'original_proximity_price', 'parallel_proximity_price'].flatMap(field => [[field, ''], [field + '_unavailable', false]])) } : {}) } : item);
      const missing = preserve ? saved.filter(original => !updated.some(item => item.make === original.make && item.model === original.model && Number(item.year_start ?? item.year) === Number(original.year_start ?? original.year) && Number(item.year_end ?? item.year) === Number(original.year_end ?? original.year))) : [];
      return [...updated, ...missing];
    })} onRemove={() => { onChange(prev => prev.filter((_, i) => i !== index)); setActiveIndex(null); }} onDuplicate={() => { onChange(prev => [...prev, { make: rule.make, model: rule.model, year_start: '', year_end: '', percent: rule.percent }]); setActiveIndex(rules.length); }} canDuplicate={rules.length < 1000} />)}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled || rules.length >= 1000} onClick={() => { onChange(prev => [...prev, { make: '', model: '', year_start: '', year_end: '', percent: '' }]); setActiveIndex(rules.length); }}><Plus className="h-4 w-4" />Adicionar veículo</Button><Button type="submit" disabled={disabled}>{disabled ? 'Aguarde...' : 'Salvar tabela'}</Button></div>
    <p className="text-xs text-muted-foreground">As alterações só entram em vigor ao salvar a tabela.</p>
  </fieldset>;
}