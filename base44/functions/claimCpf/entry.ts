import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

import { onlyDigits, isValidCpf } from '../../shared/registrationEligibility.ts';
import { verifiedCpf } from '../../shared/verifiedCpf.ts';
import { registrationCooldown } from '../../shared/registrationCooldown.ts';
import { userProfileFields } from '../../shared/userProfileFields.ts';

import { cpfCanBeAssigned, SHARED_OWNER_EXCEPTION } from '../../shared/cpfOwnershipPolicy.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body.action === 'status') {
      const linked = await verifiedCpf(base44, user.id);
      const rows = linked ? [] : await base44.asServiceRole.entities.VerifiedCpf.filter({ user_id: user.id, ownership_verified: { $ne: true } }, '-created_date', 1);
      const latest = rows[0];
      const cooldown = await registrationCooldown(base44, user.id, user.cpf || latest?.cpf);
      const rejected = latest?.review_status === 'rejected';
      return Response.json({ linked: Boolean(linked && linked === onlyDigits(user.cpf)), pending: Boolean(latest && !rejected && !cooldown.retry_blocked), requested_cpf: latest?.cpf || null, rejected, ...cooldown, message: cooldown.message || (rejected ? 'O prazo de 15 dias terminou. Você pode enviar uma nova solicitação de análise do cadastro.' : null) });
    }
    const cpf = onlyDigits(body.cpf);
    if (!isValidCpf(cpf)) {
      return Response.json({ error: 'CPF inválido — confira os números digitados' }, { status: 400 });
    }
    const cooldown = await registrationCooldown(base44, user.id, cpf);
    if (cooldown.retry_blocked) return Response.json({ error: cooldown.message, retry_after: cooldown.retry_after }, { status: 409 });
    // Confirma apenas o recebimento, nunca a disponibilidade de um CPF.
    const received = () => Response.json({ received: true, linked: false, message: 'Solicitação de vínculo recebida para análise administrativa.' });
    const linkedCpf = await verifiedCpf(base44, user.id);
    if (linkedCpf) {
      if (linkedCpf === cpf && onlyDigits(user.cpf) !== cpf) await base44.auth.updateMe({ ...userProfileFields(user), cpf });
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

    if (await cpfCanBeAssigned(base44, user, cpf)) {
      const pending = await base44.asServiceRole.entities.VerifiedCpf.filter({ user_id: user.id, cpf, review_status: { $ne: 'rejected' } }, '-created_date', 1);
      // Informar um CPF não comprova titularidade. Apenas o administrador pode aprovar.
      if (!pending.length) await base44.asServiceRole.entities.VerifiedCpf.create({ user_id: user.id, cpf, ownership_verified: false, review_status: 'pending' });
    }
    return received();
  } catch (error) {
    console.error('Falha na solicitação de CPF:', error.message);
    return Response.json({ error: 'Não foi possível processar a solicitação de CPF' }, { status: 500 });
  }
}