import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import RegionalRangePreview from '@/components/admin/RegionalRangePreview';
const fields = [['preco_minimo_brl', 'Início da faixa (R$)'], ['preco_medio_brl', 'Média de referência (R$)'], ['preco_maximo_brl', 'Final da faixa (R$)']];
export default function RegionalPriceEditor({ reference, capitalSlug, service, serviceCode, onSaved, onDirty, onBusy }) {
  const [values, setValues] = useState(() => ({ ...Object.fromEntries(fields.map(([key]) => [key, reference?.[key] ?? ''])), ativo: reference?.ativo ?? true }));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const change = (key, value) => { setValues(prev => ({ ...prev, [key]: value })); setError(''); onDirty(true); };
  const save = async event => {
    event.preventDefault(); setBusy(true); onBusy(true); setError('');
    try {
      const numeric = Object.fromEntries(fields.map(([key]) => [key, values[key] === '' ? null : Number(values[key])]));
      const response = await base44.functions.invoke('manageServicePricing', { action: 'regional_save', service_type: service, capital_slug: capitalSlug, version: reference?.updated_date || reference?.created_date || null, values: { ...numeric, ativo: values.ativo } });
      onSaved(response.data); onDirty(false);
    } catch (e) { setError(e?.response?.data?.error || e.message); } finally { setBusy(false); onBusy(false); }
  };
  return <form onSubmit={save} className="space-y-4">
    {!reference && <p className="text-sm text-muted-foreground">Sem referência cadastrada para esta seleção. Informe os três valores para criar a faixa.</p>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{fields.map(([key, label]) => <label key={key} className="block text-sm font-medium">{label}<input type="number" inputMode="decimal" min="0.01" max="100000" step="0.01" required disabled={busy} value={values[key]} onChange={e => change(key, e.target.value)} className="mt-1 min-h-[44px] w-full rounded-md border border-input bg-background px-3 text-foreground" /></label>)}</div>
    <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" checked={values.ativo} disabled={busy} onChange={e => change('ativo', e.target.checked)} className="h-4 w-4 accent-primary" />Aplicar esta faixa nos novos pedidos</label>
    <RegionalRangePreview reference={{ ...reference, ...values, servico_codigo: serviceCode }} />
    {reference && <p className="text-xs text-muted-foreground">{reference.origem_texto || 'Referência cadastrada'} · Atualizada em {new Date(reference.updated_date || reference.created_date).toLocaleString('pt-BR')}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={busy} className="min-h-[44px]">{busy ? 'Salvando faixa...' : 'Salvar faixa regional'}</Button>
    <p className="text-xs text-muted-foreground">As alterações só entram em vigor ao salvar. Chamados já criados não são recalculados.</p>
  </form>;
}