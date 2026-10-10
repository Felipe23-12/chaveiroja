import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ErrorBanner from '@/components/ui/ErrorBanner';
import LocksmithApprovalCard from '@/components/admin/LocksmithApprovalCard';

export default function LocksmithApprovalsPanel() {
  const [page, setPage] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async (cursor) => {
    setLoading(true); setError('');
    try {
      const { data } = await base44.functions.invoke('locksmithRegistrationApproval', { action: 'list', cursor });
      setPage(previous => ({ ...data, items: cursor ? [...previous.items, ...data.items] : data.items }));
    } catch (error) { setError(error?.response?.data?.error || error.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const decide = async (action, id, note) => {
    setBusy(id); setError(''); setSuccess('');
    try {
      await base44.functions.invoke('locksmithRegistrationApproval', { action, id, note, ownership_confirmed: action === 'approve' });
      setSuccess(action === 'approve' ? 'Cadastro aprovado. A pendência de titularidade do CPF foi liberada.' : 'Cadastro reprovado. Uma nova tentativa está bloqueada por 15 dias.');
      await load();
      return true;
    } catch (error) { setError(error?.response?.data?.error || error.message); return false; }
    finally { setBusy(null); }
  };
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading text-xl font-semibold">Cadastros pendentes</h2><p className="text-sm text-muted-foreground">Todos os chaveiros com solicitação de CPF aguardando aprovação, sem limite de data.</p></div><Button variant="outline" disabled={loading || Boolean(busy)} onClick={() => load()}>Atualizar lista</Button></div>
    <p className="text-sm font-medium">{page.total} solicitações pendentes</p>
    <ErrorBanner message={error} onRetry={() => load()} />
    {success && <p role="status" className="text-sm text-success">{success}</p>}
    {loading && <p role="status" className="text-sm text-muted-foreground">Carregando cadastros...</p>}
    {!loading && !error && !page.items.length && <p className="rounded-xl border border-border p-6 text-center text-muted-foreground">Nenhum cadastro de chaveiro aguardando aprovação.</p>}
    {page.items.map(item => <LocksmithApprovalCard key={item.id} item={item} busy={Boolean(busy) || loading} onApprove={(id, note) => decide('approve', id, note)} onReject={(id, note) => decide('reject', id, note)} />)}
    {page.has_more && <Button variant="outline" disabled={loading || Boolean(busy)} onClick={() => load(page.next_cursor)}>Carregar mais</Button>}
  </section>;
}