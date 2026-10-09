import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function ReviewChat({ request }) {
  const { appleReview } = useAuth();
  const [messages, setMessages] = useState([]), [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = async () => { const page = await base44.entities.ChatMessage.filter({ locksmith_id: request.locksmith_id, client_id: request.created_by_id }, { sort: '-created_date', limit: 50 }); if (active) setMessages(page.items.slice().reverse()); };
    const refresh = () => load().catch(err => setError(err.message));
    refresh(); const timer = setInterval(refresh, 5000), unsubscribe = base44.entities.ChatMessage.subscribe(refresh);
    return () => { active = false; clearInterval(timer); unsubscribe(); };
  }, [request.locksmith_id, request.created_by_id]);
  const send = async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { await base44.functions.invoke('sendChatMessage', { locksmith_id: request.locksmith_id, client_id: appleReview.role === 'chaveiro' ? request.created_by_id : undefined, message: text }); setText(''); }
    catch (err) { setError(err?.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };
  return <section className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="font-semibold">Conversas</h2><div className="max-h-60 overflow-y-auto space-y-2">{messages.length ? messages.map(m => <p key={m.id} className="rounded-lg bg-muted p-2 text-sm"><strong>{m.sender_name}: </strong>{m.message}</p>) : <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}</div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<form onSubmit={send} className="flex gap-2"><Input value={text} maxLength={1000} onChange={e => setText(e.target.value)} placeholder="Digite uma mensagem" /><Button disabled={busy || !text.trim()} type="submit">Enviar</Button></form></section>;
}