// Envio de push nativo para os chaveiros com chamado tocando.
// Compartilhado entre o alerta inicial (novo pedido) e o reforço contínuo
// que repete o alerta enquanto ninguém aceita.

import { loadServiceAreas, isAreaAvailable } from './serviceAreas.ts';

const DEFAULT_RADIUS_KM = 15;

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Chamado sem chaveiro atribuído (status "searching"): avisa todos os
 * chaveiros online cujo raio de atendimento alcança o endereço do cliente.
 * Garante que o celular apite mesmo quando o chamado ainda não foi direcionado.
 */
export async function notifyNearbyOnlineLocksmiths(base44: any, sr: any) {
  if (!sr.customer_lat || !sr.customer_lng) return { notified: [] };

  const locksmiths = await base44.asServiceRole.entities.Locksmith
    .filter({ online: true })
    .catch(() => []);

  const eligible = (locksmiths || []).filter((l: any) => {
    if (!l.lat || !l.lng || !l.created_by_id) return false;
    const dist = haversineKm(l.lat, l.lng, sr.customer_lat, sr.customer_lng);
    return dist <= (l.service_radius_km || DEFAULT_RADIUS_KM);
  });

  if (eligible.length === 0) return { notified: [] };

  return notifyRingingLocksmiths(
    base44,
    { ...sr, ringing_locksmith_ids: eligible.map((l: any) => l.id) },
    true
  );
}

/**
 * Notifica todos os chaveiros para quem o chamado está tocando.
 * repeat = true reenvia o alerta mesmo para quem já recebeu (reforço contínuo).
 */
export async function notifyRingingLocksmiths(base44: any, sr: any, repeat = false) {
  const areas = await loadServiceAreas(base44);
  if (!isAreaAvailable(areas, sr.customer_lat, sr.customer_lng)) return { notified: [], reason: 'Endereço fora das áreas liberadas' };
  const locksmithIds = (sr.ringing_locksmith_ids || []).length > 0
    ? sr.ringing_locksmith_ids
    : (sr.locksmith_id ? [sr.locksmith_id] : []);

  if (locksmithIds.length === 0) return { notified: [], reason: "Nenhum chaveiro atribuído" };

  const alreadyNotified = sr.push_notified_locksmith_ids || [];
  const targets = repeat ? locksmithIds : locksmithIds.filter((id: string) => !alreadyNotified.includes(id));
  if (targets.length === 0) return { notified: [], reason: "Todos os chaveiros já foram notificados" };

  // Chaveiros que recusaram e ainda estão no intervalo de espera não recebem alerta
  const now = Date.now();
  const inCooldown = new Set(
    (sr.rejections || [])
      .filter((r: any) => r.rering_at && new Date(r.rering_at).getTime() > now)
      .map((r: any) => r.locksmith_id)
  );

  const serviceType = sr.service_type || "Serviço de chaveiro";
  const address = sr.address || "Endereço não informado";
  const isUrgent = sr.urgency === "urgent";
  // Título curto e direto — é o que aparece na tela de bloqueio do celular
  const title = isUrgent ? "🚨 CHAMADO URGENTE — atenda agora!" : "🔔 Novo chamado disponível";
  const priceLine = sr.price ? `\n💰 R$ ${Number(sr.price).toFixed(2)}` : "";
  const content = `${serviceType}\n📍 ${address}${priceLine}\nToque para aceitar antes de outro chaveiro.`;

  const notified: string[] = [];
  for (const locksmithId of targets) {
    if (inCooldown.has(locksmithId)) continue;
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(locksmithId).catch(() => null);
    const userId = locksmith?.created_by_id;
    if (!userId || locksmith.online !== true || !isAreaAvailable(areas, locksmith.lat, locksmith.lng)) continue;

    // Confere o raio de atendimento do chaveiro antes de notificar
    if (sr.customer_lat && sr.customer_lng && locksmith.lat && locksmith.lng) {
      const dist = haversineKm(locksmith.lat, locksmith.lng, sr.customer_lat, sr.customer_lng);
      if (dist > (locksmith.service_radius_km || DEFAULT_RADIUS_KM)) continue;
    }

    try {
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
    const merged = Array.from(new Set([...alreadyNotified, ...notified]));
    await base44.asServiceRole.entities.ServiceRequest.update(sr.id, {
      push_notified_locksmith_ids: merged,
    });
  }

  return { notified };
}