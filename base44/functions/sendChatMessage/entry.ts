import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Faça login para enviar mensagens.' }, { status: 401 });
    const { locksmith_id, client_id, message, photo_url } = await req.json();
    const text = String(message || '').trim();
    if (!locksmith_id || !text || text.length > 1000) return Response.json({ error: 'Mensagem inválida.' }, { status: 400 });
    if (/https?:\/\/|www\./i.test(text)) return Response.json({ error: 'Links não são permitidos.' }, { status: 400 });
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(locksmith_id).catch(() => null);
    if (!locksmith) return Response.json({ error: 'Chaveiro não encontrado.' }, { status: 404 });
    const isLocksmith = locksmith.created_by_id === user.id;
    if (isLocksmith && !client_id) return Response.json({ error: 'Cliente não informado.' }, { status: 400 });
    const customerId = isLocksmith ? client_id : user.id;
    if (isLocksmith) {
      const conversation = await base44.asServiceRole.entities.ChatMessage.filter({ locksmith_id, client_id: customerId });
      const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ locksmith_id, created_by_id: customerId });
      if (!conversation.length && !requests.length) return Response.json({ error: 'Conversa não encontrada.' }, { status: 403 });
    }
    const created = await base44.asServiceRole.entities.ChatMessage.create({
      locksmith_id, locksmith_name: locksmith.name, locksmith_user_id: locksmith.created_by_id,
      client_id: customerId, client_name: isLocksmith ? undefined : (user.full_name || 'Cliente'),
      sender_type: isLocksmith ? 'locksmith' : 'customer',
      sender_name: isLocksmith ? locksmith.name : (user.full_name || 'Cliente'),
      sender_user_id: user.id, message: text,
      ...(photo_url ? { photo_url } : {}),
    });
    return Response.json({ message: created });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro ao enviar mensagem.' }, { status: 500 });
  }
}
