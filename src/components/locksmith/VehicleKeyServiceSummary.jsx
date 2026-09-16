import React from "react";

export default function VehicleKeyServiceSummary({ request, clientName, keyType, origin, technical, customerNote }) {
  const parallel = origin?.toLowerCase() === "chave paralela";
  const files = technical.arquivos?.split(/;\s*/).filter((file) => /^(VVDI|KD|KM100)\b/i.test(file.trim())).join("; ");
  const alarm = parallel ? files || "Marca e arquivo não informados no chamado" : origin ? "Sim" : technical.alarme || "Não informado";
  const machine = technical["máquina de codificação"]?.split(/\s+—\s+/).filter((part) => !/^programação de chaves$/i.test(part.trim())).join(" — ");
  const total = request?.price != null ? Number(request.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado";

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground space-y-4 break-words">
      <p><strong>Cliente:</strong> {clientName}</p>
      <p><strong>Valor total do serviço:</strong> <span className="font-semibold text-primary">{total}</span></p>
      <p>{request?.vehicle_info || "Veículo não informado no chamado"}</p>
      <p><strong>Tipo de chave:</strong> {keyType || "Não informado"}</p>
      <div className="space-y-2 whitespace-pre-wrap">
        <p className="font-semibold">{origin || "Origem da chave não informada"}</p>
        {technical["código da chave"] && <p><strong>Código da chave:</strong> {technical["código da chave"]}</p>}
        {technical["produto de referência"] && <p><strong>Produto de referência:</strong> {technical["produto de referência"]}</p>}
        {technical["aplicação do catálogo"] && <p><strong>Aplicação do catálogo:</strong> {technical["aplicação do catálogo"]}</p>}
        <p><strong>Transponder:</strong> {technical.transponder || "Não informado"} — <strong>Lâmina:</strong> {technical["lâmina"] || "Não informada"}</p>
        <p><strong>Frequência:</strong> {technical["frequência"] || "Não informada no chamado"}{technical["botões"] && <> — <strong>Botões:</strong> {technical["botões"]}</>}</p>
        {technical["código da chave"] && <p className="text-xs text-muted-foreground">Referência do catálogo utilizada na cotação; confirme a versão no veículo. Produto sem chip não significa veículo sem imobilizador.</p>}
        <p><strong>Alarme:</strong> {alarm}</p>
        <p><strong>Codificação:</strong> {technical.codificação || "Não informada"}</p>
        <p><strong>Máquina de codificação:</strong> {machine || "Não informada"}</p>
      </div>
      {customerNote && <p className="border-t border-border pt-3 whitespace-pre-wrap"><strong>Observação do cliente:</strong> {customerNote}</p>}
    </div>
  );
}