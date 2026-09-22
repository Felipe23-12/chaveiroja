import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import LightMap from "@/components/map/LightMap";
import { useServiceAreas, isAreaAvailable } from '@/lib/serviceAreas';

/**
 * Mapa (leve) dos chaveiros do Modo Livre online em tempo real.
 * Substitui o Leaflet por imagem estática + sobreposição (LightMap),
 * evitando travamentos no WebView do Android.
 */
export default function RealLocksmithsMap({ me }) {
  const [locksmiths, setLocksmiths] = useState([]);
  const [loading, setLoading] = useState(true);
  const coverage = useServiceAreas();

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

  const others = locksmiths.filter((l) => !coverage.loading && !coverage.error && isAreaAvailable(coverage.areas, l.lat, l.lng) && l.id !== me?.id);
  const center = me ? { lat: me.lat, lng: me.lng } : { lat: -23.55, lng: -46.63 };

  const markers = useMemo(() => {
    const arr = [];
    if (me?.lat && me?.lng) arr.push({ id: "me", lat: me.lat, lng: me.lng, type: "me", label: me.name });
    others.forEach((l) =>
      arr.push({ id: l.id, lat: l.lat, lng: l.lng, type: "locksmith", label: l.name, active: !l.available })
    );
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, me?.lat, me?.lng, locksmiths, coverage.areas, coverage.loading, coverage.error]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Chaveiros online agora</h3>
          <p className="text-xs text-muted-foreground">Modo Livre · atualização em tempo real</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-success font-medium">
            <span className="w-2 h-2 rounded-full bg-success" />
            {others.filter((l) => l.available).length} livres
          </span>
          <span className="flex items-center gap-1.5 text-warning font-medium">
            <span className="w-2 h-2 rounded-full bg-warning" />
            {others.filter((l) => !l.available).length} ocupados
          </span>
        </div>
      </div>

      <LightMap center={center} markers={markers} height={380} />

      {loading && <p className="text-xs text-muted-foreground text-center">Carregando profissionais…</p>}
    </div>
  );
}