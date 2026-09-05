// Transforma o retorno de `subscribe` (função ou Promise de função) em uma
// função de limpeza segura para useEffect — evita "destroy is not a function".
export function safeUnsubscribe(unsub) {
  return () => {
    if (typeof unsub === "function") unsub();
    else if (unsub && typeof unsub.then === "function") {
      unsub.then((fn) => typeof fn === "function" && fn()).catch(() => {});
    }
  };
}