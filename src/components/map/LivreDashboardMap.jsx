import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";
import { X } from "lucide-react";
import LightMap from "@/components/map/LightMap";
import OpenInNavAppsButton from "@/components/map/OpenInNavAppsButton";

// Raio de cobertura para exibir clientes no mapa (km)
const RADIUS_KM = 30;

/**
 * Mapa do Modo Livre — mostra o próprio chaveiro + as solicitações ativas
 * (clientes aguardando atendimento) próximas, em tempo real. Usa o LightMap
 * (imagem estática + sobreposição), leve para WebView do Android.
 */
export default function LivreDashboardMap({ me }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ status: "searching" }, "-created_date", 100)
        .then((list) => {
          if (active) setRequests(list.filter((r) => r.customer_lat && r.customer_lng));
        })
        .catch(() => {});
    load().finally(() => active && setLoading(false));
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const nearby = useMemo(() => {
    if (!me) return requests;
    return requests.filter(
      (r) => haversineKm({ lat: me.lat, lng: me.lng }, { lat: r.customer_lat, lng: r.customer_lng }) <= RADIUS_KM
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, me?.lat, me?.lng]);

  const markers = useMemo(() => {
    const arr = [];
    if (me?.lat && me?.lng) arr.push({ id: "me", lat: me.lat, lng: me.lng, type: "me", label: me.name });
    nearby.forEach((r) =>
      arr.push({ id: r.id, lat: r.customer_lat, lng: r.customer_lng, type: "client", label: r.service_type })
    );
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, me?.lat, me?.lng, nearby]);

  const center = me ? { lat: me.lat, lng: me.lng } : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Clientes próximos</h3>
          <p className="text-xs text-muted-foreground">Solicitações ativas em tempo real</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {nearby.length} aguardando
        </div>
      </div>

      <LightMap
        center={center}
        markers={markers}
        height={380}
        renderPopup={(m, close) => {
          if (m.id === "me" || !me?.lat) return null;
          const r = nearby.find((x) => x.id === m.id);
          if (!r) return null;
          return (
            <div className="w-60 rounded-xl border border-border bg-card shadow-xl p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.service_type}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.address}</p>
                </div>
                <button onClick={close} className="p-1 rounded-lg text-muted-foreground hover:bg-accent shrink-0" title="Fechar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <OpenInNavAppsButton from={{ lat: me.lat, lng: me.lng }} to={{ lat: r.customer_lat, lng: r.customer_lng }} />
            </div>
          );
        }}
      />

      {loading && <p className="text-xs text-muted-foreground text-center">Carregando clientes…</p>}
      {!loading && nearby.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Nenhuma solicitação ativa no raio de {RADIUS_KM} km no momento.
        </p>
      )}
    </div>
  );
}