import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const STRIPE_API_V1 = 'https://api.stripe.com/v1';
const STRIPE_API_V2 = 'https://api.stripe.com/v2';
const STRIPE_VERSION_V2 = '2026-08-26.dahlia';
const APP_URL = 'https://woodoo-quick-lock-link.base44.app';

function stripeForm(data: Record<string, string | number | boolean>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) form.append(key, String(value));
  return form.toString();
}

// Requisições v1 (form-encoded) — account_links, login_links e capabilities são interoperáveis com contas v2
async function stripeRequest(path: string, stripeKey: string, options: RequestInit = {}) {
  const res = await fetch(`${STRIPE_API_V1}${path}`, {
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

// Requisições v2 (JSON + Stripe-Version) — criação e consulta de contas em /v2/core/accounts
async function stripeRequestV2(path: string, stripeKey: string, options: RequestInit = {}) {
  const res = await fetch(`${STRIPE_API_V2}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/json',
      'Stripe-Version': STRIPE_VERSION_V2,
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || 'Erro ao comunicar com o Stripe (v2)';
    const error = new Error(message);
    (error as any).stripe = data?.error;
    throw error;
  }
  return data;
}

// Busca a conta no Stripe. Contas criadas em versões/APIs diferentes podem não
// responder na v2 com a chave da plataforma — nesse caso caímos para a v1.
async function retrieveAccount(accountId: string, stripeKey: string) {
  try {
    return await stripeRequestV2(
      `/core/accounts/${accountId}?include=configuration.merchant&include=configuration.recipient&include=identity&include=requirements`,
      stripeKey,
      { method: 'GET' }
    );
  } catch (_e) {
    return await stripeRequest(`/accounts/${accountId}`, stripeKey, { method: 'GET' });
  }
}

function capabilityStatus(account: any, capability: string) {
  // v2: configuration.merchant.capabilities.{capability}.status
  const v2Status = account?.configuration?.merchant?.capabilities?.[capability]?.status;
  if (v2Status) return v2Status;
  // v1 fallback: capabilities.{capability}
  return account?.capabilities?.[capability] || 'unknown';
}

function isChargesEnabled(account: any) {
  const v2Card = account?.configuration?.merchant?.capabilities?.card_payments?.status;
  if (v2Card) return v2Card === 'active';
  return !!account?.charges_enabled;
}

function isPayoutsEnabled(account: any) {
  const v2Payouts = account?.configuration?.merchant?.capabilities?.stripe_balance?.payouts?.status;
  if (v2Payouts) return v2Payouts === 'active';
  return !!account?.payouts_enabled;
}

function isDetailsSubmitted(account: any) {
  if (account?.requirements) {
    const due = account.requirements.currently_due;
    return Array.isArray(due) ? due.length === 0 : !due;
  }
  return !!account?.details_submitted;
}

async function saveConnectRecord(base44: any, locksmithId: string, account: any) {
  const now = new Date().toISOString();
  const chargesEnabled = isChargesEnabled(account);
  const payoutsEnabled = isPayoutsEnabled(account);
  const detailsSubmitted = isDetailsSubmitted(account);
  const record = {
    locksmith_id: locksmithId,
    stripe_account_id: account.id,
    status: account.disabled ? 'disabled' : chargesEnabled && payoutsEnabled ? 'active' : detailsSubmitted ? 'restricted' : 'onboarding',
    charges_enabled: chargesEnabled,
    payouts_enabled: payoutsEnabled,
    pix_payments_status: capabilityStatus(account, 'pix_payments'),
    details_submitted: detailsSubmitted,
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
        try {
          const account = await retrieveAccount(existing[0].stripe_account_id, stripeKey);
          await saveConnectRecord(base44, locksmithId, account);
          return Response.json({ success: true, account_id: account.id, account });
        } catch (_e) {
          // Vínculo inválido (conta de outro ambiente Stripe) — recria abaixo.
          await base44.asServiceRole.entities.StripeConnectAccount.delete(existing[0].id);
        }
      }

      // Accounts v2: POST /v2/core/accounts (JSON body)
      // merchant → card_payments | recipient → stripe_balance.stripe_transfers (substitui v1 transfers)
      const payload: any = {
        dashboard: 'express',
        identity: { country: 'br' },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
          recipient: {
            capabilities: {
              stripe_balance: {
                payouts: { requested: true },
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        defaults: {
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
        include: ['configuration.merchant', 'configuration.recipient', 'identity', 'requirements'],
      };
      if (user.email) payload.contact_email = user.email;

      const account = await stripeRequestV2('/core/accounts', stripeKey, {
        method: 'POST',
        body: JSON.stringify(payload),
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

      const returnUrl = `${APP_URL}/cadastro/recebimentos?stripe=return`;
      const refreshUrl = `${APP_URL}/cadastro/recebimentos?stripe=refresh`;
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

      let account;
      try {
        account = await retrieveAccount(record.stripe_account_id, stripeKey);
      } catch (_e) {
        // Conta inexistente para a chave atual (ex.: criada em ambiente de teste).
        // Removemos o vínculo inválido para o chaveiro poder se cadastrar novamente.
        await base44.asServiceRole.entities.StripeConnectAccount.delete(record.id);
        return Response.json({ connected: false, status: 'not_created' });
      }
      const saved = await saveConnectRecord(base44, locksmithId, account);
      return Response.json({
        connected: true,
        account_id: account.id,
        status: saved.status,
        charges_enabled: saved.charges_enabled,
        payouts_enabled: saved.payouts_enabled,
        details_submitted: saved.details_submitted,
        pix_payments_status: saved.pix_payments_status,
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