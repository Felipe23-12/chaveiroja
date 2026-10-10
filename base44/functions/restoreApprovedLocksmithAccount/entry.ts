import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { persistLocksmithAccount } from '../../shared/persistLocksmithAccount.ts';
import { userProfileFields } from '../../shared/userProfileFields.ts';
import { isValidCpf } from '../../shared/registrationEligibility.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });
    if (user.role === 'admin' || user.is_verified !== true || user.account_type === 'chaveiro') {
      return Response.json({ restored: false });
    }
    // Only this account's explicit administrative locksmith approval is trusted.
    // A pending request, a profile or an old unreviewed CPF cannot grant access.
    const rows = await base44.asServiceRole.entities.VerifiedCpf.filter({
      user_id: user.id, ownership_verified: true, review_status: 'approved',
      reviewed_by: { $exists: true, $ne: '' }, reviewed_at: { $exists: true, $ne: '' },
    }, '-reviewed_at', 1);
    const approval = rows[0];
    if (!approval || !isValidCpf(approval.cpf)) return Response.json({ restored: false });
    const saved = await persistLocksmithAccount(base44, user.id, approval.cpf);
    return Response.json({ restored: true, profile: userProfileFields(saved) });
  } catch (error) {
    console.error('Falha ao restaurar categoria aprovada:', error.message);
    return Response.json({ error: 'Não foi possível sincronizar a categoria da conta. Tente novamente.' }, { status: 500 });
  }
}