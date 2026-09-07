import React from "react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  ["address_incorrect", "O endereço informado está incorreto?", "Você deverá aguardar 6 minutos no local."],
  ["threat", "Você foi ameaçado ou agredido?", "Relate o ocorrido; sua conta ficará em análise por até 48 horas."],
  ["client_cancelled", "O cliente cancelou o serviço?", "Será obrigatória uma foto do local e espera de 5 minutos."],
];

export default function CancellationReasonStep({ onSelect, onClose }) {
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Informe por que deseja cancelar após chegar ao local:</p>{OPTIONS.map(([id, title, text]) => <button key={id} onClick={() => onSelect(id)} className="w-full text-left p-3 rounded-xl border border-border hover:border-primary"><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground mt-1">{text}</p></button>)}<Button variant="ghost" onClick={onClose} className="w-full">Continuar atendimento</Button></div>;
}