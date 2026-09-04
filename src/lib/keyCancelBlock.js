// Bloqueio temporário para confecção de chaves (carro e moto) no modo aplicativo:
// ao cancelar 3 chamados, o cliente fica 3 horas sem poder solicitar novamente.
import { base44 } from "@/api/base44Client";

export const KEY_SERVICE_TYPES = [
  "Confecção de Chave de Carro",
  "Confecção de Chave de Moto",
];

export const KEY_CANCEL_LIMIT = 3;
export const KEY_BLOCK_HOURS = 3;

// Retorna { blocked, minutesLeft, cancelCount }
export async function getKeyCancelBlock(userId) {
  if (!userId) return { blocked: false, minutesLeft: 0, cancelCount: 0 };
  const windowMs = KEY_BLOCK_HOURS * 60 * 60 * 1000;
  const since = Date.now() - windowMs;

  const list = await base44.entities.ServiceRequest.filter(
    { created_by_id: userId, status: "cancelled" },
    "-updated_date",
    50
  );

  const recent = list.filter(
    (r) =>
      KEY_SERVICE_TYPES.includes(r.service_type) &&
      new Date(r.updated_date).getTime() >= since
  );

  if (recent.length < KEY_CANCEL_LIMIT) {
    return { blocked: false, minutesLeft: 0, cancelCount: recent.length };
  }

  // Bloqueio conta a partir do 3º cancelamento mais recente
  const third = recent[KEY_CANCEL_LIMIT - 1];
  const unlockAt = new Date(third.updated_date).getTime() + windowMs;
  const minutesLeft = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60000));
  return { blocked: true, minutesLeft, cancelCount: recent.length };
}