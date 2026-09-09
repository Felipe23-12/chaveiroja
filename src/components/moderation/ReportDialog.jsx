import React, { useState } from "react";
import { Flag } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReportForm from "@/components/moderation/ReportForm";

export default function ReportDialog({ targetUserId, targetType, targetName, contextType, requestId, locksmithId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  if (!targetUserId || targetUserId === user?.id) return null;
  const data = { reporter_id: user.id, reporter_name: user.full_name || user.email, reported_id: targetUserId, reported_name: targetName, reporter_type: user.account_type, reported_type: targetType, context_type: contextType, request_id: requestId, locksmith_id: locksmithId };
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="text-destructive"><Flag /> Denunciar</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Denunciar conduta</DialogTitle><DialogDescription>A denúncia será enviada para análise administrativa e não suspende automaticamente a conta.</DialogDescription></DialogHeader>{sent ? <p className="rounded-lg bg-primary/10 p-4 text-sm">Denúncia enviada. Um canal de apuração foi aberto e a outra parte terá 2 dias para apresentar defesa.</p> : <ReportForm data={data} onDone={() => setSent(true)} />}</DialogContent></Dialog>
  </>;
}