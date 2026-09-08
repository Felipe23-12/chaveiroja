// Fila de ações do chaveiro feitas sem internet (aceitar/recusar chamado).
// As ações ficam salvas no dispositivo e são enviadas automaticamente assim
// que a conexão voltar.
import { base44 } from "@/api/base44Client";
import { acceptRing, rejectRing } from "@/lib/ringBroadcast";
import { saveLastService, getLastService } from "@/lib/offlineCache";

const QUEUE_KEY = "chaveiro_offline_action_queue";
let flushing = false;
let bound = false;

function readQueue() {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function writeQueue(list) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  } catch (e) {
    /* storage indisponível */
  }
}

export function queuedActionsCount() {
  return readQueue().length;
}

/** Guarda a ação para envio posterior. */
export function enqueueAction(action) {
  const list = readQueue();
  list.push({ ...action, _queue_id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, _queued_at: new Date().toISOString() });
  writeQueue(list);
}

/** Envia as ações pendentes; mantém na fila as que falharem. */
export async function flushActionQueue() {
  if (flushing) return 0;
  const list = readQueue();
  if (list.length === 0) return 0;
  flushing = true;
  const remaining = [];
  let sent = 0;
  for (const action of list) {
    try {
      if (action.type === "accept") {
        await acceptRing(action.requestId, action.locksmith, action.extra || 0);
      } else if (action.type === "reject") {
        await rejectRing(action.request, action.locksmithId);
      } else if (action.type === "status_update") {
        await base44.entities.ServiceRequest.update(action.requestId, action.data);
      }
      sent += 1;
    } catch (e) {
      remaining.push(action);
    }
  }
  // Preserva ações adicionadas enquanto o envio estava em andamento.
  const processedIds = new Set(list.map((item) => item._queue_id).filter(Boolean));
  const addedDuringFlush = readQueue().filter((item) => item._queue_id && !processedIds.has(item._queue_id));
  writeQueue([...remaining, ...addedDuringFlush]);
  flushing = false;
  return sent;
}

/**
 * Atualiza o status do atendimento. Sem internet, a alteração é aplicada no
 * cache local e fica na fila para ser enviada assim que a conexão voltar.
 * Retorna o registro atualizado (do servidor ou do cache).
 */
export async function syncServiceUpdate(requestId, data) {
  try {
    const updated = await base44.entities.ServiceRequest.update(requestId, data);
    saveLastService(updated);
    return updated;
  } catch (e) {
    enqueueAction({ type: "status_update", requestId, data });
    const cached = getLastService();
    const merged = cached?.id === requestId ? { ...cached, ...data } : { id: requestId, ...data };
    saveLastService(merged);
    return merged;
  }
}

/** Reenvia automaticamente quando a conexão voltar. */
export function bindAutoFlush(onFlushed) {
  if (bound) return;
  bound = true;
  const run = () => {
    flushActionQueue().then((n) => {
      if (n > 0 && onFlushed) onFlushed(n);
    });
  };
  window.addEventListener("online", run);
  if (navigator.onLine) run();
}