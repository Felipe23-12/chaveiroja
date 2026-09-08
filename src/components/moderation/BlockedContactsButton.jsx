import React, { useState } from "react";
import { Ban, UserRoundCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useBlockedUsers from "@/hooks/useBlockedUsers";

export default function BlockedContactsButton() {
  const [open, setOpen] = useState(false);
  const { blocks, user } = useBlockedUsers();
  const mine = blocks.filter((b) => b.blocker_id === user?.id && b.active !== false);
  return <>
    <button onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-accent min-h-[36px]"><Ban className="w-3 h-3" /> Contatos bloqueados</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Contatos bloqueados</DialogTitle></DialogHeader><div className="space-y-2">{mine.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum contato bloqueado.</p> : mine.map((b) => <div key={b.id} className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm font-medium">{b.blocked_name || "Usuário"}</span><Button size="sm" variant="outline" onClick={() => base44.entities.UserBlock.delete(b.id)}><UserRoundCheck /> Desbloquear</Button></div>)}</div></DialogContent></Dialog>
  </>;
}