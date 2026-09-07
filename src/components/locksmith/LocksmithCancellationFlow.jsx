import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CancellationReasonStep from "@/components/locksmith/CancellationReasonStep";
import CancellationDetailsStep from "@/components/locksmith/CancellationDetailsStep";

export default function LocksmithCancellationFlow({ open, onOpenChange, request, onSubmitted }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (details) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("serviceTrust", { action: "open_case", request_id: request.id, reason, ...details });
      onSubmitted?.(res.data);
      onOpenChange(false);
      setReason("");
    } finally { setLoading(false); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Justificar cancelamento</DialogTitle></DialogHeader>{reason ? <CancellationDetailsStep reason={reason} loading={loading} onSubmit={submit} onBack={() => setReason("")} /> : <CancellationReasonStep onSelect={setReason} onClose={() => onOpenChange(false)} />}</DialogContent></Dialog>;
}