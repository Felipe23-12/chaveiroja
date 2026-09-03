import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { service_request_id } = body;
    if (!service_request_id) {
      return Response.json({ error: 'service_request_id é obrigatório' }, { status: 400 });
    }

    // Carrega a solicitação (service role para acessar dados do cliente)
    const request = await base44.asServiceRole.entities.ServiceRequest.get(service_request_id);
    if (!request) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    // Carrega o cliente (User) para obter o email
    let customerEmail = null;
    let customerName = 'Cliente';
    if (request.created_by_id) {
      try {
        const customer = await base44.asServiceRole.entities.User.get(request.created_by_id);
        customerEmail = customer?.email;
        customerName = customer?.full_name || 'Cliente';
      } catch (e) {
        /* ignora */
      }
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

    // Avaliação dada pelo cliente
    const rating = request.rating || 0;
    const reviewComment = request.review || '';
    const stars = rating > 0 ? '⭐'.repeat(rating) : 'Não avaliado';
    const ratingBlock = rating > 0
      ? `<tr><td style="padding: 8px 0; color: #666;">Sua avaliação</td><td style="padding: 8px 0;">${stars} (${rating}/5)</td></tr>`
      : '';
    const reviewBlock = reviewComment
      ? `<tr><td style="padding: 8px 0; color: #666;">Comentário</td><td style="padding: 8px 0; font-style: italic;">"${reviewComment}"</td></tr>`
      : '';

    const subject = `Resumo do serviço · ${serviceType}`;
    const html = `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; margin: 0;">🔑 Resumo do serviço</h1>
      </div>
      <p>Olá <strong>${customerName}</strong>,</p>
      <p>Seu serviço foi concluído com sucesso. Segue o resumo completo do atendimento para sua transparência:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #666;">Tipo de serviço</td><td style="padding: 8px 0;">${serviceType}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Chaveiro</td><td style="padding: 8px 0;">${locksmithName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Endereço</td><td style="padding: 8px 0;">${address}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">Data</td><td style="padding: 8px 0;">${date}</td></tr>
        ${ratingBlock}
        ${reviewBlock}
      </table>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #666; font-size: 14px;">Valor total pago</p>
        <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: bold; color: #15803d;">R$ ${price}</p>
      </div>
      <p style="margin-top: 24px;">Agradecemos a confiança em nosso serviço!</p>
      <p style="color: #999; font-size: 12px; margin-top: 8px;">Equipe Chaveiro Já</p>
    </div>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: customerEmail,
      subject,
      body: html,
    });

    return Response.json({ success: true, sentTo: customerEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}