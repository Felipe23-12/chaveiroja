// Todos os serviços do modo aplicativo: 3 cancelamentos no dia geram 6 horas de bloqueio.
import { base44 } from "@/api/base44Client";
import { normalizeServiceError } from "@/lib/serviceErrors";
async function invokeServiceTrust(body) {
  try { return await base44.functions.invoke("serviceTrust", body); }
  catch (error) { throw normalizeServiceError(error); }
}

export const KEY_CANCEL_LIMIT = 3;
export const KEY_BLOCK_HOURS = 6;

export async function getKeyCancelBlock(userId) {
  if (!userId) return { blocked: false, minutesLeft: 0, cancelCount: 0 };
  const response = await invokeServiceTrust({ action: "client_block_status" });
  return response.data;
}

export async function createAppServiceRequest(data) {
  const response = await invokeServiceTrust({ action: "create_request", data });
  const request = response.data.request;
  // Métrica GA4: somente após confirmação do chamado pelo servidor.
  // Sem nome, endereço ou outros dados pessoais no evento.
  if (request?.id && typeof window !== "undefined" && typeof window.gtag === "function") {
    try {
      const key = `chaveiroja_ga4_request_${request.id}`;
      if (window.sessionStorage.getItem(key) !== "sent") {
        window.gtag("event", "chamado_solicitado", {
          service_type: request.service_type || data.service_type || "nao_informado",
          request_source: "web",
        });
        window.sessionStorage.setItem(key, "sent");
      }
    } catch (error) {
      // Falhas de analytics nunca impedem o atendimento.
      console.warn("Medição do chamado indisponível", error);
    }
  }
  return request;
}