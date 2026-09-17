import { base44 } from "@/api/base44Client";

export async function loadChatReadStates(userId) {
  if (!userId) return new Map();
  const rows = await base44.entities.ChatReadState.filter({ user_id: userId });
  const states = new Map();
  rows.forEach((row) => {
    const key = `${row.locksmith_id}:${row.client_id}`;
    if (!states.has(key) || Date.parse(row.last_read_at) > Date.parse(states.get(key))) states.set(key, row.last_read_at);
  });
  return states;
}

export async function markChatConversationRead(userId, locksmithId, clientId, lastReadAt) {
  if (!userId || !locksmithId || !clientId || !lastReadAt) return;
  const rows = await base44.entities.ChatReadState.filter({ user_id: userId, locksmith_id: locksmithId, client_id: clientId });
  const latest = rows.sort((a, b) => Date.parse(b.last_read_at) - Date.parse(a.last_read_at))[0];
  if (latest && Date.parse(latest.last_read_at) >= Date.parse(lastReadAt)) return;
  const data = { user_id: userId, locksmith_id: locksmithId, client_id: clientId, last_read_at: lastReadAt };
  if (latest) await base44.entities.ChatReadState.update(latest.id, data);
  else await base44.entities.ChatReadState.create(data);
}