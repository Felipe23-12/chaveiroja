import { jsPDF } from "jspdf";

const formatBRL = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d) => new Date(d).toLocaleDateString("pt-BR");

function monthLabel() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function currentMonthRecords(records) {
  const now = new Date();
  return (records || []).filter((r) => {
    const d = new Date(r.created_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function buildSummary({ completed, cancelled, isAppMode, commissionRate }) {
  let gross = 0;
  let commission = 0;
  let commissionPaid = 0;
  let commissionPending = 0;
  completed.forEach((r) => {
    const price = Number(r.price) || 0;
    gross += price;
    if (isAppMode) {
      const comm = price * commissionRate;
      commission += comm;
      if ((r.commission_status || "pending") === "paid") commissionPaid += comm;
      else commissionPending += comm;
    }
  });
  let cancellationTotal = 0;
  cancelled.forEach((r) => {
    cancellationTotal += Number(r.cancellation_locksmith_amount) || 0;
  });
  const net = gross - commission + cancellationTotal;
  return { gross, commission, commissionPaid, commissionPending, cancellationTotal, net, count: completed.length };
}

function fileBase(me) {
  const slug = (me?.name || "chaveiro").toLowerCase().replace(/\s+/g, "-");
  return `comissoes-${slug}-${monthLabel().replace(/\s+/g, "-")}`;
}

export function downloadCommissionCSV({ me, completed, cancelled, isAppMode, commissionRate }) {
  const mc = currentMonthRecords(completed);
  const mca = currentMonthRecords(cancelled);
  const s = buildSummary({ completed: mc, cancelled: mca, isAppMode, commissionRate });
  const lines = [];
  lines.push("Relatorio de Comissoes - Chaveiro Ja");
  lines.push(`Chaveiro;${me?.name || ""}`);
  lines.push(`Modo;${isAppMode ? "Aplicativo" : "Livre"}`);
  lines.push(`Periodo;${monthLabel()}`);
  lines.push("");
  lines.push("RESUMO");
  lines.push(`Servicos concluidos;${s.count}`);
  lines.push(`Total bruto;${formatBRL(s.gross)}`);
  if (isAppMode) {
    lines.push(`Comissao app (15%);${formatBRL(s.commission)}`);
    lines.push(`Comissoes compensadas;${formatBRL(s.commissionPaid)}`);
    lines.push(`Comissoes pendentes;${formatBRL(s.commissionPending)}`);
    lines.push(`Taxas de cancelamento recebidas (20%);${formatBRL(s.cancellationTotal)}`);
  }
  lines.push(`Liquido;${formatBRL(s.net)}`);
  lines.push("");
  lines.push("SERVICOS CONCLUIDOS");
  lines.push("Data;Tipo;Endereco;Valor;Comissao (15%);Liquido;Status");
  mc.forEach((r) => {
    const price = Number(r.price) || 0;
    const comm = isAppMode ? price * commissionRate : 0;
    const net = price - comm;
    const status = (r.commission_status || "pending") === "paid" ? "Compensada" : "Pendente";
    lines.push(
      `${formatDate(r.created_date)};${r.service_type};${(r.address || "").replace(/;/g, ",")};${formatBRL(price)};${formatBRL(comm)};${formatBRL(net)};${status}`
    );
  });
  if (isAppMode && mca.length > 0) {
    lines.push("");
    lines.push("CANCELAMENTOS COM TAXA");
    lines.push("Data;Tipo;Taxa (25%);Chaveiro (20%);App (5%)");
    mca.forEach((r) => {
      lines.push(
        `${formatDate(r.created_date)};${r.service_type};${formatBRL(r.cancellation_fee)};${formatBRL(r.cancellation_locksmith_amount)};${formatBRL(r.cancellation_app_fee)}`
      );
    });
  }
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBase(me)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCommissionPDF({ me, completed, cancelled, isAppMode, commissionRate }) {
  const mc = currentMonthRecords(completed);
  const mca = currentMonthRecords(cancelled);
  const s = buildSummary({ completed: mc, cancelled: mca, isAppMode, commissionRate });
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(16);
  doc.text("Relatorio de Comissoes - Chaveiro Ja", 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Chaveiro: ${me?.name || ""}`, 14, y); y += 6;
  doc.text(`Modo: ${isAppMode ? "Aplicativo" : "Livre"}`, 14, y); y += 6;
  doc.text(`Periodo: ${monthLabel()}`, 14, y); y += 8;

  doc.setFontSize(12);
  doc.text("Resumo", 14, y); y += 6;
  doc.setFontSize(10);
  doc.text(`Servicos concluidos: ${s.count}`, 14, y); y += 6;
  doc.text(`Total bruto: ${formatBRL(s.gross)}`, 14, y); y += 6;
  if (isAppMode) {
    doc.text(`Comissao app (15%): ${formatBRL(s.commission)}`, 14, y); y += 6;
    doc.text(`Comissoes compensadas: ${formatBRL(s.commissionPaid)}`, 14, y); y += 6;
    doc.text(`Comissoes pendentes: ${formatBRL(s.commissionPending)}`, 14, y); y += 6;
    doc.text(`Taxas de cancelamento (20%): ${formatBRL(s.cancellationTotal)}`, 14, y); y += 6;
  }
  doc.text(`Liquido: ${formatBRL(s.net)}`, 14, y); y += 8;

  doc.setFontSize(12);
  doc.text("Servicos concluidos", 14, y); y += 6;
  doc.setFontSize(9);
  mc.forEach((r) => {
    if (y > 280) { doc.addPage(); y = 18; }
    const price = Number(r.price) || 0;
    const comm = isAppMode ? price * commissionRate : 0;
    const net = price - comm;
    const status = (r.commission_status || "pending") === "paid" ? "Compensada" : "Pendente";
    doc.text(
      `${formatDate(r.created_date)} - ${r.service_type} - ${formatBRL(price)} (comissao ${formatBRL(comm)}, liquido ${formatBRL(net)}, ${status})`,
      14, y, { maxWidth: 185 }
    );
    y += 5;
  });

  if (isAppMode && mca.length > 0) {
    y += 4;
    if (y > 270) { doc.addPage(); y = 18; }
    doc.setFontSize(12);
    doc.text("Cancelamentos com taxa", 14, y); y += 6;
    doc.setFontSize(9);
    mca.forEach((r) => {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.text(
        `${formatDate(r.created_date)} - ${r.service_type} - Taxa ${formatBRL(r.cancellation_fee)} (voce ${formatBRL(r.cancellation_locksmith_amount)}, app ${formatBRL(r.cancellation_app_fee)})`,
        14, y, { maxWidth: 185 }
      );
      y += 5;
    });
  }

  doc.save(`${fileBase(me)}.pdf`);
}