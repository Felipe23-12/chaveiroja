import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SPREADSHEET_ID = "1OKEypS7Y593A1QTB5LbI7ja-4QN1P1yDfsqAuLabpXI";
const SHEET_NAME = "Pagamentos";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const serviceRequestId = body.service_request_id;

    if (!serviceRequestId) {
      return Response.json({ error: "service_request_id é obrigatório" }, { status: 400 });
    }

    // Busca o pedido e o pagamento associado
    const sr = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);

    let payment = null;
    if (sr.payment_id) {
      payment = await base44.asServiceRole.entities.Payment.get(sr.payment_id).catch(() => null);
    }

    // Token do conector Google Sheets (conta do builder)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Monta a linha com os dados do pagamento
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const row = [
      now,
      sr.id,
      sr.service_type || "",
      sr.address || "",
      sr.locksmith_name || "",
      payment?.client_name || "",
      sr.price || 0,
      sr.payment_method || payment?.method || "",
      sr.payment_status || payment?.status || "",
      payment?.commission_amount || 0,
      payment?.net_amount || 0,
      sr.distance_km || 0,
      sr.locomotion_cost || 0,
      sr.discount_applied ? "Sim" : "Não",
      sr.discount_amount || 0,
    ];

    // Anexa a linha na planilha
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
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}