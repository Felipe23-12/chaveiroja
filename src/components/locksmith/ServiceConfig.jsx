import React from "react";
import { isMotoSeatOpening, validateOpeningVehicle } from "../../../base44/shared/automotiveOpening";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PriceSummary from "./PriceSummary";
import AddressAutocomplete from "./AddressAutocomplete";
import LocksConfig from "./LocksConfig";
import VehicleMakeModelFields from "./VehicleMakeModelFields";
import { getVehicleYearRange, validateVehicleModelYear } from "../../../base44/shared/vehicleModelYears";
import OpeningConditionQuestions from "@/components/client/OpeningConditionQuestions";
import { isOpeningService } from "@/lib/pricing";
import { useServiceQuoteScope } from '@/components/location/ServiceQuoteScope';

export default function ServiceConfig({
  service,
  address,
  setAddress,
  onAddressSelect,
  description,
  setDescription,
  selectedOptions,
  toggleOption,
  customAddons,
  setCustomAddon,
  vehicleInfo,
  setVehicleInfo,
  locks,
  setLocks,
  brokenKeyInLock,
  setBrokenKeyInLock,
  openingReason,
  setOpeningReason,
  price,
  showCalculationDetails = false,
  calculationService = null,
  nearestDistance,
  assumedNearby = false,
}) {
  const { allowed } = useServiceQuoteScope();
  const seatOpening = service.id === "abertura_automotiva" && isMotoSeatOpening(vehicleInfo);
  const yearRange = seatOpening ? { min: 1900, max: new Date().getFullYear() + 1 } : getVehicleYearRange(vehicleInfo?.make, vehicleInfo?.model);
  const yearCheck = service.id === "abertura_automotiva" ? validateOpeningVehicle(vehicleInfo) : validateVehicleModelYear(vehicleInfo?.make, vehicleInfo?.model, vehicleInfo?.year);
  const vehicleReady = yearCheck.valid && Boolean(
    (vehicleInfo?.make || "").trim() &&
      (vehicleInfo?.model || "").trim() &&
      (vehicleInfo?.year || "").toString().trim()
  );

  const updateVehicle = (field, value) =>
    setVehicleInfo((v) => ({ ...v, [field]: value }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">{service.label}</h2>
        <p className="text-sm text-muted-foreground">{service.description}</p>
      </div>

      {service.id === "abertura_automotiva" && <fieldset className="space-y-2">
        <legend className="text-sm font-medium">O que deseja abrir?</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[{ id: 'car', label: 'Abertura de carro' }, { id: 'moto_seat', label: 'Abertura de banco de moto' }].map(item => <button type="button" key={item.id} aria-pressed={(vehicleInfo.opening_target || 'car') === item.id} className={`rounded-xl border-2 p-3 text-left text-sm ${(vehicleInfo.opening_target || 'car') === item.id ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => { setVehicleInfo({ opening_target: item.id, make: '', model: '', year: '', opening_method: 'simples', factory_seat_opening: null }); setOpeningReason(null); setBrokenKeyInLock(null); }}>{item.label}</button>)}</div>
        {seatOpening && <p className="text-sm text-muted-foreground">Todas as marcas e modelos com banco de abertura original de fábrica. Faixa base: R$ 150 a R$ 300, sujeita aos adicionais do serviço.</p>}
      </fieldset>}
      {isOpeningService(service) && (
        <OpeningConditionQuestions motoSeat={seatOpening} automotive={service.id === "abertura_automotiva"} reason={openingReason} onReasonChange={setOpeningReason} brokenKey={brokenKeyInLock} onBrokenKeyChange={setBrokenKeyInLock} />
      )}

      {/* Fechaduras: quantas portas abrir e quais miolos trocar */}
      {service.hasLocks && <LocksConfig locks={locks} setLocks={setLocks} pricing={price?.serverPricing} />}

      {/* Adicionais */}
      {service.options && service.options.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Adicionais</label>
          <div className="space-y-2">
            {service.options.map((opt) => {
              const checked = selectedOptions.includes(opt.id);
              return (
                <div key={opt.id} className="rounded-xl border border-border bg-white p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(opt.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium text-foreground flex-1">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">Adicional após confirmação</span>
                  </label>
                  {allowed && opt.price === "custom" && checked && (
                    <div className="mt-2 pl-6">
                      <Input
                        type="number"
                        placeholder="Valor do acréscimo"
                        value={customAddons[opt.id] || ""}
                        onChange={(e) => setCustomAddon(opt.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Veículo (automotiva) */}
      {service.needsVehicleInfo && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground block">Dados do veículo</label>
          {seatOpening ? <div className="space-y-3">
            <label className="block text-sm">Montadora<Input value={vehicleInfo.make || ''} maxLength={80} placeholder="Ex.: Honda, Yamaha, BMW" onChange={e => setVehicleInfo(v => ({ ...v, make: e.target.value, model: '', year: '', factory_seat_opening: null }))} /></label>
            <label className="block text-sm">Modelo da moto<Input value={vehicleInfo.model || ''} maxLength={120} placeholder="Ex.: PCX 150, ADV 150" onChange={e => setVehicleInfo(v => ({ ...v, model: e.target.value, year: '', factory_seat_opening: null }))} /></label>
            <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={vehicleInfo.factory_seat_opening === true} onChange={e => updateVehicle('factory_seat_opening', e.target.checked)} />Confirmo que o banco possui abertura original de fábrica.</label>
          </div> : <VehicleMakeModelFields vehicleInfo={vehicleInfo} updateVehicle={updateVehicle} />}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ano-modelo {yearRange?.min ? `(${yearRange.min}–${Math.min(yearRange.max, new Date().getFullYear() + 1)})` : ""}</label>
            <Input
              type="number"
              min={yearRange?.min}
              max={yearRange?.max ? Math.min(yearRange.max, new Date().getFullYear() + 1) : undefined}
              placeholder="Ex: 2021"
              value={vehicleInfo.year || ""}
              onChange={(e) => updateVehicle("year", e.target.value)}
            />
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Versão ou geração (se souber)</label><Input placeholder="Ex.: 1.0 LT, G5, EXL" value={vehicleInfo.version || ""} onChange={(e) => updateVehicle("version", e.target.value)} maxLength={80} /></div>
          {vehicleInfo?.model && !yearCheck.valid && <p className="text-sm text-destructive">{yearCheck.error}</p>}
          {!seatOpening && <div>
            <p className="text-sm font-medium mb-1.5">Tipo de abertura</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'simples', label: 'Abertura simples', description: 'Abertura convencional' },
                { id: 'lishi', label: 'Abertura Lishi profissional', description: price?.serverPricing?.calculation?.lishi_percent != null ? `Abertura com ferramenta Lishi · adicional de ${price.serverPricing.calculation.lishi_percent}% sobre o total da abertura simples` : 'Abertura com ferramenta Lishi · consulte o adicional ao completar os dados' },
              ].map(item => <button type="button" key={item.id} aria-pressed={(vehicleInfo.opening_method || 'simples') === item.id} onClick={() => updateVehicle('opening_method', item.id)} className={`min-h-[44px] rounded-xl border-2 p-3 text-left ${(vehicleInfo.opening_method || 'simples') === item.id ? 'border-primary bg-primary/5' : 'border-border'}`}><span className="block text-sm font-medium">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></button>)}
            </div>
          </div>}
        </div>
      )}

      {/* Endereço com autocomplete */}
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
          placeholder="Ex: Perdi a chave de casa..."
          rows={2}
        />
      </div>

      {isOpeningService(service) && (openingReason == null || (service.id !== "abertura_automotiva" && brokenKeyInLock == null)) ? (
        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground text-center">
          {service.id === "abertura_automotiva" ? "Selecione o que aconteceu para calcularmos o valor do serviço." : "Responda as duas perguntas obrigatórias para calcularmos o valor do serviço."}
        </div>
      ) : service.needsVehicleInfo && !vehicleReady ? (
        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground text-center">
          Informe montadora, modelo e ano do veículo para calcularmos o valor do serviço.
        </div>
      ) : price ? (
        <PriceSummary price={price} service={calculationService || service} showCalculationDetails={showCalculationDetails} nearestDistance={nearestDistance} assumedNearby={assumedNearby} />
      ) : (
        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground text-center">
          {address ? "Complete os dados para consultar o valor do serviço." : "Informe o endereço acima para calcularmos o valor do serviço."}
        </div>
      )}
    </div>
  );
}