import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, ArrowRight, ArrowLeft, Loader2, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SERVICE_CATALOG, calculatePrice } from "@/lib/pricing";
import ServiceCard from "@/components/locksmith/ServiceCard";
import ServiceConfig from "@/components/locksmith/ServiceConfig";
import LocksmithCard from "@/components/locksmith/LocksmithCard";
import RequestTracking from "@/components/locksmith/RequestTracking";

export default function Home() {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [customAddons, setCustomAddons] = useState({});
  const [vehicleInfo, setVehicleInfo] = useState({ model: "", year: "", complexity: "simples" });

  const [locksmiths, setLocksmiths] = useState([]);
  const [loadingLocksmiths, setLoadingLocksmiths] = useState(false);
  const [selectedLocksmith, setSelectedLocksmith] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const service = useMemo(() => SERVICE_CATALOG.find((s) => s.id === serviceId), [serviceId]);

  // Preço calculado (modo app)
  const price = useMemo(() => {
    if (!service) return null;
    return calculatePrice({
      service,
      selectedOptions,
      customAddons,
      vehicleInfo,
      locksmithsAvailable: locksmiths.length || 5,
    });
  }, [service, selectedOptions, customAddons, vehicleInfo, locksmiths.length]);

  useEffect(() => {
    if (step === 3 && locksmiths.length === 0) {
      setLoadingLocksmiths(true);
      base44.entities.Locksmith.filter({ available: true }, "distance_km")
        .then(setLocksmiths)
        .finally(() => setLoadingLocksmiths(false));
    }
  }, [step]);

  const toggleOption = (optId) => {
    setSelectedOptions((prev) =>
      prev.includes(optId) ? prev.filter((o) => o !== optId) : [...prev, optId]
    );
  };

  const setCustomAddon = (optId, value) => {
    setCustomAddons((prev) => ({ ...prev, [optId]: value }));
  };

  const handleConfirmConfig = () => {
    if (!address) return;
    setStep(3);
  };

  // Preço final exibido para cada chaveiro (livre = preço próprio; app = calculado)
  const getOfferedPrice = (locksmith) => {
    if (locksmith.work_mode === "livre" && locksmith.custom_price_base) {
      const addons = price?.addons || 0;
      return locksmith.custom_price_base + addons;
    }
    return price?.total || 0;
  };

  const handleSelectLocksmith = (l) => {
    if (submitting) return;
    setSelectedLocksmith(l);
    setSubmitting(true);
    const finalPrice = getOfferedPrice(l);
    base44.entities.ServiceRequest.create({
      service_type: service.label,
      address,
      description,
      urgency,
      status: "accepted",
      locksmith_id: l.id,
      locksmith_name: l.name,
      price: finalPrice,
    })
      .then((req) => setActiveRequest(req))
      .finally(() => {
        setSubmitting(false);
        setStep(4);
      });
  };

  const handleAdvance = () => {
    if (!activeRequest) return;
    const next = activeRequest.status === "accepted" ? "on_the_way" : "completed";
    base44.entities.ServiceRequest.update(activeRequest.id, { status: next }).then((updated) =>
      setActiveRequest(updated)
    );
  };

  const handleRate = (n) => {
    base44.entities.ServiceRequest.update(activeRequest.id, { rating: n }).then((updated) =>
      setActiveRequest(updated)
    );
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
    setSelectedLocksmith(null);
    setActiveRequest(null);
    setLocksmiths([]);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-foreground">ChaveiroJá</h1>
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

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button onClick={handleConfirmConfig} disabled={!address} className="flex-1">
              Buscar chaveiros <Search className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Selecionar chaveiro */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Chaveiros disponíveis</h2>
            <p className="text-sm text-muted-foreground">
              {service?.label} · valor ofertado R$ {price?.total.toFixed(2)}
            </p>
          </div>

          {loadingLocksmiths ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Buscando profissionais...</p>
            </div>
          ) : locksmiths.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Nenhum chaveiro disponível no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locksmiths.map((l) => (
                <LocksmithCard
                  key={l.id}
                  locksmith={l}
                  selected={selectedLocksmith?.id === l.id}
                  onSelect={() => handleSelectLocksmith(l)}
                  offeredPrice={getOfferedPrice(l)}
                />
              ))}
            </div>
          )}

          <Button variant="outline" onClick={() => setStep(2)} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      )}

      {/* Step 4: Acompanhamento */}
      {step === 4 && activeRequest && (
        <div className="space-y-5">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Acompanhando serviço</h2>
            <p className="text-sm text-muted-foreground">{activeRequest.service_type} · {activeRequest.address}</p>
          </div>

          <RequestTracking
            request={activeRequest}
            locksmith={selectedLocksmith}
            onAdvance={handleAdvance}
            onRate={handleRate}
            onCall={(l) => (window.location.href = `tel:${l.phone}`)}
          />

          {activeRequest.status === "completed" && activeRequest.rating && (
            <Button onClick={handleNewRequest} variant="outline" className="w-full">
              Solicitar novo serviço
            </Button>
          )}
        </div>
      )}

      {step === 4 && !activeRequest && submitting && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Confirmando seu pedido...</p>
        </div>
      )}
    </div>
  );
}