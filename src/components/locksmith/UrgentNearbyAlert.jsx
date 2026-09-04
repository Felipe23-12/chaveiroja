import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, MapPin, Clock } from "lucide-react";
import { haversineKm } from "@/lib/geo";
import { SERVICE_CATALOG } from "@/lib/pricing";
import { playNotificationSound } from "@/lib/notificationSound";

const RADIUS_KM = 15;

// O chaveiro atende o serviço do chamado?
function matchesSpecialty(locksmith, req) {
  const svc = SERVICE_CATALOG.find((s) => s.label === req.service_type);
  if (!svc) return true;
  if (locksmith.services?.length > 0) return locksmith.services.includes(svc.id);
  const specs = locksmith.specialties?.length > 0 ? locksmith.specialties : [locksmith.specialty];
  return specs.includes(svc.specialty);
}

/**
 * Alerta automático no painel: lista os chamados URGENTES abertos na região do
 * chaveiro (raio de 15 km) e dispara som + vibração a cada novo chamado urgente.
 */
export default function UrgentNearbyAlert({ locksmith }) {
  const [urgent, setUrgent] = useState([]);
  const alertedIds = useRef(new Set());

  useEffect(() => {
    if (!locksmith?.online) return;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ status: "searching", urgency: "urgent" }, "-created_date")
        .then((list) => {
          const near = list.filter(
            (r) =>
              r.customer_lat &&
              matchesSpecialty(locksmith, r) &&
              haversineKm(
                { lat: locksmith.lat, lng: locksmith.lng },
                { lat: r.customer_lat, lng: r.customer_lng }
              ) <= RADIUS_KM
          );
          setUrgent(near);
          near.forEach((r) => {
            if (alertedIds.current.has(r.id)) return;
            alertedIds.current.add(r.id);
            playNotificationSound();
            if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]);
          });
        })
        .catch(() => {});
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [locksmith?.id, locksmith?.online, locksmith?.lat, locksmith?.lng]);

  if (!locksmith?.online || urgent.length === 0) return null;

  return (
    <div className="mb-5 rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/30 overflow-hidden animate-alert-slide">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white animate-alert-blink">
        <AlertTriangle className="w-5 h-5" />
        <p className="font-heading font-bold text-sm">
          {urgent.length === 1
            ? "1 chamado URGENTE na sua região"
            : `${urgent.length} chamados URGENTES na sua região`}
        </p>
      </div>
      <div className="p-3 space-y-2">
        {urgent.map((r) => {
          const dist = haversineKm(
            { lat: locksmith.lat, lng: locksmith.lng },
            { lat: r.customer_lat, lng: r.customer_lng }
          );
          return (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-red-200">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{r.service_type}</p>
                <p className="text-xs text-muted-foreground truncate">{r.address}</p>
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> Chegada em até 35 min
                </p>
              </div>
              <span className="text-xs font-bold text-red-600 shrink-0">{dist.toFixed(1)} km</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}