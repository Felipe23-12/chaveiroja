import React, { useState } from "react";
import { Ban, Mail, Phone, UserRoundCheck, Wrench } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";

export default function ReportParticipantCard({ label, participant, locksmith, fallbackName, type }) {
  const [blocked, setBlocked] = useState(participant?.moderation_blocked === true);
  const [saving, setSaving] = useState(false);
  const toggle = async () => {
    if (!participant?.id || saving) return;
    setSaving(true);
    try {
      await base44.functions.invoke("reportChannel", {
        action: "adminSetUserBlock",
        userId: participant.id,
        blocked: !blocked,
        reason: "Bloqueio relacionado à análise de denúncia",
      });
      setBlocked((value) => !value);
    } finally {
      setSaving(false);
    }
  };
  const name = participant?.full_name || participant?.username || fallbackName || "Perfil não encontrado";
  return <div className="rounded-xl border border-border bg-muted/20 p-3">
    <div className="mb-3 flex items-center gap-3">
      <Image src={participant?.avatar_url || locksmith?.avatar_url} alt={`Perfil de ${name}`} className="h-11 w-11 rounded-full" />
      <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="truncate font-heading font-semibold text-foreground">{name}</p><p className="text-xs capitalize text-muted-foreground">{type || participant?.account_type || "usuário"}</p></div>
      {blocked && <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">Bloqueado</span>}
    </div>
    <div className="space-y-1 text-xs text-muted-foreground">
      {participant?.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{participant.email}</p>}
      {(participant?.phone || locksmith?.phone) && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{participant?.phone || locksmith?.phone}</p>}
      {locksmith && <p className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />{locksmith.specialty || "Chaveiro"} · nota {Number(locksmith.rating || 0).toFixed(1)}</p>}
    </div>
    <Button type="button" variant="outline" size="sm" onClick={toggle} disabled={!participant?.id || saving} className={`mt-3 w-full ${blocked ? "text-success" : "text-destructive"}`}>
      {blocked ? <UserRoundCheck /> : <Ban />}{saving ? "Salvando..." : blocked ? "Desbloquear perfil" : "Bloquear perfil"}
    </Button>
  </div>;
}