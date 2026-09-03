import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";

// Raio de cobertura para exibir clientes no mapa (km)
const RADIUS_KM = 30;

// Marcador do próprio chaveiro
const meIcon = L.divIcon({
  className: "",
  html: `<div style="background:#0ea5e9;width:34px;height:34px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:12px;font-weight:700;">Eu</span></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// Marcador de cliente (solicitação ativa)
const clientIcon = L.divIcon({
  className: "",
  html: `<div style="background:#f59e0b;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-size:14px;font-weight:700;">!</span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// Corrige o dimensionamento dos tiles quando o contêiner muda de tamanho (mobile)
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [map]);
  return null;
}

// Enquadrar apenas quando o conjunto de pontos muda (não a cada coordenada)
function FitBounds({ points, signature }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return null;
}

/**
 * Mapa do Modo Livre — mostra o próprio chaveiro + as solicitações ativas
 * (clientes aguardando atendimento) próximas, em tempo real. Permite que o
 * chaveiro livre veja onde os clientes estão e decida atender.
 */
export default function LivreDashboardMap({ me }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega solicitações ativas (clientes buscando atendimento) e assina updates
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

  const center = me ? { lat: me.lat, lng: me.lng } : { lat: -23.55, lng: -46.63 };

  // Solicitações próximas dentro do raio de cobertura
  const nearby = useMemo(() => {
    if (!me) return requests;
    return requests.filter(
      (r) => haversineKm({ lat: me.lat, lng: me.lng }, { lat: r.customer_lat, lng: r.customer_lng }) <= RADIUS_KM
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, me?.lat, me?.lng]);

  const points = useMemo(() => {
    const pts = [];
    if (me?.lat && me?.lng) pts.push({ lat: me.lat, lng: me.lng });
    nearby.forEach((r) => pts.push({ lat: r.customer_lat, lng: r.customer_lng }));
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.lat, me?.lng, nearby.length]);

  const signature = `me|${nearby.map((r) => r.id).join(",")}`;

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

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 380 }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          preferCanvas
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapResizer />
          <FitBounds points={points} signature={signature} />
          {me?.lat && me?.lng && (
            <Marker position={[me.lat, me.lng]} icon={meIcon}>
              <Popup><strong>{me.name}</strong> (você)</Popup>
            </Marker>
          )}
          {nearby.map((r) => (
            <Marker
              key={r.id}
              position={[r.customer_lat, r.customer_lng]}
              icon={clientIcon}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>{r.service_type}</strong>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{r.address}</div>
                  {me && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {haversineKm({ lat: me.lat, lng: me.lng }, { lat: r.customer_lat, lng: r.customer_lng })} km de você
                    </div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 2, fontWeight: 600, color: "#f59e0b" }}>
                    🟡 Aguardando atendimento
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {loading && <p className="text-xs text-muted-foreground text-center">Carregando clientes…</p>}
      {!loading && nearby.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Nenhuma solicitação ativa no raio de {RADIUS_KM} km no momento.
        </p>
      )}
    </div>
  );
}