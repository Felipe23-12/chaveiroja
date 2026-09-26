import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VehicleFipeRateRow from '@/components/admin/VehicleFipeRateRow';

export default function VehicleFipeRatesEditor({ rules, savedRules = [], disabled, onChange }) {
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 font-heading font-semibold">FIPE por montadora, modelo e ano</legend>
    <p className="text-sm text-muted-foreground">Para configurar um único ano-modelo, repita o ano nos campos inicial e final. Para vários anos consecutivos com a mesma porcentagem, informe o primeiro e o último ano. Use “Adicionar veículo” para outro carro; uma regra salva mantém sua montadora e modelo, evitando substituir o preço do carro anterior.</p>
    <p className="text-xs text-muted-foreground">Esta regra define o percentual da FIPE e, opcionalmente, o preço da chave para a faixa de anos. Preços em branco mantêm o catálogo atual. Piso mínimo, adicionais e fatores dinâmicos continuam valendo. Remover a regra restaura o percentual geral após salvar.</p>
    {!rules.length && <p className="text-sm text-muted-foreground">Nenhuma regra específica. Todos os veículos usam os percentuais gerais abaixo.</p>}
    {rules.map((rule, index) => <VehicleFipeRateRow key={index} rule={rule} savedIdentity={savedRules.find(saved => saved.make === rule.make && saved.model === rule.model) || null} index={index} onChange={patch => onChange(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))} onRemove={() => onChange(prev => prev.filter((_, i) => i !== index))} onDuplicate={() => onChange(prev => [...prev, { make: rule.make, model: rule.model, year_start: '', year_end: '', percent: rule.percent }])} canDuplicate={rules.length < 1000} />)}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled || rules.length >= 1000} onClick={() => onChange(prev => [...prev, { make: '', model: '', year_start: '', year_end: '', percent: '' }])}><Plus className="h-4 w-4" />Adicionar veículo</Button><Button type="submit" disabled={disabled}>{disabled ? 'Aguarde...' : 'Salvar tabela'}</Button></div>
    <p className="text-xs text-muted-foreground">As alterações só entram em vigor ao salvar a tabela.</p>
  </fieldset>;
}