import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VehicleFipeRateRow from '@/components/admin/VehicleFipeRateRow';

export default function VehicleFipeRatesEditor({ rules, disabled, onChange }) {
  return <fieldset disabled={disabled} className="rounded-xl border border-border bg-card p-4 space-y-4">
    <legend className="px-2 font-heading font-semibold">FIPE por montadora, modelo e ano</legend>
    <p className="text-sm text-muted-foreground">Escolha o veículo e informe seu percentual de mão de obra. Exemplo: Onix 2020 pode ter um percentual diferente de Tracker 2020. A correspondência é pelo modelo e ano exatos; Onix e Onix Plus são regras separadas.</p>
    <p className="text-xs text-muted-foreground">Esta regra substitui somente o percentual da FIPE da tabela geral. Piso mínimo, adicionais e fatores dinâmicos continuam valendo. Remover a regra restaura o percentual geral após salvar.</p>
    {!rules.length && <p className="text-sm text-muted-foreground">Nenhuma regra específica. Todos os veículos usam os percentuais gerais abaixo.</p>}
    {rules.map((rule, index) => <VehicleFipeRateRow key={index} rule={rule} index={index} onChange={patch => onChange(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item))} onRemove={() => onChange(prev => prev.filter((_, i) => i !== index))} />)}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled || rules.length >= 1000} onClick={() => onChange(prev => [...prev, { make: '', model: '', year: '', percent: '' }])}><Plus className="h-4 w-4" />Adicionar veículo</Button><Button type="submit" disabled={disabled}>{disabled ? 'Aguarde...' : 'Salvar tabela'}</Button></div>
    <p className="text-xs text-muted-foreground">As alterações só entram em vigor ao salvar a tabela.</p>
  </fieldset>;
}