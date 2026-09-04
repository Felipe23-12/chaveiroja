import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ArrowLeft, Zap, Bell, Loader2, Navigation, CheckCircle2, AlertTriangle, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG, calculateCancellationFee, CANCELLATION_THRESHOLD_MINUTES, calculateLongDistanceFee } from "@/lib/pricing";
import { calculateDynamicPrice } from "@/lib/dynamicPricing";
import { searchCarKeyValue } from "@/lib/carKey";
import DynamicPriceFactors from "@/components/locksmith/DynamicPriceFactors";
import ServiceCard from "@/components/locksmith/ServiceCard";
import ServiceConfig from "@/components/locksmith/ServiceConfig";
import CarKeyConfig from "@/components/locksmith/CarKeyConfig";
import RequestTracking from "@/components/locksmith/RequestTracking";
import LiveLocksmithsMap from "@/components/locksmith/LiveLocksmithsMap";
import ModuleSelector from "@/components/locksmith/ModuleSelector";
import LocksmithMiniProfile from "@/components/locksmith/LocksmithMiniProfile";
import ReviewForm from "@/components/locksmith/ReviewForm";
import LightMap from "@/components/map/LightMap";
import { DEFAULT_CENTER, getCustomerLocation, haversineKm, fetchDrivingRoute, etaMinutes } from "@/lib/geo";
import { getClientLoyalty, applyLoyaltyDiscount } from "@/lib/loyalty";
import PointsProgressCard from "@/components/locksmith/PointsProgressCard";
import PaymentStep from "@/components/payment/PaymentStep";
import ReceiptButton from "@/components/payment/ReceiptButton";
import { createPaymentRecord, confirmPaymentPaid } from "@/lib/payments";
import { ensureNotificationPermission, notifyClient } from "@/lib/clientNotifications";
import { Image } from "@/components/ui/image";
import StepTransition from "@/components/ui/StepTransition";
import StepProgress from "@/components/ui/StepProgress";
import ErrorBanner from "@/components/ui/ErrorBanner";
import LoadingCard from "@/components/ui/LoadingCard";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStepState] = useState(1);
  const [module, setModule] = useState("app");
  const [searchParams, setSearchParams] = useSearchParams();

  // Sincroniza o step com a URL (?step=N) para que o botão de voltar do
  // Android/navegador retroceda uma etapa em vez de sair da página.
  const goToStep = (n) => {
    setStepState(n);
    setSearchParams({ step: String(n) });
  };

  useEffect(() => {
    const urlStep = parseInt(searchParams.get("step"), 10);
    if (!isNaN(urlStep) && urlStep >= 1 && urlStep <= 7 && urlStep !== step) {
      setStepState(urlStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [serviceId, setServiceId] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [customAddons, setCustomAddons] = useState({});
  const [vehicleInfo, setVehicleInfo] = useState({ model: "", year: "", complexity: "simples" });
  const [keyValue, setKeyValue] = useState(null);
  const [searching, setSearching] = useState(false);

  const [customerLoc, setCustomerLoc] = useState(DEFAULT_CENTER);
  const [appLocksmiths, setAppLocksmiths] = useState([]);
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [activeRequest, setActiveRequest] = useState(null);
  const [selectedLocksmith, setSelectedLocksmith] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loyalty, setLoyalty] = useState(null);
  const [paying, setPaying] = useState(false);
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [cancelFeeData, setCancelFeeData] = useState(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const reqRef = useRef(null);
  const notifiedMoving = useRef(false);
  const notifiedNearby = useRef(false);
  const notifiedEnd = useRef(false);
  const notifiedCompleted = useRef(false);
  const notifiedArrived = useRef(false);

  const service = useMemo(() => SERVICE_CATALOG.find((s) => s.id === serviceId), [serviceId]);

  useEffect(() => {
    base44.auth.me().then((u) => setCustomerName(u?.full_name || "")).catch(() => {});
  }, []);

  // Distância do chaveiro elegível mais próximo (para estimativa de preço)
  const nearestDistance = useMemo(() => {
    if (!service || appLocksmiths.length === 0) return null;
    const eligible = appLocksmiths.filter((l) => {
      if (l.services && l.services.length > 0) return l.services.includes(service.id);
      const locksmithSpecialties =
        l.specialties && l.specialties.length > 0 ? l.specialties : [l.specialty];
      return locksmithSpecialties.includes(service.specialty);
    });
    if (eligible.length === 0) return null;
    return Math.min(...eligible.map((l) => haversineKm(customerLoc, { lat: l.lat, lng: l.lng })));
  }, [service, appLocksmiths, customerLoc]);

  // Supply: chaveiros online no modo app
  const onlineLocksmithsCount = appLocksmiths.filter((l) => l.online).length;

  // Preço dinâmico (modo aplicativo): oferta/demanda + urgência + região + bairro + distância
  const price = useMemo(() => {
    if (!service) return null;
    return calculateDynamicPrice({
      service,
      selectedOptions,
      customAddons,
      vehicleInfo,
      onlineLocksmiths: onlineLocksmithsCount,
      activeRequests: activeRequestsCount,
      urgency,
      customerLat: customerLoc.lat,
      customerLng: customerLoc.lng,
      address,
      nearestDistanceKm: nearestDistance,
      keyValue,
    });
  }, [service, selectedOptions, customAddons, vehicleInfo, onlineLocksmithsCount, activeRequestsCount, urgency, customerLoc, address, nearestDistance, keyValue]);

  useEffect(() => {
    getCustomerLocation().then(setCustomerLoc);
    base44.entities.Locksmith.filter({ work_mode: "app", available: true }).then(setAppLocksmiths);
    base44.auth.me()
      .then((u) => getClientLoyalty(u.id))
      .then(setLoyalty)
      .catch(() => setLoyalty(null));
  }, []);

  // Restaura um serviço em andamento ao reentrar na Home — garante que o
  // cliente consiga retomar o fluxo, finalizar e pagar mesmo após navegar
  // para outras abas ou sair da tela de solicitação.
  useEffect(() => {
    let cancelled = false;
    base44.auth.me().then(async (u) => {
      if (!u?.id || cancelled) return;
      try {
        const list = await base44.entities.ServiceRequest.filter({ created_by_id: u.id }, "-created_date", 20);
        if (cancelled) return;
        const active = list.find((r) => {
          if (r.status === "ringing" || r.status === "accepted" || r.status === "on_the_way") return true;
          if (r.end_photos?.length > 0 && r.status !== "completed") return true;
          if (r.status === "completed" && !r.rating) return true;
          return false;
        });
        if (!active) return;
        setActiveRequest(active);
        reqRef.current = active.id;
        if (active.locksmith_id) {
          base44.entities.Locksmith.get(active.locksmith_id).then(setSelectedLocksmith).catch(() => {});
        }
        let s = 5;
        if (active.status === "ringing") s = 3;
        else if (active.status === "accepted") s = 4;
        else if (active.status === "on_the_way") s = 5;
        else if (active.end_photos?.length > 0 && active.status !== "completed") s = 6;
        else if (active.status === "completed") s = 7;
        goToStep(s);
      } catch (e) {
        /* silencioso */
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demanda ativa: conta solicitações em andamento (searching + ringing)
  // para alimentar o cálculo dinâmico de oferta vs. demanda.
  useEffect(() => {
    const fetchDemand = async () => {
      try {
        const [searching, ringing] = await Promise.all([
          base44.entities.ServiceRequest.filter({ status: "searching" }),
          base44.entities.ServiceRequest.filter({ status: "ringing" }),
        ]);
        setActiveRequestsCount((searching?.length || 0) + (ringing?.length || 0));
      } catch (e) {
        /* silencioso — não bloqueia o fluxo */
      }
    };
    fetchDemand();
    const unsub = base44.entities.ServiceRequest.subscribe(() => fetchDemand());
    return unsub;
  }, []);

  const toggleOption = (optId) => {
    setSelectedOptions((prev) =>
      prev.includes(optId) ? prev.filter((o) => o !== optId) : [...prev, optId]
    );
  };

  const setCustomAddon = (optId, value) => {
    setCustomAddons((prev) => ({ ...prev, [optId]: value }));
  };

  const handleAddressSelect = ({ lat, lng }) => {
    setCustomerLoc({ lat, lng });
  };

  const handleSearchKey = async () => {
    if (!vehicleInfo.model.trim() || !vehicleInfo.year.trim()) {
      setSearchError("Informe modelo e ano do veículo");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const val = await searchCarKeyValue(vehicleInfo.model, vehicleInfo.year);
      if (val == null || val <= 0) {
        setSearchError("Não foi possível encontrar o valor da chave. Tente novamente.");
        setKeyValue(null);
      } else {
        setKeyValue(val);
      }
    } catch (e) {
      setSearchError(e.message || "Falha ao pesquisar o valor da chave");
    } finally {
      setSearching(false);
    }
  };

  // Solicita o serviço: encontra o chaveiro do modo app mais próximo e "toca" nele
  // O pagamento acontece APÓS a conclusão do serviço, não antes.
  const handleConfirmConfig = async () => {
    if (!address || submitting) return;
    setSubmitting(true);
    setSearchError("");
    try {
      // Filtra apenas chaveiros que atendem o serviço solicitado.
      // 1. Se o chaveiro configurou serviços específicos, exige o ID do serviço.
      // 2. Se não configurou serviços, usa a especialidade como filtro:
      //    o serviço só vai para chaveiros cuja especialidade inclui a do serviço.
      const eligible = appLocksmiths.filter((l) => {
        if (l.services && l.services.length > 0) {
          return l.services.includes(service.id);
        }
        const locksmithSpecialties =
          l.specialties && l.specialties.length > 0 ? l.specialties : [l.specialty];
        return locksmithSpecialties.includes(service.specialty);
      });

      const nearest = [...eligible]
        .map((l) => ({ l, d: haversineKm(customerLoc, { lat: l.lat, lng: l.lng }) }))
        .sort((a, b) => a.d - b.d)[0];

      if (!nearest) {
        setSearchError(`Nenhum chaveiro disponível para "${service.label}" no modo aplicativo agora. Tente outro serviço ou novamente.`);
        setSubmitting(false);
        return;
      }

      const base = {
        service_type: service.label,
        address,
        description,
        urgency,
        status: "ringing",
        locksmith_id: nearest.l.id,
        locksmith_name: nearest.l.name,
        customer_lat: customerLoc.lat,
        customer_lng: customerLoc.lng,
        locksmith_lat: nearest.l.lat,
        locksmith_lng: nearest.l.lng,
      };

      const useDiscount = loyalty?.available > 0;

      let req;
      if (service.isCarKey) {
        // Preço dinâmico: valor da chave (fixo) + mão de obra (ajustada por oferta/demanda/região/bairro)
        const basePrice = price?.total || 0;
        const adjustedLabor = price ? Math.round((price.base - (keyValue || 0)) * 100) / 100 : 0;
        const kmFee = calculateLongDistanceFee(nearest.d);
        const disc = useDiscount ? applyLoyaltyDiscount(basePrice) : { amount: 0, final: basePrice };
        req = await base44.entities.ServiceRequest.create({
          ...base,
          price: disc.final,
          key_value: keyValue,
          labor_cost: adjustedLabor,
          locomotion_cost: kmFee,
          distance_km: Math.round(nearest.d * 100) / 100,
          extra_cost: 0,
          discount_applied: useDiscount,
          discount_amount: disc.amount,
        });
      } else {
        // Preço dinâmico já inclui ajustes de oferta/demanda, região, bairro e taxa de distância
        const basePrice = price?.total || 0;
        const kmFee = calculateLongDistanceFee(nearest.d);
        const disc = useDiscount ? applyLoyaltyDiscount(basePrice) : { amount: 0, final: basePrice };
        req = await base44.entities.ServiceRequest.create({
          ...base,
          price: disc.final,
          distance_km: Math.round(nearest.d * 100) / 100,
          locomotion_cost: kmFee,
          discount_applied: useDiscount,
          discount_amount: disc.amount,
        });
      }

      if (useDiscount) {
        setLoyalty((prev) => (prev ? { ...prev, available: prev.available - 1 } : prev));
      }
      setSelectedLocksmith(nearest.l);
      setActiveRequest(req);
      reqRef.current = req.id;
      goToStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  // Pagamento confirmado via Stripe — acontece após o serviço, antes da finalização
  const handleServicePayment = async (method, stripePaymentIntentId) => {
    if (!activeRequest) return;

    // Dinheiro: não cria PaymentIntent no Stripe — o chaveiro confirma o recebimento
    if (method === "dinheiro") {
      setPaying(true);
      setSearchError("");
      try {
        await base44.entities.ServiceRequest.update(activeRequest.id, { payment_method: "dinheiro" });
        setActiveRequest((prev) => ({ ...prev, payment_method: "dinheiro" }));
      } catch (e) {
        setSearchError(e.message || "Falha ao registrar forma de pagamento");
      } finally {
        setPaying(false);
      }
      return;
    }

    setPaying(true);
    setSearchError("");
    try {
      const user = await base44.auth.me();
      const payment = await createPaymentRecord({
        serviceRequestId: activeRequest.id,
        amount: activeRequest.price,
        method,
        locksmithId: selectedLocksmith?.id,
        locksmithName: selectedLocksmith?.name,
        clientId: user?.id,
        clientName: user?.full_name,
        stripePaymentIntentId,
      });
      await confirmPaymentPaid(payment.id);
      setActiveRequest((prev) => ({ ...prev, payment_id: payment.id, payment_status: "paid" }));
      base44.auth.me()
        .then((u) => getClientLoyalty(u.id))
        .then(setLoyalty)
        .catch(() => {});
    } catch (e) {
      setSearchError(e.message || "Falha ao processar pagamento");
    } finally {
      setPaying(false);
    }
  };

  // Pagamento da taxa de cancelamento
  const handleCancelFeePayment = async (method, stripePaymentIntentId) => {
    if (!activeRequest || !cancelFeeData) return;
    setPaying(true);
    try {
      const user = await base44.auth.me();
      const payment = await createPaymentRecord({
        serviceRequestId: activeRequest.id,
        amount: cancelFeeData.fee,
        method,
        locksmithId: selectedLocksmith?.id,
        locksmithName: selectedLocksmith?.name,
        clientId: user?.id,
        clientName: user?.full_name,
        stripePaymentIntentId,
      });
      await confirmPaymentPaid(payment.id);
      await base44.entities.ServiceRequest.update(activeRequest.id, {
        status: "cancelled",
        cancellation_fee: cancelFeeData.fee,
        cancellation_locksmith_amount: cancelFeeData.locksmithAmount,
        cancellation_app_fee: cancelFeeData.appFee,
        payment_status: "paid",
      });
      handleNewRequest();
    } catch (e) {
      setSearchError(e.message || "Falha ao processar taxa de cancelamento");
    } finally {
      setPaying(false);
    }
  };

  // Assina a solicitação para reagir quando o chaveiro aceitar / se mover
  useEffect(() => {
    if (!activeRequest) return;
    // Solicita permissão de notificação nativa ao iniciar o acompanhamento
    ensureNotificationPermission();
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.data?.id === activeRequest.id) {
        base44.entities.ServiceRequest.get(activeRequest.id).then((updated) => {
          setActiveRequest(updated);
          if (updated.status === "accepted" && step === 3) {
            goToStep(4);
          }
          if (updated.status === "on_the_way" && step === 4) {
            goToStep(5);
          }
          // Chaveiro registrou o final do serviço → cliente paga
          if (updated.end_photos?.length > 0 && step === 5) {
            goToStep(6);
          }
          // Chaveiro finaliza o serviço (após pagamento) → avaliação
          if (updated.status === "completed" && step === 6) {
            goToStep(7);
          }

          // Notificação: chaveiro iniciou o deslocamento
          if (updated.status === "on_the_way" && !notifiedMoving.current) {
            notifiedMoving.current = true;
            notifyClient(
              "Chaveiro a caminho!",
              `${selectedLocksmith?.name || "O chaveiro"} iniciou o deslocamento até você.`
            );
            toast({
              title: "🚗 Chaveiro a caminho!",
              description: `${selectedLocksmith?.name || "O chaveiro"} saiu em direção ao seu endereço.`,
            });
          }

          // Notificação: chaveiro a menos de 1 km de distância
          if (
            updated.locksmith_lat &&
            updated.customer_lat &&
            !notifiedNearby.current
          ) {
            const dist = haversineKm(
              { lat: updated.locksmith_lat, lng: updated.locksmith_lng },
              { lat: updated.customer_lat, lng: updated.customer_lng }
            );
            if (dist <= 1 && dist >= 0) {
              notifiedNearby.current = true;
              notifyClient(
                "Seu chaveiro está chegando!",
                `Ele está a menos de 1 km do seu endereço.`
              );
              toast({
                title: "📍 Seu chaveiro está chegando!",
                description: "A menos de 1 km de distância. Prepare-se para recebê-lo.",
              });
            }
          }

          // Notificação: chaveiro chegou ao local
          if (updated.locksmith_arrived && !notifiedArrived.current) {
            notifiedArrived.current = true;
            notifyClient("Chaveiro chegou!", `${selectedLocksmith?.name || "O chaveiro"} chegou ao seu endereço. Confirme a chegada.`);
            toast({ title: "📍 Chaveiro chegou!", description: "Confirme a chegada para liberar o início do serviço." });
          }

          // Notificação: chaveiro registrou o final do serviço (hora de confirmar e pagar)
          if (updated.end_photos?.length > 0 && !notifiedEnd.current) {
            notifiedEnd.current = true;
            notifyClient("Serviço concluído!", "O chaveiro finalizou o atendimento. Confirme e efetue o pagamento.");
            toast({ title: "✅ Serviço concluído!", description: "Confirme o serviço e efetue o pagamento." });
          }
          // Notificação: chaveiro finalizou o serviço (pagamento confirmado)
          if (updated.status === "completed" && !notifiedCompleted.current) {
            notifiedCompleted.current = true;
            notifyClient("Tudo certo!", "Serviço finalizado. Avalie o atendimento.");
          }
        });
      }
    });
    return unsub;
  }, [activeRequest?.id, step, selectedLocksmith]);

  // Busca a rota real de carro entre o chaveiro e o cliente (OSRM)
  useEffect(() => {
    if (step < 4 || !activeRequest) return;
    const from = { lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng };
    const to = { lat: activeRequest.customer_lat, lng: activeRequest.customer_lng };
    if (!from.lat || !to.lat) return;
    setRoutePath(null);
    setRouteEta(null);
    fetchDrivingRoute(from, to).then((r) => {
      if (r) {
        setRoutePath(r.coordinates);
        setRouteEta(etaMinutes(r.duration));
      }
    });
  }, [step, activeRequest?.locksmith_lat, activeRequest?.locksmith_lng, activeRequest?.customer_lat, activeRequest?.customer_lng]);

  const handleAdvance = () => {
    if (!activeRequest) return;
    // O cliente só confirma que o chaveiro está a caminho; a conclusão do serviço
    // é controlada pelo chaveiro, após o pagamento.
    if (activeRequest.status === "accepted") {
      base44.entities.ServiceRequest.update(activeRequest.id, { status: "on_the_way" }).then(setActiveRequest);
    }
  };

  const handleRate = async (n, comment = "") => {
    const updated = await base44.entities.ServiceRequest.update(activeRequest.id, {
      rating: n,
      review: comment,
    });
    setActiveRequest(updated);
    // Envia o resumo do serviço por email ao cliente (após pagamento e avaliação)
    try {
      await base44.functions.invoke("sendServiceCompletionEmail", {
        service_request_id: activeRequest.id,
      });
    } catch (e) {
      /* não bloqueia o fluxo se o email falhar */
    }
  };

  // Cliente confirma que o chaveiro chegou ao local
  const handleConfirmArrival = async () => {
    if (!activeRequest) return;
    await base44.entities.ServiceRequest.update(activeRequest.id, { client_arrived_confirmed: true });
    setActiveRequest((prev) => ({ ...prev, client_arrived_confirmed: true }));
  };

  // Cliente confirma que o serviço foi finalizado (libera o pagamento)
  const handleConfirmService = async () => {
    if (!activeRequest) return;
    await base44.entities.ServiceRequest.update(activeRequest.id, { client_confirmed: true });
    setActiveRequest((prev) => ({ ...prev, client_confirmed: true }));
  };

  const handleCancel = async () => {
    if (!activeRequest) return;
    // Não permite cancelar após o chaveiro chegar ou iniciar o atendimento
    const arrived = activeRequest.locksmith_arrived || (activeRequest.start_photos?.length > 0);
    if (arrived) {
      toast({ title: "Não é possível cancelar", description: "O chaveiro já chegou no local. Aguarde a finalização do serviço.", variant: "destructive" });
      return;
    }
    const started = activeRequest.status === "accepted" || activeRequest.status === "on_the_way";
    if (started) {
      // Janela grátis: cancelamento sem custo nos primeiros 5 min após o aceite
      const acceptedAt = activeRequest.accepted_at ? new Date(activeRequest.accepted_at).getTime() : null;
      const withinFreeWindow =
        acceptedAt != null && Date.now() - acceptedAt < CANCELLATION_THRESHOLD_MINUTES * 60 * 1000;
      if (withinFreeWindow) {
        try {
          await base44.entities.ServiceRequest.update(activeRequest.id, { status: "cancelled" });
          handleNewRequest();
        } catch (e) {
          toast({ title: "Falha ao cancelar", description: e.message || "Tente novamente", variant: "destructive" });
        }
        return;
      }
      // Após 5 min: abre a confirmação da taxa de cancelamento (paga online)
      const c = calculateCancellationFee(activeRequest.price);
      setCancelFeeData(c);
      setCancelConfirmOpen(true);
      return;
    }
    // Antes do aceite: cancela livremente
    try {
      await base44.entities.ServiceRequest.update(activeRequest.id, { status: "cancelled" });
      handleNewRequest();
    } catch (e) {
      toast({ title: "Falha ao cancelar", description: e.message || "Tente novamente", variant: "destructive" });
    }
  };

  const handleNewRequest = () => {
    goToStep(1);
    setServiceId("");
    setAddress("");
    setDescription("");
    setUrgency("normal");
    setSelectedOptions([]);
    setCustomAddons({});
    setVehicleInfo({ model: "", year: "", complexity: "simples" });
    setKeyValue(null);
    setSearching(false);
    setSearchError("");
    setSelectedLocksmith(null);
    setActiveRequest(null);
    setSearchError("");
    setPaying(false);
    setCancelFeeData(null);
    setRoutePath(null);
    setRouteEta(null);
    notifiedMoving.current = false;
    notifiedNearby.current = false;
    notifiedEnd.current = false;
    notifiedCompleted.current = false;
  };

  const showAppFlow = module === "app" || step > 1 || activeRequest;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="mb-8 fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src="https://media.base44.com/images/public/6a975d266a8000184833026a/dd1b4ee70_ChatGPTImage3desetde202614_01_55.png"
            alt="Chaveiro Já"
            fittingType="fit"
            className="w-11 h-11 rounded-xl"
          />
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">Chaveiro Já</h1>
            <p className="text-sm text-muted-foreground">Chaveiros de confiança a um toque</p>
          </div>
        </div>
      </div>

      {step === 1 && !activeRequest && (
        <ModuleSelector module={module} setModule={setModule} />
      )}

      {showAppFlow && (
        <StepProgress step={step} total={7} />
      )}

      {/* Step 1: Serviço */}
      {step === 1 && showAppFlow && (
        <div className="space-y-5 step-enter">
          <PointsProgressCard loyalty={loyalty} />
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Qual serviço você precisa?</h2>
            <p className="text-sm text-muted-foreground">Selecione o tipo de atendimento</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_CATALOG.map((s) => (
              <ServiceCard key={s.id} service={s} selected={serviceId === s.id} onClick={() => setServiceId(s.id)} />
            ))}
          </div>
          <Button onClick={() => goToStep(2)} disabled={!serviceId} size="lg" className="w-full">
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Modo Livre: mapa interativo com chaveiros online */}
      {!showAppFlow && (
        <div className="space-y-4 fade-in-up">
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50">
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-5 h-5 text-emerald-600" />
              <h2 className="font-heading font-semibold text-lg text-foreground">Modo Livre</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Navegue pelo mapa, encontre chaveiros online perto de você e converse diretamente com o profissional para combinar o serviço.
            </p>
          </div>
          <LiveLocksmithsMap customerLoc={customerLoc} livreOnly />
        </div>
      )}

      {/* Step 2: Configuração + preço */}
      {step === 2 && service && (
        <div className="space-y-5 step-enter">
          {service.isCarKey ? (
            <CarKeyConfig
              service={service}
              vehicleInfo={vehicleInfo}
              setVehicleInfo={setVehicleInfo}
              address={address}
              setAddress={setAddress}
              onAddressSelect={handleAddressSelect}
              description={description}
              setDescription={setDescription}
              keyValue={keyValue}
              searching={searching}
              searchError={searchError}
              onSearch={handleSearchKey}
              price={null}
            />
          ) : (
            <ServiceConfig
              service={service}
              address={address}
              setAddress={setAddress}
              onAddressSelect={handleAddressSelect}
              description={description}
              setDescription={setDescription}
              selectedOptions={selectedOptions}
              toggleOption={toggleOption}
              customAddons={customAddons}
              setCustomAddon={setCustomAddon}
              vehicleInfo={vehicleInfo}
              setVehicleInfo={setVehicleInfo}
              price={price}
            />
          )}

          {/* Fatores dinâmicos de precificação (oferta/demanda, região, bairro, distância) */}
          {price && nearestDistance != null && (
            <DynamicPriceFactors price={price} nearestDistance={nearestDistance} />
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Urgência</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUrgency("normal")}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  urgency === "normal" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setUrgency("urgent")}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  urgency === "urgent" ? "border-red-500 bg-red-50 text-red-600" : "border-border text-muted-foreground"
                }`}
              >
                <Zap className="w-4 h-4" /> Urgente
              </button>
            </div>
          </div>

          <ErrorBanner message={searchError} />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => goToStep(1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button onClick={handleConfirmConfig} disabled={!address || submitting || (service?.isCarKey && !keyValue)} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
              Solicitar chaveiro
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Procurando / tocando no chaveiro */}
      {step === 3 && activeRequest && (
        <div className="space-y-5 text-center step-enter">
          <div className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-primary animate-bounce" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
              Tocando no chaveiro mais próximo...
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedLocksmith?.name} · {service?.label}
            </p>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Aguardando o profissional aceitar
            </div>
          </div>
          <Button variant="outline" onClick={handleCancel} className="w-full">
            Cancelar solicitação
          </Button>
        </div>
      )}

      {/* Step 4: Pedido em andamento (chaveiro aceitou) */}
      {step === 4 && activeRequest && activeRequest.status === "accepted" && (
        <div className="space-y-5 step-enter">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
              Chaveiro aceitou seu pedido!
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {selectedLocksmith?.name} · {service?.label}
            </p>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Status: Em Andamento
            </span>
          </div>

          <LightMap
            center={{ lat: activeRequest.customer_lat, lng: activeRequest.customer_lng }}
            height={300}
            markers={[
              { id: "c", lat: activeRequest.customer_lat, lng: activeRequest.customer_lng, type: "customer", label: "Você" },
              { id: "l", lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng, type: "locksmith", label: selectedLocksmith?.name?.split(" ")[0] },
            ]}
            route={{ from: { lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng }, to: { lat: activeRequest.customer_lat, lng: activeRequest.customer_lng } }}
            routePath={routePath}
            eta={routeEta}
          />

          <LocksmithMiniProfile locksmith={selectedLocksmith} />
          <div className="flex gap-2">
            <Button onClick={() => { handleAdvance(); goToStep(5); }} size="lg" className="flex-1">
              Acompanhar no mapa <Navigation className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/acompanhamento/${activeRequest.id}`)}
              size="lg"
              className="flex-1"
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Rota + Chat
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Acompanhamento em tempo real */}
      {step === 5 && activeRequest && (
        <div className="space-y-5 step-enter">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" /> Acompanhando serviço
            </h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {activeRequest.address}</p>
          </div>

          {activeRequest.locksmith_arrived && !activeRequest.client_arrived_confirmed && (
            <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="w-5 h-5" />
                <p className="font-medium text-sm">O chaveiro chegou ao local!</p>
              </div>
              <p className="text-xs text-muted-foreground">Confirme a chegada para que o chaveiro inicie o atendimento.</p>
              <Button onClick={handleConfirmArrival} className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar chegada do chaveiro
              </Button>
            </div>
          )}

          <LightMap
            center={{ lat: activeRequest.customer_lat, lng: activeRequest.customer_lng }}
            height={320}
            markers={[
              { id: "c", lat: activeRequest.customer_lat, lng: activeRequest.customer_lng, type: "customer", label: "Você" },
              { id: "l", lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng, type: "locksmith", label: selectedLocksmith?.name?.split(" ")[0], active: activeRequest.status === "on_the_way" },
            ]}
            route={
              activeRequest.status !== "completed"
                ? { from: { lat: activeRequest.locksmith_lat, lng: activeRequest.locksmith_lng }, to: { lat: activeRequest.customer_lat, lng: activeRequest.customer_lng } }
                : null
            }
            routePath={routePath}
            eta={routeEta}
          />

          <RequestTracking
            request={activeRequest}
            locksmith={selectedLocksmith}
            onAdvance={handleAdvance}
            onRate={handleRate}
            onCall={(l) => (window.location.href = `tel:${l.phone}`)}
          />

          <Button
            variant="outline"
            onClick={() => navigate(`/acompanhamento/${activeRequest.id}`)}
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Ver rota e conversar com o chaveiro
          </Button>

          {activeRequest.status !== "completed" && !activeRequest.locksmith_arrived && !activeRequest.start_photos?.length && (
            <Button onClick={handleCancel} variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
              Cancelar serviço
            </Button>
          )}

          {activeRequest.status === "completed" && (
            <Button onClick={handleNewRequest} variant="outline" className="w-full">
              Solicitar novo serviço
            </Button>
          )}
        </div>
      )}

      {/* Step 6: Pagamento (após o chaveiro registrar o final do serviço) */}
      {step === 6 && activeRequest && activeRequest.end_photos?.length > 0 && activeRequest.status !== "completed" && (
        <div className="space-y-3 step-enter">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Serviço concluído!</h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {selectedLocksmith?.name}</p>
          </div>

          {!activeRequest.client_confirmed ? (
            <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
              <p className="text-sm font-medium text-foreground text-center">O chaveiro registrou a finalização do serviço. Confirme para prosseguir ao pagamento.</p>
              <div className="flex gap-2">
                <Button onClick={handleConfirmService} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirmar serviço
                </Button>
                <Button variant="outline" onClick={() => navigate(`/acompanhamento/${activeRequest.id}`)} className="flex-1">
                  <MessageCircle className="w-4 h-4 mr-1.5" /> Falar com chaveiro
                </Button>
              </div>
            </div>
          ) : activeRequest.payment_method === "dinheiro" && !activeRequest.cash_received ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Loader2 className="w-7 h-7 text-amber-600 animate-spin" />
              </div>
              <h3 className="font-heading font-semibold text-base text-foreground mb-1">
                Aguardando recebimento em dinheiro
              </h3>
              <p className="text-sm text-muted-foreground">
                O chaveiro irá confirmar o recebimento de <strong className="text-foreground">R$ {activeRequest.price?.toFixed(2)}</strong> em dinheiro.
              </p>
            </div>
          ) : activeRequest.payment_status === "paid" ? (
            <div className="flex flex-col items-center text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-1">
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-foreground mb-1">
                  Pagamento confirmado!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aguardando o chaveiro finalizar o serviço.
                </p>
              </div>
              <div className="w-full max-w-xs">
                <ReceiptButton
                  serviceRequest={activeRequest}
                  locksmith={selectedLocksmith}
                  customerName={customerName}
                />
              </div>
            </div>
          ) : (
            <PaymentStep
              amount={activeRequest.price}
              description={`${activeRequest.service_type} - ${activeRequest.address}`}
              locksmithId={selectedLocksmith?.id}
              processing={paying}
              onConfirm={handleServicePayment}
              onBack={handleNewRequest}
            />
          )}
          <ErrorBanner message={searchError} />
        </div>
      )}

      {/* Step 7: Avaliação final (após o chaveiro finalizar o serviço) */}
      {step === 7 && activeRequest && activeRequest.status === "completed" && (
        <div className="space-y-5 step-enter">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Pagamento confirmado!</h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {selectedLocksmith?.name}</p>
          </div>

          <LocksmithMiniProfile locksmith={selectedLocksmith} />

          <div className="p-4 rounded-2xl border border-border bg-card">
            <p className="text-center text-sm font-medium text-foreground mb-3">Avalie o atendimento do chaveiro</p>
            <ReviewForm
              locksmithId={selectedLocksmith?.id}
              locksmithName={selectedLocksmith?.name}
              serviceType={activeRequest.service_type}
              workMode={selectedLocksmith?.work_mode}
              onSubmitted={(r) => handleRate(r)}
            />
          </div>

          <ReceiptButton
            serviceRequest={activeRequest}
            locksmith={selectedLocksmith}
            customerName={customerName}
          />

          <Button onClick={handleNewRequest} variant="outline" className="w-full">
            Solicitar novo serviço
          </Button>
        </div>
      )}

      {/* Tela de pagamento da taxa de cancelamento */}
      {cancelFeeData && activeRequest && (
        <div className="space-y-3 step-enter">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Taxa de cancelamento</h2>
            <p className="text-sm text-muted-foreground">
              O chaveiro já havia aceitado seu pedido. Pague a taxa de cancelamento para liberar novos pedidos.
            </p>
          </div>
          <PaymentStep
            amount={cancelFeeData.fee}
            description={`Taxa de cancelamento - ${activeRequest.service_type}`}
            locksmithId={selectedLocksmith?.id}
            processing={paying}
            onConfirm={handleCancelFeePayment}
            onBack={handleNewRequest}
            onlineOnly
          />
          <ErrorBanner message={searchError} />
        </div>
      )}

      {/* Confirmação nativa da taxa de cancelamento (window.confirm não funciona em WebView) */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar taxa de cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              O chaveiro já aceitou seu pedido e está a caminho. Será cobrada uma taxa de cancelamento de 25% (R$ {cancelFeeData?.fee.toFixed(2)}), paga apenas online (cartão). Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelFeeData(null)}>Não, voltar</AlertDialogCancel>
            <AlertDialogAction>Sim, pagar taxa e cancelar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}