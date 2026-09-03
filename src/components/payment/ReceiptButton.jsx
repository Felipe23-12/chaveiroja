import React, { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";

const PAYMENT_METHOD_LABEL = {
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
};

function formatDateBR(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatCurrency(v) {
  return `R$ ${(Number(v) || 0).toFixed(2)}`;
}

/**
 * Gera um recibo digital em PDF do serviço realizado e baixa o arquivo.
 * serviceRequest: registro de ServiceRequest concluído/pago
 * locksmith: dados do chaveiro (opcional)
 * customerName: nome do cliente (opcional)
 */
export default function ReceiptButton({ serviceRequest, locksmith, customerName }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!serviceRequest) return;
    setGenerating(true);
    try {
      const sr = serviceRequest;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 18;
      let y = 22;

      // Cabeçalho — faixa preta com logo amarelo
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 28, "F");
      doc.setFillColor(245, 158, 11);
      doc.rect(0, 28, pageW, 1.5, "F");

      doc.setTextColor(245, 158, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("CHAVEIRO JÁ", margin, 16);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Recibo de Serviço", pageW - margin, 16, { align: "right" });

      y = 40;
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("RECIBO DE PRESTAÇÃO DE SERVIÇO", pageW / 2, y, { align: "center" });
      y += 6;

      // Número do recibo (baseado no ID do pedido)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const receiptNo = `Nº ${sr.id?.slice(-8).toUpperCase() || "00000000"}`;
      const issuedAt = `Emitido em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
      doc.text(receiptNo, margin, y);
      doc.text(issuedAt, pageW - margin, y, { align: "right" });
      y += 6;

      // Linha separadora
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Dados do cliente
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("CLIENTE", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Nome: ${customerName || "—"}`, margin, y);
      y += 5;
      doc.text(`Pedido: ${sr.id || ""}`, margin, y);
      y += 8;

      // Dados do chaveiro
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PROFISSIONAL", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Chaveiro: ${sr.locksmith_name || locksmith?.name || "—"}`, margin, y);
      y += 5;
      if (locksmith?.phone) {
        doc.text(`Telefone: ${locksmith.phone}`, margin, y);
        y += 5;
      }
      if (locksmith?.specialty) {
        doc.text(`Especialidade: ${locksmith.specialty}`, margin, y);
        y += 5;
      }
      y += 5;

      // Detalhes do serviço
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("DETALHES DO SERVIÇO", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);

      const serviceRows = [
        ["Tipo de serviço", sr.service_type || "—"],
        ["Urgência", sr.urgency === "urgent" ? "Urgente" : "Normal"],
        ["Endereço", sr.address || "—"],
        ["Descrição", sr.description || "—"],
        ["Data de aceitação", formatDateBR(sr.accepted_at)],
        ["Distância (km)", sr.distance_km ? `${sr.distance_km} km` : "—"],
      ];
      serviceRows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, margin, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(String(value), pageW - margin * 2 - 40);
        doc.text(wrapped, margin + 40, y);
        y += Math.max(5, wrapped.length * 5);
      });
      y += 4;

      // Quadro de valores
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, pageW - margin * 2, 56, 2, 2, "FD");
      let vy = y + 8;
      const colLabel = margin + 6;
      const colValue = pageW - margin - 6;

      const priceRows = [
        ["Valor da chave", formatCurrency(sr.key_value)],
        ["Mão de obra", formatCurrency(sr.labor_cost)],
        ["Locomoção", formatCurrency(sr.locomotion_cost)],
        ["Custos adicionais", formatCurrency(sr.extra_cost)],
      ];
      priceRows.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(10);
        doc.text(label, colLabel, vy);
        doc.text(value, colValue, vy, { align: "right" });
        vy += 6;
      });

      if (sr.discount_applied) {
        doc.setTextColor(22, 163, 74);
        doc.text(`Desconto de fidelidade (10%)`, colLabel, vy);
        doc.text(`- ${formatCurrency(sr.discount_amount)}`, colValue, vy, { align: "right" });
        vy += 6;
      }

      // Total
      doc.setDrawColor(226, 232, 240);
      doc.line(margin + 6, vy, pageW - margin - 6, vy);
      vy += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("TOTAL PAGO", colLabel, vy);
      doc.text(formatCurrency(sr.price), colValue, vy, { align: "right" });
      vy += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Forma de pagamento: ${PAYMENT_METHOD_LABEL[sr.payment_method] || sr.payment_method || "—"}`,
        colLabel,
        vy
      );
      y = vy + 10;

      // Status do pagamento
      doc.setFillColor(220, 252, 231);
      doc.setDrawColor(34, 197, 94);
      doc.roundedRect(margin, y, 70, 9, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      doc.text("PAGAMENTO CONFIRMADO", margin + 4, y + 6);
      y += 16;

      // Fotos registradas
      if (sr.start_photos?.length || sr.end_photos?.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("REGISTRO FOTOGRÁFICO", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`Fotos do início: ${sr.start_photos?.length || 0}`, margin, y);
        y += 5;
        doc.text(`Fotos do final: ${sr.end_photos?.length || 0}`, margin, y);
        y += 8;
      }

      // Rodapé
      const footerY = doc.internal.pageSize.getHeight() - 18;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Este recibo foi gerado automaticamente pelo aplicativo Chaveiro Já e comprova a prestação do serviço descrito acima.",
        pageW / 2,
        footerY,
        { align: "center" }
      );

      // Nome do arquivo
      const safeName = (sr.locksmith_name || "chaveiro")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
      doc.save(`recibo_${safeName}_${sr.id?.slice(-6) || "servico"}.pdf`);
    } catch (e) {
      console.error("Erro ao gerar recibo", e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={generating} variant="outline" className="w-full">
      {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
      {generating ? "Gerando recibo..." : "Baixar recibo (PDF)"}
    </Button>
  );
}