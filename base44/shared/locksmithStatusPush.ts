export async function notifyLocksmithStatus(base44, request, eventType, dryRun = false) {
  const cancelled = eventType === 'client_cancelled' && request.status === 'cancelled' && request.cancelled_by === 'cliente';
  const arrived = eventType === 'arrival_confirmed' && request.client_arrived_confirmed === true && request.locksmith_arrived === true && ['accepted', 'on_the_way'].includes(request.status);
  const cashSelected = eventType === 'cash_payment_selected' && request.payment_method === 'dinheiro' && request.client_confirmed === true && ['accepted', 'on_the_way'].includes(request.status);
  if (!cancelled && !arrived && !cashSelected) return { skipped: true, reason: 'O estado atual não corresponde ao aviso' };
  // Antes do aceite, avisa quem estava recebendo o chamado; após o aceite, só o responsável.
  const assigned = request.accepted_at || request.queued_at || request.locksmith_arrived;
  const targets = Array.from(new Set(cancelled && !assigned && request.ringing_locksmith_ids?.length
    ? request.ringing_locksmith_ids : [request.locksmith_id])).filter(Boolean);
  const title = cancelled ? 'Cliente cancelou o chamado' : cashSelected ? 'Pagamento em dinheiro selecionado' : 'Cliente confirmou sua chegada';
  const content = cancelled
    ? `${request.service_type}: o cliente cancelou este chamado. Não é necessário continuar o deslocamento. Confira o painel.`
    : cashSelected
      ? `${request.service_type}: o cliente pagará R$ ${Number(request.price || 0).toFixed(2)} em dinheiro. Confirme o recebimento no painel.`
      : `${request.service_type}: sua chegada foi confirmada. Registre as fotos iniciais para começar o atendimento.`;
  const notified = [];
  const pending = [];
  const failures = [];
  for (const locksmithId of targets) {
    const profile = await base44.asServiceRole.entities.Locksmith.get(locksmithId);
    if (!profile?.created_by_id) continue;
    const query = { request_id: request.id, locksmith_id: locksmithId, user_id: profile.created_by_id, event_type: eventType };
    const existing = await base44.asServiceRole.entities.LocksmithStatusNotification.filter(query, '-created_date', 1);
    if (existing.length) continue;
    pending.push(locksmithId);
    if (dryRun) continue;
    try {
      await base44.asServiceRole.integrations.Core.SendPushNotification({
        user_id: profile.created_by_id, title, content,
        action_label: 'Abrir painel', action_url: '/painel-chaveiro',
      });
      await base44.asServiceRole.entities.LocksmithStatusNotification.create({ ...query, sent_at: new Date().toISOString() });
      notified.push(locksmithId);
    } catch (error) {
      failures.push(locksmithId);
      console.error('Falha no aviso ao chaveiro', { request_id: request.id, locksmith_id: locksmithId, event_type: eventType, error: error.message });
    }
  }
  if (failures.length) throw new Error(`Falha ao enviar ${failures.length} aviso(s) ao chaveiro; os envios concluídos foram registrados.`);
  return { success: true, event_type: eventType, notified_count: notified.length, pending_count: pending.length, dry_run: dryRun };
}