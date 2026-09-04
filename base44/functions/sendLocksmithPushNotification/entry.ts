import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!verifyInternalCall(body)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const serviceRequestId = body.service_request_id;

    if (!serviceRequestId) {
      return Response.json({ error: "service_request_id é obrigatório" }, { status: 400 });
    }

    // Busca o pedido recém-criado
    const sr = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    if (!sr) {
      return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // Só notifica pedidos recém-criados (status searching ou ringing)
    if (sr.status !== "searching" && sr.status !== "ringing") {
      return Response.json({ skipped: true, reason: `status ${sr.status} não requer notificação` });
    }

    if (!sr.locksmith_id) {
      return Response.json({ skipped: true, reason: "Nenhum chaveiro atribuído" });
    }

    // Busca o chaveiro para obter o user_id (created_by_id)
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(sr.locksmith_id).catch(() => null);
    if (!locksmith) {
      return Response.json({ skipped: true, reason: "Chaveiro não encontrado" });
    }

    const locksmithUserId = locksmith.created_by_id;
    if (!locksmithUserId) {
      return Response.json({ skipped: true, reason: "Chaveiro sem usuário vinculado" });
    }

    // Monta a mensagem com tipo de serviço e localização exata
    const serviceType = sr.service_type || "Serviço de chaveiro";
    const address = sr.address || "Endereço não informado";
    const urgencyLabel = sr.urgency === "urgent" ? " (URGENTE)" : "";

    const title = `🔔 Novo pedido${urgencyLabel}`;
    const content = `${serviceType}\n📍 ${address}`;

    // Envia a notificação push ao chaveiro
    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: locksmithUserId,
      title,
      content,
      action_label: "Ver pedido",
      action_url: "/painel-chaveiro",
    });

    return Response.json({
      success: true,
      locksmith_id: sr.locksmith_id,
      locksmith_name: locksmith.name,
      service_type: serviceType,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}