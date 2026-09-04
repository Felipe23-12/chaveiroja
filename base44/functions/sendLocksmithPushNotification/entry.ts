import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';

const DEFAULT_RADIUS_KM = 15;

// Distância em km entre dois pontos (Haversine)
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalCall = verifyInternalCall(body);
    const user = internalCall ? null : await base44.auth.me().catch(() => null);
    if (!internalCall && !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!internalCall && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
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

      // Confere o raio de atendimento do chaveiro antes de notificar —
      // evita alertas de chamados fora da zona configurada por ele.
      if (sr.customer_lat && sr.customer_lng && locksmith.lat && locksmith.lng) {
        const dist = haversineKm(locksmith.lat, locksmith.lng, sr.customer_lat, sr.customer_lng);
        if (dist > (locksmith.service_radius_km || DEFAULT_RADIUS_KM)) continue;
      }

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