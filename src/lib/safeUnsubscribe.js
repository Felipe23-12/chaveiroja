// Normaliza o retorno do SDK (função ou Promise) e trata a limpeza com segurança.
export function safeUnsubscribe(subscription) {
  let stopped = false, cleanup;
  const run = () => {
    if (typeof cleanup === "function") {
      try { cleanup(); } catch { /* conexão já encerrada */ }
      cleanup = null;
    }
  };
  if (typeof subscription === "function") cleanup = subscription;
  else if (subscription && typeof subscription.then === "function") {
    Promise.resolve(subscription).then(fn => { cleanup = fn; if (stopped) run(); }).catch(() => {});
  }
  return () => { stopped = true; run(); };
}

/** Realtime indisponível não pode interromper as consultas periódicas da tela. */
export function subscribeSafely(startSubscription) {
  try { return safeUnsubscribe(startSubscription()); }
  catch { return () => {}; }
}
