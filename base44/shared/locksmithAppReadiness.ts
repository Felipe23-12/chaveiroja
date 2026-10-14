import { scoreAvailable } from './scoreDispatchPolicy.ts';
import { isValidCpf, onlyDigits } from './registrationEligibility.ts';

export function activePaymentAccount(accounts: any[], locksmith: any) {
  return accounts.find(account => account.status === 'active' &&
    (account.locksmith_user_id === locksmith.created_by_id ||
      (!account.locksmith_user_id && account.locksmith_id === locksmith.id)));
}

export async function filterAppReadyLocksmiths(base44: any, profiles: any[], suppliedScores?: any[]) {
  if (!profiles.length) return [];
  const entities = base44.asServiceRole.entities;
  const userIds = [...new Set(profiles.map(profile => profile.created_by_id).filter(Boolean))];
  const [users, approvals, accounts, scoreRows] = await Promise.all([
    entities.User.filter({ id: { $in: userIds } }, '-updated_date', 500, 0, ['id', 'role', 'cpf', 'moderation_blocked']),
    entities.VerifiedCpf.filter({ user_id: { $in: userIds }, ownership_verified: true }, '-created_date', 500, 0, ['user_id', 'cpf']),
    entities.MercadoPagoAccount.filter({ status: 'active', $or: [
      { locksmith_user_id: { $in: userIds } }, { locksmith_id: { $in: profiles.map(profile => profile.id) } },
    ] }, '-updated_date', 500, 0, ['locksmith_user_id', 'locksmith_id', 'status']),
    suppliedScores || entities.LocksmithScore.filter({ locksmith_id: { $in: profiles.map(profile => profile.id) } }, '-updated_date', 500, 0, ['locksmith_id', 'score', 'banned', 'suspended_until']),
  ]);
  const byUser = new Map(users.map(user => [user.id, user]));
  // A primeira aprovação é a mais recente, como verifiedCpf() usa no aceite.
  const byApproval = new Map();
  for (const approval of approvals) if (!byApproval.has(approval.user_id)) byApproval.set(approval.user_id, approval);
  const scores = new Map();
  for (const row of scoreRows) if (!scores.has(row.locksmith_id)) scores.set(row.locksmith_id, row);
  const now = Date.now();
  return profiles.filter(profile => {
    if (!profile.online || profile.inactive_deactivated || Date.parse(profile.blocked_until || '') > now ||
      (profile.work_mode === 'livre' && (profile.receive_app_requests === false || profile.monthly_fee_paid !== true)) ||
      !scoreAvailable(scores.get(profile.id), now)) return false;
    const user: any = byUser.get(profile.created_by_id);
    const approvedCpf = onlyDigits(byApproval.get(profile.created_by_id)?.cpf);
    const approved = user && (user.role === 'admin' ||
      (isValidCpf(approvedCpf) && approvedCpf === onlyDigits(user.cpf)));
    return approved && !user.moderation_blocked && Boolean(activePaymentAccount(accounts, profile));
  });
}
