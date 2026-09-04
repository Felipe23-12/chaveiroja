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

    const sr = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    if (!sr) {
      return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    // Só notifica pedidos que ainda estão procurando chaveiro
    if (sr.status !== "searching" && sr.status !== "ringing") {
      return Response.json({ skipped: true, reason: `status ${sr.status} não requer notificação` });
    }

    // Todos os chaveiros para quem o chamado está tocando (broadcast + ampliações de raio)
    const locksmithIds = (sr.ringing_locksmith_ids || []).length > 0
      ? sr.ringing_locksmith_ids
      : (sr.locksmith_id ? [sr.locksmith_id] : []);

    if (locksmithIds.length === 0) {
      return Response.json({ skipped: true, reason: "Nenhum chaveiro atribuído" });
    }

    // Evita notificar de novo quem já recebeu o alerta deste chamado
    const alreadyNotified = sr.push_notified_locksmith_ids || [];
    const targets = locksmithIds.filter((id) => !alreadyNotified.includes(id));
    if (targets.length === 0) {
      return Response.json({ skipped: true, reason: "Todos os chaveiros já foram notificados" });
    }

    const serviceType = sr.service_type || "Serviço de chaveiro";
    const address = sr.address || "Endereço não informado";
    const urgencyLabel = sr.urgency === "urgent" ? " (URGENTE)" : "";
    const title = `🔔 Novo chamado${urgencyLabel}`;
    const content = `${serviceType}\n📍 ${address}`;

    const notified = [];
    for (const locksmithId of targets) {
      const locksmith = await base44.asServiceRole.entities.Locksmith.get(locksmithId).catch(() => null);
      const userId = locksmith?.created_by_id;
      if (!userId) continue;
      try {
        // Push nativo: toca o som de notificação no celular mesmo com o app fechado
        await base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: userId,
          title,
          content,
          action_label: "Ver chamado",
          action_url: "/painel-chaveiro",
        });
        notified.push(locksmithId);
      } catch (e) {
        // segue para os demais chaveiros
      }
    }

    if (notified.length > 0) {
      await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, {
        push_notified_locksmith_ids: [...alreadyNotified, ...notified],
      });
    }

    return Response.json({ success: true, notified_count: notified.length, notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}