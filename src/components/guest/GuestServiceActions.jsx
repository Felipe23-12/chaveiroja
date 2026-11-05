import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ErrorBanner from '@/components/ui/ErrorBanner';
import GuestRegistrationPrompt from '@/components/guest/GuestRegistrationPrompt';
export default function GuestServiceActions({ guest, request }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [quote, setQuote] = useState(null), [failed, setFailed] = useState(false);
  const run = async (action, body = {}) => { setBusy(true); setError(''); try { await guest.call(action, body); await guest.refresh(); setQuote(null); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const cancelQuote = async () => { setBusy(true); setError(''); try { setQuote(await guest.call('cancel_quote')); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const active = ['searching','ringing','queued','accepted','on_the_way'].includes(request.status);
  return <section className="space-y-3">
    <ErrorBanner message={error} />
    {request.locksmith_arrived && !request.client_arrived_confirmed && active && <div className="space-y-3 rounded-xl border bg-card p-4"><p className="font-medium">O chaveiro informou que chegou. Ele está com você?</p><Button disabled={busy} onClick={() => run('arrival', { confirmed: true })}>Sim, confirmar chegada</Button><Button variant="outline" disabled={busy} onClick={() => run('arrival', { confirmed: false })}>Ainda não chegou</Button></div>}
    {active && <Button variant="outline" className="w-full" disabled={busy} onClick={cancelQuote}>Cancelar atendimento</Button>}
    {active && request.client_arrived_confirmed && !request.client_confirmed && <Button variant="outline" className="w-full" onClick={() => setFailed(v => !v)}>O serviço não deu certo</Button>}
    {failed && <GuestRegistrationPrompt failed />}
    {quote && active && <div className="space-y-3 rounded-xl border bg-card p-4" role="alert"><p>{quote.free ? 'Deseja cancelar sem taxa?' : `Taxa de cancelamento: ${quote.fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Ela ficará pendente até o pagamento.`}</p><Button disabled={busy} onClick={() => run('cancel', { confirmed_fee: true, confirmed_fee_amount: quote.fee })}>{busy ? 'Cancelando…' : 'Confirmar cancelamento'}</Button><Button variant="ghost" disabled={busy} onClick={() => setQuote(null)}>Manter chamado</Button></div>}
  </section>;
}