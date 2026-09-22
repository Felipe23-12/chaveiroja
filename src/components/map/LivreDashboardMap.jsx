import React, { useMemo } from "react";
import LightMap from "@/components/map/LightMap";
import CoverageNotice from '@/components/location/CoverageNotice';

/** Mapa privado do chaveiro: exibe somente a própria localização. */
export default function LivreDashboardMap({ me }) {
  const markers = useMemo(() => {
    if (!me?.lat || !me?.lng) return [];
    return [{ id: "me", lat: me.lat, lng: me.lng, type: "me", label: me.name || "Você" }];
  }, [me?.lat, me?.lng, me?.name]);

  const center = me?.lat && me?.lng ? { lat: me.lat, lng: me.lng } : null;

  return <div className="space-y-3">
    <div>
      <h3 className="font-heading font-semibold text-foreground">Sua localização</h3>
      <p className="text-xs text-muted-foreground">Este mapa é privado e mostra somente o seu marcador.</p>
    </div>
    <CoverageNotice location={center} locksmith />
    <LightMap center={center} markers={markers} height={380} />
    {markers.length === 0 && <p className="text-center text-xs text-muted-foreground">Ative sua localização para visualizar seu marcador.</p>}
  </div>;
}