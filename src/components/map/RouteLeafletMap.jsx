import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Marcadores customizados (div) — evita o problema de assets do Leaflet com bundlers
const customerIcon = L.divIcon({
  className: "",
  html: `<div style="background:#2563eb;width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:12px;font-weight:700;">Eu</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function makeLocksmithIcon(active, label) {
  const letter = (label || "C").charAt(0).toUpperCase();
  return L.divIcon({
    className: "",
    html: `<div style="background:${active ? "#f59e0b" : "#10b981"};width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-size:13px;font-weight:700;">${letter}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

// Ajusta a janela do mapa para enquadrar todos os pontos e corrige o
// dimensionamento dos tiles após o mount (sem isso o mapa fica cinza).
function FitBounds({ points, center }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    } else if (center?.lat) {
      map.setView([center.lat, center.lng], 15, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/**
 * Mapa real (OpenStreetMap/Leaflet) que mostra a rota de carro entre o
 * cliente e o chaveiro em tempo real. Substitui o MapView estilizado
 * (grade) por ruas reais, nomes de bairros e posicionamento preciso.
 *
 * API compatível com MapView: { center, markers, route, routePath, eta, height }
 */
export default function RouteLeafletMap({ center, markers = [], route = null, routePath = null, eta = null, height = 320 }) {
  const allPoints = useMemo(() => {
    const pts = [];
    markers.forEach((m) => {
      if (m.lat && m.lng) pts.push({ lat: m.lat, lng: m.lng });
    });
    if (routePath && routePath.length > 1) {
      routePath.forEach((p) => {
        if (p.lat && p.lng) pts.push(p);
      });
    } else if (route) {
      if (route.from?.lat && route.from?.lng) pts.push(route.from);
      if (route.to?.lat && route.to?.lng) pts.push(route.to);
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(markers), JSON.stringify(route), JSON.stringify(routePath)]);

  const polyline = routePath && routePath.length > 1
    ? routePath.map((p) => [p.lat, p.lng])
    : null;
  const straightLine = !polyline && route && route.from?.lat && route.to?.lat
    ? [[route.from.lat, route.from.lng], [route.to.lat, route.to.lng]]
    : null;

  const fallback = center && center.lat ? [center.lat, center.lng] : [-23.55, -46.63];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer
        center={fallback}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {polyline && (
          <>
            <Polyline positions={polyline} color="#0ea5e9" weight={10} opacity={0.25} />
            <Polyline positions={polyline} color="#0f172a" weight={5} />
            <Polyline positions={polyline} color="#38bdf8" weight={3} dashArray="10 8" />
          </>
        )}
        {straightLine && (
          <>
            <Polyline positions={straightLine} color="#0ea5e9" weight={10} opacity={0.25} />
            <Polyline positions={straightLine} color="#0f172a" weight={5} />
          </>
        )}
        {markers.filter((m) => m.lat && m.lng).map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={m.type === "customer" ? customerIcon : makeLocksmithIcon(m.active || m.busy, m.label)}
          >
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
        <FitBounds points={allPoints} center={center} />
      </MapContainer>
      {eta != null && (
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 text-white shadow-lg text-xs font-bold">
          <Navigation className="w-3.5 h-3.5" /> {eta} min · chegada
        </div>
      )}
    </div>
  );
}