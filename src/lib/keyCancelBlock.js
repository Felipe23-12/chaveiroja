// Todos os serviços do modo aplicativo: 3 cancelamentos no dia geram 6 horas de bloqueio.
import { base44 } from "@/api/base44Client";

export const KEY_CANCEL_LIMIT = 3;
export const KEY_BLOCK_HOURS = 6;

export async function getKeyCancelBlock(userId) {
  if (!userId) return { blocked: false, minutesLeft: 0, cancelCount: 0 };
  const response = await base44.functions.invoke("serviceTrust", { action: "client_block_status" });
  return response.data;
}

export async function createAppServiceRequest(data) {
  const response = await base44.functions.invoke("serviceTrust", { action: "create_request", data });
  return response.data.request;
}