import { base44 } from "@/api/base44Client";

// ID do conector Gmail registrado no workspace (modo por usuário)
export const GMAIL_CONNECTOR_ID = "6a9a70c3031fa6c6d0a7570c";

// Envia o aviso automático ao cliente pela conta Gmail conectada do usuário.
// Silencioso: se a conta não estiver conectada, o fluxo do app não é afetado.
export async function notifyStatusByGmail(serviceRequestId, status) {
  try {
    await base44.functions.invoke("sendStatusEmailViaGmail", {
      service_request_id: serviceRequestId,
      status,
    });
  } catch (e) {
    /* Gmail não conectado ou falha de envio — não bloqueia o atendimento */
  }
}