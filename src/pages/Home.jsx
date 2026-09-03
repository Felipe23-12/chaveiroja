import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ArrowLeft, Zap, Bell, Loader2, Navigation, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG, calculatePrice, calculateCarKeyPrice, CAR_KEY_LABOR, CAR_KEY_COST_PER_KM, calculateCancellationFee, CANCELLATION_THRESHOLD_MINUTES, calculateLongDistanceFee } from "@/lib/pricing";
import { searchCarKeyValue } from "@/lib/carKey";
import ServiceCard from "@/components/locksmith/ServiceCard";
import ServiceConfig from "@/components/locksmith/ServiceConfig";
import CarKeyConfig from "@/components/locksmith/CarKeyConfig";
import RequestTracking from "@/components/locksmith/RequestTracking";
import LiveLocksmithsMap from "@/components/locksmith/LiveLocksmithsMap";
import ModuleSelector from "@/components/locksmith/ModuleSelector";
import LocksmithMiniProfile from "@/components/locksmith/LocksmithMiniProfile";
import ReviewForm from "@/components/locksmith/ReviewForm";
import MapView from "@/components/map/MapView";
import { DEFAULT_CENTER, getCustomerLocation, haversineKm, fetchDrivingRoute, etaMinutes } from "@/lib/geo";
import { getClientLoyalty, applyLoyaltyDiscount } from "@/lib/loyalty";
import PointsProgressCard from "@/components/locksmith/PointsProgressCard";
import PaymentStep from "@/components/payment/PaymentStep";
import { createPaymentRecord, confirmPaymentPaid } from "@/lib/payments";
import { Image } from "@/components/ui/image";
import StepTransition from "@/components/ui/StepTransition";
import StepProgress from "@/components/ui/StepProgress";
import ErrorBanner from "@/components/ui/ErrorBanner";
import LoadingCard from "@/components/ui/LoadingCard";

export default function Home() {
  const [step, setStep] = useState(1);
  const [module, setModule] = useState("app");
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
  const [activeRequest, setActiveRequest] = useState(null);
  const [selectedLocksmith, setSelectedLocksmith] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loyalty, setLoyalty] = useState(null);
  const [paying, setPaying] = useState(false);
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [cancelFeeData, setCancelFeeData] = useState(null);
  const reqRef = useRef(null);

  const service = useMemo(() => SERVICE_CATALOG.find((s) => s.id === serviceId), [serviceId]);

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

  const price = useMemo(() => {
    if (!service) return null;
    const kmFee = nearestDistance != null ? calculateLongDistanceFee(nearestDistance) : 0;
    if (service.isCarKey) {
      return calculateCarKeyPrice({ keyValue: keyValue || 0, distanceKm: 0, extraCost: 0 });
    }
    const basePrice = calculatePrice({
      service,
      selectedOptions,
      customAddons,
      vehicleInfo,
      locksmithsAvailable: appLocksmiths.length || 5,
      urgency,
    });
    if (basePrice && kmFee > 0) {
      basePrice.breakdown.push({
        label: `Taxa de distância (${nearestDistance.toFixed(1)} km × R$ 0,90)`,
        value: kmFee,
      });
      basePrice.total = Math.round((basePrice.total + kmFee) * 100) / 100;
    }
    return basePrice;
  }, [service, selectedOptions, customAddons, vehicleInfo, appLocksmiths.length, urgency, keyValue, nearestDistance]);

  useEffect(() => {
    getCustomerLocation().then(setCustomerLoc);
    base44.entities.Locksmith.filter({ work_mode: "app", available: true }).then(setAppLocksmiths);
    base44.auth.me()
      .then((u) => getClientLoyalty(u.id))
      .then(setLoyalty)
      .catch(() => setLoyalty(null));
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
        const carPrice = calculateCarKeyPrice({ keyValue: keyValue || 0, distanceKm: nearest.d, extraCost: 0 });
        const basePrice = carPrice.total;
        const disc = useDiscount ? applyLoyaltyDiscount(basePrice) : { amount: 0, final: basePrice };
        req = await base44.entities.ServiceRequest.create({
          ...base,
          price: disc.final,
          key_value: carPrice.keyValue,
          labor_cost: carPrice.laborCost,
          locomotion_cost: carPrice.locomotion,
          distance_km: carPrice.distanceKm,
          extra_cost: 0,
          discount_applied: useDiscount,
          discount_amount: disc.amount,
        });
      } else {
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
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  // Cliente confirma que o chaveiro finalizou o serviço
  const handleClientConfirm = async () => {
    if (!activeRequest) return;
    await base44.entities.ServiceRequest.update(activeRequest.id, { client_confirmed: true });
    setActiveRequest((prev) => ({ ...prev, client_confirmed: true }));
  };

  // Pagamento confirmado via Stripe após a conclusão do serviço
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
      setStep(8);
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
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.data?.id === activeRequest.id) {
        base44.entities.ServiceRequest.get(activeRequest.id).then((updated) => {
          setActiveRequest(updated);
          if (updated.status === "accepted" && step === 3) {
            setStep(4);
          }
          if (updated.status === "on_the_way" && step === 4) {
            setStep(5);
          }
          if (updated.status === "completed" && step === 5) {
            setStep(6);
          }
          if (updated.locksmith_confirmed && step === 6) {
            setStep(7);
          }
          if (updated.cash_received && step === 7) {
            setStep(8);
          }
        });
      }
    });
    return unsub;
  }, [activeRequest?.id, step]);

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
    const next = activeRequest.status === "accepted" ? "on_the_way" : "completed";
    base44.entities.ServiceRequest.update(activeRequest.id, { status: next }).then(setActiveRequest);
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

  const handleCancel = async () => {
    if (!activeRequest) return;
    const isApp = selectedLocksmith?.work_mode === "app";
    const postConfirmation =
      isApp &&
      activeRequest.accepted_at &&
      (activeRequest.status === "accepted" || activeRequest.status === "on_the_way");

    // Se o chaveiro já aceitou e passou do tempo limite, cobra taxa de cancelamento
    if (postConfirmation) {
      const elapsedMin = (Date.now() - new Date(activeRequest.accepted_at).getTime()) / 60000;
      if (elapsedMin >= CANCELLATION_THRESHOLD_MINUTES) {
        const c = calculateCancellationFee(activeRequest.price);
        const ok = window.confirm(
          `Cancelamento após ${CANCELLATION_THRESHOLD_MINUTES} minutos da confirmação do chaveiro.\n\n` +
          `Será cobrada uma taxa de 25% sobre o valor do serviço (R$ ${c.fee.toFixed(2)}).\n\nDeseja continuar?`
        );
        if (!ok) return;
        // Mostra a tela de pagamento da taxa de cancelamento
        setCancelFeeData(c);
        return;
      }
    }

    // Sem taxa: apenas cancela
    await base44.entities.ServiceRequest.update(activeRequest.id, { status: "cancelled" });
    handleNewRequest();
  };

  const handleNewRequest = () => {
    setStep(1);
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
  };

  const showAppFlow = module === "app" || step > 1 || activeRequest;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="mb-8 fade-in-up">
        <div className="flex items-center gap-2 mb-2">
          <Image
            src="https://media.base44.com/images/public/6a975d266a8000184833026a/9589e6a99_generated_image.png"
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
        <StepProgress step={step} total={8} />
      )}

      {/* Step 1: Serviço */}
      {step === 1 && showAppFlow && (
        <div className="space-y-5 step-enter">
          <PointsProgressCard loyalty={loyalty} />
          <LiveLocksmithsMap customerLoc={customerLoc} />
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Qual serviço você precisa?</h2>
            <p className="text-sm text-muted-foreground">Selecione o tipo de atendimento</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_CATALOG.map((s) => (
              <ServiceCard key={s.id} service={s} selected={serviceId === s.id} onClick={() => setServiceId(s.id)} />
            ))}
          </div>
          <Button onClick={() => setStep(2)} disabled={!serviceId} size="lg" className="w-full">
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Modo Livre: mapa interativo com chaveiros online */}
      {!showAppFlow && <LiveLocksmithsMap customerLoc={customerLoc} />}

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
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
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

          <MapView
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
          <Button onClick={() => { handleAdvance(); setStep(5); }} size="lg" className="w-full">
            Acompanhar no mapa <Navigation className="w-4 h-4 ml-2" />
          </Button>
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

          <MapView
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

          {activeRequest.status !== "completed" && (
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

      {/* Step 6: Cliente confirma que o chaveiro finalizou o serviço */}
      {step === 6 && activeRequest && activeRequest.status === "completed" && (
        <div className="space-y-5 step-enter">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Serviço concluído!</h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {selectedLocksmith?.name}</p>
          </div>

          <LocksmithMiniProfile locksmith={selectedLocksmith} />

          {!activeRequest.client_confirmed ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Confirme que o chaveiro finalizou o atendimento para prosseguir com o pagamento.
              </p>
              <Button onClick={handleClientConfirm} size="lg" className="w-full">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar serviço
              </Button>
            </div>
          ) : !activeRequest.locksmith_confirmed ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                <Loader2 className="w-7 h-7 text-amber-600 animate-spin" />
              </div>
              <h3 className="font-heading font-semibold text-base text-foreground mb-1">
                Aguardando confirmação do chaveiro
              </h3>
              <p className="text-sm text-muted-foreground">
                O profissional foi notificado e precisa confirmar a finalização para liberar o pagamento.
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Step 7: Pagamento (após confirmação do chaveiro) */}
      {step === 7 && activeRequest && activeRequest.locksmith_confirmed && (
        <div className="space-y-3 step-enter">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Serviço confirmado!</h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {selectedLocksmith?.name}</p>
          </div>

          {activeRequest.payment_method === "dinheiro" && !activeRequest.cash_received ? (
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

      {/* Step 8: Avaliação final */}
      {step === 8 && activeRequest && (
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
          />
          <ErrorBanner message={searchError} />
        </div>
      )}
    </div>
  );
}