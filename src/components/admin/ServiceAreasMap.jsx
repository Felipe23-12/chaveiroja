import React, { useMemo } from 'react';
import LightMap from '@/components/map/LightMap';

export default function ServiceAreasMap({ areas }) {
  const fitPoints = useMemo(() => {
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const area of areas) {
      const rings = [...(area.polygons || []), ...(area.lines || [])];
      for (const ring of rings) for (const point of ring) {
        const [lng, lat] = point;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
      }
    }
    return Number.isFinite(minLat) ? [{ lat: minLat, lng: minLng }, { lat: maxLat, lng: maxLng }] : [];
  }, [areas]);

  return <div className="space-y-2">
    <h3 className="text-sm font-semibold text-foreground">Mapa das áreas de atendimento</h3>
    <LightMap center={{ lat: -23.532, lng: -46.791 }} fitPoints={fitPoints} coverageMode="admin" height={360} />
  </div>;
}