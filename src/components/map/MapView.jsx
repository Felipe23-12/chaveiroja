import React from "react";
import { MapPin, Navigation, Wrench, Clock } from "lucide-react";

// Janela de visualização do mapa em graus (cobertura ao redor do centro)
const VIEW_SPAN = 0.03;

function project(lat, lng, center) {
  const x = ((lng - (center.lng - VIEW_SPAN / 2)) / VIEW_SPAN) * 100;
  const y = (((center.lat + VIEW_SPAN / 2) - lat) / VIEW_SPAN) * 100;
  return { x, y };
}

/**
 * Mapa estilizado (sem dependência de tiles) que posiciona marcadores por
 * lat/lng em relação a um centro. Suporta uma rota entre dois pontos.
 *
 * markers: [{ id, lat, lng, type: "customer"|"locksmith", label, active }]
 * route: { from: {lat,lng}, to: {lat,lng} } | null
 */
export default function MapView({ center, markers = [], route = null, height = 360, onMarkerClick }) {
  const c = center || { lat: -23.55, lng: -46.63 };

  const from = route ? project(route.from.lat, route.from.lng, c) : null;
  const to = route ? project(route.to.lat, route.to.lng, c) : null;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-border"
      style={{
        height,
        background:
          "linear-gradient(135deg, #e8eef3 0%, #dce7f0 100%)",
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

      {/* Rota */}
      {route && from && to && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line
            x1={`${from.x}%`}
            y1={`${from.y}%`}
            x2={`${to.x}%`}
            y2={`${to.y}%`}
            stroke="#0f172a"
            strokeWidth={3}
            strokeDasharray="6 6"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Marcadores */}
      {markers.map((m) => {
        const p = project(m.lat, m.lng, c);
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
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/90 shadow text-[11px] font-medium text-slate-700">
          <Navigation className="w-3.5 h-3.5 text-primary" /> Rota até você
        </div>
      )}
    </div>
  );
}