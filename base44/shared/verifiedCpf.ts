import { isValidCpf, onlyDigits } from './registrationEligibility.ts';

export async function verifiedCpf(base44, userId) {
  const rows = await base44.asServiceRole.entities.VerifiedCpf.filter({ user_id: userId }, '-created_date', 1);
  const cpf = onlyDigits(rows[0]?.cpf);
  return isValidCpf(cpf) ? cpf : null;
}