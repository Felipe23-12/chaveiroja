import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { verifyInternalCall } from '../../shared/internalCall.ts';

const SPREADSHEET_ID = "1OKEypS7Y593A1QTB5LbI7ja-4QN1P1yDfsqAuLabpXI";
const SHEET_NAME = "Leads";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalCall = verifyInternalCall(body);
    const caller = internalCall ? null : await base44.auth.me().catch(() => null);
    if (!internalCall && !caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!internalCall && caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const userId = body.user_id;

    if (!userId) {
      return Response.json({ error: "user_id é obrigatório" }, { status: 400 });
    }

    // Busca os dados do usuário recém-cadastrado
    const user = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
    if (!user) {
      return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Token do conector Google Sheets (conta do builder)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Garante que a aba "Leads" existe (ignora erro se já existir)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
        }),
      }
    ).catch(() => null);

    // Verifica se a aba está vazia para escrever o cabeçalho
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    const checkData = await checkRes.json();
    const isEmpty = !checkData.values || checkData.values.length === 0;

    if (isEmpty) {
      const headers = [
        "Data do Cadastro", "Nome", "Email", "Telefone", "CPF", "Tipo de Conta",
      ];
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:append?valueInputOption=RAW`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [headers] }),
        }
      );
    }

    // Monta a linha com os dados de contato do novo cliente
    const createdAt = user.created_date
      ? new Date(user.created_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const row = [
      createdAt,
      user.full_name || "",
      user.email || "",
      user.phone || "",
      user.cpf || "",
      user.account_type || "cliente",
    ];

    // Anexa a linha na planilha
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
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