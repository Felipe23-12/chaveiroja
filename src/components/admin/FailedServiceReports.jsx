import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

export default function FailedServiceReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = () => base44.entities.ServiceCancellationCase.filter({ reason: 'service_failed' }, '-created_date', 100).then(rows => { setReports(rows); setLoading(false); }).catch(() => setLoading(false));
    load(); const unsubscribe = base44.entities.ServiceCancellationCase.subscribe(load);
    return () => unsubscribe?.();
  }, []);
  return <section className="space-y-3"><h2 className="font-heading text-lg font-semibold">Serviços que não deram certo</h2>
    {loading ? <p className="text-sm text-muted-foreground">Carregando registros…</p> : !reports.length ? <p className="text-sm text-muted-foreground">Nenhum cancelamento desse tipo.</p> : reports.map(item => <article key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
      <p className="text-sm font-medium">Chamado {item.request_id} · Cancelado sem taxa</p>
      <p className="text-xs text-muted-foreground">{new Date(item.created_date).toLocaleString('pt-BR')} · Cliente {item.client_id} · Chaveiro {item.locksmith_id}</p>
      <div className="flex flex-wrap gap-2">{(item.evidence_photos || []).map(url => <a href={url} key={url} target="_blank" rel="noopener noreferrer" aria-label="Abrir foto do serviço"><Image src={url} alt="Prova do serviço não concluído" className="h-24 w-24 rounded-lg object-cover" /></a>)}</div>
    </article>)}
  </section>;
}