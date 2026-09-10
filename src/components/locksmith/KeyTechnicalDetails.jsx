import React from "react";
import { Cpu, KeyRound, Wrench, User, Banknote, Car } from "lucide-react";
import { clientNameFromRequest } from "@/lib/clientName";

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
    .replace(/(?:^|—\s*)Chave (?:original|paralela)(?=\s*—|$)/i, "")
    .replace(/(?:^|\s)—(?:\s|$)/g, " ")
    .trim();

  if (!isVehicleKey && !customerNote && !clientName) return null;
  const origin = raw.match(/(?:^|—\s*)(Chave original|Chave paralela)(?=\s*—|$)/i)?.[1];
  const keyType = ({ simples: "Chave simples", canivete: "Chave canivete", telecomando: "Chave com telecomando", presenca: "Chave de presença (Smart Key)" })[request?.key_type] || request?.key_type;
  const rows = [
    { label: "Nome do cliente", value: clientNameFromRequest(request), icon: User },
    { label: "Valor do serviço", value: request?.price != null ? Number(request.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado", icon: Banknote },
    { label: "Modelo e ano do veículo", value: request?.vehicle_info, icon: Car },
    { label: "Transponder", value: technical.transponder, icon: Cpu },
    { label: "Tipo de chave solicitado", value: keyType, icon: KeyRound },
    { label: "Origem da chave", value: origin, icon: KeyRound },
    { label: "Modelo da lâmina da chave", value: technical["lâmina"], icon: KeyRound },
    { label: "Máquinas de programação do veículo", value: technical["máquina de codificação"], icon: Wrench },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div><p className="font-heading font-semibold text-foreground">{isVehicleKey ? "Ficha de confecção de chave" : "Ficha técnica do serviço"}</p><p className="text-xs text-muted-foreground">Informações liberadas após o aceite</p></div>
      {!isVehicleKey && clientName && <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> <strong>{clientName}</strong></p>}
      {isVehicleKey && <dl className="grid gap-2 sm:grid-cols-2">{rows.map(({ label, value, icon: Icon }, index) => <div key={label} className={`flex min-w-0 gap-3 rounded-lg border border-border p-3 ${index === 6 ? "sm:col-span-2" : ""}`}><Icon className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className={`mt-1 whitespace-pre-wrap break-words font-semibold ${index === 1 ? "text-lg text-primary" : "text-sm text-foreground"}`}>{value || "Não informado no chamado"}</dd></div></div>)}</dl>}
      {technical.arquitetura && <p className="text-xs text-muted-foreground"><strong className="text-foreground">Arquitetura:</strong> {technical.arquitetura}</p>}
      {technical.codificação && <p className="text-xs text-muted-foreground"><strong className="text-foreground">Codificação:</strong> {technical.codificação}</p>}
      {origin?.toLowerCase() === "chave paralela" && <div className="rounded-lg border border-border p-3"><p className="text-xs font-medium text-muted-foreground">Arquivos da chave paralela — VVDI / KD</p><p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-foreground">{technical.arquivos?.split(/;\s*/).filter((file) => /^(VVDI|KD)\b/i.test(file.trim())).join("\n") || "Arquivo VVDI/KD não informado no chamado"}</p></div>}
      {customerNote && <p className="border-t border-border pt-3 text-sm text-foreground whitespace-pre-wrap break-words"><strong>Observação do cliente:</strong> {customerNote}</p>}
    </div>
  );
}