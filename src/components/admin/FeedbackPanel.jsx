import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import LoadingCard from "@/components/ui/LoadingCard";
import FeedbackCard from "@/components/admin/FeedbackCard";

export default function FeedbackPanel({ users = [] }) {
  const [page, setPage] = useState(0);
  const { data = [], isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ["app-feedback", page],
    queryFn: () => base44.entities.AppFeedback.list("-created_date", 21, page * 20),
  });
  const authors = new Map(users.map((user) => [user.id, user]));
  return <section className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-heading text-lg font-semibold">Sugestões e problemas</h2><p className="text-sm text-muted-foreground">Relatos privados dos usuários, do mais recente ao mais antigo.</p></div><Button variant="outline" className="min-h-[44px]" disabled={isFetching} onClick={() => refetch()}><RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Atualizar</Button></div>
    {isPending ? <LoadingCard label="Carregando relatos..." /> : isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar os relatos. Clique em Atualizar para tentar novamente.</p> : <>
      {!data.length && <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum relato nesta página.</div>}
      {data.slice(0, 20).map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} author={authors.get(feedback.created_by_id)} />)}
    </>}
    <div className="flex items-center justify-between gap-2"><Button className="min-h-[44px]" variant="outline" disabled={page === 0 || isFetching} onClick={() => setPage((value) => value - 1)}>Anterior</Button><span className="text-xs text-muted-foreground">Página {page + 1}</span><Button className="min-h-[44px]" variant="outline" disabled={isFetching || isError || data.length <= 20} onClick={() => setPage((value) => value + 1)}>Próxima</Button></div>
  </section>;
}