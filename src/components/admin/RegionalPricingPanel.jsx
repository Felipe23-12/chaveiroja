import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BRAZIL_CAPITALS } from '@/data/brazilCapitals';
import { SERVICE_REFERENCE_CODE } from '@/lib/regionalPricing';
import { SERVICE_CATALOG } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import LoadingCard from '@/components/ui/LoadingCard';
import RegionalPriceEditor from '@/components/admin/RegionalPriceEditor';
const services = SERVICE_CATALOG.filter(item => SERVICE_REFERENCE_CODE[item.id]);
const capitals = [...BRAZIL_CAPITALS].sort((a, b) => a.uf.localeCompare(b.uf));
export default function RegionalPricingPanel() {
  const [capitalSlug, setCapitalSlug] = useState('sao_paulo'), [serviceId, setServiceId] = useState('abertura_residencial');
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const client = useQueryClient(), service = services.find(item => item.id === serviceId);
  const queryKey = ['regional-pricing-admin', capitalSlug, serviceId];
  const { data, isLoading, isFetching, error, refetch } = useQuery({ queryKey, refetchOnWindowFocus: false, queryFn: async () => (await base44.functions.invoke('manageServicePricing', { action: 'regional_get', service_type: service.label, capital_slug: capitalSlug })).data });
  const switchTo = (set, value) => { if (!dirty || window.confirm('Descartar as alterações regionais não salvas?')) { set(value); setDirty(false); setMessage(''); } };
  return <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
    <div><h2 className="font-heading text-lg font-semibold">Faixas por estado e capital</h2><p className="mt-1 text-sm text-muted-foreground">Consulte e edite mínimo, média e máximo das aberturas nas 27 capitais e suas regiões de referência.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Estado / capital<select value={capitalSlug} disabled={busy} onChange={e => switchTo(setCapitalSlug, e.target.value)} className="mt-1 min-h-[44px] w-full rounded-md border border-input bg-background px-3">{capitals.map(item => <option key={item.slug} value={item.slug}>{item.uf} — {item.name}</option>)}</select></label>
      <label className="text-sm font-medium">Serviço da faixa regional<select value={serviceId} disabled={busy} onChange={e => switchTo(setServiceId, e.target.value)} className="mt-1 min-h-[44px] w-full rounded-md border border-input bg-background px-3">{services.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    </div>
    <p className="text-xs text-muted-foreground">A faixa regional ativa tem prioridade sobre a faixa geral. Confecção de carro mantém FIPE e catálogo; confecção de moto e cópia mantêm suas regras atuais, sem referências regionais cadastradas.</p>
    {isLoading ? <LoadingCard label="Carregando faixa regional..." /> : error ? <p role="alert" className="text-sm text-destructive">{error?.response?.data?.error || error.message}</p> : data && <RegionalPriceEditor key={`${capitalSlug}:${serviceId}:${data.reference?.updated_date || 'new'}:${reload}`} reference={data.reference} capitalSlug={capitalSlug} service={service.label} serviceCode={SERVICE_REFERENCE_CODE[serviceId]} onBusy={setBusy} onDirty={value => { setDirty(value); if (value) setMessage(''); }} onSaved={result => { client.setQueryData(queryKey, result); setMessage('Faixa salva e aplicada às próximas cotações, conforme a opção selecionada.'); }} />}
    {message && <p role="status" className="text-sm text-success">{message}</p>}
    <Button variant="outline" disabled={busy || isFetching} onClick={() => { if (!dirty || window.confirm('Recarregar e descartar as alterações regionais?')) { setDirty(false); setMessage(''); setReload(value => value + 1); refetch(); } }} className="min-h-[44px]">Recarregar faixa</Button>
  </section>;
}