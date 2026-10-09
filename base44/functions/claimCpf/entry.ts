import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

import { onlyDigits, isValidCpf } from '../../shared/registrationEligibility.ts';
import { verifiedCpf } from '../../shared/verifiedCpf.ts';

function formatCpf(cpf) {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

// Exceção individual autorizada pelo titular: a conta operacional de chaveiro
// abaixo pode compartilhar o CPF já usado pela conta administrativa/cliente.
// A regra geral de unicidade continua valendo para todos os demais usuários.
const SHARED_OWNER_EXCEPTION = Object.freeze({
  cpf: '03693893101',
  locksmithEmail: 'chaveiro.carvalho24h@gmail.com',
  adminEmail: 'felipemotacs1@gmail.com',
});

function isAllowedOwnerDuplicate(user, cpf, duplicateAccounts = [], trustedMatches = []) {
  if (cpf !== SHARED_OWNER_EXCEPTION.cpf) return false;
  if (String(user?.email || '').toLowerCase() !== SHARED_OWNER_EXCEPTION.locksmithEmail) return false;
  if (user?.account_type !== 'chaveiro') return false;

  const otherUsers = duplicateAccounts.filter((account) => account.id !== user.id);
  const otherTrustedIds = trustedMatches.filter((row) => row.user_id !== user.id).map((row) => row.user_id);
  const allowedAdmin = otherUsers.find((account) =>
    String(account?.email || '').toLowerCase() === SHARED_OWNER_EXCEPTION.adminEmail &&
    account?.role === 'admin' &&
    account?.account_type === 'cliente'
  );
  if (!allowedAdmin) return false;

  return otherUsers.every((account) => account.id === allowedAdmin.id) &&
    otherTrustedIds.every((id) => id === allowedAdmin.id);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body.action === 'status') {
      const linked = await verifiedCpf(base44, user.id);
      return Response.json({ linked: Boolean(linked && linked === onlyDigits(user.cpf)) });
    }
    const cpf = onlyDigits(body.cpf);
    if (!isValidCpf(cpf)) {
      return Response.json({ error: 'CPF inválido — confira os números digitados' }, { status: 400 });
    }
    // Confirma apenas o recebimento, nunca a disponibilidade de um CPF.
    const received = () => Response.json({ received: true, linked: false, message: 'Solicitação de vínculo recebida para análise administrativa.' });
    const linkedCpf = await verifiedCpf(base44, user.id);
    if (linkedCpf) {
      if (linkedCpf === cpf && onlyDigits(user.cpf) !== cpf) await base44.auth.updateMe({ cpf });
      return received();
    }
    // Um CPF legado só pode ser confirmado para o mesmo titular, nunca trocado.
    // Exceção: a conta operacional autorizada abaixo já possuía um CPF legado e
    // precisa substituí-lo pelo CPF compartilhado com a conta administrativa.
    const ownerLegacyReplacement =
      cpf === SHARED_OWNER_EXCEPTION.cpf &&
      String(user?.email || '').toLowerCase() === SHARED_OWNER_EXCEPTION.locksmithEmail &&
      user?.account_type === 'chaveiro';
    if (user.cpf && onlyDigits(user.cpf) !== cpf && !ownerLegacyReplacement) return received();
    const attemptedAfter = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recentAttempts = await base44.asServiceRole.entities.ClaimCpfAttempt.filter({
      user_id: user.id,
      attempted_at: { $gte: attemptedAfter },
    });
    if (recentAttempts.length >= 5) {
      return Response.json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }, { status: 429 });
    }
    await base44.asServiceRole.entities.ClaimCpfAttempt.create({
      user_id: user.id,
      attempted_at: new Date().toISOString(),
    });

    const [plainMatches, formattedMatches, blockedMatches] = await Promise.all([
      base44.asServiceRole.entities.User.filter({ cpf }),
      base44.asServiceRole.entities.User.filter({ cpf: formatCpf(cpf) }),
      base44.asServiceRole.entities.BlockedCpf.filter({ cpf }),
    ]);
    const trustedMatches = await base44.asServiceRole.entities.VerifiedCpf.filter({ cpf, ownership_verified: true });
    const duplicateAccounts = [...plainMatches, ...formattedMatches].filter((account, index, all) => all.findIndex((item) => item.id === account.id) === index);
    const duplicate = duplicateAccounts.find((account) => account.id !== user.id) || trustedMatches.find((account) => account.user_id !== user.id);
    const allowedOwnerDuplicate = duplicate && isAllowedOwnerDuplicate(user, cpf, duplicateAccounts, trustedMatches);
    if (!blockedMatches.length && (!duplicate || allowedOwnerDuplicate)) {
      const pending = await base44.asServiceRole.entities.VerifiedCpf.filter({ user_id: user.id, cpf }, '-created_date', 1);
      // Informar um CPF não comprova titularidade. Apenas o administrador pode aprovar.
      if (!pending.length) await base44.asServiceRole.entities.VerifiedCpf.create({ user_id: user.id, cpf, ownership_verified: false });
    }
    return received();
  } catch (error) {
    return Response.json({ error: 'Não foi possível processar a solicitação de CPF' }, { status: 500 });
  }
}