import React from "react";
import { Navigation, MapPin, CheckCircle2, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import UrgentArrivalCountdown from "@/components/locksmith/UrgentArrivalCountdown";
import CancellationCaseNotice from "@/components/client/CancellationCaseNotice";
import ModerationActions from "@/components/moderation/ModerationActions";
import LightMap from "@/components/map/LightMap";
import RequestTracking from "@/components/locksmith/RequestTracking";
import UpgradeToUrgentButton from "@/components/locksmith/UpgradeToUrgentButton";
export default function HomeTrackingStep({ request, locksmith, routePath, routeEta, onConfirmArrival, onDenyArrival, onAdvance, onRate, onChat, onUpdated, onCancel, onNewRequest }) {
  return <div className="space-y-5 step-enter">
    <div><h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" /> Acompanhando serviço</h2><p className="text-sm text-muted-foreground">{request.service_type} · {request.address}</p></div>
    <UrgentArrivalCountdown request={request} />
    <CancellationCaseNotice requestId={request.id} />
    <ModerationActions targetUserId={request.locksmith_user_id || locksmith?.created_by_id} targetType="chaveiro" targetName={request.locksmith_name || locksmith?.name} contextType="service" requestId={request.id} locksmithId={locksmith?.id} />
    {request.locksmith_arrived && !request.client_arrived_confirmed && <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
      <div className="flex items-center gap-2 text-primary"><MapPin className="w-5 h-5" /><p className="font-medium text-sm">O chaveiro chegou ao local!</p></div>
      <p className="text-xs text-muted-foreground">Confirme a chegada para que o chaveiro inicie o atendimento. Se ele ainda não chegou, avise pelo botão abaixo.</p>
      <Button onClick={onConfirmArrival} className="w-full"><CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar chegada do chaveiro</Button>
      <Button onClick={onDenyArrival} variant="outline" className="w-full text-destructive border-destructive/40"><AlertTriangle className="w-4 h-4 mr-1.5" /> Ele ainda não chegou</Button>
    </div>}
    <LightMap center={{ lat: request.customer_lat, lng: request.customer_lng }} height={320} markers={[
      { id: "c", lat: request.customer_lat, lng: request.customer_lng, type: "customer", label: "Você" },
      { id: "l", lat: request.locksmith_lat, lng: request.locksmith_lng, type: "locksmith", label: locksmith?.name?.split(" ")[0], active: request.status === "on_the_way" },
    ]} route={request.status !== "completed" ? { from: { lat: request.locksmith_lat, lng: request.locksmith_lng }, to: { lat: request.customer_lat, lng: request.customer_lng } } : null} routePath={routePath} eta={routeEta} />
    <RequestTracking request={request} locksmith={locksmith} onAdvance={onAdvance} onRate={onRate} onCall={(l) => { window.location.href = `tel:${l.phone}`; }} />
    <Button variant="outline" onClick={onChat} className="w-full"><MessageCircle className="w-4 h-4 mr-2" /> Ver rota e conversar com o chaveiro</Button>
    {!request.start_photos?.length && <UpgradeToUrgentButton request={request} onUpdated={onUpdated} />}
    {request.status !== "completed" ? <Button onClick={onCancel} variant="outline" className="w-full text-destructive border-destructive/40">Cancelar serviço</Button> : <Button onClick={onNewRequest} variant="outline" className="w-full">Solicitar novo serviço</Button>}
  </div>;
}