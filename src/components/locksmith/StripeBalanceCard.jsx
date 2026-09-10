import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import StripeWithdrawButton from "@/components/locksmith/StripeWithdrawButton";

const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function StripeBalanceCard() {
  const { user } = useAuth();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["stripe-balance", user?.id], enabled: !!user?.id,
    queryFn: async () => (await base44.functions.invoke("stripeConnect", { action: "get_balance" })).data,
    staleTime: 15000, refetchInterval: 60000, refetchOnWindowFocus: "always", retry: 1,
  });
  return <div className="p-5 rounded-2xl border border-border bg-card text-card-foreground space-y-3">
    <div className="flex items-center justify-between gap-2"><h3 className="font-semibold flex items-center gap-2"><Wallet className="w-5 h-5 text-primary" /> Saldo na conta Stripe</h3><Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="Atualizar saldo Stripe"><RefreshCw className={isFetching ? "w-4 h-4 animate-spin" : "w-4 h-4"} /></Button></div>
    {isPending ? <p className="text-sm text-muted-foreground flex gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Consultando saldo real...</p> : error ? <p role="alert" className="text-sm text-destructive">Não foi possível consultar o saldo no Stripe. Tente atualizar.</p> : !data?.connected ? <p className="text-sm text-muted-foreground">Vincule sua conta Stripe para consultar os recebimentos.</p> : <>
      <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Disponível no Stripe</p><p className="font-heading font-bold text-2xl">{money(data.available)}</p></div><div><p className="text-xs text-muted-foreground">Em processamento no Stripe</p><p className="font-heading font-bold text-2xl">{money(data.pending)}</p></div></div>
      <p className="text-xs text-muted-foreground">Valores consultados diretamente no Stripe. O saldo em processamento ainda aguarda liberação para saque.</p>
      {data.livemode === false && <p className="text-sm text-destructive">Ambiente de teste: estes valores não são dinheiro real.</p>}
    </>}
    <StripeWithdrawButton className="rounded-xl bg-primary text-primary-foreground [&_button]:text-primary-foreground [&_p]:text-primary-foreground" />
  </div>;
}