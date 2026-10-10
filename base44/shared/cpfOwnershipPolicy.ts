export function formatCpf(cpf) {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

// Exceção individual já autorizada; não amplia a regra geral de unicidade.
export const SHARED_OWNER_EXCEPTION = Object.freeze({
  cpf: '03693893101',
  locksmithEmail: 'chaveiro.carvalho24h@gmail.com',
  adminEmail: 'felipemotacs1@gmail.com',
});

function isAllowedOwnerDuplicate(user, cpf, duplicateAccounts, trustedMatches) {
  if (cpf !== SHARED_OWNER_EXCEPTION.cpf || String(user?.email || '').toLowerCase() !== SHARED_OWNER_EXCEPTION.locksmithEmail || user?.account_type !== 'chaveiro') return false;
  const otherUsers = duplicateAccounts.filter(account => account.id !== user.id);
  const otherTrustedIds = trustedMatches.filter(row => row.user_id !== user.id).map(row => row.user_id);
  const allowedAdmin = otherUsers.find(account => String(account?.email || '').toLowerCase() === SHARED_OWNER_EXCEPTION.adminEmail && account.role === 'admin' && account.account_type === 'cliente');
  return Boolean(allowedAdmin && otherUsers.every(account => account.id === allowedAdmin.id) && otherTrustedIds.every(id => id === allowedAdmin.id));
}

export async function cpfCanBeAssigned(base44, user, cpf) {
  const [plain, formatted, blocked, trusted] = await Promise.all([
    base44.asServiceRole.entities.User.filter({ cpf }),
    base44.asServiceRole.entities.User.filter({ cpf: formatCpf(cpf) }),
    base44.asServiceRole.entities.BlockedCpf.filter({ cpf }),
    base44.asServiceRole.entities.VerifiedCpf.filter({ cpf, ownership_verified: true }),
  ]);
  const accounts = [...new Map([...plain, ...formatted].map(account => [account.id, account])).values()];
  const duplicate = accounts.some(account => account.id !== user.id) || trusted.some(row => row.user_id !== user.id);
  return !blocked.length && (!duplicate || isAllowedOwnerDuplicate(user, cpf, accounts, trusted));
}