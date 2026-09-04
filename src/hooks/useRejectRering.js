import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Tempo de espera antes do chamado recusado tocar novamente para o mesmo chaveiro
export const RERING_DELAY_MS = 2 * 60 * 1000;

/**
 * Quando o chaveiro recusa um chamado, ele volta a tocar para ele mesmo depois
 * de 2 minutos (caso nenhum outro chaveiro tenha assumido nesse intervalo).
 */
export function useRejectRering(locksmithId) {
  useEffect(() => {
    if (!locksmithId) return;

    const check = async () => {
      try {
        const list = await base44.entities.ServiceRequest.filter({
          locksmith_id: locksmithId,
          status: "searching",
        });
        const due = list.filter(
          (r) => r.rering_at && new Date(r.rering_at).getTime() <= Date.now()
        );
        for (const r of due) {
          await base44.entities.ServiceRequest.update(r.id, {
            status: "ringing",
            rering_at: null,
          });
        }
      } catch (e) {
        /* silencioso — tenta no próximo ciclo */
      }
    };

    check();
    const t = setInterval(check, 15000);
    return () => clearInterval(t);
  }, [locksmithId]);
}