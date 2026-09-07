import { useEffect } from "react";

/**
 * Executa o callback sempre que o usuário volta para o aplicativo
 * (aba/app trazido para o primeiro plano). Útil para revalidar status
 * externos, como o cadastro da conta Stripe.
 */
export default function useOnAppResume(callback) {
  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
    };
  }, [callback]);
}