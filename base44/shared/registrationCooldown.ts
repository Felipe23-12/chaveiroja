import { onlyDigits } from './registrationEligibility.ts';

export async function registrationCooldown(base44, userId, cpf) {
  const identities = [{ user_id: userId }];
  const digits = onlyDigits(cpf);
  if (digits.length === 11) identities.push({ cpf: digits });
  const { items } = await base44.asServiceRole.entities.VerifiedCpf.filter({
    review_status: 'rejected', retry_after: { $gt: new Date().toISOString() }, $or: identities,
  }, { sort: '-retry_after', limit: 1, fields: ['retry_after'] });
  const retryAfter = items[0]?.retry_after || null;
  const date = retryAfter ? new Date(retryAfter).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
  return { retry_blocked: Boolean(retryAfter), retry_after: retryAfter, message: date ? `Cadastro reprovado. Aguarde 15 dias após a reprovação. Nova tentativa liberada em ${date} (horário de Brasília).` : null };
}

export async function rejectLocksmithRegistration(base44, row, adminId, note) {
  const reviewedAt = new Date().toISOString();
  const retryAfter = new Date(Date.parse(reviewedAt) + 15 * 24 * 60 * 60 * 1000).toISOString();
  const values = { review_status: 'rejected', ownership_verified: false, retry_after: retryAfter, reviewed_at: reviewedAt, reviewed_by: adminId, review_note: note };
  await base44.entities.VerifiedCpf.update(row.id, values);
  // Close other pending applications of this account so they cannot bypass rejection.
  let result;
  do {
    result = await base44.entities.VerifiedCpf.updateMany({ user_id: row.user_id, ownership_verified: { $ne: true }, review_status: { $ne: 'rejected' } }, { $set: values });
  } while (result.has_more);
  return { rejected: true, retry_after: retryAfter };
}