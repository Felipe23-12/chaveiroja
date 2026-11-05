import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ErrorBanner from '@/components/ui/ErrorBanner';
export default function GuestCaseNotice({ guest }) {
  const item = guest.snapshot.case;
  const [text, setText] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  if (!item || ['resolved','cancelled'].includes(item.status)) return null;
  const send = async response => { setBusy(true); setError(''); try { const quote = response === 'confirmed' ? await guest.call('cancel_quote') : null; if (quote?.fee > 0 && !window.confirm(`Confirma cancelar com taxa de R$ ${quote.fee.toFixed(2)}?`)) return; await guest.call('case_response', { response, report: text, confirmed_fee: true, confirmed_fee_amount: quote?.fee }); await guest.refresh(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <section className="space-y-3 rounded-xl border border-warning bg-card p-4"><h2 className="font-heading font-semibold">Ação necessária</h2><ErrorBanner message={error} />
    {item.reason === 'address_incorrect' ? <p className="text-sm">O chaveiro informou que está no endereço indicado e aguardará 6 minutos. Encontre-o no local.</p> : item.reason === 'threat' ? <><p className="text-sm">Foi registrada uma ocorrência de segurança. Informe sua versão.</p><Textarea value={text} maxLength={2000} onChange={e => setText(e.target.value)} /><Button disabled={busy || text.trim().length < 10} onClick={() => send('reported')}>Enviar minha versão</Button></> : <><p className="text-sm">O chaveiro informou que você cancelou. Confirme ou negue em até 5 minutos.</p><Button disabled={busy} onClick={() => send('confirmed')}>Sim, cancelei</Button><Button disabled={busy} variant="outline" onClick={() => send('denied')}>Não cancelei</Button></>}
    {item.client_response && <p className="text-xs text-muted-foreground">Sua resposta foi registrada.</p>}
  </section>;
}