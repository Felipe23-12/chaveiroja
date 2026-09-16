import React from "react";
import VehicleKeyServiceSummary from "@/components/locksmith/VehicleKeyServiceSummary";
import { clientNameFromRequest } from "@/lib/clientName";

const FIELD_PATTERN = /(Arquitetura|Arquivos|Transponder|Lâmina|Frequência|Código da chave|Produto de referência|Botões|Aplicação do catálogo|Alarme|Codificação|Máquina de codificação):\s*(.*?)(?=\s+—\s+(?:Arquitetura|Arquivos|Transponder|Lâmina|Frequência|Código da chave|Produto de referência|Botões|Aplicação do catálogo|Alarme|Codificação|Máquina de codificação):|\n(?:Arquitetura|Arquivos|Transponder|Lâmina|Frequência|Código da chave|Produto de referência|Botões|Aplicação do catálogo|Alarme|Codificação|Máquina de codificação):|$)/gis;

export default function KeyTechnicalDetails({ description, request }) {
  const isVehicleKey = ["Confecção de Chave de Carro", "Confecção de Chave de Moto"].includes(request?.service_type);
  const raw = String(description || request?.description || "");
  const clientName = raw.match(/(?:^|—\s*)Cliente:\s*([^—\n]+)/i)?.[1]?.trim();
  const technical = {};
  let match;
  while ((match = FIELD_PATTERN.exec(raw)) !== null) technical[match[1].toLowerCase()] = match[2].trim();
  const customerNote = raw
    .replace(/(?:^|—\s*)Cliente:\s*[^—\n]+(?:—\s*)?/i, "")
    .replace(FIELD_PATTERN, "")
    .replace(/(?:^|—\s*)Chave (?:original|paralela)(?=\s*—|$)/i, "")
    .replace(/(?:^|\s)—(?:\s|$)/g, " ")
    .trim();

  if (!isVehicleKey && !customerNote && !clientName) return null;
  const origin = raw.match(/(?:^|—\s*)(Chave original|Chave paralela)(?=\s*—|$)/i)?.[1];
  const keyType = ({ simples: "Simples", canivete: "Canivete", telecomando: "Telecomando", presenca: "Presença (Smart Key)" })[request?.key_type] || request?.key_type;
  if (isVehicleKey) return <VehicleKeyServiceSummary request={request} clientName={clientName || clientNameFromRequest(request)} keyType={keyType} origin={origin} technical={technical} customerNote={customerNote} />;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div><p className="font-heading font-semibold text-foreground">{isVehicleKey ? "Ficha de confecção de chave" : "Ficha técnica do serviço"}</p><p className="text-xs text-muted-foreground">Informações liberadas após o aceite</p></div>
      {!isVehicleKey && clientName && <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> <strong>{clientName}</strong></p>}

      {technical.arquitetura && <p className="text-xs text-muted-foreground"><strong className="text-foreground">Arquitetura:</strong> {technical.arquitetura}</p>}
      {technical.codificação && <p className="text-xs text-muted-foreground"><strong className="text-foreground">Codificação:</strong> {technical.codificação}</p>}
      {origin?.toLowerCase() === "chave paralela" && <div className="rounded-lg border border-border p-3"><p className="text-xs font-medium text-muted-foreground">Arquivos da chave paralela — VVDI / KD</p><p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-foreground">{technical.arquivos?.split(/;\s*/).filter((file) => /^(VVDI|KD)\b/i.test(file.trim())).join("\n") || "Arquivo VVDI/KD não informado no chamado"}</p></div>}
      {customerNote && <p className="border-t border-border pt-3 text-sm text-foreground whitespace-pre-wrap break-words"><strong>Observação do cliente:</strong> {customerNote}</p>}
    </div>
  );
}