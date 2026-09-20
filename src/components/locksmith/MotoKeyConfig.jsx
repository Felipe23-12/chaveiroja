import React from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import KeyServicePrice from "@/components/client/KeyServicePrice";
import PriceSummary from "./PriceSummary";
import AddressAutocomplete from "./AddressAutocomplete";
import { MOTO_BRANDS, MOTO_MODELS, MOTO_KEY_TYPES, getMotoModel } from "@/lib/motoKey";
import KeyOriginSelector from "./KeyOriginSelector";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl border-2 text-sm font-medium min-h-[44px] transition-all ${
        active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function MotoKeyConfig({
  service,
  motoInfo,
  setMotoInfo,
  motoRule,
  address,
  setAddress,
  onAddressSelect,
  description,
  setDescription,
  price,
  keyOrigin,
  setKeyOrigin,
  keyCatalog,
  showPriceBeforeAcceptance = false,
  calculationService = null,
  nearestDistance,
  assumedNearby = false,
}) {
  const update = (field, value) => setMotoInfo((v) => ({ ...v, [field]: value }));
  const models = MOTO_MODELS[motoInfo.brandId] || [];
  const model = getMotoModel(motoInfo.brandId, motoInfo.modelId);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">{service.label}</h2>
        <p className="text-sm text-muted-foreground">{service.description}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Marca</label>
        <div className="grid grid-cols-2 gap-3">
          {MOTO_BRANDS.map((b) => (
            <Chip
              key={b.id}
              active={motoInfo.brandId === b.id}
              onClick={() => setMotoInfo((v) => ({ ...v, brandId: b.id, modelId: "" }))}
            >
              {b.label}
            </Chip>
          ))}
        </div>
      </div>

      {motoInfo.brandId && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Modelo</label>
          <div className="grid grid-cols-2 gap-2">
            {models.map((m) => (
              <Chip key={m.id} active={motoInfo.modelId === m.id} onClick={() => update("modelId", m.id)}>
                {m.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {motoInfo.modelId && (
        <>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Ano da moto</label>
            <Input
              type="number"
              placeholder="Ex: 2023"
              value={motoInfo.year || ""}
              onChange={(e) => update("year", e.target.value)}
            />
          </div>

          <KeyOriginSelector value={keyOrigin} onChange={setKeyOrigin} catalog={keyCatalog} keyType={motoInfo.keyType} hidePriceDetails />

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo de chave</label>
            <div className="grid grid-cols-1 gap-2">
              {MOTO_KEY_TYPES.filter((k) => k.id === "simples" || model?.premium).map((k) => (
                <Chip key={k.id} active={motoInfo.keyType === k.id} onClick={() => update("keyType", k.id)}>
                  {k.label}
                </Chip>
              ))}
            </div>
          </div>

          {motoInfo.keyType === "presenca" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Você tem a senha (código) da moto?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Chip active={motoInfo.hasPassword === true} onClick={() => update("hasPassword", true)}>
                  Sim, tenho a senha
                </Chip>
                <Chip active={motoInfo.hasPassword === false} onClick={() => update("hasPassword", false)}>
                  Não tenho
                </Chip>
              </div>
            </div>
          )}
        </>
      )}

      {motoRule?.blocked && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-warning/40 bg-warning/10 text-warning">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-sm">{motoRule.reason}</p>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Endereço</label>
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={onAddressSelect}
          placeholder="Digite seu endereço..."
          allowCurrentLocation
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição (opcional)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: perdi a única chave da moto..."
          rows={2}
        />
      </div>

      {showPriceBeforeAcceptance ? <PriceSummary price={price} service={calculationService || service} showCalculationDetails nearestDistance={nearestDistance} assumedNearby={assumedNearby} /> : <KeyServicePrice pending />}
    </div>
  );
}