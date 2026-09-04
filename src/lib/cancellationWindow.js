// Carência de cancelamento (modo aplicativo): o cliente pode cancelar sem custo
// dentro dos primeiros 5 minutos. O tempo decorrido é contado a partir da
// confirmação do chaveiro (accepted_at) e, na falta dela, da abertura do
// chamado (created_date).
import { CANCELLATION_THRESHOLD_MINUTES } from "@/lib/pricing";

const WINDOW_MS = CANCELLATION_THRESHOLD_MINUTES * 60 * 1000;

export function getCancellationWindow(request) {
  if (!request) return { free: false, elapsedMs: 0, minutesLeft: 0, reference: null };
  const ref = request.accepted_at || request.created_date;
  const refMs = ref ? new Date(ref).getTime() : NaN;
  // Sem referência de tempo válida: mantém o cancelamento gratuito
  if (!refMs || isNaN(refMs)) {
    return { free: true, elapsedMs: 0, minutesLeft: CANCELLATION_THRESHOLD_MINUTES, reference: null };
  }
  const elapsedMs = Date.now() - refMs;
  const free = elapsedMs < WINDOW_MS;
  return {
    free,
    elapsedMs,
    minutesLeft: free ? Math.max(1, Math.ceil((WINDOW_MS - elapsedMs) / 60000)) : 0,
    reference: request.accepted_at ? "accepted" : "created",
  };
}