import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Revisão de segurança automática: procura registros sem os campos de
// isolamento (usados pelas regras de acesso) e avisa os administradores.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const [requests, messages, stripeAccounts, users] = await Promise.all([
      sr.entities.ServiceRequest.list('-created_date', 500),
      sr.entities.ChatMessage.list('-created_date', 500),
      sr.entities.StripeConnectAccount.list('-created_date', 500),
      sr.entities.User.list('-created_date', 500),
    ]);

    const findings = [];

    const orphanRequests = requests.filter(
      (r) => r.locksmith_id && !r.locksmith_user_id
    );
    if (orphanRequests.length) {
      findings.push(
        `${orphanRequests.length} atendimento(s) com chaveiro designado sem o vínculo de usuário (locksmith_user_id) — o isolamento de acesso pode falhar nesses registros.`
      );
    }

    const orphanMessages = messages.filter(
      (m) => !m.client_id || !m.locksmith_user_id
    );
    if (orphanMessages.length) {
      findings.push(
        `${orphanMessages.length} mensagem(ns) de chat sem cliente ou chaveiro vinculado — conversas sem os dois vínculos não ficam restritas aos participantes.`
      );
    }

    const seen = {};
    let duplicateStripe = 0;
    for (const acc of stripeAccounts) {
      if (seen[acc.stripe_account_id]) duplicateStripe += 1;
      else seen[acc.stripe_account_id] = true;
    }
    if (duplicateStripe) {
      findings.push(
        `${duplicateStripe} conta(s) Stripe duplicada(s) — o mesmo recebedor está ligado a mais de um perfil.`
      );
    }

    const admins = users.filter((u) => u.role === 'admin');
    findings.push(
      `${admins.length} usuário(s) com acesso de administrador: ${admins
        .map((u) => u.email)
        .join(', ')}.`
    );

    const summary = [
      `Revisão de segurança — ${new Date().toLocaleDateString('pt-BR')}`,
      '',
      `Atendimentos verificados: ${requests.length}`,
      `Mensagens verificadas: ${messages.length}`,
      `Contas Stripe verificadas: ${stripeAccounts.length}`,
      `Usuários verificados: ${users.length}`,
      '',
      'Resultado:',
      ...findings.map((f) => `• ${f}`),
    ].join('\n');

    for (const admin of admins) {
      await sr.integrations.Core.SendEmail({
        to: admin.email,
        subject: 'ChaveiroJá — Revisão de segurança (a cada 20 dias)',
        body: summary,
        from_name: 'ChaveiroJá',
      });
    }

    return Response.json({ ok: true, findings, admins: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}