import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';

// Envia push nativo ao destinatário de uma mensagem de chat, para que o alerta
// toque e apareça na tela do celular mesmo com o app fechado ou bloqueado.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!verifyInternalCall(req, body)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const messageId = body.chat_message_id;
    if (!messageId) return Response.json({ error: 'chat_message_id é obrigatório' }, { status: 400 });

    const msg = await base44.asServiceRole.entities.ChatMessage.get(messageId);
    if (!msg) return Response.json({ error: 'Mensagem não encontrada' }, { status: 404 });

    // Cliente/sistema escreveu → avisa o chaveiro. Chaveiro escreveu → avisa o cliente.
    const toLocksmith = msg.sender_type !== 'locksmith';
    let userId = toLocksmith ? msg.locksmith_user_id : msg.client_id;

    if (toLocksmith && !userId && msg.locksmith_id) {
      const locksmith = await base44.asServiceRole.entities.Locksmith.get(msg.locksmith_id).catch(() => null);
      userId = locksmith?.created_by_id;
    }
    if (!userId) return Response.json({ skipped: true, reason: 'Destinatário sem usuário vinculado' });

    const senderName = msg.sender_name || (toLocksmith ? msg.client_name || 'Cliente' : msg.locksmith_name || 'Chaveiro');
    const text = (msg.message || '').slice(0, 140);

    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: userId,
      title: `💬 ${senderName}`,
      content: text,
      action_label: 'Abrir conversa',
      action_url: toLocksmith ? '/painel-chaveiro' : `/chat/${msg.locksmith_id}`,
    });

    return Response.json({ success: true, user_id: userId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}