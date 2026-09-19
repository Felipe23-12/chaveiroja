import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { servicePaymentConfirmed } from '@/lib/trustedMutations';
import { safeUnsubscribe } from '@/lib/safeUnsubscribe';

export default function useVerifiedServicePayment(request) {
  const [state, setState] = useState({ id: null, paid: false, loading: true });
  useEffect(() => {
    let alive = true;
    if (!request?.id) return;
    setState({ id: request.id, paid: false, loading: true });
    const load = () => servicePaymentConfirmed(request.id).then(paid => {
      if (alive) setState({ id: request.id, paid, loading: false });
    }).catch(() => { if (alive) setState({ id: request.id, paid: false, loading: false }); });
    load();
    const unsubscribe = base44.entities.Payment.subscribe(load);
    const timer = setInterval(load, 15000);
    return () => { alive = false; clearInterval(timer); safeUnsubscribe(unsubscribe)(); };
  }, [request?.id, request?.updated_date, request?.payment_status, request?.cash_received]);
  return state.id === request?.id ? state : { paid: false, loading: true };
}