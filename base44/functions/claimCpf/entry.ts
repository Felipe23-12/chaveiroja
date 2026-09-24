import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

import { onlyDigits, isValidCpf } from '../../shared/registrationEligibility.ts';
import { verifiedCpf } from '../../shared/verifiedCpf.ts';

function formatCpf(cpf) {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
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
    const received = (linked = false) => Response.json({ received: true, linked, message: 'Solicitação de vínculo recebida.' });
    const linkedCpf = await verifiedCpf(base44, user.id);
    if (linkedCpf) {
      if (linkedCpf === cpf && onlyDigits(user.cpf) !== cpf) await base44.auth.updateMe({ cpf });
      return received(linkedCpf === cpf);
    }
    // Um CPF legado só pode ser confirmado para o mesmo titular, nunca trocado.
    if (user.cpf && onlyDigits(user.cpf) !== cpf) return received();
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
    const trustedMatches = await base44.asServiceRole.entities.VerifiedCpf.filter({ cpf });
    const duplicate = [...plainMatches, ...formattedMatches].find((account) => account.id !== user.id) || trustedMatches.find((account) => account.user_id !== user.id);
    if (!blockedMatches.length && !duplicate) {
      await base44.asServiceRole.entities.VerifiedCpf.create({ user_id: user.id, cpf });
      if (onlyDigits(user.cpf) !== cpf) await base44.auth.updateMe({ cpf });
      return received(true);
    }
    return received();
  } catch (error) {
    return Response.json({ error: 'Não foi possível processar a solicitação de CPF' }, { status: 500 });
  }
}