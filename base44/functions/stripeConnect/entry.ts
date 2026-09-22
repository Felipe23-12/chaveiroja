import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const STRIPE_API_V1 = 'https://api.stripe.com/v1';
const STRIPE_API_V2 = 'https://api.stripe.com/v2';
const STRIPE_VERSION_V2 = '2026-08-26.dahlia';
const APP_URL = 'https://woodoo-quick-lock-link.base44.app';
// 05/10/2026, 00:00 no horário de Brasília. Não altera cadastros anteriores.
const UNIFIED_REGISTRATION_START = Date.parse('2026-10-05T00:00:00-03:00');
const requiresUnifiedRegistration = (user) => user?.account_type === 'chaveiro' && Date.parse(user.created_date) >= UNIFIED_REGISTRATION_START;

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
// Só consideramos o vínculo inválido quando o Stripe confirma que a conta não existe
function isMissingAccountError(error: any) {
  return error?.stripe?.code === 'resource_missing';
}

async function findConnectRecord(base44: any, userId: string) {
  const direct = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: userId });
  if (direct?.[0]) return direct[0];

  const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: userId });
  const profileId = profiles?.[0]?.id;
  if (!profileId) return null;

  const legacy = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: profileId });
  return legacy?.[0] || null;
}

// As contas são criadas como Express (v1), então a consulta usa sempre a v1 —
// a v2 devolve um objeto parcial que fazia o status ficar travado em "pendente".
async function retrieveAccount(accountId: string, stripeKey: string) {
  return await stripeRequest(`/accounts/${accountId}`, stripeKey, { method: 'GET' });
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
  // v2: os repasses ficam na configuração "recipient" (merchant só cobre cobranças)
  const balance =
    account?.configuration?.recipient?.capabilities?.stripe_balance ||
    account?.configuration?.merchant?.capabilities?.stripe_balance;
  const v2Payouts = balance?.payouts?.status || balance?.stripe_transfers?.status;
  if (v2Payouts) return v2Payouts === 'active';
  return !!account?.payouts_enabled;
}

function isDetailsSubmitted(account: any) {
  if (account?.requirements) {
    const due = account.requirements.currently_due;
    return account.details_submitted === true || (Array.isArray(due) && due.length === 0);
  }
  return !!account?.details_submitted;
}

function isUnderReview(account: any) {
  const requirements = account?.requirements || {};
  const currentlyDue = requirements.currently_due || [];
  const pendingVerification = requirements.pending_verification || [];
  const rejected = String(requirements.disabled_reason || '').startsWith('rejected');
  return !rejected && !(isChargesEnabled(account) && isPayoutsEnabled(account)) &&
    (pendingVerification.length > 0 || (currentlyDue.length === 0 && isDetailsSubmitted(account)));
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

  const existing = await findConnectRecord(base44, locksmithId);
  if (!existing?.onboarding_completed_at && (account.details_submitted === true || isUnderReview(account) || (chargesEnabled && payoutsEnabled))) {
    record.onboarding_completed_at = now;
  }
  if (existing?.id) {
    return await base44.asServiceRole.entities.StripeConnectAccount.update(existing.id, record);
  }
  return await base44.asServiceRole.entities.StripeConnectAccount.create({ ...record, created_at: now });
}

export default async function(req) {
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

    if (action === 'onboarding_policy') {
      if (!requiresUnifiedRegistration(user) || user.role === 'admin') return Response.json({ required: false, completed: true });
      const record = await findConnectRecord(base44, user.id);
      return Response.json({ required: true, completed: !!(record?.onboarding_completed_at || record?.details_submitted) });
    }

    if (action === 'create_account') {
      const existing = await findConnectRecord(base44, locksmithId);
      if (existing?.stripe_account_id) {
        try {
          const account = await retrieveAccount(existing.stripe_account_id, stripeKey);
          await saveConnectRecord(base44, locksmithId, account);
          return Response.json({ success: true, account_id: account.id, account });
        } catch (e) {
          if (!isMissingAccountError(e)) throw e;
          // Vínculo inválido (conta de outro ambiente Stripe) — recria abaixo.
          await base44.asServiceRole.entities.StripeConnectAccount.delete(existing.id);
        }
      }

      // Conta Express (API v1) — modelo estável e compatível com account_links/login_links
      const fields: Record<string, string | boolean> = {
        type: 'express',
        country: 'br',
        'capabilities[card_payments][requested]': true,
        'capabilities[transfers][requested]': true,
      };
      const targetUser = locksmithId === user.id ? user : await base44.asServiceRole.entities.User.get(locksmithId);
      if (targetUser.email) fields.email = targetUser.email;
      if (requiresUnifiedRegistration(targetUser)) {
        fields.business_type = 'individual';
        const names = String(targetUser.legal_name || targetUser.full_name || '').trim().split(/\s+/);
        if (names.length > 1) {
          fields['individual[first_name]'] = names[0];
          fields['individual[last_name]'] = names.slice(1).join(' ');
        }
        if (targetUser.email) fields['individual[email]'] = targetUser.email;
        const phone = String(targetUser.phone || '').replace(/\D/g, '');
        if (phone.length === 10 || phone.length === 11) fields['individual[phone]'] = `+55${phone}`;
        else if (phone.startsWith('55') && (phone.length === 12 || phone.length === 13)) fields['individual[phone]'] = `+${phone}`;
        const cpf = await verifiedCpf(base44, targetUser.id) || '';
        if (cpf.length === 11) fields['individual[id_number]'] = cpf;
        fields['metadata[app_user_id]'] = targetUser.id;
      }

      const account = await stripeRequest('/accounts', stripeKey, {
        method: 'POST',
        headers: requiresUnifiedRegistration(targetUser) ? { 'Idempotency-Key': `chaveiro-connect-${locksmithId}` } : {},
        body: stripeForm(fields),
      });

      // Express v1 já solicita recebimento de repasses em capabilities[transfers].
      await saveConnectRecord(base44, locksmithId, account);
      return Response.json({ success: true, account_id: account.id, account });
    }

    if (action === 'create_onboarding_link') {
      const record = await findConnectRecord(base44, locksmithId);
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
      const record = await findConnectRecord(base44, locksmithId);
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
      const record = await findConnectRecord(base44, locksmithId);
      if (!record?.stripe_account_id) {
        return Response.json({ connected: false, status: 'not_created', onboarding_required: requiresUnifiedRegistration(user), onboarding_completed: false });
      }

      let account;
      try {
        account = await retrieveAccount(record.stripe_account_id, stripeKey);
      } catch (e) {
        if (isMissingAccountError(e)) {
          // Conta inexistente para a chave atual (ex.: criada em outro ambiente Stripe).
          await base44.asServiceRole.entities.StripeConnectAccount.delete(record.id);
          return Response.json({ connected: false, status: 'not_created', onboarding_required: requiresUnifiedRegistration(user), onboarding_completed: false });
        }
        // Falha temporária: mantemos o vínculo e devolvemos o último status salvo.
        return Response.json({
          connected: true,
          account_id: record.stripe_account_id,
          status: record.status,
          charges_enabled: record.charges_enabled,
          payouts_enabled: record.payouts_enabled,
          details_submitted: record.details_submitted,
          pix_payments_status: record.pix_payments_status,
          requirements: null,
          under_review: record.status === 'restricted' && !!record.details_submitted,
          stale: true,
          onboarding_required: requiresUnifiedRegistration(user),
          onboarding_completed: !!record.onboarding_completed_at,
        });
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
        under_review: isUnderReview(account),
        onboarding_required: requiresUnifiedRegistration(user),
        onboarding_completed: !!saved.onboarding_completed_at,
      });
    }

    if (action === 'get_balance') {
      const record = await findConnectRecord(base44, locksmithId);
      if (!record?.stripe_account_id) return Response.json({ connected: false });
      // Nunca substitui uma falha do Stripe pelo saldo interno ou por zero.
      const balance = await stripeRequest('/balance', stripeKey, {
        method: 'GET', headers: { 'Stripe-Account': record.stripe_account_id },
      });
      const brlTotal = (rows) => (rows || []).filter((row) => row.currency === 'brl').reduce((total, row) => total + row.amount, 0) / 100;
      return Response.json({
        connected: true, account_id: record.stripe_account_id, currency: 'brl',
        available: brlTotal(balance.available), pending: brlTotal(balance.pending),
        livemode: balance.livemode, checked_at: new Date().toISOString(),
      });
    }

    if (action === 'create_login_link') {
      const record = await findConnectRecord(base44, locksmithId);
      if (!record?.stripe_account_id) return Response.json({ error: 'Conta Stripe Connect não encontrada' }, { status: 400 });
      const link = await stripeRequest(`/accounts/${record.stripe_account_id}/login_links`, stripeKey, { method: 'POST', body: '' });
      return Response.json({ success: true, url: link.url });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}