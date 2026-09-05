import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Navigation, Filter, Loader2, Inbox } from "lucide-react";
import { haversineKm } from "@/lib/geo";
import { SERVICE_CATALOG } from "@/lib/pricing";
import NativeSelectDrawer from "@/components/ui/NativeSelectDrawer";
import { resyncRingingForRadius } from "@/lib/radiusResync";

import { DEFAULT_SERVICE_RADIUS_KM } from "@/components/locksmith/ServiceRadiusConfig";

const RADIUS_OPTIONS = [1, 3, 5, 10, 15, 20, 30, 40, 50].map((km) => ({
  value: String(km),
  label: `${km} km`,
}));

/**
 * Lista solicitações abertas (status "searching") próximas ao chaveiro.
 * Inclui um filtro toggle para mostrar apenas solicitações dentro de um
   raio configurável (padrão 10km) do local atual do chaveiro.
 */
export default function NearbyRequestsList({ locksmith }) {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  // O estado do filtro fica guardado no aparelho — ao fechar e reabrir o app
  // o chaveiro encontra a mesma configuração ativa.
  const [filterEnabled, setFilterEnabled] = useState(
    () => localStorage.getItem("nearby_radius_filter") !== "off"
  );

  const toggleFilter = () => {
    setFilterEnabled((f) => {
      localStorage.setItem("nearby_radius_filter", f ? "off" : "on");
      return !f;
    });
  };
  // Usa o raio de atendimento salvo no perfil do chaveiro
  const savedRadius = locksmith?.service_radius_km || DEFAULT_SERVICE_RADIUS_KM;
  const [radius, setRadius] = useState(savedRadius);

  useEffect(() => {
    setRadius(savedRadius);
  }, [savedRadius]);

  // Salva o raio escolhido no perfil para que a configuração continue
  // valendo ao sair e voltar ao app.
  const changeRadius = (km) => {
    setRadius(km);
    if (locksmith?.id) {
      base44.entities.Locksmith.update(locksmith.id, { service_radius_km: km })
        .then(() => resyncRingingForRadius({ ...locksmith, service_radius_km: km }, km))
        .catch(() => {});
    }
  };

  // Busca solicitações abertas (searching) e assina atualizações
  useEffect(() => {
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ status: "searching" }, "-created_date")
        .then((list) => {
          setAllRequests(list);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return () => {
      if (typeof unsub === "function") unsub();
      else if (unsub && typeof unsub.then === "function") {
        unsub.then((fn) => typeof fn === "function" && fn()).catch(() => {});
      }
    };
  }, []);

  if (!locksmith || !locksmith.online) return null;

  // Filtra por especialidade do chaveiro
  const matchesSpecialty = (req) => {
    const svc = SERVICE_CATALOG.find((s) => s.label === req.service_type);
    if (!svc) return true;
    if (locksmith.services && locksmith.services.length > 0) {
      return locksmith.services.includes(svc.id);
    }
    const mySpecialties = locksmith.specialties && locksmith.specialties.length > 0
      ? locksmith.specialties
      : [locksmith.specialty];
    return mySpecialties.includes(svc.specialty);
  };

  // Calcula distância e filtra
  const withDistance = allRequests
    .filter(matchesSpecialty)
    .filter((r) => r.customer_lat && r.customer_lng)
    .map((r) => ({
      ...r,
      distance: haversineKm(
        { lat: locksmith.lat, lng: locksmith.lng },
        { lat: r.customer_lat, lng: r.customer_lng }
      ),
    }));

  const filtered = filterEnabled
    ? withDistance.filter((r) => r.distance <= radius)
    : withDistance;

  // Ordena por distância
  filtered.sort((a, b) => a.distance - b.distance);

  return (
    <div className="mb-5 rounded-xl border border-border bg-card overflow-hidden fade-in-up">
      {/* Cabeçalho com filtro */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <p className="font-medium text-sm text-foreground">Solicitações na região</p>
        </div>
        <button
          onClick={toggleFilter}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {filterEnabled ? `${radius} km` : "Sem filtro"}
        </button>
      </div>

      {/* Controle de raio quando filtro ativo */}
      {filterEnabled && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground shrink-0">Raio:</span>
            <div className="flex-1">
              <NativeSelectDrawer
                label="Raio de busca"
                value={String(radius)}
                onChange={(v) => changeRadius(Number(v))}
                options={RADIUS_OPTIONS}
              />
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6">
            <Inbox className="w-7 h-7 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-sm text-muted-foreground">
              {filterEnabled
                ? `Nenhuma solicitação dentro de ${radius} km`
                : "Nenhuma solicitação aberta no momento"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {filtered.length} {filtered.length === 1 ? "solicitação" : "solicitações"}
              {filterEnabled && ` dentro de ${radius} km`}
            </p>
            {filtered.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{req.service_type}</p>
                  <p className="text-xs text-muted-foreground truncate">{req.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-primary">{req.distance.toFixed(1)} km</p>
                  {req.urgency === "urgent" && (
                    <p className="text-[10px] text-red-500 font-medium">Urgente</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}