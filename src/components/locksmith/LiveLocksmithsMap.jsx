import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { base44 } from "@/api/base44Client";
import { MapPin, Loader2, MessageCircle, Star, Wrench, ZoomIn, ZoomOut, Navigation, Search, SlidersHorizontal, X } from "lucide-react";
import { haversineKm } from "@/lib/geo";

// Ícone customizado (div) para o Leaflet — pino estilo "gota"
const makeIcon = (color, label = "") =>
  L.divIcon({
    className: "locksmith-marker",
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:700;">${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

const meIcon = makeIcon("#0ea5e9", "Eu");
const freeIcon = makeIcon("#10b981", "");
const busyIcon = makeIcon("#f59e0b", "");

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center?.lat && center?.lng) {
      map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    }
  }, [center?.lat, center?.lng]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  return (
    <div
      className="leaflet-control-zoom leaflet-bar leaflet-control"
      style={{ position: "absolute", right: 12, bottom: 24, zIndex: 1000 }}
    >
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
 * Mapa interativo real (OpenStreetMap) da tela principal do cliente.
 * Mostra TODOS os chaveiros disponíveis (Modo Livre online + Modo App disponíveis)
 * em tempo real, ao redor da localização atual do cliente.
 */
export default function LiveLocksmithsMap({ customerLoc, livreOnly = false }) {
  const navigate = useNavigate();
  const [locksmiths, setLocksmiths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () =>
      base44.entities.Locksmith.list().then((list) => {
        if (active) {
          // Disponíveis: Modo Livre online OU Modo App disponível
          // livroOnly = exibe apenas chaveiros independentes (modo livre) para contato direto
          setLocksmiths(
            list.filter(
              (l) =>
                livreOnly
                  ? (l.work_mode === "livre" && l.online)
                  : (l.work_mode === "livre" && l.online) ||
                    (l.work_mode === "app" && l.available)
            )
          );
        }
      });
    load().finally(() => active && setLoading(false));
    const unsub = base44.entities.Locksmith.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, [livreOnly]);

  const withDist = useMemo(
    () =>
      locksmiths
        .map((l) => ({
          ...l,
          distance: haversineKm(customerLoc, { lat: l.lat, lng: l.lng }),
        }))
        .sort((a, b) => a.distance - b.distance),
    [locksmiths, customerLoc]
  );

  const center = customerLoc?.lat ? customerLoc : { lat: -23.55, lng: -46.63 };

  const filtered = useMemo(() => {
    let result = withDist;
    if (maxDistance > 0) {
      result = result.filter((l) => l.distance <= maxDistance);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.specialty?.toLowerCase().includes(q) ||
          (l.specialties || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    return result;
  }, [withDist, maxDistance, searchQuery]);

  const isFiltering = searchQuery.trim() !== "" || maxDistance > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Chaveiros disponíveis perto de você
          </h3>
          <p className="text-xs text-muted-foreground">
            Profissionais online em tempo real · toque no pino para detalhes
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {loading ? "…" : withDist.filter((l) => l.available).length} livres
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {loading ? "…" : withDist.filter((l) => !l.available).length} ocupados
          </span>
        </div>
      </div>

      {/* Busca e filtro por distância */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou especialidade…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-9 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:bg-accent"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value={0}>Qualquer distância</option>
            <option value={1}>Até 1 km</option>
            <option value={3}>Até 3 km</option>
            <option value={5}>Até 5 km</option>
            <option value={10}>Até 10 km</option>
            <option value={20}>Até 20 km</option>
            <option value={50}>Até 50 km</option>
          </select>
          {maxDistance > 0 && (
            <button
              onClick={() => setMaxDistance(0)}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"
              title="Limpar filtro"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 360 }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
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
          <Marker position={[center.lat, center.lng]} icon={meIcon}>
            <Popup>
              <strong>Você</strong>
            </Popup>
          </Marker>
          {withDist.map((l) => (
            <Marker
              key={l.id}
              position={[l.lat, l.lng]}
              icon={l.available ? freeIcon : busyIcon}
            >
              <Popup>
                <div style={{ minWidth: 150 }}>
                  <strong>{l.name}</strong>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {l.specialty} · ⭐ {l.rating}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    {l.distance} km de você
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2, fontWeight: 600 }}>
                    {l.available ? "🟢 Disponível" : "🟡 Em atendimento"}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: "#0ea5e9" }}>
                    {l.work_mode === "livre" ? "Modo Livre" : "Modo App"}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Localizando profissionais…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-dashed border-border">
          <Wrench className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isFiltering ? "Nenhum chaveiro encontrado com esses filtros." : "Nenhum chaveiro online agora."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isFiltering
              ? "Tente ampliar a distância ou limpar a busca."
              : livreOnly
              ? "Volte mais tarde ou mude para o Modo Aplicativo para solicitar um serviço."
              : "Você ainda pode solicitar um serviço — o app encontra o profissional mais próximo."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5" />
            {isFiltering ? `${filtered.length} resultado(s) ordenados por distância` : "Mais próximos de você"}
          </p>
          {filtered.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card"
            >
              <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-semibold text-sm shrink-0 ${l.available ? "bg-emerald-500" : "bg-amber-500"}`}>
                {l.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${l.available ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {l.available ? "Disponível" : "Em atendimento"}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {l.work_mode === "livre" ? "Livre" : "App"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.specialty} · {l.distance} km · ⭐ {l.rating}
                </p>
              </div>
              <button
                onClick={() => navigate(`/chaveiro/${l.id}`)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-accent"
                title="Ver perfil"
              >
                <Star className="w-4 h-4" />
              </button>
              {l.work_mode === "livre" && (
                <button
                  onClick={() => navigate(`/chat/${l.id}`)}
                  className="p-2 rounded-lg text-primary hover:bg-accent"
                  title="Conversar"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}