import React from "react";
import { MapPin, Navigation, Wrench, Clock } from "lucide-react";

/**
 * Mapa estilizado (sem dependência de tiles) que posiciona marcadores por
 * lat/lng. A janela de visualização é calculada automaticamente para enquadrar
 * todos os marcadores e a rota, garantindo que nada fique fora da tela.
 *
 * markers: [{ id, lat, lng, type: "customer"|"locksmith", label, active, busy }]
 * route: { from: {lat,lng}, to: {lat,lng} } | null
 * routePath: [{lat,lng}...] | null  (polilinha da rota de carro)
 */
export default function MapView({ center, markers = [], route = null, routePath = null, eta = null, height = 360, onMarkerClick }) {
  // Coleta todos os pontos válidos para calcular a bounding box
  const allPoints = [];
  markers.forEach((m) => {
    if (m.lat && m.lng) allPoints.push({ lat: m.lat, lng: m.lng });
  });
  if (route) {
    if (route.from?.lat && route.from?.lng) allPoints.push(route.from);
    if (route.to?.lat && route.to?.lng) allPoints.push(route.to);
  }
  if (routePath) {
    routePath.forEach((p) => {
      if (p.lat && p.lng) allPoints.push(p);
    });
  }

  // Calcula bounds ou usa o centro fornecido / padrão
  let minLat, maxLat, minLng, maxLng;
  if (allPoints.length > 0) {
    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    minLat = Math.min(...lats);
    maxLat = Math.max(...lats);
    minLng = Math.min(...lngs);
    maxLng = Math.max(...lngs);
  } else {
    const c = center || { lat: -23.55, lng: -46.63 };
    minLat = c.lat - 0.015;
    maxLat = c.lat + 0.015;
    minLng = c.lng - 0.015;
    maxLng = c.lng + 0.015;
  }

  // Garante um span mínimo e adiciona padding (25%)
  const latSpan = Math.max(maxLat - minLat, 0.004);
  const lngSpan = Math.max(maxLng - minLng, 0.004);
  const padLat = latSpan * 0.3;
  const padLng = lngSpan * 0.3;
  const viewMinLat = minLat - padLat;
  const viewMaxLat = maxLat + padLat;
  const viewMinLng = minLng - padLng;
  const viewMaxLng = maxLng + padLng;
  const viewLatSpan = viewMaxLat - viewMinLat;
  const viewLngSpan = viewMaxLng - viewMinLng;

  function project(lat, lng) {
    const x = ((lng - viewMinLng) / viewLngSpan) * 100;
    const y = ((viewMaxLat - lat) / viewLatSpan) * 100;
    return { x, y };
  }

  const from = route ? project(route.from.lat, route.from.lng) : null;
  const to = route ? project(route.to.lat, route.to.lng) : null;

  const pathPoints = routePath && routePath.length > 1
    ? routePath.map((p) => project(p.lat, p.lng))
    : null;
  const polylinePoints = pathPoints ? pathPoints.map((p) => `${p.x},${p.y}`).join(" ") : null;

  return (
    <div
      className="relative w-full touch-pan-y rounded-2xl overflow-hidden border border-border"
      style={{
        height,
        background: "linear-gradient(135deg, #e8eef3 0%, #dce7f0 100%)",
        backgroundImage:
          "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      {/* "Ruas" decorativas */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/3 left-0 right-0 h-3 bg-slate-200/70" />
        <div className="absolute top-2/3 left-0 right-0 h-2 bg-slate-200/60" />
        <div className="absolute top-0 bottom-0 left-1/4 w-2 bg-slate-200/70" />
        <div className="absolute top-0 bottom-0 left-3/4 w-3 bg-slate-200/60" />
      </div>

      {/* Rota traçada */}
      {(routePath || (route && from && to)) && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {routePath && pathPoints && pathPoints.length > 1 ? (
            <>
              {/* Halo externo pulsante */}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="route-glow"
                vectorEffect="non-scaling-stroke"
              />
              {/* Linha base — desenha progressivamente */}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#0f172a"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={100}
                className="route-draw"
                vectorEffect="non-scaling-stroke"
              />
              {/* Linha animada de fluxo (azul claro) — aparece após o desenho */}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10 8"
                className="route-flow route-fade-in"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : (
            from && to && (
              <>
                <line
                  x1={`${from.x}`}
                  y1={`${from.y}`}
                  x2={`${to.x}`}
                  y2={`${to.y}`}
                  stroke="#0ea5e9"
                  strokeWidth={8}
                  strokeLinecap="round"
                  className="route-glow"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={`${from.x}`}
                  y1={`${from.y}`}
                  x2={`${to.x}`}
                  y2={`${to.y}`}
                  stroke="#0f172a"
                  strokeWidth={5}
                  strokeLinecap="round"
                  pathLength={100}
                  className="route-draw"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={`${from.x}`}
                  y1={`${from.y}`}
                  x2={`${to.x}`}
                  y2={`${to.y}`}
                  stroke="#38bdf8"
                  strokeWidth={3}
                  strokeDasharray="10 8"
                  strokeLinecap="round"
                  className="route-flow route-fade-in"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            )
          )}
        </svg>
      )}

      {/* Seta de direção no meio da rota */}
      {route && from && to && (() => {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
        return (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${midX}%`,
              top: `${midY}%`,
              transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            }}
          >
            <div className="w-7 h-7 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center">
              <Navigation className="w-4 h-4 text-white" />
            </div>
          </div>
        );
      })()}

      {/* Marcadores */}
      {markers.map((m) => {
        if (!m.lat || !m.lng) return null;
        const p = project(m.lat, m.lng);
        const isCustomer = m.type === "customer";
        const isBusy = m.type === "locksmith" && m.busy;
        return (
          <button
            key={m.id}
            onClick={m.onClick ? () => m.onClick(m) : undefined}
            className="absolute -translate-x-1/2 -translate-y-full transition-all"
            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: m.active ? 30 : 10 }}
          >
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center rounded-full shadow-lg border-2 ${
                  isCustomer
                    ? "w-9 h-9 bg-blue-600 border-white text-white"
                    : isBusy
                    ? "w-9 h-9 bg-amber-500 border-white text-white"
                    : "w-9 h-9 bg-emerald-500 border-white text-white"
                }`}
              >
                {isCustomer ? (
                  <MapPin className="w-4 h-4" />
                ) : isBusy ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Wrench className="w-4 h-4" />
                )}
              </div>
              <div className="w-0.5 h-2 bg-slate-700/60" />
              {m.label && (
                <span className="mt-0.5 px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-medium text-slate-700 shadow whitespace-nowrap">
                  {m.label}
                </span>
              )}
            </div>
          </button>
        );
      })}

      {/* Legenda */}
      <div className="absolute bottom-2 left-2 flex items-center gap-3 px-2.5 py-1.5 rounded-lg bg-white/90 shadow text-[11px] text-slate-600">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Você</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Livre</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Em atendimento</span>
      </div>

      {route && (
        <div className="absolute top-2 right-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500 text-white shadow-lg text-xs font-bold">
          <Navigation className="w-4 h-4" />
          {eta ? `${eta} min · chegada` : "Rota traçada"}
        </div>
      )}
    </div>
  );
}