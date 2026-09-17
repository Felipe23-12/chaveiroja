import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { escapeHtml } from '../../shared/escapeHtml.ts';

// Envia automaticamente o recibo do serviço ao cliente após o pagamento
// ser confirmado. Roda como service role (chamado por workflow, sem usuário).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalCall = verifyInternalCall(req, body);
    const user = internalCall ? null : await base44.auth.me().catch(() => null);
    if (!internalCall && !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { service_request_id } = body;
    if (!service_request_id) {
      return Response.json({ error: 'service_request_id é obrigatório' }, { status: 400 });
    }

    const request = await base44.asServiceRole.entities.ServiceRequest.get(service_request_id);
    if (!request) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }
    if (!internalCall && user.role !== 'admin' && request.created_by_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Só envia se o pagamento estiver confirmado
    if (request.payment_status !== 'paid') {
      return Response.json({ skipped: true, reason: 'payment_not_confirmed' });
    }

    // Carrega o cliente (User) para obter o email
    let customerEmail = null;
    let customerName = 'Cliente';
    if (request.created_by_id) {
      try {
        const customer = await base44.asServiceRole.entities.User.get(request.created_by_id);
        customerEmail = customer?.email;
        customerName = customer?.full_name || 'Cliente';
      } catch (e) { /* ignora */ }
    }

    if (!customerEmail) {
      return Response.json({ error: 'Email do cliente não encontrado' }, { status: 404 });
    }

    const serviceType = request.service_type || 'Serviço de chaveiro';
    const address = request.address || 'Não informado';
    const price = (request.price || 0).toFixed(2).replace('.', ',');
    const locksmithName = request.locksmith_name || 'Chaveiro';
    const date = new Date(request.created_date || Date.now()).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const methodMap = {
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'Pix',
      dinheiro: 'Dinheiro',
    };
    const paymentMethod = methodMap[request.payment_method] || '—';

    // Detalhamento financeiro (confecção de chave de carro)
    const rows = [];
    if (request.key_value) rows.push(`<tr><td style="padding:6px 0;color:#666;">Valor da chave</td><td style="padding:6px 0;">R$ ${Number(request.key_value).toFixed(2).replace('.', ',')}</td></tr>`);
    if (request.labor_cost) rows.push(`<tr><td style="padding:6px 0;color:#666;">Mão de obra</td><td style="padding:6px 0;">R$ ${Number(request.labor_cost).toFixed(2).replace('.', ',')}</td></tr>`);
    if (request.locomotion_cost) rows.push(`<tr><td style="padding:6px 0;color:#666;">Locomoção</td><td style="padding:6px 0;">R$ ${Number(request.locomotion_cost).toFixed(2).replace('.', ',')}</td></tr>`);
    if (request.extra_cost) rows.push(`<tr><td style="padding:6px 0;color:#666;">Custos adicionais</td><td style="padding:6px 0;">R$ ${Number(request.extra_cost).toFixed(2).replace('.', ',')}</td></tr>`);
    if (request.discount_amount) rows.push(`<tr><td style="padding:6px 0;color:#666;">Desconto de fidelidade</td><td style="padding:6px 0;color:#15803d;">- R$ ${Number(request.discount_amount).toFixed(2).replace('.', ',')}</td></tr>`);
    const breakdownBlock = rows.length
      ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;">${rows.join('')}</table>`
      : '';

    const subject = `Recibo do serviço · ${serviceType}`;
    const html = `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;color:#1a1a1a;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:24px;margin:0;">🔑 Recibo do serviço</h1>
        <span style="display:inline-block;margin-top:8px;padding:4px 12px;border-radius:9999px;background:#dcfce7;color:#15803d;font-size:12px;font-weight:bold;">✓ PAGAMENTO CONFIRMADO</span>
      </div>
      <p>Olá <strong>${escapeHtml(customerName)}</strong>,</p>
      <p>Seu pagamento foi confirmado e o serviço foi finalizado. Segue o recibo completo do atendimento:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#666;">Tipo de serviço</td><td style="padding:8px 0;">${escapeHtml(serviceType)}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Chaveiro</td><td style="padding:8px 0;">${escapeHtml(locksmithName)}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Endereço</td><td style="padding:8px 0;">${escapeHtml(address)}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Data</td><td style="padding:8px 0;">${escapeHtml(date)}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Forma de pagamento</td><td style="padding:8px 0;">${escapeHtml(paymentMethod)}</td></tr>
      </table>
      ${breakdownBlock}
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#666;font-size:14px;">Valor total pago</p>
        <p style="margin:4px 0 0 0;font-size:28px;font-weight:bold;color:#15803d;">R$ ${escapeHtml(price)}</p>
      </div>
      <p style="margin-top:24px;">Agradecemos a confiança em nosso serviço!</p>
      <p style="color:#999;font-size:12px;margin-top:8px;">Equipe Chaveiro Já</p>
    </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: customerEmail,
      subject,
      body: html,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}