export async function submitTrustedClientReview(base44, user, body) {
  const rating = Number(body.rating);
  const comment = String(body.comment || '').trim();
  if (!body.request_id || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 3000) return Response.json({ error: 'Avaliação inválida.' }, { status: 400 });
  const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
  if (!request || request.locksmith_user_id !== user.id || request.status !== 'completed') return Response.json({ error: 'Você só pode avaliar o cliente de um atendimento concluído seu.' }, { status: 403 });
  const existing = await base44.asServiceRole.entities.Review.filter({ service_request_id: request.id, review_type: 'client' }, '-created_date', 1);
  if (existing.length) return Response.json({ error: 'Este cliente já foi avaliado neste atendimento.' }, { status: 409 });
  const [locksmith, client] = await Promise.all([
    base44.asServiceRole.entities.Locksmith.get(request.locksmith_id),
    base44.asServiceRole.entities.User.get(request.created_by_id),
  ]);
  if (!locksmith || locksmith.created_by_id !== user.id) return Response.json({ error: 'Perfil de chaveiro inválido.' }, { status: 403 });
  const review = await base44.asServiceRole.entities.Review.create({ locksmith_id: locksmith.id, locksmith_name: locksmith.name, client_id: request.created_by_id, customer_name: client?.full_name || 'Cliente', reviewer_id: user.id, rating, comment, service_type: request.service_type, service_request_id: request.id, work_mode: 'app', review_type: 'client' });
  return Response.json({ success: true, review });
}

export async function submitTrustedReview(base44, user, body) {
  const rating = Number(body.rating), mode = body.work_mode;
  if (!body.locksmith_id || !Number.isInteger(rating) || rating < 1 || rating > 5 || !['app', 'livre'].includes(mode) || String(body.comment || '').length > 3000) return Response.json({ error: 'Avaliação inválida.' }, { status: 400 });
  const locksmith = await base44.asServiceRole.entities.Locksmith.get(body.locksmith_id);
  if (!locksmith || locksmith.created_by_id === user.id) return Response.json({ error: 'Você não pode avaliar este perfil.' }, { status: 403 });
  const recent = await base44.asServiceRole.entities.Review.filter({ reviewer_id: user.id, created_date: { $gte: new Date(Date.now() - 86400000).toISOString() } }, '-created_date', 10);
  if (recent.length >= 10 || (recent[0] && Date.parse(recent[0].created_date) > Date.now() - 30000)) return Response.json({ error: 'Aguarde antes de enviar outra avaliação.' }, { status: 429 });
  let anchor, entity, request;
  if (mode === 'app') {
    if (!body.service_request_id) return Response.json({ error: 'Informe o atendimento concluído.' }, { status: 403 });
    request = await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id);
    if (!request || request.created_by_id !== user.id || request.locksmith_id !== locksmith.id || request.status !== 'completed') return Response.json({ error: 'Você só pode avaliar um atendimento concluído seu.' }, { status: 403 });
    const existing = await base44.asServiceRole.entities.Review.filter({ service_request_id: request.id }, '-created_date', 10);
    if (existing.some((review) => review.review_type !== 'client') || request.rating != null) return Response.json({ error: 'Este atendimento já foi avaliado.' }, { status: 409 });
    anchor = request; entity = base44.asServiceRole.entities.ServiceRequest;
  } else {
    if (locksmith.work_mode !== 'livre' || body.service_request_id) return Response.json({ error: 'Modo de avaliação inválido.' }, { status: 403 });
    const existing = await base44.asServiceRole.entities.Review.filter({ locksmith_id: locksmith.id, work_mode: 'livre', $or: [{ reviewer_id: user.id }, { created_by_id: user.id }] }, '-created_date', 1);
    if (existing.length) return Response.json({ error: 'Esta conversa já foi avaliada.' }, { status: 409 });
    const messages = await base44.asServiceRole.entities.ChatMessage.filter({ locksmith_id: locksmith.id, client_id: user.id, sender_type: 'customer', $or: [{ sender_user_id: user.id }, { created_by_id: user.id }] }, 'created_date', 1);
    if (!messages.length) return Response.json({ error: 'Você só pode avaliar uma conversa sua.' }, { status: 403 });
    anchor = messages[0]; entity = base44.asServiceRole.entities.ChatMessage;
  }
  // One conditional write on the existing unique anchor, before insertion.
  // Fail closed after interruption: never release a consumed claim automatically.
  const claimed = await entity.updateMany({ id: anchor.id, review_claimed: { $ne: true } }, { $set: { review_claimed: true } });
  if (claimed.updated !== 1) return Response.json({ error: 'Avaliação já enviada ou em processamento.' }, { status: 409 });
  await base44.asServiceRole.entities.Review.create({ locksmith_id: locksmith.id, locksmith_name: locksmith.name, reviewer_id: user.id, customer_name: user.full_name || 'Cliente', rating, comment: String(body.comment || '').trim(), work_mode: mode, review_type: 'locksmith', ...(request ? { service_request_id: request.id, service_type: request.service_type } : {}) });
  if (request) await base44.asServiceRole.entities.ServiceRequest.update(request.id, { rating, review: String(body.comment || '').trim() });
  let count = 0, sum = 0;
  for (let offset = 0; ; offset += 100) {
    const page = await base44.asServiceRole.entities.Review.filter({ locksmith_id: locksmith.id }, 'created_date', 100, offset);
    const reviews = page.filter((review) => review.review_type !== 'client');
    count += reviews.length; sum += reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
    if (page.length < 100) break;
  }
  await base44.asServiceRole.entities.Locksmith.update(locksmith.id, { rating: Math.round(sum / count * 10) / 10, reviews_count: count });
  return Response.json({ success: true });
}