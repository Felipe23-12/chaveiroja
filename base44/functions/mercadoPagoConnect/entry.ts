import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { createOAuthState, MP_CALLBACK_URL } from "../../shared/mercadoPago.ts";
import { ensureLocksmithProfile } from "../../shared/locksmithProfile.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.account_type !== "chaveiro" && user.role !== "admin") return Response.json({ error: "Acesso exclusivo para chaveiros" }, { status: 403 });
    const body = await req.json();
    if (!['prepare_profile', 'get_status', 'onboarding_policy', 'connect'].includes(body.action)) return Response.json({ error: 'Ação inválida' }, { status: 400 });
    if (body.action === 'prepare_profile') {
      const locksmith = await ensureLocksmithProfile(base44, user, body.profile);
      return Response.json({ locksmith });
    }
    const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id }, "-updated_date", 1);
    const locksmith = profiles[0] || (body.action === 'connect' ? await ensureLocksmithProfile(base44, user) : null);
    const accountsByUser = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_user_id: user.id });
    const legacyAccounts = accountsByUser.length || !locksmith
      ? []
      : await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: locksmith.id });
    const account = accountsByUser?.[0] || legacyAccounts?.[0];

    if (body.action === "get_status" || body.action === "onboarding_policy") {
      const connected = account?.status === "active";
      const required = true; // Sem conexão, o chaveiro não pode aceitar chamados do Modo Aplicativo.
      return Response.json({ connected, account_id: account?.mercado_pago_user_id || null, onboarding_required: required, onboarding_completed: connected, required, completed: connected });
    }
    if (body.action === "connect") {
      const state = await createOAuthState(user.id, locksmith.id);
      const params = new URLSearchParams({ client_id: secrets.get("MERCADO_PAGO_CLIENT_ID"), response_type: "code", platform_id: "mp", state, redirect_uri: MP_CALLBACK_URL });
      return Response.json({ url: `https://auth.mercadopago.com.br/authorization?${params.toString()}` });
    }
    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}