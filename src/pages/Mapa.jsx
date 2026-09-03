import React, { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import LiveLocksmithsMap from "@/components/locksmith/LiveLocksmithsMap";
import { DEFAULT_CENTER, getCustomerLocation } from "@/lib/geo";

export default function Mapa() {
  const [customerLoc, setCustomerLoc] = useState(DEFAULT_CENTER);

  useEffect(() => {
    getCustomerLocation().then(setCustomerLoc);
  }, []);

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

      <LiveLocksmithsMap customerLoc={customerLoc} livreOnly />
    </div>
  );
}