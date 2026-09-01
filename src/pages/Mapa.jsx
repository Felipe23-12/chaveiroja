import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, MessageCircle, Wrench, Loader2, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import MapView from "@/components/map/MapView";
import { DEFAULT_CENTER, getCustomerLocation, haversineKm } from "@/lib/geo";

export default function Mapa() {
  const navigate = useNavigate();
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [locksmiths, setLocksmiths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getCustomerLocation().then((loc) => active && setCenter(loc));
    const load = () =>
      base44.entities.Locksmith.filter({ work_mode: "livre", online: true }).then((list) => {
        if (active) setLocksmiths(list);
      });
    load().finally(() => active && setLoading(false));

    // Atualização em tempo real (chaveiros entrando/saindo do mapa)
    const unsub = base44.entities.Locksmith.subscribe(() => load());
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const markers = [
    { id: "me", lat: center.lat, lng: center.lng, type: "customer", label: "Você" },
    ...locksmiths.map((l) => ({
      id: l.id,
      lat: l.lat,
      lng: l.lng,
      type: "locksmith",
      label: l.name.split(" ")[0],
      onClick: () => navigate(`/chat/${l.id}`),
    })),
  ];

  return (
    <div className="px-4 py-6 md:py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Chaveiros no mapa
          </h1>
          <p className="text-sm text-muted-foreground">
            Profissionais do <strong>Modo Livre</strong> online agora · negocie direto no chat
          </p>
        </div>
      </div>

      <MapView center={center} markers={markers} height={420} />

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Localizando profissionais...</span>
          ) : (
            <>{locksmiths.length} chaveiro(s) online perto de você</>
          )}
        </p>
        <Button onClick={() => navigate("/")} variant="outline" size="sm">
          <Search className="w-4 h-4 mr-1.5" /> Solicitar serviço
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {locksmiths.map((l) => {
          const dist = haversineKm(center, { lat: l.lat, lng: l.lng });
          return (
            <div
              key={l.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold">
                {l.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{l.name}</p>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> online
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l.specialty} · {dist} km · ⭐ {l.rating}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigate(`/chaveiro/${l.id}`)}>
                  <Star className="w-4 h-4 mr-1.5" /> Perfil
                </Button>
                <Button size="sm" onClick={() => navigate(`/chat/${l.id}`)}>
                  <MessageCircle className="w-4 h-4 mr-1.5" /> Chat
                </Button>
              </div>
            </div>
          );
        })}

        {!loading && locksmiths.length === 0 && (
          <div className="text-center py-10 rounded-xl border border-dashed border-border">
            <Wrench className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum chaveiro do Modo Livre online agora.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Você ainda pode solicitar um serviço e o app encontra o profissional mais próximo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}