import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingCard from "@/components/ui/LoadingCard";

const LABELS = {
  not_configured: ["Provedor não configurado", "bg-muted text-muted-foreground"],
  no_phone: ["Sem telefone válido", "bg-warning/15 text-warning"],
  sending: ["Enviando", "bg-muted text-foreground"],
  whatsapp_sent: ["WhatsApp enviado", "bg-primary/20 text-foreground"],
  whatsapp_delivered: ["WhatsApp entregue", "bg-success/15 text-success"],
  sms_sending: ["Enviando SMS", "bg-muted text-foreground"],
  sms_sent: ["SMS enviado", "bg-primary/20 text-foreground"],
  sms_delivered: ["SMS entregue", "bg-success/15 text-success"],
  failed: ["Falhou", "bg-destructive/15 text-destructive"],
};

export default function MessageDeliveriesPanel() {
  const { data = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["locksmith-message-deliveries"],
    queryFn: () => base44.entities.LocksmithMessageDelivery.list("-created_date", 50),
  });

  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div>
        <h2 className="text-lg font-bold">Avisos por WhatsApp/SMS</h2>
        <p className="text-sm text-muted-foreground">Novos chamados avisam o chaveiro por WhatsApp; sem WhatsApp, o aviso segue por SMS.</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="h-4 w-4" />Atualizar</Button>
    </div>
    {isLoading ? <LoadingCard label="Carregando avisos..." /> : data.length === 0 ? <p className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">Nenhum aviso registrado ainda.</p> :
      <div className="space-y-2">{data.map((d) => {
        const [label, cls] = LABELS[d.status] || [d.status, "bg-muted"];
        const error = d.sms_error_message || d.whatsapp_error_message;
        return <div key={d.id} className="rounded-xl border border-border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">Chamado {d.service_request_id.slice(-6)} · {d.phone || "sem telefone"}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{new Date(d.created_date).toLocaleString("pt-BR")}{d.fallback_reason ? ` · ${d.fallback_reason}` : ""}</p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>;
      })}</div>}
  </section>;
}