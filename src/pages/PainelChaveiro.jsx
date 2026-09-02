import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, Bell, Check, X, Navigation, Power, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MapView from "@/components/map/MapView";
import { haversineKm, stepToward } from "@/lib/geo";

export default function PainelChaveiro() {
  const [locksmiths, setLocksmiths] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [me, setMe] = useState(null);
  const [ring, setRing] = useState(null); // solicitação chegando
  const [active, setActive] = useState(null); // serviço em andamento
  const [extraCost, setExtraCost] = useState("");
  const moveTimer = useRef(null);

  const selected = locksmiths.find((l) => l.id === selectedId) || me;

  // Carrega chaveiros e assina atualizações do selecionado
  useEffect(() => {
    base44.entities.Locksmith.list().then((list) => {
      setLocksmiths(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    base44.entities.Locksmith.get(selectedId).then(setMe);
    const unsub = base44.entities.Locksmith.subscribe((event) => {
      if (event.data?.id === selectedId) base44.entities.Locksmith.get(selectedId).then(setMe);
    });
    return unsub;
  }, [selectedId]);

  // Escuta "toques" (status ringing) direcionados a este chaveiro (modo app)
  useEffect(() => {
    if (!selectedId) return;
    const load = () =>
      base44.entities.ServiceRequest.filter({ locksmith_id: selectedId, status: "ringing" }, "-created_date").then(
        (list) => setRing(list[0] || null)
      );
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [selectedId]);

  // Assina o serviço em andamento deste chaveiro (aceito / a caminho)
  useEffect(() => {
    if (!selectedId) return;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ locksmith_id: selectedId }, "-created_date")
        .then((list) => {
          const ongoing = list.find((r) => r.status === "accepted" || r.status === "on_the_way");
          setActive(ongoing || null);
        });
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [selectedId]);

  // Simula o deslocamento do chaveiro até o cliente
  useEffect(() => {
    if (!active || active.status === "completed") {
      if (moveTimer.current) clearInterval(moveTimer.current);
      return;
    }
    moveTimer.current = setInterval(async () => {
      const fresh = await base44.entities.ServiceRequest.get(active.id);
      const dest = { lat: fresh.customer_lat, lng: fresh.customer_lng };
      const cur = { lat: fresh.locksmith_lat, lng: fresh.locksmith_lng };
      const dist = haversineKm(cur, dest);
      if (dist < 0.05) {
        await base44.entities.ServiceRequest.update(active.id, { status: "completed" });
        if (moveTimer.current) clearInterval(moveTimer.current);
        return;
      }
      const next = stepToward(cur, dest, 0.12);
      await base44.entities.ServiceRequest.update(active.id, {
        status: "on_the_way",
        locksmith_lat: next.lat,
        locksmith_lng: next.lng,
      });
    }, 1500);
    return () => moveTimer.current && clearInterval(moveTimer.current);
  }, [active?.id]);

  const toggleOnline = async () => {
    if (!me) return;
    await base44.entities.Locksmith.update(me.id, { online: !me.online });
  };

  const handleAccept = async () => {
    if (!ring || !me) return;
    const extra = Number(extraCost) || 0;
    const newPrice = Math.round(((ring.price || 0) + extra) * 100) / 100;
    await base44.entities.ServiceRequest.update(ring.id, {
      status: "accepted",
      locksmith_lat: me.lat,
      locksmith_lng: me.lng,
      price: newPrice,
      extra_cost: extra,
    });
    setExtraCost("");
    setRing(null);
  };

  const handleReject = async () => {
    if (!ring) return;
    await base44.entities.ServiceRequest.update(ring.id, { status: "cancelled" });
    setRing(null);
  };

  const isAppMode = me?.work_mode === "app";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Painel do Chaveiro</h1>
          <p className="text-sm text-muted-foreground">Receba solicitações e atenda em tempo real</p>
        </div>
      </div>

      {/* Seleção de perfil */}
      <div className="space-y-1.5 mb-5">
        <Label>Selecione seu perfil</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="Escolha um chaveiro" /></SelectTrigger>
          <SelectContent>
            {locksmiths.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name} · {l.work_mode === "livre" ? "Livre" : "App"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {me && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card mb-5">
          <div>
            <p className="font-medium text-foreground">{me.name}</p>
            <p className="text-xs text-muted-foreground">
              Modo {me.work_mode === "livre" ? "Livre" : "Aplicativo"} ·{" "}
              <span className={me.online ? "text-emerald-600" : "text-muted-foreground"}>
                {me.online ? "Online" : "Offline"}
              </span>
            </p>
          </div>
          <Button onClick={toggleOnline} variant={me.online ? "destructive" : "default"} size="sm">
            <Power className="w-4 h-4 mr-1.5" /> {me.online ? "Sair" : "Entrar"}
          </Button>
        </div>
      )}

      {/* Toque (ring) — modo app */}
      {ring && isAppMode && (
        <div className="p-5 rounded-2xl border-2 border-primary bg-primary/5 mb-5 animate-pulse">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Bell className="w-5 h-5 animate-bounce" />
            <p className="font-semibold">Nova solicitação!</p>
          </div>
          <p className="text-sm text-foreground">{ring.service_type}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{ring.address}</p>
          {ring.key_value != null ? (
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Valor da chave</span><span className="font-medium">R$ {ring.key_value?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mão de obra</span><span className="font-medium">R$ {ring.labor_cost?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Locomoção ({ring.distance_km?.toFixed(1)} km)</span><span className="font-medium">R$ {ring.locomotion_cost?.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="font-semibold text-foreground">Total</span><span className="font-bold text-foreground">R$ {ring.price?.toFixed(2)}</span></div>
            </div>
          ) : (
            <p className="text-sm font-medium text-foreground mt-2">R$ {ring.price?.toFixed(2)}</p>
          )}
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Custos adicionais (opcional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={extraCost}
              onChange={(e) => setExtraCost(e.target.value)}
              placeholder="R$ 0,00"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white text-sm"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAccept} className="flex-1">
              <Check className="w-4 h-4 mr-1.5" /> Aceitar
            </Button>
            <Button onClick={handleReject} variant="outline" className="flex-1">
              <X className="w-4 h-4 mr-1.5" /> Recusar
            </Button>
          </div>
        </div>
      )}

      {/* Serviço em andamento */}
      {active ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Navigation className="w-4 h-4" />
              <p className="font-medium">A caminho do cliente</p>
            </div>
            <p className="text-sm text-foreground">{active.service_type}</p>
            <p className="text-xs text-muted-foreground">{active.address}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: <span className="font-medium text-foreground">
                {active.status === "accepted" ? "Aceito" : active.status === "on_the_way" ? "A caminho" : "Concluído"}
              </span>
            </p>
          </div>

          <MapView
            center={{ lat: active.customer_lat, lng: active.customer_lng }}
            height={320}
            markers={[
              { id: "c", lat: active.customer_lat, lng: active.customer_lng, type: "customer", label: "Cliente" },
              { id: "l", lat: active.locksmith_lat, lng: active.locksmith_lng, type: "locksmith", label: "Você", active: active.status === "on_the_way" },
            ]}
            route={
              active.status !== "completed"
                ? { from: { lat: active.locksmith_lat, lng: active.locksmith_lng }, to: { lat: active.customer_lat, lng: active.customer_lng } }
                : null
            }
          />

          {active.status === "completed" && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
              <Check className="w-5 h-5" /> Serviço concluído!
            </div>
          )}
        </div>
      ) : (
        !ring && (
          <div className="text-center py-12 rounded-xl border border-dashed border-border">
            {isAppMode ? (
              <>
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {me?.online ? "Aguardando solicitações..." : "Fique online para receber solicitações."}
                </p>
              </>
            ) : (
              <>
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No Modo Livre você aparece no mapa dos clientes e negocia pelo chat.
                </p>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}