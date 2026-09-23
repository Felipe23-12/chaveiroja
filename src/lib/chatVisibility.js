import { base44 } from "@/api/base44Client";

export async function loadHiddenMessageIds(userId) {
  if (!userId) return new Set();
  const rows = await base44.entities.ChatMessageVisibility.filter({ user_id: userId });
  return new Set(rows.map((row) => row.message_id));
}

export async function hideChatConversation(messages, userId) {
  if (!userId) throw new Error("Usuário não identificado");
  const hidden = await loadHiddenMessageIds(userId);
  for (const message of messages) {
    if (message.id && !hidden.has(message.id)) await hideChatMessage(message.id, userId);
  }
}

export async function hideChatMessage(messageId, userId) {
  if (!messageId || !userId) return;
  await base44.entities.ChatMessageVisibility.create({
    message_id: messageId,
    user_id: userId,
    hidden_at: new Date().toISOString(),
  });
}