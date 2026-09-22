import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { REPAIR_PARTS } from '@/lib/quoteMode';

const labels = { requested: 'Aguardando chaveiro', inspecting: 'Chaveiro verificando o pedido', offered: 'Valor proposto pelo chaveiro', countered: 'Contraproposta enviada', accepted: 'Atendimento iniciado', declined: 'Orçamento encerrado' };
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export default function QuoteCard({ quote, locksmith, onAction, busy }) {
  const [price, setPrice] = useState('');
  const send = action => onAction(action, { quote_id: quote.id, ...(action === 'offer' || action === 'counter' ? { price: Number(price) } : {}) });
  const part = REPAIR_PARTS.find(([key]) => key === quote.repair_part)?.[1];
  return <article className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
    <div><h3 className="font-semibold text-foreground">{quote.service_type}{part ? ` · ${part}` : ''}</h3><p className="text-muted-foreground">{quote.vehicle_info} · {quote.address}</p><p className="mt-1">{quote.description}</p></div>
    <p className="font-medium">{labels[quote.status] || quote.status}{!locksmith && quote.locksmith_name ? ` · ${quote.locksmith_name}` : ''}</p>
    {quote.offered_price > 0 && <p>Proposta do chaveiro: <strong>{money(quote.offered_price)}</strong></p>}
    {quote.counter_price > 0 && <p>Contraproposta do cliente: <strong>{money(quote.counter_price)}</strong></p>}
    {quote.status === 'accepted' && quote.service_request_id && <Button asChild><Link to={locksmith ? '/painel-chaveiro' : `/acompanhamento/${quote.service_request_id}`}>Acompanhar atendimento</Link></Button>}
    {locksmith && quote.status === 'requested' && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => send('accept')}>Aceitar pedido</Button><Button disabled={busy} variant="outline" onClick={() => send('decline')}>Recusar pedido</Button></div>}
    {locksmith && quote.status === 'inspecting' && <div className="space-y-2"><label className="block">Valor do orçamento (R$)<Input type="number" min="1" max="100000" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label><div className="flex gap-2"><Button disabled={busy || !Number(price)} onClick={() => send('offer')}>Enviar valor</Button><Button disabled={busy} variant="outline" onClick={() => send('decline')}>Recusar</Button></div></div>}
    {!locksmith && quote.status === 'offered' && <div className="space-y-2"><label className="block">Sua contraproposta (R$)<Input type="number" min="1" max="100000" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => send('approve')}>Aceitar valor e iniciar</Button><Button disabled={busy || !Number(price)} variant="outline" onClick={() => send('counter')}>Enviar contraproposta</Button><Button disabled={busy} variant="outline" onClick={() => send('decline')}>Recusar orçamento</Button></div></div>}
    {locksmith && quote.status === 'countered' && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => send('accept_counter')}>Aceitar e iniciar</Button><Button disabled={busy} variant="outline" onClick={() => send('decline')}>Recusar e encerrar</Button></div>}
    {!locksmith && quote.status === 'requested' && <Button disabled={busy} variant="outline" onClick={() => send('decline')}>Cancelar pedido</Button>}
  </article>;
}