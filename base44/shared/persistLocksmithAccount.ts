import { userProfileFields } from './userProfileFields.ts';
import { isValidCpf, onlyDigits } from './registrationEligibility.ts';

// Call only after administrator approval or a trusted approval lookup for
// the authenticated account. Never accept a caller-selected account here.
export async function persistLocksmithAccount(base44, userId, requestedCpf) {
  const cpf = onlyDigits(requestedCpf);
  if (!isValidCpf(cpf)) throw new Error('CPF aprovado inválido.');
  const current = await base44.asServiceRole.entities.User.get(userId);
  if (!current) throw new Error('Conta não encontrada.');
  await base44.asServiceRole.entities.User.update(userId, {
    ...userProfileFields(current), account_type: 'chaveiro', cpf,
  });
  // Approval must not report success until the database confirms the category.
  const saved = await base44.asServiceRole.entities.User.get(userId);
  if (saved.account_type !== 'chaveiro' || onlyDigits(saved.cpf) !== cpf) {
    throw new Error('Não foi possível persistir a categoria de chaveiro.');
  }
  return saved;
}