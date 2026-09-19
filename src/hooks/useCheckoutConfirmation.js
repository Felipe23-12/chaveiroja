import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function useCheckoutConfirmation(serviceRequestId, paymentKind, onConfirm) {
  const callback = useRef(onConfirm);
  callback.current = onConfirm;
  const checkRef = useRef(() => {});
  const [state, setState] = useState({ checking: false, pending: false, error: '' });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('mercado_pago') === 'retorno' ? params.get('local_payment_id') : null;
    if (!serviceRequestId && !paymentId) return;
    let stopped = false, running = false, confirmed = false, timer;
    const check = async () => {
      if (stopped || running || confirmed || document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      running = true;
      setState(s => ({ ...s, checking: true, error: '' }));
      try {
        const { data } = await base44.functions.invoke('mercadoPagoPayment', {
          action: 'get_status', payment_kind: paymentKind,
          ...(serviceRequestId ? { service_request_id: serviceRequestId } : { payment_id: paymentId }),
        });
        if (stopped) return;
        setState({ checking: false, pending: !!data.payment_id && data.status !== 'paid', error: '' });
        if (data.status === 'paid') {
          confirmed = true;
          await callback.current?.(data.method, null, data.payment_id);
        }
      } catch (error) {
        if (!stopped) setState(s => ({ ...s, checking: false, error: error?.response?.data?.error || 'Não foi possível consultar o pagamento. Tentaremos novamente; não pague outra vez.' }));
      } finally {
        running = false;
        if (!stopped && !confirmed) timer = setTimeout(check, 15000);
      }
    };
    checkRef.current = check;
    check();
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      stopped = true; clearTimeout(timer);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [serviceRequestId, paymentKind]);
  return { ...state, check: () => checkRef.current() };
}