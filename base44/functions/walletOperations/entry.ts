import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getOrCreateFinancials } from '../../shared/locksmithFinancials.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action;

    // Confirma pagamento recebido fora do aplicativo e compensa a comissão.
    if (action === "confirm_cash") {
      const service = await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id).catch(() => null);
      const locksmith = await base44.asServiceRole.entities.Locksmith.get(body.locksmith_id).catch(() => null);
      if (!service || !locksmith || service.locksmith_id !== locksmith.id || locksmith.created_by_id !== user.id) {
        return Response.json({ error: "Atendimento não encontrado" }, { status: 404 });
      }
      if (service.cash_received === true) {
        return Response.json({ success: true, already_confirmed: true });
      }
      if (service.client_confirmed !== true || service.payment_method !== "dinheiro") {
        return Response.json({ error: "O cliente ainda não confirmou o pagamento em dinheiro" }, { status: 409 });
      }
      const serviceAmount = Number(service.price);
      if (!Number.isFinite(serviceAmount) || serviceAmount <= 0) {
        return Response.json({ error: "Valor do atendimento inválido" }, { status: 409 });
      }

      const financials = await getOrCreateFinancials(base44, locksmith);
      const commission = Math.round(serviceAmount * 0.15 * 100) / 100;
      const available = Math.max(0, Number(financials.wallet_balance || 0));
      const deductedNow = Math.min(available, commission);
      const pendingBefore = Math.max(0, Number(financials.pending_cash_commission || 0));
      const pendingAfter = Math.round((pendingBefore + commission - deductedNow) * 100) / 100;

      await base44.asServiceRole.entities.LocksmithFinancials.update(financials.id, {
        wallet_balance: Math.round((available - deductedNow) * 100) / 100,
        pending_cash_commission: pendingAfter,
      });
      await base44.asServiceRole.entities.ServiceRequest.update(service.id, {
        cash_received: true,
        payment_method: "dinheiro",
        payment_status: "paid",
        commission_status: pendingAfter > pendingBefore ? "pending" : "paid",
      });
      return Response.json({ success: true, commission, deducted_now: deductedNow, pending: pendingAfter });
    }

    // Solicita um saque da carteira com validação no servidor.
    if (action === "request_withdrawal") {
      const locksmith = await base44.asServiceRole.entities.Locksmith.get(body.locksmith_id).catch(() => null);
      if (!locksmith || locksmith.created_by_id !== user.id) {
        return Response.json({ error: "Carteira não encontrada" }, { status: 404 });
      }
      const financials = await getOrCreateFinancials(base44, locksmith);
      const amount = Math.round(Number(body.amount) * 100) / 100;
      const balance = Math.round(Number(financials.wallet_balance || 0) * 100) / 100;
      if (amount <= 0 || amount > balance) {
        return Response.json({ error: "Saldo insuficiente para saque" }, { status: 400 });
      }
      if (!String(body.pix_key_value || "").trim()) {
        return Response.json({ error: "Informe uma chave Pix válida" }, { status: 400 });
      }
      const [requested, processing] = await Promise.all([
        base44.asServiceRole.entities.Withdrawal.filter({ locksmith_id: locksmith.id, status: "requested" }),
        base44.asServiceRole.entities.Withdrawal.filter({ locksmith_id: locksmith.id, status: "processing" }),
      ]);
      if (requested?.length || processing?.length) {
        return Response.json({ error: "Já existe um saque aguardando processamento" }, { status: 409 });
      }

      const withdrawal = await base44.asServiceRole.entities.Withdrawal.create({
        locksmith_id: locksmith.id,
        locksmith_name: locksmith.name,
        amount,
        pix_key_type: body.pix_key_type,
        pix_key_value: String(body.pix_key_value).trim(),
        bank_name: String(body.bank_name || "").trim(),
        status: "requested",
        requested_at: new Date().toISOString(),
      });
      try {
        await base44.asServiceRole.entities.LocksmithFinancials.update(financials.id, {
          wallet_balance: Math.round((balance - amount) * 100) / 100,
          pending_balance: Math.round((Number(financials.pending_balance || 0) + amount) * 100) / 100,
        });
      } catch (error) {
        await base44.asServiceRole.entities.Withdrawal.delete(withdrawal.id).catch(() => null);
        throw error;
      }
      return Response.json({ withdrawal });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}