import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SPREADSHEET_ID = "1OKEypS7Y593A1QTB5LbI7ja-4QN1P1yDfsqAuLabpXI";
const SHEET_NAME = "Faturamento Mensal";

const COMMISSION_RATE = 0.15;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const month = body.month;

    // Determina o mês alvo (padrão: mês atual)
    const now = new Date();
    const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Busca todos os ServiceRequests pagos do mês
    const allRequests = await base44.asServiceRole.entities.ServiceRequest.list("-created_date", 2000);
    const monthRequests = allRequests.filter((r) => {
      if (r.payment_status !== "paid") return false;
      const d = new Date(r.created_date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return k === targetMonth;
    });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Garante que a aba existe (ignora erro se já existir)
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }),
    }).catch(() => {});

    // Limpa a aba
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:Z:clear`,
      { method: "POST", headers: { "Authorization": `Bearer ${accessToken}` } }
    ).catch(() => {});

    // Cabeçalho
    const headers = [
      "Data", "ID do Pedido", "Tipo de Serviço", "Endereço", "Chaveiro", "Cliente",
      "Valor Total", "Método de Pagamento", "Comissão (15%)", "Valor Líquido",
      "Distância (km)", "Custo Locomoção", "Desconto Aplicado", "Valor Desconto",
    ];

    // Linhas de dados
    const rows = monthRequests.map((r) => {
      const price = r.price || 0;
      const commission = Math.round(price * COMMISSION_RATE * 100) / 100;
      const net = Math.round((price - commission) * 100) / 100;
      return [
        new Date(r.created_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        r.id,
        r.service_type || "",
        r.address || "",
        r.locksmith_name || "",
        "",
        price,
        r.payment_method || "",
        commission,
        net,
        r.distance_km || 0,
        r.locomotion_cost || 0,
        r.discount_applied ? "Sim" : "Não",
        r.discount_amount || 0,
      ];
    });

    // Resumo
    const totalRevenue = monthRequests.reduce((s, r) => s + (r.price || 0), 0);
    const totalCommission = Math.round(totalRevenue * COMMISSION_RATE * 100) / 100;
    const totalNet = Math.round((totalRevenue - totalCommission) * 100) / 100;

    const summaryRows = [
      [],
      ["RESUMO DO MÊS", targetMonth],
      ["Total de Serviços", monthRequests.length],
      ["Faturamento Total", totalRevenue],
      ["Comissões (15%)", totalCommission],
      ["Valor Líquido (Chaveiros)", totalNet],
    ];

    // Escreve tudo de uma vez
    const allRows = [headers, ...rows, ...summaryRows];
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ values: allRows }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return Response.json({ error: "Falha ao gravar na planilha", details: errText }, { status: 500 });
    }

    return Response.json({
      success: true,
      month: targetMonth,
      count: monthRequests.length,
      totalRevenue,
      totalCommission,
      totalNet,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}