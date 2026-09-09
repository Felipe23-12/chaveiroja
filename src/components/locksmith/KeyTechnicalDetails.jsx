import React from "react";

export default function KeyTechnicalDetails({ description, request }) {
  const isVehicleKey = ["Confecção de Chave de Carro", "Confecção de Chave de Moto"].includes(request?.service_type);
  const clientMatch = String(description || "").match(/(?:^|—\s*)Cliente:\s*([^—\n]+)/i);
  const clientName = clientMatch?.[1]?.trim();
  const cleanDescription = String(description || "").replace(/(?:^|—\s*)Cliente:\s*[^—\n]+(?:—\s*)?/i, "").trim();
  if (!cleanDescription && !isVehicleKey && !clientName) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground mb-1">Descrição e dados técnicos</p>
      {request && <div className="mb-2 rounded-md bg-muted/50 p-2 text-sm text-foreground">
        <p><span className="text-muted-foreground">Cliente:</span> <strong>{clientName || "Nome não informado"}</strong></p>
        <p><span className="text-muted-foreground">Valor total do serviço:</span> <strong>R$ {(Number(request.price) || 0).toFixed(2)}</strong></p>
      </div>}
      {isVehicleKey && <div className="mb-2 text-sm font-medium text-foreground">
        <p>{request.vehicle_info || "Veículo não informado"}</p>
        <p>Tipo de chave: {({ simples: "Simples", canivete: "Canivete", telecomando: "Telecomando", presenca: "Presença (Smart Key)" })[request.key_type] || request.key_type || "não informado"}</p>
      </div>}
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{cleanDescription}</p>
      {isVehicleKey && !cleanDescription.includes("Máquina de codificação:") && <p className="mt-2 text-sm text-muted-foreground">Codificação e máquina não informadas neste chamado. Confirme na ficha técnica; informação ausente não significa “sem cod”.</p>}
    </div>
  );
}