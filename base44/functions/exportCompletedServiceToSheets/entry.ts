import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyInternalCall } from '../../shared/internalCall.ts';

// Mesma planilha do fluxo de pagamentos, aba dedicada aos atendimentos
const SPREADSHEET_ID = "1OKEypS7Y593A1QTB5LbI7ja-4QN1P1yDfsqAuLabpXI";
const SHEET_NAME = "Atendimentos";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalCall = verifyInternalCall(req);
    const user = internalCall ? null : await base44.auth.me().catch(() => null);
    if (!internalCall && !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!internalCall && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const serviceRequestId = body.service_request_id;

    if (!serviceRequestId) {
      return Response.json({ error: "service_request_id é obrigatório" }, { status: 400 });
    }

    const sr = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);

    // Dados de contato do cliente
    const userId = sr.created_by_id;
    let customerEmail = "";
    let customerPhone = "";
    let customerName = "";
    if (userId) {
      const user = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
      if (user) {
        customerEmail = user.email || "";
        customerPhone = user.phone || "";
        customerName = user.full_name || "";
      }
    }

    // Dados do chaveiro
    let locksmithPhone = "";
    let locksmithWorkMode = "";
    if (sr.locksmith_id) {
      const locksmith = await base44.asServiceRole.entities.Locksmith.get(sr.locksmith_id).catch(() => null);
      if (locksmith) {
        locksmithPhone = locksmith.phone || "";
        locksmithWorkMode = locksmith.work_mode || "";
      }
    }

    // Token do conector Google Sheets (conta do builder)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const acceptedAt = sr.accepted_at
      ? new Date(sr.accepted_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : "";

    const row = [
      now,                          // Data de exportação
      sr.id,                        // ID do pedido
      sr.service_type || "",        // Tipo de serviço
      sr.status || "",             // Status final
      sr.urgency || "",             // Urgência
      sr.address || "",             // Endereço
      sr.description || "",         // Descrição
      sr.locksmith_name || "",      // Nome do chaveiro
      locksmithPhone,              // Telefone do chaveiro
      locksmithWorkMode,            // Modo de trabalho (livre/app)
      customerName,                // Nome do cliente
      customerEmail,               // Email do cliente
      customerPhone,                // Telefone do cliente
      sr.price || 0,                // Valor total
      sr.key_value || 0,            // Valor da chave (confecção)
      sr.labor_cost || 0,           // Mão de obra
      sr.locomotion_cost || 0,      // Locomoção
      sr.distance_km || 0,          // Distância (km)
      sr.extra_cost || 0,           // Custos extras
      sr.discount_applied ? "Sim" : "Não",  // Desconto de fidelidade
      sr.discount_amount || 0,      // Valor do desconto
      sr.payment_method || "",      // Forma de pagamento
      sr.payment_status || "",      // Status do pagamento
      sr.commission_status || "",   // Status da comissão
      acceptedAt,                   // Data/hora de aceitação
      sr.rating || "",              // Avaliação do cliente
      sr.review || "",              // Comentário do cliente
      sr.start_photos?.length || 0, // Qtd. fotos de início
      sr.end_photos?.length || 0,   // Qtd. fotos do final
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      return Response.json({ error: "Falha ao gravar na planilha", details: errText }, { status: 500 });
    }

    const appendData = await appendRes.json();
    return Response.json({
      success: true,
      updatedRange: appendData.updates?.updatedRange,
      spreadsheetId: SPREADSHEET_ID,
      sheet: SHEET_NAME,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}