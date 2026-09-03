import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { ZoomIn, ZoomOut } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";

// Ícone customizado (div) para evitar o problema de assets do Leaflet com bundlers
const makeIcon = (color, label) =>
  L.divIcon({
    className: "locksmith-marker",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700;">${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

const meIcon = makeIcon("#0ea5e9", "Eu");
const freeIcon = makeIcon("#10b981", "");
const busyIcon = makeIcon("#f59e0b", "");

// Recenter helper
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center?.lat, center?.lng]);
  return null;
}

// Corrige o dimensionamento dos tiles sempre que o contêiner muda de tamanho
// (essencial no mobile, onde o layout se ajusta depois do mount).
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

// Botões de zoom customizados sobre o mapa
function ZoomControls() {
  const map = useMap();
  return (
    <div className="leaflet-control-zoom leaflet-bar leaflet-control" style={{ position: "absolute", right: 12, bottom: 24, zIndex: 1000 }}>
      <button
        type="button"
        aria-label="Aproximar"
        onClick={() => map.zoomIn()}
        className="flex items-center justify-center w-9 h-9 bg-white border-b border-border text-foreground hover:bg-accent transition-colors"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Afastar"
        onClick={() => map.zoomOut()}
        className="flex items-center justify-center w-9 h-9 bg-white border-t border-border text-foreground hover:bg-accent transition-colors"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Mapa real (OpenStreetMap) mostrando chaveiros do Modo Livre online em tempo real.
 * Inclui ruas, nomes de cidades, bairros etc.
 */
export default function RealLocksmithsMap({ me }) {
  const [locksmiths, setLocksmiths] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      base44.entities.Locksmith.filter({ work_mode: "livre", online: true }).then((list) => {
        if (active) setLocksmiths(list);
      });
    load().finally(() => active && setLoading(false));
    const unsub = base44.entities.Locksmith.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const others = locksmiths.filter((l) => l.id !== me?.id);
  const center = me ? { lat: me.lat, lng: me.lng } : { lat: -23.55, lng: -46.63 };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Chaveiros online agora</h3>
          <p className="text-xs text-muted-foreground">Modo Livre · atualização em tempo real</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {others.filter((l) => l.available).length} livres
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {others.filter((l) => !l.available).length} ocupados
          </span>
        </div>
      </div>

      <div ref={containerRef} className="rounded-xl overflow-hidden border border-border" style={{ height: 380 }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          preferCanvas
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={center} />
          <MapResizer />
          <ZoomControls />
          {me && (
            <Marker position={[me.lat, me.lng]} icon={meIcon}>
              <Popup>
                <strong>{me.name}</strong> (você)
              </Popup>
            </Marker>
          )}
          {others.map((l) => (
            <Marker
              key={l.id}
              position={[l.lat, l.lng]}
              icon={l.available ? freeIcon : busyIcon}
            >
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <strong>{l.name}</strong>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {l.specialty} · ⭐ {l.rating}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {me
                      ? `${haversineKm({ lat: me.lat, lng: me.lng }, { lat: l.lat, lng: l.lng })} km de você`
                      : ""}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2, fontWeight: 600 }}>
                    {l.available ? "🟢 Livre" : "🟡 Em atendimento"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground text-center">Carregando profissionais…</p>
      )}
    </div>
  );
}