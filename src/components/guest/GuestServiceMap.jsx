import React, { useEffect, useState } from 'react';
import LightMap from '@/components/map/LightMap';
import { fetchDrivingRoute, etaMinutes } from '@/lib/geo';
export default function GuestServiceMap({ request }) {
  const [path, setPath] = useState(null);
  const from = { lat: request.locksmith_lat, lng: request.locksmith_lng }, to = { lat: request.customer_lat, lng: request.customer_lng };
  useEffect(() => {
    let active = true;
    if ([from.lat, from.lng].every(Number.isFinite)) fetchDrivingRoute(from, to).then(result => { if (active) setPath(result); });
    return () => { active = false; };
  }, [from.lat, from.lng, to.lat, to.lng]);
  const markers = [{ ...to, id: 'customer', type: 'customer', label: 'Endereço do atendimento', active: false }];
  if ([from.lat, from.lng].every(Number.isFinite)) markers.push({ ...from, id: 'locksmith', type: 'locksmith', label: request.locksmith_name || 'Chaveiro', active: true });
  return <LightMap markers={markers} center={to} route={markers.length > 1 ? { from, to } : null} routePath={path?.coordinates} eta={path ? etaMinutes(path.duration) : null} height={300} />;
}