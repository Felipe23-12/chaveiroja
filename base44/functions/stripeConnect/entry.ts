import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const STRIPE_API = 'https://api.stripe.com/v1';
const APP_URL = 'https://woodoo-quick-lock-link.base44.app';

function stripeForm(data: Record<string, string | number | boolean>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) form.append(key, String(value));
  return form.toString();
}

async function stripeRequest(path: string, stripeKey: string, options: RequestInit = {}) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || 'Erro ao comunicar com o Stripe';
    const error = new Error(message);
    (error as any).stripe = data?.error;
    throw error;
  }
  return data;
}

function capabilityStatus(account: any, capability: string) {
  return account?.capabilities?.[capability] || 'unknown';
}

async function saveConnectRecord(base44: any, locksmithId: string, account: any) {
  const now = new Date().toISOString();
  const record = {
    locksmith_id: locksmithId,
    stripe_account_id: account.id,
    status: account.disabled ? 'disabled' : account.charges_enabled && account.payouts_enabled ? 'active' : account.details_submitted ? 'restricted' : 'onboarding',
    charges_enabled: !!account.charges_enabled,
    payouts_enabled: !!account.payouts_enabled,
    pix_payments_status: capabilityStatus(account, 'pix_payments'),
    details_submitted: !!account.details_submitted,
    updated_at: now,
  };

  const existing = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: locksmithId });
  if (existing?.[0]?.id) {
    return await base44.asServiceRole.entities.StripeConnectAccount.update(existing[0].id, record);
  }
  return await base44.asServiceRole.entities.StripeConnectAccount.create({ ...record, created_at: now });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (user.account_type !== 'chaveiro' && user.role !== 'admin') {
      return Response.json({ error: 'Apenas contas de chaveiro podem usar o Stripe Connect' }, { status: 403 });
    }

    const stripeKey = secrets.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return Response.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const locksmithId = body.locksmith_id || user.id;

    if (user.role !== 'admin' && locksmithId !== user.id) {
      return Response.json({ error: 'Você só pode gerenciar sua própria conta de recebimentos' }, { status: 403 });
    }

    if (action === 'create_account') {
      const existing = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: locksmithId });
      if (existing?.[0]?.stripe_account_id) {
        const account = await stripeRequest(`/accounts/${existing[0].stripe_account_id}`, stripeKey, { method: 'GET' });
        await saveConnectRecord(base44, locksmithId, account);
        return Response.json({ success: true, account_id: account.id, account });
      }

      const account = await stripeRequest('/accounts', stripeKey, {
        method: 'POST',
        body: stripeForm({
          country: 'BR',
          type: 'express',
          'capabilities[card_payments][requested]': true,
          'capabilities[transfers][requested]': true,
          ...(user.email ? { email: user.email } : {}),
        }),
      });

      await saveConnectRecord(base44, locksmithId, account);
      return Response.json({ success: true, account_id: account.id, account });
    }

    if (action === 'create_onboarding_link') {
      const records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: locksmithId });
      const record = records?.[0];
      if (!record?.stripe_account_id) {
        return Response.json({ error: 'Conta Stripe Connect ainda não foi criada' }, { status: 400 });
      }

      const returnUrl = `${APP_URL}/configurar-recebimentos?stripe=return`;
      const refreshUrl = `${APP_URL}/configurar-recebimentos?stripe=refresh`;
      const link = await stripeRequest('/account_links', stripeKey, {
        method: 'POST',
        body: stripeForm({
          account: record.stripe_account_id,
          type: 'account_onboarding',
          refresh_url: refreshUrl,
          return_url: returnUrl,
        }),
      });

      await base44.asServiceRole.entities.StripeConnectAccount.update(record.id, {
        status: 'onboarding',
        updated_at: new Date().toISOString(),
      });
      return Response.json({ success: true, url: link.url, expires_at: link.expires_at });
    }

    if (action === 'request_pix') {
      const records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: locksmithId });
      const record = records?.[0];
      if (!record?.stripe_account_id) {
        return Response.json({ error: 'Conta Stripe Connect ainda não foi criada' }, { status: 400 });
      }

      try {
        const capability = await stripeRequest(`/accounts/${record.stripe_account_id}/capabilities/pix_payments`, stripeKey, {
          method: 'POST',
          body: stripeForm({ requested: true }),
        });
        await base44.asServiceRole.entities.StripeConnectAccount.update(record.id, {
          pix_payments_status: capability.status || 'unknown',
          updated_at: new Date().toISOString(),
        });
        return Response.json({ success: true, status: capability.status || 'unknown' });
      } catch (error) {
        const message = error?.message || 'Não foi possível solicitar a capacidade Pix';
        await base44.asServiceRole.entities.StripeConnectAccount.update(record.id, {
          pix_payments_status: 'inactive',
          updated_at: new Date().toISOString(),
        });
        return Response.json({ success: false, status: 'inactive', error: message }, { status: 200 });
      }
    }

    if (action === 'get_status') {
      const records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: locksmithId });
      const record = records?.[0];
      if (!record?.stripe_account_id) {
        return Response.json({ connected: false, status: 'not_created' });
      }

      const account = await stripeRequest(`/accounts/${record.stripe_account_id}`, stripeKey, { method: 'GET' });
      const saved = await saveConnectRecord(base44, locksmithId, account);
      return Response.json({
        connected: true,
        account_id: account.id,
        status: saved.status,
        charges_enabled: !!account.charges_enabled,
        payouts_enabled: !!account.payouts_enabled,
        details_submitted: !!account.details_submitted,
        pix_payments_status: capabilityStatus(account, 'pix_payments'),
        requirements: account.requirements || null,
      });
    }

    if (action === 'create_login_link') {
      const records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: locksmithId });
      const record = records?.[0];
      if (!record?.stripe_account_id) return Response.json({ error: 'Conta Stripe Connect não encontrada' }, { status: 400 });
      const link = await stripeRequest(`/accounts/${record.stripe_account_id}/login_links`, stripeKey, { method: 'POST', body: '' });
      return Response.json({ success: true, url: link.url });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
});
