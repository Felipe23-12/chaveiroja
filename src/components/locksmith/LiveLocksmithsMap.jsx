import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Loader2, MessageCircle, Star, Wrench } from "lucide-react";
import MapView from "@/components/map/MapView";
import { haversineKm } from "@/lib/geo";

/**
 * Mapa ao vivo da tela principal do cliente.
 * Mostra apenas chaveiros do Modo Livre (work_mode="livre") que estão online,
 * em tempo real, ao redor da localização atual do cliente.
 */
export default function LiveLocksmithsMap({ customerLoc }) {
  const navigate = useNavigate();
  const [locksmiths, setLocksmiths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () =>
      base44.entities.Locksmith.filter({ work_mode: "livre", online: true }).then((list) => {
        if (active) setLocksmiths(list);
      });
    load().finally(() => active && setLoading(false));

    // Atualização em tempo real: chaveiros entrando/saindo/online
    const unsub = base44.entities.Locksmith.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const withDist = locksmiths
    .map((l) => ({ ...l, distance: haversineKm(customerLoc, { lat: l.lat, lng: l.lng }) }))
    .sort((a, b) => a.distance - b.distance);

  const markers = [
    { id: "me", lat: customerLoc.lat, lng: customerLoc.lng, type: "customer", label: "Você" },
    ...withDist.map((l) => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      type: "locksmith",
      label: l.name?.split(" ")[0],
      onClick: () => navigate(`/chat/${l.id}`),
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Chaveiros online perto de você
          </h3>
          <p className="text-xs text-muted-foreground">
            Profissionais do <strong>Modo Livre</strong> visíveis no mapa · toque para conversar
          </p>
        </div>
        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {loading ? "…" : withDist.length} online
        </span>
      </div>

      <MapView center={customerLoc} markers={markers} height={300} />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Localizando profissionais…
        </div>
      ) : withDist.length === 0 ? (
        <div className="text-center py-6 rounded-xl border border-dashed border-border">
          <Wrench className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum chaveiro do Modo Livre online agora.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Você ainda pode solicitar um serviço — o app encontra o profissional mais próximo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {withDist.slice(0, 3).map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                {l.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
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
              <button
                onClick={() => navigate(`/chat/${l.id}`)}
                className="p-2 rounded-lg text-primary hover:bg-accent"
                title="Conversar"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}