import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useServiceAreas } from '@/lib/serviceAreas';
import { Button } from '@/components/ui/button';
import AreaLookupForm from '@/components/admin/AreaLookupForm';
export default function ServiceAreasPanel() {
  const { areas, loading, error: loadError } = useServiceAreas(); const client = useQueryClient();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: ['serviceAreas'] });
  const add = async area => { if (areas.some(a => a.name === area.name && a.scope === area.scope)) throw new Error('Esta área já está cadastrada. Use Liberar na lista.'); await base44.entities.ServiceArea.create(area); await refresh(); };
  const toggle = async area => { setBusy(true); setError(''); try { await base44.entities.ServiceArea.update(area.id, { active: !area.active }); await refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <section className="space-y-5 rounded-xl border border-border bg-card p-4 md:p-6">
    <div><h2 className="text-lg font-semibold">Áreas de atendimento</h2><p className="text-sm text-muted-foreground">Somente as áreas liberadas permitem novos chamados e chaveiros online. Fora delas, o mapa fica vermelho. Atendimentos já aceitos podem ser concluídos.</p></div>
    <p className="text-xs text-muted-foreground">Limites aproximados do OpenStreetMap. Ruas incluem uma faixa de 120 m de cada lado. Áreas sobrepostas se somam; pausar todas suspende novos atendimentos.</p>
    <AreaLookupForm onAdd={add} disabled={loading || busy || !!loadError} />
    {(error || loadError) && <p role="alert" className="text-sm text-destructive">{error || 'Não foi possível carregar as áreas.'}<Button variant="ghost" onClick={refresh}>Tentar novamente</Button></p>}
    {loading ? <p className="text-sm text-muted-foreground">Carregando áreas…</p> : areas.length ? <div className="space-y-2">{areas.map(area => <div key={area.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm"><span className="min-w-0 flex-1">{area.name}</span><span className={area.active ? 'text-success' : 'text-muted-foreground'}>{area.active ? 'Liberada' : 'Pausada'}</span><Button disabled={busy} variant="outline" onClick={() => toggle(area)}>{area.active ? 'Pausar' : 'Liberar'}</Button></div>)}</div> : <p className="text-sm text-warning">Nenhuma área liberada. Cadastre uma área para iniciar os atendimentos.</p>}
  </section>;
}