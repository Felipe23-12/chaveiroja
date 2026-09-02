import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Clock, MapPin, Star, Wrench } from "lucide-react";
import ServiceFilters, { filterRequests } from "@/components/admin/ServiceFilters";
import ServiceSearchBar from "@/components/admin/ServiceSearchBar";
import ServiceGallery from "@/components/locksmith/ServiceGallery";

const statusLabels = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  accepted: { label: "Aceito", color: "bg-blue-100 text-blue-700" },
  on_the_way: { label: "A caminho", color: "bg-violet-100 text-violet-700" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700" },
};

export default function History() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date: "", serviceType: "", status: "", locksmithName: "", search: "" });

  useEffect(() => {
    base44.entities.ServiceRequest.list("-created_date", 50)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterRequests(requests, filters);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Clock className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Histórico</h1>
          <p className="text-sm text-muted-foreground">Seus serviços solicitados</p>
        </div>
      </div>

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
          {filtered.map((req) => {
            const st = statusLabels[req.status] || statusLabels.pending;
            return (
              <div key={req.id} className="p-4 rounded-2xl bg-white border border-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-foreground">{req.service_type}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                  <span className="font-heading font-bold text-foreground">R$ {req.price?.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                  <MapPin className="w-3.5 h-3.5" /> {req.address}
                </div>
                {req.locksmith_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{req.locksmith_name}</span>
                    {req.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">{req.rating}</span>
                      </span>
                    )}
                  </div>
                )}
                <ServiceGallery startPhotos={req.start_photos} endPhotos={req.end_photos} />
              </div>
            );
          })}
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