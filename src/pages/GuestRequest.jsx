import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import ServiceAccessProvider from '@/components/guest/ServiceAccessContext';
import useGuestService from '@/components/guest/useGuestService';
import GuestBookingIntro from '@/components/guest/GuestBookingIntro';
import GuestOpeningForm from '@/components/guest/GuestOpeningForm';
import GuestServiceTracking from '@/components/guest/GuestServiceTracking';
import ErrorBanner from '@/components/ui/ErrorBanner';
import LoadingCard from '@/components/ui/LoadingCard';
export default function GuestRequest() {
  const { user, isLoadingAuth } = useAuth();
  const guest = useGuestService(user?.id);
  const [contact, setContact] = useState({ name: '', phone: '', service: '', urgency: 'normal', terms: false });
  const [configuring, setConfiguring] = useState(false), [claimError, setClaimError] = useState(''), [claimRevision, setClaimRevision] = useState(0);
  useEffect(() => {
    if (!user || isLoadingAuth || !guest.snapshot) return;
    if (!guest.snapshot.request && !guest.snapshot.claimed) { window.location.replace('/'); return; }
    let active = true;
    guest.call('claim').then(result => {
      if (!active) return;
      const failed = new URLSearchParams(window.location.search).get('cancel') === '1';
      window.location.replace(failed ? '/?cancel=1' : guest.snapshot.request?.status === 'cancelled' && !guest.snapshot.request?.cancellation_fee ? '/historico' : '/');
    }).catch(e => { if (active) setClaimError(e.message); });
    return () => { active = false; };
  }, [user?.id, isLoadingAuth, Boolean(guest.snapshot), claimRevision]);
  return <main className="min-h-[100dvh] bg-background text-foreground pt-safe pb-safe"><div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
    <nav className="flex items-center justify-between gap-3"><Link to="/" className="font-heading text-xl font-bold">ChaveiroJá</Link><Link className="min-h-11 py-3 text-sm underline" to="/login/chaveiro">Sou chaveiro</Link></nav>
    <ErrorBanner message={guest.error} onRetry={guest.retry} /><ErrorBanner message={claimError} onRetry={() => { setClaimError(''); setClaimRevision(v => v + 1); }} />
    <ServiceAccessProvider value={guest.invoke}>
      {user ? !claimError && <LoadingCard label="Vinculando seu atendimento à sua conta…" /> : guest.snapshot?.request ? <GuestServiceTracking guest={guest} /> : guest.snapshot?.claimed ? <p>Este chamado já foi vinculado. <Link to="/login/cliente" className="underline">Entre na sua conta para continuar.</Link></p> : configuring ? <GuestOpeningForm contact={contact} guest={guest} onBack={() => setConfiguring(false)} /> : <GuestBookingIntro value={contact} onChange={setContact} onContinue={() => setConfiguring(true)} />}
    </ServiceAccessProvider>
    <footer className="flex justify-center gap-4 text-xs text-muted-foreground"><Link to="/termos-privacidade">Privacidade</Link><Link to="/contato">Contato</Link></footer>
  </div></main>;
}