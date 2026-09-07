import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const confirmationEmail = 'felipemotacs1@gmail.com';

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem executar o reset' }, { status: 403 });

    const password = secrets.get('LOCKSMITH_RESET_PASSWORD');
    if (!password) return Response.json({ error: 'Senha de reset não configurada' }, { status: 500 });
    const body = await req.json().catch(() => ({}));

    if (body.action === 'request_confirmation') {
      if (body.password !== password) return Response.json({ error: 'Senha incorreta' }, { status: 403 });
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
      const expiresAt = Date.now() + 10 * 60 * 1000;
      const signature = await sign(`${user.id}:${code}:${expiresAt}`, password);
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: confirmationEmail,
        subject: 'Confirmação para apagar todos os chaveiros',
        body: `Seu código de confirmação é: ${code}\n\nEle expira em 10 minutos. Se você não solicitou este reset, não compartilhe o código.`,
      });
      return Response.json({ success: true, expiresAt, signature });
    }

    if (body.action === 'confirm_reset') {
      const expiresAt = Number(body.expiresAt);
      if (!body.code || !body.signature || !expiresAt || Date.now() > expiresAt) {
        return Response.json({ error: 'Código expirado ou inválido' }, { status: 400 });
      }
      const expected = await sign(`${user.id}:${body.code}:${expiresAt}`, password);
      if (expected !== body.signature) return Response.json({ error: 'Código de confirmação incorreto' }, { status: 403 });
      const result = await base44.asServiceRole.entities.Locksmith.deleteMany({});
      return Response.json({ success: true, deletedCount: result?.deleted_count || 0 });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Erro ao executar o reset' }, { status: 500 });
  }
}