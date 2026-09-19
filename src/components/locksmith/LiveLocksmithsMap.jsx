import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Loader2, MessageCircle, Star, Wrench, Navigation, Search, SlidersHorizontal, X } from "lucide-react";
import { haversineKm } from "@/lib/geo";
import LightMap from "@/components/map/LightMap";
import MapLocationSearch from "@/components/map/MapLocationSearch";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import { estimateEtaMinutes, formatEta } from "@/lib/etaEstimate";
import useBlockedUsers from "@/hooks/useBlockedUsers";

/**
 * Tela principal do cliente: mostra TODOS os chaveiros disponíveis
 * (Modo Livre online + Modo App disponíveis) em tempo real, ao redor da
 * localização atual do cliente. Usa o LightMap (imagem estática + sobreposição),
 * leve para WebView do Android — sem travamentos.
 */
export default function LiveLocksmithsMap({ customerLoc, livreOnly = false }) {
  const navigate = useNavigate();
  const [locksmiths, setLocksmiths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [maxDistance, setMaxDistance] = useState(0);
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  // Local pesquisado (bairro/rua) — sobrepõe a localização automática
  const [searchLoc, setSearchLoc] = useState(null);
  const [searchLabel, setSearchLabel] = useState("");
  const [minRating, setMinRating] = useState(0);
  const { blockedIds, loading: blocksLoading } = useBlockedUsers();

  const SPECIALTY_OPTIONS = ["Residencial", "Automotivo", "Comercial", "Emergencial"];

  useEffect(() => {
    let active = true;
    const isVisible = (profile) =>
      (profile?.online === true || profile?.available === false) && (!livreOnly || profile.work_mode === "livre");
    const load = () =>
      base44.entities.Locksmith.list("-updated_date", 500).then((list) => {
        if (active) setLocksmiths(list.filter(isVisible));
      });
    const onEvent = (event) => {
      const profile = event.data;
      if (!active || !profile?.id) return;
      setLocksmiths((current) => {
        const others = current.filter((item) => item.id !== profile.id);
        if (event.type === "delete" || !isVisible(profile)) return others;
        const previous = current.find((item) => item.id === profile.id);
        return [{ ...previous, ...profile }, ...others];
      });
    };
    load().finally(() => active && setLoading(false));
    const unsub = safeUnsubscribe(base44.entities.Locksmith.subscribe(onEvent));
    return () => {
      active = false;
      unsub();
    };
  }, [livreOnly]);

  const refLoc = searchLoc || (customerLoc?.lat ? customerLoc : { lat: -23.55, lng: -46.63 });

  const withDist = useMemo(
    () =>
      locksmiths
        .filter((l) => blocksLoading || !blockedIds.has(l.created_by_id))
        .map((l) => {
          const distance = haversineKm(refLoc, { lat: l.lat, lng: l.lng });
          return { ...l, distance, eta: estimateEtaMinutes(distance) };
        })
        .sort((a, b) => a.distance - b.distance),
    [locksmiths, blockedIds, blocksLoading, refLoc.lat, refLoc.lng]
  );

  const center = refLoc;

  const filtered = useMemo(() => {
    let result = withDist;
    if (maxDistance > 0) result = result.filter((l) => l.distance <= maxDistance);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.specialty?.toLowerCase().includes(q) ||
          (l.specialties || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    if (specialtyFilter) {
      result = result.filter((l) => {
        const mySpecialties = l.specialties && l.specialties.length > 0 ? l.specialties : [l.specialty];
        return mySpecialties.includes(specialtyFilter);
      });
    }
    if (minRating > 0) result = result.filter((l) => (l.rating || 0) >= minRating);
    return result;
  }, [withDist, maxDistance, searchQuery, specialtyFilter, minRating]);

  const isFiltering =
    searchQuery.trim() !== "" || maxDistance > 0 || specialtyFilter !== "" || minRating > 0;

  const mapMarkers = useMemo(() => {
    const arr = [];
    if (center?.lat && center?.lng)
      arr.push({ id: "me", lat: center.lat, lng: center.lng, type: "customer", label: searchLoc ? "Local" : "Você" });
    filtered.forEach((l) => {
      if (l.lat && l.lng) arr.push({ id: l.id, lat: l.lat, lng: l.lng, type: "locksmith", label: l.name, active: !l.available });
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, center?.lat, center?.lng]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> {livreOnly ? "Chaveiros online em todo o Brasil" : "Chaveiros disponíveis perto de você"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {livreOnly ? "Mapa nacional do Modo Livre · converse diretamente com o profissional" : "Posição atualizada em tempo real · com tempo estimado de chegada até seu endereço"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-success font-medium">
            <span className="w-2 h-2 rounded-full bg-success" />
            {loading ? "…" : withDist.filter((l) => l.available).length} livres
          </span>
          <span className="flex items-center gap-1.5 text-warning font-medium">
            <span className="w-2 h-2 rounded-full bg-warning" />
            {loading ? "…" : withDist.filter((l) => !l.available).length} ocupados
          </span>
        </div>
      </div>

      {/* Busca por bairro ou rua — recentraliza o mapa no local pesquisado */}
      <MapLocationSearch
        label={searchLabel}
        location={customerLoc}
        onSelect={({ address, lat, lng }) => {
          setSearchLabel(address);
          setSearchLoc({ lat, lng });
        }}
        onClear={() => {
          setSearchLabel("");
          setSearchLoc(null);
        }}
      />

      {/* Busca e filtro por distância */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou especialidade…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-9 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            className="h-11 px-3 rounded-lg border border-input bg-card text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      {/* Filtro por tipo de serviço / especialidade */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Tipo:</span>
        <button
          onClick={() => setSpecialtyFilter("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            specialtyFilter === "" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Todos
        </button>
        {SPECIALTY_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSpecialtyFilter(specialtyFilter === s ? "" : s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              specialtyFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {s}
          </button>
        ))}
        {specialtyFilter && (
          <button
            onClick={() => setSpecialtyFilter("")}
            className="p-1 rounded-lg text-muted-foreground hover:bg-accent"
            title="Limpar filtro de tipo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtro por nota de avaliação */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Avaliação:</span>
        <button
          onClick={() => setMinRating(0)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            minRating === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Todas
        </button>
        {[3, 4, 4.5].map((r) => (
          <button
            key={r}
            onClick={() => setMinRating(minRating === r ? 0 : r)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              minRating === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            <Star className="w-3 h-3" /> {r}+
          </button>
        ))}
      </div>

      <LightMap
        center={center}
        markers={mapMarkers}
        height={360}
        eta={filtered[0]?.eta ?? null}
        renderPopup={(m, close) => {
          const l = filtered.find((x) => x.id === m.id);
          if (!l) return null;
          return (
            <div className="w-56 rounded-xl border border-border bg-card shadow-xl p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.specialty} · ⭐ {l.rating}</p>
                  <p className="text-xs text-muted-foreground">{l.distance} km · {l.work_mode === "livre" ? "Livre" : "App"}</p>
                  <p className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> chega em ~{formatEta(l.eta)}
                  </p>
                </div>
                <button onClick={close} className="p-1 rounded-lg text-muted-foreground hover:bg-accent shrink-0" title="Fechar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/chaveiro/${l.id}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-accent"
                >
                  <Star className="w-3.5 h-3.5" /> Avaliações
                </button>
                {l.work_mode === "livre" && (
                  <button
                    onClick={() => navigate(`/chat/${l.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Mensagem
                  </button>
                )}
              </div>
            </div>
          );
        }}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Localizando profissionais…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-dashed border-border">
          <Wrench className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isFiltering ? "Nenhum chaveiro encontrado com esses filtros." : "Nenhum chaveiro online ou ocupado agora."}
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
              <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-semibold text-sm shrink-0 ${l.available ? "bg-success" : "bg-warning"}`}>
                {l.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${l.available ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                    {l.available ? "Disponível" : "Em atendimento"}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {l.work_mode === "livre" ? "Livre" : "App"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.specialty} · {l.distance} km · ⭐ {l.rating}
                </p>
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> chegada estimada em ~{formatEta(l.eta)}
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