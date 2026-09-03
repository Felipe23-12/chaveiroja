import React, { useMemo } from "react";
import { Bell, BellOff, MapPin, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import LivreDashboardMap from "@/components/map/LivreDashboardMap";
import LocksmithChatConversations from "@/components/locksmith/LocksmithChatConversations";

/**
 * Dashboard do Modo Livre — exibido quando o chaveiro pagou a mensalidade.
 * Mostra o mapa interativo em tempo real + conversas com clientes.
 * Inclui toggle para receber/não receber solicitações do modo aplicativo.
 */
export default function LivreModeDashboard({ me, onUpdateMe }) {
  const toggleAppRequests = (checked) => {
    onUpdateMe({ receive_app_requests: checked });
  };

  // Estabiliza o me para o mapa — só re-renderiza quando campos relevantes mudam
  const mapMe = useMemo(
    () => ({
      id: me?.id,
      name: me?.name,
      lat: me?.lat,
      lng: me?.lng,
      available: me?.available,
      online: me?.online,
    }),
    [me?.id, me?.name, me?.lat, me?.lng, me?.available, me?.online]
  );

  return (
    <div className="space-y-5 fade-in-up">
      {/* Toggle: receber solicitações do modo aplicativo */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3">
          {me?.receive_app_requests !== false ? (
            <Bell className="w-5 h-5 text-primary" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-foreground text-sm">Solicitações do modo aplicativo</p>
            <p className="text-xs text-muted-foreground">
              {me?.receive_app_requests !== false
                ? "Você recebe alertas de pedidos próximos via app"
                : "Você não recebe solicitações do modo aplicativo"}
            </p>
          </div>
        </div>
        <Switch
          checked={me?.receive_app_requests !== false}
          onCheckedChange={toggleAppRequests}
        />
      </div>

      {/* Mapa interativo em tempo real — clientes próximos */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Mapa em tempo real</h3>
        </div>
        <LivreDashboardMap me={mapMe} />
      </div>

      {/* Conversas com clientes */}
      <LocksmithChatConversations me={me} />
    </div>
  );
}

/**
 * Tela exibida quando o chaveiro está no modo livre mas não pagou a mensalidade.
 * O chat com clientes continua acessível (componente separado) — apenas o mapa
 * interativo e a visibilidade no mapa ficam bloqueados.
 */
export function LivreModeLocked({ onPay, me }) {
  // Estabiliza o me para o mapa — só re-renderiza quando campos relevantes mudam
  const mapMe = useMemo(
    () => ({
      id: me?.id,
      name: me?.name,
      lat: me?.lat,
      lng: me?.lng,
      available: me?.available,
      online: me?.online,
    }),
    [me?.id, me?.name, me?.lat, me?.lng, me?.available, me?.online]
  );

  return (
    <div className="space-y-4 fade-in-up">
      {/* Aviso de mensalidade — banner compacto, não substitui o mapa */}
      <div className="flex flex-col items-center text-center py-5 px-4 rounded-xl border-2 border-amber-300 bg-amber-50">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="font-heading font-semibold text-base text-foreground mb-1">
          Mensalidade pendente
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mb-3">
          Pague a mensalidade do modo livre para liberar sua visibilidade no mapa para os clientes.
          O mapa abaixo permanece visível como referência dos chamados.
        </p>
        <Button onClick={onPay} size="sm">
          <CreditCard className="w-4 h-4 mr-2" /> Pagar mensalidade
        </Button>
      </div>

      {/* Mapa visível mesmo com mensalidade pendente — referência dos chamados */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Mapa em tempo real</h3>
        </div>
        <LivreDashboardMap me={mapMe} />
      </div>
    </div>
  );
}