import React from "react";
import { Cpu, KeyRound, Wrench } from "lucide-react";

const FIELD_PATTERN = /(Arquitetura|Arquivos|Transponder|Lâmina|Alarme|Codificação|Máquina de codificação):\s*(.*?)(?=\s+—\s+(?:Arquitetura|Arquivos|Transponder|Lâmina|Alarme|Codificação|Máquina de codificação):|\n(?:Arquitetura|Arquivos|Transponder|Lâmina|Alarme|Codificação|Máquina de codificação):|$)/gis;

export default function KeyTechnicalDetails({ description, request }) {
  const isVehicleKey = ["Confecção de Chave de Carro", "Confecção de Chave de Moto"].includes(request?.service_type);
  const raw = String(description || "");
  const clientName = raw.match(/(?:^|—\s*)Cliente:\s*([^—\n]+)/i)?.[1]?.trim();
  const technical = {};
  let match;
  while ((match = FIELD_PATTERN.exec(raw)) !== null) technical[match[1].toLowerCase()] = match[2].trim();
  const customerNote = raw
    .replace(/(?:^|—\s*)Cliente:\s*[^—\n]+(?:—\s*)?/i, "")
    .replace(FIELD_PATTERN, "")
    .replace(/(?:^|\s)—(?:\s|$)/g, " ")
    .trim();

  if (!isVehicleKey && !customerNote && !clientName) return null;
  const rows = [
    { label: "Transponder", value: technical.transponder, icon: Cpu },
    { label: "Lâmina", value: technical["lâmina"], icon: KeyRound },
    { label: "Equipamentos para programação", value: technical["máquina de codificação"], icon: Wrench },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div><p className="font-heading font-semibold text-foreground">Ficha técnica do serviço</p><p className="text-xs text-muted-foreground">Informações liberadas após o aceite</p></div>
      {request && <div className="rounded-lg bg-muted/50 p-3 text-sm"><p><span className="text-muted-foreground">Cliente:</span> <strong>{clientName || "Nome não informado"}</strong></p><p><span className="text-muted-foreground">Veículo:</span> <strong>{request.vehicle_info || "Não informado"}</strong></p><p><span className="text-muted-foreground">Tipo de chave:</span> <strong>{({ simples: "Simples", canivete: "Canivete", telecomando: "Telecomando", presenca: "Presença (Smart Key)" })[request.key_type] || request.key_type || "Não informado"}</strong></p></div>}
      {isVehicleKey && <div className="grid gap-2">{rows.map(({ label, value, icon: Icon }) => <div key={label} className="flex gap-3 rounded-lg border border-border p-3"><Icon className="h-5 w-5 shrink-0 text-primary" /><div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="text-sm font-semibold text-foreground">{value || "Não informado no catálogo"}</p></div></div>)}</div>}
      {technical.arquitetura && <p className="text-xs text-muted-foreground"><strong className="text-foreground">Arquitetura:</strong> {technical.arquitetura}</p>}
      {technical.codificação && <p className="text-xs text-muted-foreground"><strong className="text-foreground">Codificação:</strong> {technical.codificação}</p>}
      {technical.arquivos && <p className="text-xs text-muted-foreground"><strong className="text-foreground">Arquivos:</strong> {technical.arquivos}</p>}
      {customerNote && <p className="border-t border-border pt-3 text-sm text-foreground whitespace-pre-wrap break-words"><strong>Observação do cliente:</strong> {customerNote}</p>}
    </div>
  );
}