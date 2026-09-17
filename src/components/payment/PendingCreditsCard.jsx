import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import useOnAppResume from "@/hooks/useOnAppResume";

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function PendingCreditsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const [markingId, setMarkingId] = useState(null);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["pending-payment-credits", user?.id, page], enabled: !!user,
    queryFn: async () => (await base44.functions.invoke("mercadoPagoPayment", { action: "get_pending_credits", page })).data,
    refetchInterval: 30000, refetchOnWindowFocus: true, refetchOnReconnect: true,
  });
  useOnAppResume(refetch);

  const handleMarkTransferred = async (paymentId) => {
    setMarkingId(paymentId);
    try {
      await base44.functions.invoke("mercadoPagoPayment", { action: "mark_transferred", payment_id: paymentId });
      toast({ title: "Repasse confirmado", description: "O crédito saiu da lista de pendentes." });
      refetch();
    } catch (e) {
      toast({ title: "Erro ao confirmar repasse", description: e?.response?.data?.error || e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setMarkingId(null);
    }
  };
  return <section className="rounded-xl border border-border bg-card p-4 space-y-3 text-foreground">
    <h3 className="font-heading font-semibold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Créditos pendentes de repasse</h3>
    {isLoading ? <p className="flex gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Consultando créditos...</p> : isError ? <p role="alert" className="text-sm text-destructive">Não foi possível consultar os créditos.</p> : <>
      <p className="text-2xl font-heading font-bold">{money(data?.total)}</p>
      <p className="text-xs text-muted-foreground">{data?.count || 0} pagamento(s) confirmado(s). Valores após comissão, eventuais compensações e tarifas do Mercado Pago.</p>
      {!!data?.review_count && <p className="text-sm text-muted-foreground">{data.review_count} pagamento(s) em revisão, fora do total pendente.</p>}
      {!data?.items?.length && <p className="text-sm text-muted-foreground">Nenhum crédito nesta página.</p>}
      <div className="space-y-2">{data?.items?.map((item) => <div key={item.id} className="border-t border-border pt-2 text-sm">
        <div className="flex justify-between gap-2"><span>{user?.role === "admin" ? item.locksmith_name || "Chaveiro" : "Crédito do atendimento"}</span><strong>{item.status === "under_review" ? "Em revisão" : money(item.amount)}</strong></div>
        <p className="text-xs text-muted-foreground break-all">{new Date(item.date).toLocaleDateString("pt-BR")} · Atendimento {item.service_request_id}</p>
        <p className="text-xs text-muted-foreground">Pago: {money(item.gross)} · Comissão/compensações: {money(item.commission)} · Tarifa: {item.fee == null ? "a confirmar" : money(item.fee)}</p>
        {user?.role === "admin" && item.status !== "under_review" && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5"
            disabled={markingId === item.id}
            onClick={() => handleMarkTransferred(item.id)}
          >
            {markingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Marcar como repassado
          </Button>
        )}
      </div>)}</div>
    </>}
    <p className="text-xs text-muted-foreground">Recebidos pela plataforma, ainda não transferidos ao chaveiro. O Mercado Pago não permite repasse automático para outra conta; um admin precisa enviar o Pix manualmente e depois marcar como repassado.</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="min-h-[44px]" disabled={isFetching} onClick={() => refetch()}>Atualizar</Button>
      {page > 0 && <Button variant="outline" size="sm" className="min-h-[44px]" disabled={isFetching} onClick={() => setPage(page - 1)}>Anterior</Button>}
      {data?.has_more && <Button variant="outline" size="sm" className="min-h-[44px]" disabled={isFetching} onClick={() => setPage(page + 1)}>Próxima</Button>}
    </div>
  </section>;
}