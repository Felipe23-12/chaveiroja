import React from "react";
import { CheckCircle2, Navigation, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import LightMap from "@/components/map/LightMap";
import LocksmithMiniProfile from "@/components/locksmith/LocksmithMiniProfile";
import UpgradeToUrgentButton from "@/components/locksmith/UpgradeToUrgentButton";
import UrgentArrivalCountdown from "@/components/locksmith/UrgentArrivalCountdown";
import KeyServicePrice from "@/components/client/KeyServicePrice";

/** Etapa 4: chaveiro aceitou o pedido — mapa, perfil e ações de acompanhamento */
export default function AcceptedStep({ request, locksmith, serviceLabel, routePath, routeEta, onTrack, onChat, onUpdated }) {
  return (
    <div className="space-y-5 step-enter">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Chaveiro aceitou seu pedido!</h2>
        <p className="text-sm text-muted-foreground mb-3">{locksmith?.name} · {serviceLabel}</p>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/15 text-success text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Status: Em Andamento
        </span>
      </div>

      <UrgentArrivalCountdown request={request} />
      <KeyServicePrice request={request} />

      <LightMap
        center={{ lat: request.customer_lat, lng: request.customer_lng }}
        height={300}
        markers={[
          { id: "c", lat: request.customer_lat, lng: request.customer_lng, type: "customer", label: "Você" },
          { id: "l", lat: request.locksmith_lat, lng: request.locksmith_lng, type: "locksmith", label: locksmith?.name?.split(" ")[0] },
        ]}
        route={{ from: { lat: request.locksmith_lat, lng: request.locksmith_lng }, to: { lat: request.customer_lat, lng: request.customer_lng } }}
        routePath={routePath}
        eta={routeEta}
      />

      <LocksmithMiniProfile locksmith={locksmith} />
      <UpgradeToUrgentButton request={request} onUpdated={onUpdated} />
      <div className="flex gap-2">
        <Button onClick={onTrack} size="lg" className="flex-1">
          Acompanhar no mapa <Navigation className="w-4 h-4 ml-2" />
        </Button>
        <Button variant="outline" onClick={onChat} size="lg" className="flex-1">
          <MessageCircle className="w-4 h-4 mr-2" /> Rota + Chat
        </Button>
      </div>
    </div>
  );
}