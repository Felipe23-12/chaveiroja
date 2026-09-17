import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { APP_URL, MP_CALLBACK_URL, readOAuthState } from "../../shared/mercadoPago.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = await readOAuthState(url.searchParams.get("state"));
    if (!code) throw new Error("Autorização não concluída");
    const response = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "authorization_code", client_id: secrets.get("MERCADO_PAGO_CLIENT_ID"), client_secret: secrets.get("MERCADO_PAGO_CLIENT_SECRET"), code, redirect_uri: MP_CALLBACK_URL }),
    });
    const token = await response.json();
    if (!response.ok || !token.access_token || !token.user_id) throw new Error(token.message || "Não foi possível vincular o Mercado Pago");
    const existingByUser = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_user_id: state.userId });
    const existingByProfile = existingByUser.length
      ? []
      : await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: state.locksmithId });
    const existing = existingByUser?.[0] || existingByProfile?.[0];
    const data = {
      locksmith_id: state.locksmithId,
      locksmith_user_id: state.userId,
      mercado_pago_user_id: String(token.user_id),
      access_token: token.access_token,
      refresh_token: token.refresh_token || "",
      public_key: token.public_key || "",
      scope: token.scope || "",
      token_expires_at: new Date(Date.now() + Number(token.expires_in || 15552000) * 1000).toISOString(),
      status: "active",
      connected_at: existing?.connected_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existing) await base44.asServiceRole.entities.MercadoPagoAccount.update(existing.id, data);
    else await base44.asServiceRole.entities.MercadoPagoAccount.create(data);
    return Response.redirect(`${APP_URL}/cadastro/recebimentos?mercado_pago=connected`, 302);
  } catch (error) {
    return Response.redirect(`${APP_URL}/cadastro/recebimentos?mercado_pago=error&message=${encodeURIComponent(error.message)}`, 302);
  }
}