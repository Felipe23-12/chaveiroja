import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function LocksmithCaseStatus({ requestId }) {
  const [item, setItem] = useState(null);
  const load = () => base44.entities.ServiceCancellationCase.filter({ request_id: requestId }, "-created_date", 1).then((rows) => setItem(rows[0] || null)).catch(() => {});
  useEffect(() => { load(); return safeUnsubscribe(base44.entities.ServiceCancellationCase.subscribe(load)); }, [requestId]);
  if (!item || ["resolved", "cancelled", "threat_suspended"].includes(item.status)) return null;
  const keepService = async () => { await base44.functions.invoke("serviceTrust", { action: "resolve_case", case_id: item.id }); await load(); };
  return <div className="p-4 rounded-xl border-2 border-warning/40 bg-warning/10 space-y-2"><p className="text-sm font-semibold">Cancelamento em verificação</p><p className="text-xs text-muted-foreground">{item.status === "waiting_address" ? "Aguarde 6 minutos no endereço informado. Se encontrar o cliente, continue o atendimento." : item.status === "waiting_client" ? "Aguardando o cliente confirmar se cancelou o serviço." : "O cliente negou o cancelamento. Encontre-o e conclua o serviço."}</p>{item.status === "waiting_address" && <Button size="sm" onClick={keepService} className="w-full">Encontrei o cliente · continuar</Button>}</div>;
}