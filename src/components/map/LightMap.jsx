import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigation } from "lucide-react";

/**
 * Mapa leve otimizado para WebView do Android.
 *
 * Em vez de uma biblioteca interativa (Leaflet) que carrega dezenas de tiles
 * e trava o gesto no mobile, este componente carrega UMA imagem estática do
 * OpenStreetMap cobrindo a área da rota e desenha a rota e os marcadores como
 * sobreposição SVG/HTML. A imagem é buscada apenas quando a área muda; durante
 * o acompanhamento da rota só os marcadores se movem (CSS), sem recarregar
 * nada — zero travamento.
 *
 * API compatível com o antigo RouteLeafletMap:
 *   { center, markers, route, routePath, eta, height }
 *
 * markers: [{ id, lat, lng, type: "customer"|"me"|"locksmith", label, active }]
 */
const TILE = 256;
const STATIC_BASE = "https://staticmap.openstreetmap.de/staticmap.php";

function lngToX(lng, z) {
  return ((lng + 180) / 360) * TILE * Math.pow(2, z);
}
function latToY(lat, z) {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * Math.pow(2, z);
}
function project(lat, lng, c, z, w, h) {
  return {
    x: lngToX(lng, z) - lngToX(c.lng, z) + w / 2,
    y: latToY(lat, z) - latToY(c.lat, z) + h / 2,
  };
}
function fitZoom(b, w, h, pad = 0.82) {
  const dLng = Math.max(b.maxLng - b.minLng, 0.001);
  const zLng = Math.log2((w * pad) / (dLng * TILE / 360));
  const ySpan = Math.abs(latToY(b.maxLat, 0) - latToY(b.minLat, 0)) || 1;
  const zLat = Math.log2((h * pad) / ySpan);
  return Math.max(1, Math.min(17, Math.floor(Math.min(zLng, zLat))));
}

export default function LightMap({ center, markers = [], route = null, routePath = null, eta = null, height = 320 }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 360, h: height });
  const [imgError, setImgError] = useState(false);

  // Mede o contêiner para buscar a imagem no tamanho exato (alinhamento perfeito)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: Math.max(200, Math.round(el.clientWidth)), h: height });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  // Dimensões da imagem (limitadas para não estourar o serviço estático)
  const fw = Math.min(size.w, 1024);
  const fh = Math.min(size.h, 1024);

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

  // Centraliza e calcula zoom com base na área da rota (estável: só muda quando
  // o conjunto de pontos muda, não a cada atualização de coordenada).
  const view = useMemo(() => {
    if (allPoints.length === 0) {
      const c = center && center.lat ? center : { lat: -23.55, lng: -46.63 };
      return { c, z: 14 };
    }
    const lats = allPoints.map((p) => p.lat);
    const lngs = allPoints.map((p) => p.lng);
    const b = {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
    const c = { lat: (b.minLat + b.maxLat) / 2, lng: (b.minLng + b.maxLng) / 2 };
    return { c, z: fitZoom(b, fw, fh) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPoints, fw, fh]);

  const { c, z } = view;
  const imgUrl = `${STATIC_BASE}?center=${c.lat.toFixed(5)},${c.lng.toFixed(5)}&zoom=${z}&size=${fw}x${fh}`;

  const proj = (lat, lng) => project(lat, lng, c, z, fw, fh);
  const toPct = (p) => ({ left: `${(p.x / fw) * 100}%`, top: `${(p.y / fh) * 100}%` });

  const polyline =
    routePath && routePath.length > 1 ? routePath.map((p) => proj(p.lat, p.lng)) : null;
  const straight =
    !polyline && route && route.from?.lat && route.to?.lat
      ? [proj(route.from.lat, route.from.lng), proj(route.to.lat, route.to.lng)]
      : null;

  const ptsStr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden border border-border bg-muted/40"
      style={{ height }}
    >
      {!imgError ? (
        <img
          src={imgUrl}
          alt="Mapa da rota"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "fill" }}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
      )}

      {/* Sobreposição da rota (SVG esticado junto com a imagem) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${fw} ${fh}`}
        preserveAspectRatio="none"
      >
        {polyline && (
          <>
            <polyline points={ptsStr(polyline)} fill="none" stroke="#0ea5e9" strokeWidth={10} opacity={0.25} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={ptsStr(polyline)} fill="none" stroke="#0f172a" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={ptsStr(polyline)} fill="none" stroke="#38bdf8" strokeWidth={3} strokeDasharray="10 8" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {straight && (
          <>
            <polyline points={ptsStr(straight)} fill="none" stroke="#0ea5e9" strokeWidth={10} opacity={0.25} />
            <polyline points={ptsStr(straight)} fill="none" stroke="#0f172a" strokeWidth={5} />
          </>
        )}
      </svg>

      {/* Marcadores posicionados em % (alinhados à imagem esticada) */}
      {markers
        .filter((m) => m.lat && m.lng)
        .map((m) => {
          const p = toPct(proj(m.lat, m.lng));
          if (m.type === "customer") {
            return (
              <div key={m.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={p}>
                <div className="w-8 h-8 rounded-full bg-blue-600 border-[3px] border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">
                  Eu
                </div>
              </div>
            );
          }
          if (m.type === "me") {
            return (
              <div key={m.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={p}>
                <div className="w-8 h-8 rounded-full bg-sky-500 border-[3px] border-white shadow-lg flex items-center justify-center text-white text-[11px] font-bold">
                  Eu
                </div>
              </div>
            );
          }
          if (m.type === "client") {
            return (
              <div key={m.id} className="absolute -translate-x-1/2 -translate-y-full z-10" style={p}>
                <div className="w-7 h-7 rounded-[50%_50%_50%_0] -rotate-45 border-[3px] border-white shadow-lg flex items-center justify-center bg-amber-500">
                  <span className="rotate-45 text-white text-[12px] font-bold">!</span>
                </div>
              </div>
            );
          }
          const letter = (m.label || "C").charAt(0).toUpperCase();
          return (
            <div key={m.id} className="absolute -translate-x-1/2 -translate-y-full z-10" style={p}>
              <div
                className={`w-8 h-8 rounded-[50%_50%_50%_0] -rotate-45 border-[3px] border-white shadow-lg flex items-center justify-center ${
                  m.active ? "bg-amber-500" : "bg-emerald-500"
                }`}
              >
                <span className="rotate-45 text-white text-[11px] font-bold">{letter}</span>
              </div>
            </div>
          );
        })}

      {eta != null && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500 text-white shadow-lg text-xs font-bold">
          <Navigation className="w-3.5 h-3.5" /> {eta} min · chegada
        </div>
      )}
    </div>
  );
}