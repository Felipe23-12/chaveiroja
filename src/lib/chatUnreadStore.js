import { useState, useEffect } from "react";

// Store global do contador de mensagens de chat não lidas do chaveiro.
// Permite que GlobalChatAlert (detecção) e a navegação (sidebar/tabbar)
// compartilhem o mesmo contador em tempo real, sem prop drilling.
let unread = 0;
const listeners = new Set();

export function getChatUnread() {
  return unread;
}

export function setChatUnread(value) {
  const next = Math.max(0, Math.floor(value || 0));
  if (next === unread) return;
  unread = next;
  listeners.forEach((l) => l(unread));
}

export function incrementChatUnread(by = 1) {
  setChatUnread(unread + by);
}

export function subscribeChatUnread(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Hook React para componentes lerem o contador e re-renderizarem ao mudar.
export function useChatUnread() {
  const [count, setCount] = useState(unread);
  useEffect(() => {
    setCount(unread);
    const unsub = subscribeChatUnread(setCount);
    return unsub;
  }, []);
  return count;
}