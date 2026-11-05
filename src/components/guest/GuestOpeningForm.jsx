import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ErrorBanner from '@/components/ui/ErrorBanner';
import ServiceConfig from '@/components/locksmith/ServiceConfig';
import ServiceLocationDetails from '@/components/client/ServiceLocationDetails';
import ServiceQuoteScope from '@/components/location/ServiceQuoteScope';
import useGuestOpeningForm from '@/components/guest/useGuestOpeningForm';
export default function GuestOpeningForm({ contact, guest, onBack }) {
  const form = useGuestOpeningForm(contact);
  const [quote, setQuote] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const fingerprint = JSON.stringify(form.data), pricing = quote?.key === fingerprint ? quote.pricing : null;
  const proceed = async () => {
    setBusy(true); setError('');
    try {
      const result = await guest.call(pricing ? 'create' : 'quote', { data: { ...form.data, ...(pricing ? { expected_price: pricing.price } : {}) } });
      if (result.request) guest.setSnapshot(result);
      else setQuote({ key: fingerprint, pricing: result.pricing });
    } catch (e) { setError(e.message); if (e.code === 'PRICE_CHANGED') setQuote(null); }
    finally { setBusy(false); }
  };
  return <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
    <ServiceQuoteScope location={form.location} confirmed={Boolean(form.location)}>
      <ServiceConfig {...form.config} service={{ ...form.service, options: [] }} />
    </ServiceQuoteScope>
    <ServiceLocationDetails value={form.context} onChange={form.setContext} vehicle={form.service.needsVehicleInfo} />
    {pricing && <div className="space-y-2 rounded-xl bg-muted p-4"><p className="text-sm">Valor total do chamado</p><p className="font-heading text-2xl font-bold">{pricing.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>{pricing.discount > 0 && <p className="text-sm text-muted-foreground">Desconto do primeiro chamado já aplicado.</p>}<p className="text-xs text-muted-foreground">Confira antes de solicitar. O deslocamento será validado no aceite pelo chaveiro.</p></div>}
    <ErrorBanner message={error} />
    <Button className="h-12 w-full" disabled={busy || !guest.connected || !form.location} onClick={proceed}>{busy ? 'Aguarde…' : pricing ? 'Confirmar valor e solicitar chaveiro' : 'Consultar valor do chamado'}</Button>
    <Button variant="ghost" className="w-full" disabled={busy} onClick={onBack}>Voltar</Button>
  </section>;
}