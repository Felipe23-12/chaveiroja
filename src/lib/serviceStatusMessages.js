// Mensagens automáticas de status enviadas no chat do atendimento,
// mantendo cliente e chaveiro alinhados sobre cada etapa do serviço.
import { base44 } from "@/api/base44Client";

const TEXTS = {
  accepted: (name) => `✅ ${name} confirmou o atendimento e já está se preparando para sair.`,
  on_the_way: (name) => `🚗 ${name} saiu e está a caminho do seu endereço.`,
  nearby: (name) => `📍 ${name} está a menos de 1 km — prepare-se para recebê-lo.`,
  arrived: (name) => `🔔 ${name} chegou ao local do atendimento.`,
  not_arrived: (name) =>
    `⚠️ O cliente informou que ${name} ainda não chegou ao endereço do atendimento.`,
  finished: (name) => `🧾 ${name} registrou a finalização do serviço. Confirme e efetue o pagamento.`,
};

export async function sendServiceStatusMessage(event, { request, locksmith }) {
  const build = TEXTS[event];
  if (!build || !request || !locksmith) return;
  try {
    const user = await base44.auth.me();
    await base44.entities.ChatMessage.create({
      locksmith_id: locksmith.id,
      locksmith_name: locksmith.name,
      locksmith_user_id: locksmith.created_by_id,
      client_id: user?.id,
      client_name: user?.full_name || "Cliente",
      sender_type: "system",
      sender_name: "Chaveiro Já",
      message: build(locksmith.name?.split(" ")[0] || "O chaveiro"),
    });
  } catch (e) {
    /* mensagem automática não bloqueia o fluxo do serviço */
  }
}