import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function CancellationCaseNotice({ requestId }) {
  const [item, setItem] = useState(null); const [report, setReport] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => base44.entities.ServiceCancellationCase.filter({ request_id: requestId }, "-created_date", 1).then((r) => setItem(r[0] || null)).catch(() => {});
  useEffect(() => { load(); return safeUnsubscribe(base44.entities.ServiceCancellationCase.subscribe(load)); }, [requestId]);
  if (!item || ["resolved", "cancelled"].includes(item.status)) return null;
  const answer = async (response) => { setBusy(true); try { await base44.functions.invoke("serviceTrust", { action: "client_response", case_id: item.id, response, report }); await load(); } finally { setBusy(false); } };
  return <div className="p-4 rounded-xl border-2 border-warning/40 bg-warning/10 space-y-3"><p className="font-semibold text-sm">Ação necessária</p><p className="text-sm">{item.reason === "address_incorrect" ? "O chaveiro informou que está no endereço indicado. Encontre-o; ele aguardará 6 minutos." : item.reason === "threat" ? "O chaveiro relatou ameaça ou agressão. Informe sua versão dos fatos." : "O chaveiro informou que você cancelou. Confirme ou negue em até 5 minutos."}</p>{item.reason === "threat" ? <><Textarea value={report} onChange={(e) => setReport(e.target.value)} placeholder="Conte sua versão" /><Button disabled={busy || report.trim().length < 10} onClick={() => answer("reported")} className="w-full">Enviar minha versão</Button></> : item.reason === "client_cancelled" ? <div className="flex gap-2"><Button disabled={busy} onClick={() => answer("confirmed")} className="flex-1">Sim, cancelei</Button><Button disabled={busy} variant="outline" onClick={() => answer("denied")} className="flex-1">Não cancelei</Button></div> : null}</div>;
}