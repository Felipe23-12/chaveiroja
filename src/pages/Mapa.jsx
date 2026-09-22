import React from "react";
import { MapPin } from "lucide-react";
import LiveLocksmithsMap from "@/components/locksmith/LiveLocksmithsMap";
import LocationStatusNotice from "@/components/location/LocationStatusNotice";
import usePreciseLocation from "@/hooks/usePreciseLocation";

export default function Mapa() {
  const gps = usePreciseLocation();
  const customerLoc = gps.location;

  return (
    <div className="px-4 py-6 md:py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" /> Chaveiros no mapa
          </h1>
          <p className="text-sm text-muted-foreground">
            Profissionais do <strong>Modo Livre</strong> nas áreas liberadas · negocie direto no chat
          </p>
        </div>
      </div>

      <div className="mb-4">
        <LocationStatusNotice status={gps.status} error={gps.error} accuracy={gps.accuracy} onRetry={gps.retry} />
      </div>
      <LiveLocksmithsMap customerLoc={customerLoc} livreOnly locationKnown={gps.hasFix} />
    </div>
  );
}