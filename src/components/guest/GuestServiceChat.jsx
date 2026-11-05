import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image } from '@/components/ui/image';
import ErrorBanner from '@/components/ui/ErrorBanner';
export default function GuestServiceChat({ guest, request }) {
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const send = async e => {
    e.preventDefault(); if (!text.trim() || busy) return; setBusy(true); setError('');
    try { await guest.call('message', { text, message_id: crypto.randomUUID() }); setText(''); await guest.refresh(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  if (!request.locksmith_id) return null;
  return <section className="space-y-3 rounded-xl border bg-card p-4">
    <h2 className="font-heading font-semibold">Conversa com o chaveiro</h2>
    <div className="max-h-64 space-y-2 overflow-y-auto" role="log" aria-label="Mensagens do atendimento">
      {guest.snapshot.messages.length === 0 && <p className="text-sm text-muted-foreground">Envie sua primeira mensagem.</p>}
      {guest.snapshot.messages.map(m => <div key={m.id} className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">{m.sender_name || (m.sender_type === 'customer' ? 'Você' : 'Chaveiro')}</p><p className="whitespace-pre-wrap break-words">{m.message}</p>{m.photo_url && <Image src={m.photo_url} alt="Foto enviada na conversa" fittingType="fit" className="mt-2 h-40 w-full" />}</div>)}
    </div>
    <ErrorBanner message={error} />
    {['accepted','queued','on_the_way'].includes(request.status) && <form className="flex gap-2" onSubmit={send}><Input aria-label="Mensagem para o chaveiro" value={text} maxLength={1000} onChange={e => setText(e.target.value)} placeholder="Digite uma mensagem" /><Button disabled={busy || !text.trim()} type="submit">{busy ? 'Enviando…' : 'Enviar'}</Button></form>}
    <p className="text-xs text-muted-foreground">Mostrando as últimas 30 mensagens. O histórico completo ficará disponível após o cadastro.</p>
  </section>;
}