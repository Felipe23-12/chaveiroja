import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const SPREADSHEET_ID = "1OKEypS7Y593A1QTB5LbI7ja-4QN1P1yDfsqAuLabpXI";
const COMMISSION_RATE = 0.15;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const currentMonth = monthKey(now);
    const targetMonth = body.month === undefined ? currentMonth : body.month;
    if (typeof targetMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth)) {
      return Response.json({ error: 'Mês inválido. Use AAAA-MM.' }, { status: 400 });
    }

    // Perfil do chaveiro logado — cada chaveiro exporta apenas os próprios dados
    const profiles = await base44.entities.Locksmith.filter({ created_by_id: user.id });
    const me = profiles[0];
    if (!me) return Response.json({ error: 'Nenhum perfil de chaveiro vinculado a esta conta' }, { status: 404 });
    // Limita as abas aos meses reais de existência deste perfil, sem meses futuros.
    const firstMonth = monthKey(me.created_date);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(firstMonth) || targetMonth < firstMonth || targetMonth > currentMonth) {
      return Response.json({ error: 'Escolha um mês entre a criação do perfil e o mês atual.' }, { status: 400 });
    }

    const isAppMode = me.work_mode === "app";
    const rate = isAppMode ? COMMISSION_RATE : 0;

    const [completedAll, cancelledAll] = await Promise.all([
      base44.entities.ServiceRequest.filter({ locksmith_id: me.id, status: "completed" }, "-created_date", 1000),
      base44.entities.ServiceRequest.filter({ locksmith_id: me.id, status: "cancelled" }, "-created_date", 1000),
    ]);
    const completed = completedAll.filter((r) => monthKey(r.created_date) === targetMonth);
    const cancelled = cancelledAll.filter(
      (r) => monthKey(r.created_date) === targetMonth && Number(r.cancellation_locksmith_amount) > 0
    );

    const headers = [
      "Data", "Tipo", "Serviço", "Endereço", "Valor Bruto", "Pagamento",
      "Comissão App", "Valor Líquido", "Status Comissão",
    ];

    const rows = [];
    let gross = 0, commission = 0, net = 0, cancellationTotal = 0;

    completed.forEach((r) => {
      const price = round2(r.price);
      const comm = round2(price * rate);
      const liquid = round2(price - comm);
      gross += price; commission += comm; net += liquid;
      rows.push([
        new Date(r.created_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        "Serviço concluído",
        r.service_type || "",
        r.address || "",
        price,
        r.payment_method || "",
        comm,
        liquid,
        isAppMode ? ((r.commission_status || "pending") === "paid" ? "Compensada" : "Pendente") : "-",
      ]);
    });

    cancelled.forEach((r) => {
      const amt = round2(r.cancellation_locksmith_amount);
      cancellationTotal += amt;
      rows.push([
        new Date(r.created_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        "Taxa de cancelamento",
        r.service_type || "",
        r.address || "",
        round2(r.cancellation_fee),
        r.payment_method || "",
        round2(r.cancellation_app_fee),
        amt,
        "-",
      ]);
    });

    const summary = [
      [],
      ["RESUMO", targetMonth],
      ["Chaveiro", me.display_name || me.name],
      ["Modo de trabalho", isAppMode ? "Aplicativo" : "Livre"],
      ["Serviços concluídos", completed.length],
      ["Faturamento bruto", round2(gross)],
      ["Comissões do app (15%)", round2(commission)],
      ["Taxas de cancelamento recebidas", round2(cancellationTotal)],
      ["Total líquido", round2(net + cancellationTotal)],
    ];

    // Identidade imutável evita colisões entre chaveiros e novas abas por renomeação.
    const sheetName = `Chaveiro ${me.id} - ${targetMonth}`;
    const range = encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'`);

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");
    const authHeaders = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };

    const metadataRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`, { headers: authHeaders });
    if (!metadataRes.ok) return Response.json({ error: 'Falha ao consultar as abas da planilha' }, { status: 502 });
    const metadata = await metadataRes.json();
    if (!(metadata.sheets || []).some((sheet) => sheet.properties.title === sheetName)) {
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
      });
      if (!createRes.ok) return Response.json({ error: 'Falha ao criar a aba de faturamento' }, { status: 502 });
    }

    const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}!A:Z:clear`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (!clearRes.ok) return Response.json({ error: 'Falha ao atualizar a aba de faturamento' }, { status: 502 });

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}!A1?valueInputOption=RAW`,
      { method: "PUT", headers: authHeaders, body: JSON.stringify({ values: [headers, ...rows, ...summary] }) }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return Response.json({ error: "Falha ao gravar na planilha", details: errText }, { status: 500 });
    }

    return Response.json({
      success: true,
      month: targetMonth,
      sheetName,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
      count: completed.length,
      cancelledCount: cancelled.length,
      gross: round2(gross),
      commission: round2(commission),
      net: round2(net + cancellationTotal),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}