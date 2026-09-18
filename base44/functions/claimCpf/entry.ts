import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return (remainder === 10 ? 0 : remainder) === Number(cpf[length]);
  };
  return check(9) && check(10);
}

function formatCpf(cpf) {
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const cpf = onlyDigits(body.cpf);
    if (!isValidCpf(cpf)) {
      return Response.json({ error: 'CPF inválido — confira os números digitados' }, { status: 400 });
    }
    // Confirma apenas o recebimento, nunca a disponibilidade de um CPF.
    const received = () => Response.json({ received: true, message: 'Solicitação de vínculo recebida.' });
    const currentCpf = onlyDigits(user.cpf);
    if (currentCpf) return received();
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
    const duplicate = [...plainMatches, ...formattedMatches].find((account) => account.id !== user.id);
    if (!blockedMatches.length && !duplicate) {
      await base44.auth.updateMe({ cpf });
    }
    return received();
  } catch (error) {
    return Response.json({ error: 'Não foi possível processar a solicitação de CPF' }, { status: 500 });
  }
}