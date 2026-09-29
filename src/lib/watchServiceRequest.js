import { base44 } from '@/api/base44Client';
import { safeUnsubscribe } from '@/lib/safeUnsubscribe';

// O aceite usa gravação condicional: consulta também, sem depender de eventos.
export default function watchServiceRequest(id, onRequest, onError = () => {}) {
  let stopped = false, running = false, pending = false, timer;
  let status = 'ringing';
  const refresh = async () => {
    if (stopped || document.visibilityState === 'hidden') return;
    if (running) { pending = true; return; }
    running = true;
    clearTimeout(timer);
    try {
      const request = await base44.entities.ServiceRequest.get(id);
      if (!stopped && request) {
        status = request.status;
        onRequest(request);
      }
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      running = false;
      if (!stopped) {
        const delay = pending ? 0 : ['ringing', 'searching', 'queued'].includes(status) ? 3000 : 5000;
        pending = false;
        timer = setTimeout(refresh, delay);
      }
    }
  };
  const unsubscribe = safeUnsubscribe(base44.entities.ServiceRequest.subscribe(event => {
    if (event.id === id || event.data?.id === id) refresh();
  }));
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('online', refresh);
  refresh();
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('online', refresh);
  };
}