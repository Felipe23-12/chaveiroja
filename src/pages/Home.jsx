import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, MapPin, ArrowRight, ArrowLeft, Loader2, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ServiceTypeCard from "@/components/locksmith/ServiceTypeCard";
import LocksmithCard from "@/components/locksmith/LocksmithCard";
import RequestTracking from "@/components/locksmith/RequestTracking";

const serviceTypes = ["Residencial", "Automotivo", "Comercial", "Emergencial"];

export default function Home() {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [locksmiths, setLocksmiths] = useState([]);
  const [loadingLocksmiths, setLoadingLocksmiths] = useState(false);
  const [selectedLocksmith, setSelectedLocksmith] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step === 3 && locksmiths.length === 0) {
      setLoadingLocksmiths(true);
      base44.entities.Locksmith.filter({ available: true }, "distance_km")
        .then((data) => setLocksmiths(data))
        .finally(() => setLoadingLocksmiths(false));
    }
  }, [step]);

  const handleSearch = () => {
    if (!serviceType) return;
    setStep(2);
  };

  const handleConfirmDetails = () => {
    if (!address) return;
    setStep(3);
  };

  const handleSelectLocksmith = (l) => {
    setSelectedLocksmith(l);
    setSubmitting(true);
    base44.entities.ServiceRequest.create({
      service_type: serviceType,
      address,
      description,
      urgency,
      status: "accepted",
      locksmith_id: l.id,
      locksmith_name: l.name,
      price: l.price_per_call,
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
    setServiceType("");
    setAddress("");
    setDescription("");
    setUrgency("normal");
    setSelectedLocksmith(null);
    setActiveRequest(null);
    setLocksmiths([]);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      {/* Header */}
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

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step >= n ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Service type */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Qual serviço você precisa?</h2>
            <p className="text-sm text-muted-foreground">Selecione o tipo de atendimento</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {serviceTypes.map((t) => (
              <ServiceTypeCard key={t} type={t} selected={serviceType === t} onClick={() => setServiceType(t)} />
            ))}
          </div>
          <Button onClick={handleSearch} disabled={!serviceType} size="lg" className="w-full">
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Detalhes do serviço</h2>
            <p className="text-sm text-muted-foreground">Conte-nos onde e o que aconteceu</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Endereço</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123 - Centro"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição (opcional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Perdi a chave de casa, preciso abrir a fechadura..."
                rows={3}
              />
            </div>

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
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            <Button onClick={handleConfirmDetails} disabled={!address} className="flex-1">
              Buscar chaveiros <Search className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Select locksmith */}
      {step === 3 && (
        <div className="space-y-5">
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground">Chaveiros disponíveis</h2>
            <p className="text-sm text-muted-foreground">Próximos a você · {serviceType}</p>
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
                  onSelect={() => (submitting ? null : handleSelectLocksmith(l))}
                />
              ))}
            </div>
          )}

          <Button variant="outline" onClick={() => setStep(2)} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      )}

      {/* Step 4: Tracking */}
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
            onCall={(l) => window.location.href = `tel:${l.phone}`}
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