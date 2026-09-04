// Fila de ações do chaveiro feitas sem internet (aceitar/recusar chamado).
// As ações ficam salvas no dispositivo e são enviadas automaticamente assim
// que a conexão voltar.
import { acceptRing, rejectRing } from "@/lib/ringBroadcast";

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
  list.push({ ...action, _queued_at: new Date().toISOString() });
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
      }
      sent += 1;
    } catch (e) {
      remaining.push(action);
    }
  }
  writeQueue(remaining);
  flushing = false;
  return sent;
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