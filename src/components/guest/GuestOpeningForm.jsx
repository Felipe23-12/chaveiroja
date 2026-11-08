import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackGuestEvent } from '@/lib/guestAnalytics';
import { Button } from '@/components/ui/button';
import ErrorBanner from '@/components/ui/ErrorBanner';
import ServiceConfig from '@/components/locksmith/ServiceConfig';
import ServiceLocationDetails from '@/components/client/ServiceLocationDetails';
import ServiceQuoteScope from '@/components/location/ServiceQuoteScope';
import useGuestOpeningForm from '@/components/guest/useGuestOpeningForm';

const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function GuestOpeningForm({ contact, guest, onBack }) {
  const form = useGuestOpeningForm(contact);
  const { call, connected, setSnapshot } = guest;
  const [quote, setQuote] = useState(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const quoteKey = connected && form.quoteReady ? JSON.stringify(form.quoteData) : null;
  const currentQuote = quoteKey && quote?.key === quoteKey && quote.revision === revision ? quote : null;
  const pricing = currentQuote?.pricing;
  const submitKey = JSON.stringify(form.data);
  const submitError = submissionError?.key === submitKey ? submissionError.error : null;
  const retryQuote = () => setRevision(value => value + 1);

  useEffect(() => {
    if (!quoteKey) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await call('quote', { data: JSON.parse(quoteKey) });
        if (!active) return;
        if (result.request || result.claimed) {
          setSnapshot(result);
          return;
        }
        if (!Number.isFinite(result.pricing?.price) || result.pricing.price <= 0) {
          throw new Error('Não foi possível calcular o valor. Tente novamente.');
        }
        setQuote({ key: quoteKey, revision, pricing: result.pricing });
      } catch (error) {
        if (active) setQuote({ key: quoteKey, revision, error });
      }
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [call, quoteKey, revision, setSnapshot]);

  const submit = async () => {
    if (busy || !pricing || form.locationIncomplete) return;
    setBusy(true);
    setSubmissionError(null);
    try {
      const result = await call('create', { data: { ...form.data, expected_price: pricing.price } });
      if (result.request) {
        trackGuestEvent('chamado_solicitado', `chaveiroja_ga4_request_${result.request.id}`, { service_type: result.request.service_type });
      }
      setSnapshot(result);
    } catch (error) {
      if (error.code === 'PRICE_CHANGED') retryQuote();
      else if (error.code === 'AREA_UNAVAILABLE') setQuote({ key: quoteKey, revision, error });
      if (error.code !== 'AREA_UNAVAILABLE') setSubmissionError({ key: submitKey, error });
    } finally {
      setBusy(false);
    }
  };

  return <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
    <ServiceQuoteScope location={form.location} confirmed={Boolean(form.location)}>
      <ServiceConfig {...form.config} service={{ ...form.service, options: [] }} nearestDistance={null} showPricePrompt={false} />
    </ServiceQuoteScope>
    <ServiceLocationDetails value={form.context} onChange={form.setContext} vehicle={form.service.needsVehicleInfo} />
    <div aria-live="polite">
      {!form.location && <p className="text-sm text-muted-foreground">Selecione uma sugestão de endereço ou use sua localização para calcular a prévia.</p>}
      {quoteKey && !currentQuote && <p className="text-sm text-muted-foreground">Calculando o valor do chamado…</p>}
      {pricing && <div className="space-y-2 rounded-xl bg-muted p-4">
        <p className="text-sm">Valor previsto do chamado</p>
        <p className="font-heading text-2xl font-bold text-primary">{money(pricing.price)}</p>
        {pricing.discount_type === 'first_call' && pricing.discount > 0 && <p className="text-sm text-success">Desconto de 10% no primeiro chamado: {money(pricing.discount)} já abatidos.</p>}
        <p className="text-xs text-muted-foreground">O deslocamento será validado quando o chaveiro aceitar o chamado.</p>
      </div>}
    </div>
    {pricing && form.locationIncomplete && <p className="text-sm text-muted-foreground">Informe bloco ou torre e apartamento ou unidade para solicitar.</p>}
    <ErrorBanner message={currentQuote?.error?.message} onRetry={currentQuote?.error?.code === 'AREA_UNAVAILABLE' ? undefined : retryQuote} />
    <ErrorBanner message={submitError?.message} />
    {(currentQuote?.error?.code === 'GUEST_LOGIN_REQUIRED' || submitError?.code === 'GUEST_LOGIN_REQUIRED') && (
      <Button asChild variant="outline" className="w-full"><Link to="/login/cliente?login=1">Entrar na minha conta</Link></Button>
    )}
    <Button className="h-12 w-full" disabled={busy || !pricing || form.locationIncomplete} onClick={submit}>
      {busy ? 'Aguarde…' : 'Confirmar valor e solicitar chaveiro'}
    </Button>
    <Button variant="ghost" className="w-full" disabled={busy} onClick={onBack}>Voltar</Button>
  </section>;
}