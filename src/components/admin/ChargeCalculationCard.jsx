import React from "react";
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statuses = { searching: "Procurando", ringing: "Aguardando aceite", queued: "Na fila", accepted: "Aceito", on_the_way: "Em atendimento", completed: "Concluído", cancelled: "Cancelado" };
export default function ChargeCalculationCard({ request }) {
  const snapshot = request.pricing_calculation;
  const difference = snapshot ? Math.round((request.price - snapshot.total + Number(request.discount_amount || 0)) * 100) / 100 : 0;
  const commission = Math.round(Number(request.price || 0) * 15) / 100;
  return <details className="rounded-xl border border-border bg-card p-4">
    <summary className="cursor-pointer space-y-1"><span className="font-heading font-semibold">{request.service_type} · {money(request.price)}</span><p className="text-xs text-muted-foreground">{new Date(request.created_date).toLocaleString("pt-BR")} · {statuses[request.status] || request.status}</p><p className="text-xs text-muted-foreground break-all">Chamado {request.id}</p></summary>
    <div className="mt-4 space-y-2 text-sm">
      {snapshot ? <>
        <p className="font-semibold">Cálculo na solicitação</p>
        {snapshot.lines.map((line, i) => <div key={i} className="flex justify-between gap-4"><span>{line.label}</span><span className="shrink-0">{money(line.value)}</span></div>)}
        <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Total calculado</span><span>{money(snapshot.total)}</span></div>
        {snapshot.notes?.map((note, i) => <p key={i} className="text-xs text-muted-foreground">{note}</p>)}
        <div className="flex justify-between"><span>Desconto aplicado</span><span>− {money(request.discount_amount)}</span></div>
        {difference !== 0 && <div className="flex justify-between"><span>Ajustes após a solicitação</span><span>{money(difference)}</span></div>}
      </> : <>
        <p className="text-xs text-muted-foreground">Chamado anterior ao registro detalhado: fatores de horário, clima e demanda não foram salvos. Abaixo estão apenas os valores registrados; não recalculamos o passado com as tarifas atuais.</p>
        {[["Chave", "key_value"], ["Mão de obra", "labor_cost"], ["Locomoção", "locomotion_cost"], ["Adicionais", "extra_cost"], ["Desconto", "discount_amount"]].filter(([, field]) => request[field] != null).map(([label, field]) => <div key={field} className="flex justify-between"><span>{label}</span><span>{money(request[field])}</span></div>)}
      </>}
      {request.fipe_value > 0 && <p className="text-xs text-muted-foreground">Referência FIPE: {money(request.fipe_value)} (não somada como cobrança).</p>}
      {request.distance_km != null && <p className="text-xs text-muted-foreground">Distância registrada: {Number(request.distance_km).toFixed(1)} km.</p>}
      <div className="flex justify-between border-t border-border pt-2 font-bold"><span>Valor atual do serviço</span><span>{money(request.price)}</span></div>
      {request.status === "cancelled" ? <>
        <div className="flex justify-between"><span>Taxa de cancelamento registrada</span><span>{money(request.cancellation_fee)}</span></div>
        <div className="flex justify-between"><span>Parte do aplicativo</span><span>{money(request.cancellation_app_fee)}</span></div>
        <div className="flex justify-between"><span>Parte do chaveiro</span><span>{money(request.cancellation_locksmith_amount)}</span></div>
      </> : <>
        <div className="flex justify-between"><span>Comissão prevista (15%)</span><span>{money(commission)}</span></div>
        <div className="flex justify-between"><span>Líquido previsto (85%)</span><span>{money(Number(request.price || 0) - commission)}</span></div>
        <p className="text-xs text-muted-foreground">Divisão do serviço, antes de compensações de dívidas ou ajustes financeiros; não representa saldo disponível para saque.</p>
      </>}
    </div>
  </details>;
}