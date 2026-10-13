import { isValidCpf, onlyDigits } from './registrationEligibility.ts';
import { cpfCanBeAssigned } from './cpfOwnershipPolicy.ts';
import { userProfileFields } from './userProfileFields.ts';

// Recovery is restricted to the authenticated identity and stored administrative evidence.
export async function recoverClientRegistration(base44, user) {
  if (!user || user.role === 'admin' || user.moderation_blocked === true) return user;
  const rows = await base44.asServiceRole.entities.VerifiedCpf.filter({ user_id: user.id }, '-created_date', 100);
  if (user.account_type === 'chaveiro') {
    const latest = rows[0];
    const note = String(latest?.review_note || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (latest?.review_status !== 'rejected' || note !== 'nao e chaveiro' || rows.some(row => row.ownership_verified === true)) return user;
    const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id }, '-created_date', 1);
    if (profiles.length) return user;
    await base44.asServiceRole.entities.User.update(user.id, { ...userProfileFields(user), account_type: 'cliente' });
    user = await base44.asServiceRole.entities.User.get(user.id);
  }
  // Recover the client's own saved CPF, never an approved locksmith identity.
  if (user.account_type !== 'chaveiro' && !user.cpf) {
    const cpf = onlyDigits(rows[0]?.cpf);
    if (isValidCpf(cpf) && await cpfCanBeAssigned(base44, user, cpf)) {
      await base44.asServiceRole.entities.User.update(user.id, { ...userProfileFields(user), cpf });
      user = await base44.asServiceRole.entities.User.get(user.id);
    }
  }
  return user;
}
