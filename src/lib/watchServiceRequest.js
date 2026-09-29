import { base44 } from '@/api/base44Client';
import { safeUnsubscribe } from '@/lib/safeUnsubscribe';

// O aceite usa gravação condicional: consulta também, sem depender de eventos.
export default function watchServiceRequest(id, onRequest, onError = () => {}) {
  let stopped = false, running = false, pending = false, timer;
  let status = 'ringing', revision = 0, lastTimestamp = 0;
  const deliver = request => {
    const timestamp = Date.parse(request.updated_date || '') || 0;
    if (stopped || (timestamp && timestamp < lastTimestamp)) return;
    lastTimestamp = Math.max(lastTimestamp, timestamp);
    status = request.status;
    onRequest(request);
  };
  const refresh = async () => {
    if (stopped || document.visibilityState === 'hidden') return;
    if (running) { pending = true; return; }
    running = true;
    const startedRevision = revision;
    clearTimeout(timer);
    try {
      const request = await base44.entities.ServiceRequest.get(id);
      if (request && startedRevision === revision) deliver(request);
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
    if (stopped || (event.id !== id && event.data?.id !== id)) return;
    const data = event.data;
    // Usa o evento autorizado completo sem uma consulta adicional.
    if (data?.id === id && data.status && data.service_type && data.address && data.updated_date &&
        (!['accepted', 'on_the_way'].includes(data.status) ||
          [data.locksmith_lat, data.locksmith_lng, data.customer_lat, data.customer_lng].every(Number.isFinite))) {
      revision += 1;
      deliver(data);
    } else refresh();
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