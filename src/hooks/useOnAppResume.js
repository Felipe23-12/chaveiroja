import { useEffect, useRef } from "react";

/**
 * Executa o callback sempre que o usuário volta para o aplicativo
 * (aba/app trazido para o primeiro plano). Útil para revalidar status
 * externos, como o cadastro da conta Stripe.
 */
export default function useOnAppResume(callback) {
  const callbackRef = useRef(callback);
  const lastRunRef = useRef(0);

  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    const run = () => {
      const now = Date.now();
      if (document.visibilityState !== "visible" || now - lastRunRef.current < 1000) return;
      lastRunRef.current = now;
      callbackRef.current();
    };
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
    };
  }, []);
}