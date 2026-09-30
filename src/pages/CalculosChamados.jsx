import React, { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { SERVICE_CATALOG } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import LoadingCard from "@/components/ui/LoadingCard";
import ChargeCalculationCard from "@/components/admin/ChargeCalculationCard";
import NeighborhoodPricingPanel from "@/components/admin/NeighborhoodPricingPanel";
import NativeSelectDrawer from '@/components/ui/NativeSelectDrawer';
const RegionalPricingPanel = lazy(() => import("@/components/admin/RegionalPricingPanel"));
export default function CalculosChamados() {
  const { user } = useAuth();
  const [serviceType, setServiceType] = useState("");
  const [page, setPage] = useState(0);
  const allowed = user?.role === "admin";
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["charge-calculations", user?.id, serviceType, page],
    enabled: allowed,
    queryFn: async () => (await base44.functions.invoke("serviceChargeDetails", { service_type: serviceType, page })).data,
  });
  if (!allowed) return <p className="p-6 text-muted-foreground">Acesso não autorizado.</p>;
  return <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
    <h1 className="font-heading text-2xl font-bold">Cálculos dos chamados</h1>
    <p className="text-sm text-muted-foreground">Consulte os cálculos registrados e configure as faixas regionais para novos pedidos, sem alterar cobranças de chamados existentes.</p>
    <Suspense fallback={<LoadingCard label="Carregando preços regionais..." />}><RegionalPricingPanel /></Suspense>
    <NeighborhoodPricingPanel />
    <div className="flex flex-wrap gap-3">
      <NativeSelectDrawer label="Tipo de serviço" value={serviceType} onChange={next => { setServiceType(next); setPage(0); }} className="flex-1" options={[{ value: '', label: 'Todos os serviços' }, ...SERVICE_CATALOG.map(s => ({ value: s.label, label: s.label }))]} />
      <Button variant="outline" disabled={isFetching} onClick={() => refetch()}>Atualizar</Button>
    </div>
    {isLoading ? <LoadingCard label="Carregando cálculos..." /> : error ? <p role="alert" className="text-sm text-destructive">{error?.response?.data?.error || "Não foi possível carregar. Toque em Atualizar para tentar novamente."}</p> : <>
      {!data?.items?.length && <p className="py-6 text-center text-muted-foreground">Nenhum chamado encontrado.</p>}
      {data?.items?.map((r) => <ChargeCalculationCard key={r.id} request={r} />)}
      <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 0 || isFetching} onClick={() => setPage((p) => p - 1)}>Anterior</Button><span className="text-sm">Página {page + 1}</span><Button variant="outline" disabled={!data?.has_more || isFetching} onClick={() => setPage((p) => p + 1)}>Próxima</Button></div>
    </>}
  </div>;
}