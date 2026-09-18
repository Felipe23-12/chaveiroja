import React from "react";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CarKeyConfig from "@/components/locksmith/CarKeyConfig";
import MotoKeyConfig from "@/components/locksmith/MotoKeyConfig";
import ServiceConfig from "@/components/locksmith/ServiceConfig";
import SearchRadiusSelector from "@/components/locksmith/SearchRadiusSelector";
import UrgencySelector from "@/components/client/UrgencySelector";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ServiceLocationDetails from "@/components/client/ServiceLocationDetails";
import { isOpeningService } from "@/lib/pricing";
import { parallelOptions, requiresParallelKey } from "@/lib/vehicleKeyCatalog";
export default function HomeConfigurationStep({ config }) {
  const { service, pricingService, vehicleInfo, setVehicleInfo, address, setAddress, handleAddressSelect, description, setDescription, originalKeyValue, searching, searchError, handleSearchKey, carKeyType, setCarKeyType, fipeValue, hasCodedKey, programming, price, keyOrigin, setKeyOrigin, keyCatalog, canPreviewKeyPrice, motoInfo, setMotoInfo, motoRule, selectedOptions, toggleOption, customAddons, setCustomAddon, locks, setLocks, brokenKeyInLock, setBrokenKeyInLock, openingReason, setOpeningReason, searchRadius, setSearchRadius, inRadiusCount, urgency, setUrgency, goToStep, handleConfirmConfig, submitting, keyBlock, selectedKeyValue, nearestDistance, assumedNearby } = config;
  const shared = { service, address, setAddress, onAddressSelect: handleAddressSelect, description, setDescription };
  const keys = { keyOrigin, setKeyOrigin, keyCatalog, showPriceBeforeAcceptance: canPreviewKeyPrice };
  const { locationContext, setLocationContext } = config;
  const vehicle = service.needsVehicleInfo || service.isCarKey || service.isMotoKey;
  const locationIncomplete = !vehicle && (!locationContext.place_type || (locationContext.place_type === "condominium" && (!locationContext.building?.trim() || !locationContext.unit?.trim())));
  const disabled = locationIncomplete || !address || submitting || !keyBlock || keyBlock.blocked || programming?.dealerOnly ||
    (isOpeningService(service) && (openingReason == null || (service.id !== "abertura_automotiva" && brokenKeyInLock == null))) ||
    (service.needsVehicleInfo && !service.isCarKey && (!vehicleInfo.make?.trim() || !vehicleInfo.model?.trim() || !String(vehicleInfo.year || "").trim())) ||
    (service.isCarKey && (!fipeValue || !vehicleInfo.doorStatus)) ||
    (service.isCarKey && requiresParallelKey(keyCatalog) && keyOrigin !== "paralela") ||
    ((service.isCarKey || service.isMotoKey) && keyOrigin === "paralela" && (parallelOptions(keyCatalog).length === 0 || selectedKeyValue <= 0)) ||
    (service.isMotoKey && !motoRule?.range);
  return <div className="space-y-5 step-enter">
    {service.isCarKey ? <CarKeyConfig {...shared} {...keys} vehicleInfo={vehicleInfo} setVehicleInfo={setVehicleInfo} keyValue={originalKeyValue} searching={searching} searchError={searchError} onSearch={handleSearchKey} carKeyType={carKeyType} setCarKeyType={setCarKeyType} fipeValue={fipeValue} hasCodedKey={hasCodedKey} programming={programming} price={address && fipeValue != null && !programming?.dealerOnly ? price : null} />
      : service.isMotoKey ? <MotoKeyConfig {...shared} {...keys} motoInfo={motoInfo} setMotoInfo={setMotoInfo} motoRule={motoRule} price={address ? price : null} calculationService={pricingService} nearestDistance={nearestDistance} assumedNearby={assumedNearby} />
      : <ServiceConfig {...shared} calculationService={pricingService} showCalculationDetails={canPreviewKeyPrice} selectedOptions={selectedOptions} toggleOption={toggleOption} customAddons={customAddons} setCustomAddon={setCustomAddon} vehicleInfo={vehicleInfo} setVehicleInfo={setVehicleInfo} locks={locks} setLocks={setLocks} brokenKeyInLock={brokenKeyInLock} setBrokenKeyInLock={setBrokenKeyInLock} openingReason={openingReason} setOpeningReason={setOpeningReason} price={address ? price : null} nearestDistance={nearestDistance} assumedNearby={assumedNearby} />}
    <ServiceLocationDetails value={locationContext} onChange={setLocationContext} vehicle={vehicle} />
    <p className="text-xs text-muted-foreground">Até 3 cancelamentos gratuitos por dia. Ao atingir o limite, novas solicitações ficam bloqueadas por 6 horas; cancelamentos relacionados ao mesmo atendimento podem gerar bloqueio de segurança de 2 horas.</p>
    <SearchRadiusSelector radius={searchRadius} setRadius={setSearchRadius} availableCount={inRadiusCount} />
    <UrgencySelector urgency={urgency} setUrgency={setUrgency} />
    <ErrorBanner message={searchError} />
    <div className="flex gap-3"><Button variant="outline" onClick={() => goToStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button><Button onClick={handleConfirmConfig} disabled={disabled} className="flex-1">{submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}Solicitar chaveiro</Button></div>
  </div>;
}