import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, Wrench } from "lucide-react";
import ServiceHistoryCard from "@/components/history/ServiceHistoryCard";
import ServiceFilters, { filterRequests } from "@/components/admin/ServiceFilters";
import ServiceSearchBar from "@/components/admin/ServiceSearchBar";
import ServiceGallery from "@/components/locksmith/ServiceGallery";
import SaveToCalendarButton from "@/components/locksmith/SaveToCalendarButton";
import { saveLastService, getLastService } from "@/lib/offlineCache";
import { WifiOff } from "lucide-react";
import LoadingCard from "@/components/ui/LoadingCard";
import ReplacedPartsSummary from "@/components/locksmith/ReplacedPartsSummary";
import { usePullToRefresh, PullToRefreshIndicator } from "@/components/ui/PullToRefresh";

export default function History() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filters, setFilters] = useState({ date: "", serviceType: "", status: "", locksmithName: "", search: "" });

  const loadRequests = async () => {
    try {
      const user = await base44.auth.me();
      // Somente os pedidos criados por esta conta — nunca de outro cliente
      const data = await base44.entities.ServiceRequest.filter(
        { created_by_id: user.id },
        "-created_date",
        50
      );
      setRequests(data);
      if (data.length > 0) saveLastService(data[0]);
      setOffline(false);
    } catch {
      // Sem conexão — usa o último atendimento armazenado
      const cached = getLastService();
      if (cached) {
        setRequests([cached]);
        setOffline(true);
      }
    }
  };

  useEffect(() => {
    loadRequests().finally(() => setLoading(false));
  }, []);

  const filtered = filterRequests(requests, filters);
  const { pull, refreshing } = usePullToRefresh(loadRequests);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <LoadingCard label="Carregando seu histórico..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      <div className="flex items-center gap-2 mb-6 fade-in-up">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Histórico</h1>
          <p className="text-sm text-muted-foreground">Seus serviços solicitados</p>
        </div>
      </div>

      {offline && (
        <div className="mb-4 p-3 rounded-lg bg-warning/10 text-warning text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Você está offline. Exibindo o último atendimento armazenado.</span>
        </div>
      )}

      <div className="mb-3">
        <ServiceSearchBar
          value={filters.search}
          onChange={(v) => setFilters({ ...filters, search: v })}
          placeholder="Buscar por chaveiro, tipo de serviço ou endereço"
        />
      </div>
      <div className="mb-4">
        <ServiceFilters
          filters={filters}
          onChange={setFilters}
          onClear={() => setFilters({ date: "", serviceType: "", status: "", locksmithName: "", search: "" })}
        />
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhum serviço ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Quando você solicitar um chaveiro, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <ServiceHistoryCard key={req.id} request={req} perspective="cliente">
              <ReplacedPartsSummary parts={req.replaced_parts} />
              <ServiceGallery startPhotos={req.start_photos} endPhotos={req.end_photos} />
              {req.status === "completed" && <SaveToCalendarButton request={req} />}
            </ServiceHistoryCard>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Nenhum serviço encontrado com os filtros aplicados.
            </div>
          )}
        </div>
      )}
    </div>
  );
}