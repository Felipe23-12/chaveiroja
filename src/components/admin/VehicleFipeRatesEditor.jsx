import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VehicleFipeRateRow from '@/components/admin/VehicleFipeRateRow';

export default function VehicleFipeRatesEditor({ rules, savedRules = [], disabled, onChange }) {
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 font-heading font-semibold">FIPE por montadora, modelo e ano</legend>
    <p className="text-sm text-muted-foreground">Para configurar um único ano-modelo, repita o ano nos campos inicial e final. Para vários anos consecutivos com a mesma porcentagem, informe o primeiro e o último ano. Você pode editar a montadora e o modelo. Ao trocar um veículo já salvo, a regra anterior é preservada e uma nova regra é iniciada para o veículo escolhido. Preencha ano-modelo e porcentagem antes de salvar.</p>
    <p className="text-xs text-muted-foreground">Esta regra define o percentual da FIPE e, opcionalmente, o preço da chave para a faixa de anos. Preços em branco mantêm o catálogo atual. Piso mínimo, adicionais e fatores dinâmicos continuam valendo. Remover a regra restaura o percentual geral após salvar.</p>
    {!rules.length && <p className="text-sm text-muted-foreground">Nenhuma regra específica. Todos os veículos usam os percentuais gerais abaixo.</p>}
    {rules.map((rule, index) => <VehicleFipeRateRow key={index} rule={rule} index={index} onChange={patch => onChange(prev => {
      const current = prev[index];
      const changedVehicle = ('make' in patch && patch.make !== current.make) || ('model' in patch && patch.model !== current.model);
      const saved = changedVehicle && savedRules.find(item => item.make === current.make && item.model === current.model && Number(item.year_start ?? item.year) === Number(current.year_start ?? current.year) && Number(item.year_end ?? item.year) === Number(current.year_end ?? current.year));
      const updated = prev.map((item, i) => i === index ? { ...item, ...patch, ...(saved ? { year_start: '', year_end: '', percent: '', ...Object.fromEntries(['simple_price', 'original_flip_price', 'parallel_flip_price', 'original_proximity_price', 'parallel_proximity_price'].flatMap(field => [[field, ''], [field + '_unavailable', false]])) } : {}) } : item);
      return saved && !updated.some(item => item.make === saved.make && item.model === saved.model && Number(item.year_start ?? item.year) === Number(saved.year_start ?? saved.year) && Number(item.year_end ?? item.year) === Number(saved.year_end ?? saved.year)) ? [...updated, saved] : updated;
    })} onRemove={() => onChange(prev => prev.filter((_, i) => i !== index))} onDuplicate={() => onChange(prev => [...prev, { make: rule.make, model: rule.model, year_start: '', year_end: '', percent: rule.percent }])} canDuplicate={rules.length < 1000} />)}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled || rules.length >= 1000} onClick={() => onChange(prev => [...prev, { make: '', model: '', year_start: '', year_end: '', percent: '' }])}><Plus className="h-4 w-4" />Adicionar veículo</Button><Button type="submit" disabled={disabled}>{disabled ? 'Aguarde...' : 'Salvar tabela'}</Button></div>
    <p className="text-xs text-muted-foreground">As alterações só entram em vigor ao salvar a tabela.</p>
  </fieldset>;
}