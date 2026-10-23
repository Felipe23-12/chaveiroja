import React, { useEffect, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { safeUnsubscribe } from '@/lib/safeUnsubscribe';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function LocksmithRegionsPanel() {
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(true);
  const queryClient = useQueryClient();
  useEffect(() => { const timer = setTimeout(() => setRegion(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  useEffect(() => safeUnsubscribe(base44.entities.Locksmith.subscribe(() => queryClient.invalidateQueries({ queryKey: ['admin-locksmith-regions'] }))), [queryClient]);
  const { data, isPending, isError, isFetching, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
    queryKey: ['admin-locksmith-regions', region, onlineOnly], initialPageParam: undefined,
    queryFn: ({ pageParam }) => base44.entities.Locksmith.filter({
      ...(onlineOnly ? { online: true } : {}),
      ...(region ? { service_regions: { $regex: region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}),
    }, { sort: '-updated_date', limit: 20, ...(pageParam ? { cursor: pageParam } : {}) }),
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  const items = data?.pages.flatMap(page => page.items) || [];
  return <section className="space-y-3 rounded-xl border border-border bg-card p-4">
    <h2 className="font-heading text-lg font-semibold">Chaveiros por região</h2>
    <p className="text-sm text-muted-foreground">Regiões declaradas pelos chaveiros, para consulta administrativa. Estar online não garante disponibilidade para um novo chamado.</p>
    <div className="flex flex-wrap items-center gap-3">
      <Input className="min-w-0 flex-1" value={search} onChange={e => setSearch(e.target.value)} maxLength={100} placeholder="Buscar região: Zona Sul, ABC, Guarulhos..." aria-label="Buscar região atendida" />
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={onlineOnly} onCheckedChange={v => setOnlineOnly(v === true)} />Somente online</label>
      <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>Atualizar</Button>
    </div>
    {isPending && <p role="status" className="text-sm text-muted-foreground">Carregando chaveiros...</p>}
    {isError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar. Clique em Atualizar para tentar novamente.</p>}
    {!isPending && !isError && !items.length && <p className="text-sm text-muted-foreground">Nenhum chaveiro encontrado com esses filtros.</p>}
    {items.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="text-muted-foreground"><tr><th className="p-2">Chaveiro</th><th className="p-2">Regiões atendidas</th><th className="p-2">Status</th></tr></thead>
      <tbody>{items.map(item => <tr key={item.id} className="border-t border-border"><td className="p-2">{item.display_name || item.name}</td><td className="p-2 whitespace-pre-wrap break-words">{item.service_regions || 'Não informadas'}</td><td className="p-2"><span className={item.online ? 'text-success' : 'text-muted-foreground'}>{item.online ? 'Online' : 'Offline'}</span><p className="text-xs text-muted-foreground">{item.available ? 'Disponível' : 'Indisponível'}</p></td></tr>)}</tbody>
    </table></div>}
    {hasNextPage && <Button variant="outline" disabled={isFetching} onClick={() => fetchNextPage()}>{isFetching ? 'Carregando...' : 'Carregar mais'}</Button>}
  </section>;
}