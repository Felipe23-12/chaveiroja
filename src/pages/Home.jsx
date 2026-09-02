import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ArrowLeft, Zap, Bell, Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_CATALOG, calculatePrice, calculateCarKeyPrice, CAR_KEY_LABOR, CAR_KEY_COST_PER_KM } from "@/lib/pricing";
import { searchCarKeyValue } from "@/lib/carKey";
import ServiceCard from "@/components/locksmith/ServiceCard";
import ServiceConfig from "@/components/locksmith/ServiceConfig";
import CarKeyConfig from "@/components/locksmith/CarKeyConfig";
import RequestTracking from "@/components/locksmith/RequestTracking";
import MapView from "@/components/map/MapView";
import { DEFAULT_CENTER, getCustomerLocation, haversineKm } from "@/lib/geo";
import { Image } from "@/components/ui/image";

export default function Home() {
  const [step, setStep] = useState(1);
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
  const reqRef = useRef(null);

  const service = useMemo(() => SERVICE_CATALOG.find((s) => s.id === serviceId), [serviceId]);

  const price = useMemo(() => {
    if (!service) return null;
    if (service.isCarKey) {
      return calculateCarKeyPrice({ keyValue: keyValue || 0, distanceKm: 0, extraCost: 0 });
    }
    return calculatePrice({
      service,
      selectedOptions,
      customAddons,
      vehicleInfo,
      locksmithsAvailable: appLocksmiths.length || 5,
    });
  }, [service, selectedOptions, customAddons, vehicleInfo, appLocksmiths.length, keyValue]);

  useEffect(() => {
    getCustomerLocation().then(setCustomerLoc);
    base44.entities.Locksmith.filter({ work_mode: "app", available: true }).then(setAppLocksmiths);
  }, []);

  const toggleOption = (optId) => {
    setSelectedOptions((prev) =>
      prev.includes(optId) ? prev.filter((o) => o !== optId) : [...prev, optId]
    );
  };

  const setCustomAddon = (optId, value) => {
    setCustomAddons((prev) => ({ ...prev, [optId]: value }));
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
  const handleConfirmConfig = async () => {
    if (!address || submitting) return;
    setSubmitting(true);
    setSearchError("");
    try {
      const nearest = [...appLocksmiths]
        .map((l) => ({ l, d: haversineKm(customerLoc, { lat: l.lat, lng: l.lng }) }))
        .sort((a, b) => a.d - b.d)[0];

      if (!nearest) {
        setSearchError("Nenhum chaveiro disponível no modo aplicativo agora. Tente novamente.");
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

      let req;
      if (service.isCarKey) {
        const carPrice = calculateCarKeyPrice({ keyValue: keyValue || 0, distanceKm: nearest.d, extraCost: 0 });
        req = await base44.entities.ServiceRequest.create({
          ...base,
          price: carPrice.total,
          key_value: carPrice.keyValue,
          labor_cost: carPrice.laborCost,
          locomotion_cost: carPrice.locomotion,
          distance_km: carPrice.distanceKm,
          extra_cost: 0,
        });
      } else {
        req = await base44.entities.ServiceRequest.create({ ...base, price: price?.total || 0 });
      }
      setSelectedLocksmith(nearest.l);
      setActiveRequest(req);
      reqRef.current = req.id;
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  // Assina a solicitação para reagir quando o chaveiro aceitar / se mover
  useEffect(() => {
    if (!activeRequest) return;
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.data?.id === activeRequest.id) {
        base44.entities.ServiceRequest.get(activeRequest.id).then((updated) => {
          setActiveRequest(updated);
          if ((updated.status === "accepted" || updated.status === "on_the_way") && step === 3) {
            setStep(4);
          }
        });
      }
    });
    return unsub;
  }, [activeRequest?.id, step]);

  const handleAdvance = () => {
    if (!activeRequest) return;
    const next = activeRequest.status === "accepted" ? "on_the_way" : "completed";
    base44.entities.ServiceRequest.update(activeRequest.id, { status: next }).then(setActiveRequest);
  };

  const handleRate = (n) => {
    base44.entities.ServiceRequest.update(activeRequest.id, { rating: n }).then(setActiveRequest);
  };

  const handleCancel = async () => {
    if (!activeRequest) return;
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
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="mb-8">
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

      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${step >= n ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      {/* Step 1: Serviço */}
      {step === 1 && (
        <div className="space-y-5">
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

      {/* Step 2: Configuração + preço */}
      {step === 2 && service && (
        <div className="space-y-5">
          {service.isCarKey ? (
            <CarKeyConfig
              service={service}
              vehicleInfo={vehicleInfo}
              setVehicleInfo={setVehicleInfo}
              address={address}
              setAddress={setAddress}
              description={description}
              setDescription={setDescription}
              keyValue={keyValue}
              searching={searching}
              searchError={searchError}
              onSearch={handleSearchKey}
              price={price}
            />
          ) : (
            <ServiceConfig
              service={service}
              address={address}
              setAddress={setAddress}
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

          {searchError && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{searchError}</p>
          )}

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
        <div className="space-y-5 text-center">
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

      {/* Step 4: Acompanhamento em tempo real */}
      {step === 4 && activeRequest && (
        <div className="space-y-5">
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
          />

          <RequestTracking
            request={activeRequest}
            locksmith={selectedLocksmith}
            onAdvance={handleAdvance}
            onRate={handleRate}
            onCall={(l) => (window.location.href = `tel:${l.phone}`)}
          />

          {activeRequest.status === "completed" && (
            <Button onClick={handleNewRequest} variant="outline" className="w-full">
              Solicitar novo serviço
            </Button>
          )}
        </div>
      )}
    </div>
  );
}