import React from "react";
import { Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCORE_LOW } from "@/lib/locksmithScore";

export default function LocksmithQualityRow({ locksmith: l, suspended, onToggle, onRemove }) {
  return <tr className="border-t border-border">
    <td className="px-4 py-2 text-foreground">{l.display_name || l.name}</td>
    <td className="px-4 py-2 text-muted-foreground">{l.specialty}</td>
    <td className="px-4 py-2 capitalize">{l.work_mode}</td>
    <td className="px-4 py-2 whitespace-nowrap">
      <span className={l.trust_score <= SCORE_LOW ? "font-semibold text-destructive" : "font-semibold text-foreground"}>{l.trust_score.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} / 10</span>
      {!l.trust_status && <p className="text-xs text-muted-foreground">Pontuação inicial</p>}
    </td>
    <td className="px-4 py-2">
      {l.trust_status?.banned ? <span className="font-medium text-destructive">Banido</span> : suspended ? <div className="text-destructive"><span className="font-medium">Suspenso</span><p className="text-xs whitespace-nowrap">Até {new Date(l.trust_status.suspended_until).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })} (Brasília)</p></div> : <span className="text-muted-foreground">Sem suspensão ativa</span>}
    </td>
    <td className="px-4 py-2"><span className={l.available ? "text-foreground" : "text-muted-foreground"}>{l.available ? "Disponível" : "Indisponível"}</span></td>
    <td className="px-4 py-2"><div className="flex gap-1">
      <Button size="icon" variant="ghost" onClick={() => onToggle(l)} title="Alternar disponibilidade" aria-label={`Alternar disponibilidade de ${l.name}`}><Power className="w-4 h-4" /></Button>
      <Button size="icon" variant="ghost" onClick={() => onRemove(l)} title="Remover" aria-label={`Remover ${l.name}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
    </div></td>
  </tr>;
}