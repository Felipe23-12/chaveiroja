import React from "react";
import { validateOpeningVehicle } from "../../../base44/shared/automotiveOpening";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CarKeyConfig from "@/components/locksmith/CarKeyConfig";
import MotoKeyConfig from "@/components/locksmith/MotoKeyConfig";
import ServiceConfig from "@/components/locksmith/ServiceConfig";
import SearchRadiusSelector from "@/components/locksmith/SearchRadiusSelector";
import UrgencySelector from "@/components/client/UrgencySelector";
import ErrorBanner from "@/components/ui/ErrorBanner";
import ServiceLocationDetails from "@/components/client/ServiceLocationDetails";
import { isOpeningService, isLandRoverFrom2020 } from "@/lib/pricing";
import { requiresParallelKey } from "@/lib/vehicleKeyCatalog";
import { validateVehicleModelYear } from "../../../base44/shared/vehicleModelYears";
import useServicePriceQuote from "@/hooks/useServicePriceQuote";
import useServiceCoverage from '@/hooks/useServiceCoverage';
import ServiceQuoteScope from '@/components/location/ServiceQuoteScope';
import CoverageNotice from '@/components/location/CoverageNotice';
import ServerPriceSummary from '@/components/client/ServerPriceSummary';
export default function HomeConfigurationStep({ config }) {
  const { service, pricingService, vehicleInfo, setVehicleInfo, address, setAddress, handleAddressSelect, description, setDescription, originalKeyValue, searching, searchError, handleSearchKey, carKeyType, setCarKeyType, fipeValue, hasCodedKey, programming, keyOrigin, setKeyOrigin, keyCatalog, canPreviewKeyPrice, motoInfo, setMotoInfo, motoRule, selectedOptions, toggleOption, customAddons, setCustomAddon, locks, setLocks, brokenKeyInLock, setBrokenKeyInLock, openingReason, setOpeningReason, searchRadius, setSearchRadius, inRadiusCount, urgency, setUrgency, goToStep, handleConfirmConfig, submitting, keyBlock, selectedKeyValue, nearestDistance, assumedNearby, requiresRegistration, isAdminProfile = false } = config;
  const shared = { service, address, setAddress, onAddressSelect: handleAddressSelect, description, setDescription };
  const keys = { keyOrigin, setKeyOrigin, keyCatalog, showPriceBeforeAcceptance: isAdminProfile };
  const { locationContext, setLocationContext } = config;
  const serviceLocation = { lat: config.pricingData.customer_lat, lng: config.pricingData.customer_lng };
  const coverage = useServiceCoverage(serviceLocation, locationContext.coordinates_confirmed);
  const coverageBlocked = !coverage.allowed;
  const vehicle = service.needsVehicleInfo || service.isCarKey || service.isMotoKey;
  const locationIncomplete = !vehicle && (!locationContext.place_type || (locationContext.place_type === "condominium" && (!locationContext.building?.trim() || !locationContext.unit?.trim())));
  const disabled = config.customerNameValid === false || coverageBlocked || !locationContext.coordinates_confirmed || locationIncomplete || !address || !keyBlock || keyBlock.blocked || programming?.dealerOnly ||
    (isOpeningService(service) && (openingReason == null || (service.id !== "abertura_automotiva" && brokenKeyInLock == null))) ||
    (service.needsVehicleInfo && !service.isMotoKey && !(service.id === "abertura_automotiva" ? validateOpeningVehicle(vehicleInfo) : validateVehicleModelYear(vehicleInfo.make, vehicleInfo.model, vehicleInfo.year)).valid) ||
    (service.isCarKey && (!validateVehicleModelYear(vehicleInfo.make, vehicleInfo.model, vehicleInfo.year).valid || !fipeValue || !vehicleInfo.doorStatus || (isLandRoverFrom2020(vehicleInfo.make, vehicleInfo.year) && vehicleInfo.alarmLocked == null))) ||
    (service.isCarKey && requiresParallelKey(keyCatalog) && keyOrigin !== "paralela") ||
    ((service.isCarKey || service.isMotoKey) && keyOrigin === "paralela" && selectedKeyValue <= 0) ||
    (service.isMotoKey && !motoRule?.range);
  const quote = useServicePriceQuote(config.pricingData, !disabled, config.quoteRevision);
  const price = quote.pricing ? { total: quote.pricing.price, serverPricing: quote.pricing } : null;
  return <ServiceQuoteScope location={serviceLocation} confirmed={locationContext.coordinates_confirmed}><div className="space-y-5 step-enter">
    {service.isCarKey ? <CarKeyConfig {...shared} {...keys} vehicleInfo={vehicleInfo} setVehicleInfo={setVehicleInfo} keyValue={originalKeyValue} searching={searching} searchError={searchError} onSearch={handleSearchKey} carKeyType={carKeyType} setCarKeyType={setCarKeyType} fipeValue={fipeValue} hasCodedKey={hasCodedKey} programming={programming} price={address && fipeValue != null && !programming?.dealerOnly ? price : null} />
      : service.isMotoKey ? <MotoKeyConfig {...shared} {...keys} motoInfo={motoInfo} setMotoInfo={setMotoInfo} motoRule={motoRule} price={address ? price : null} calculationService={pricingService} nearestDistance={nearestDistance} assumedNearby={assumedNearby} />
      : <ServiceConfig {...shared} calculationService={pricingService} showCalculationDetails={isAdminProfile} showPriceBeforeAcceptance={isOpeningService(service) || isAdminProfile} selectedOptions={selectedOptions} toggleOption={toggleOption} customAddons={customAddons} setCustomAddon={setCustomAddon} vehicleInfo={vehicleInfo} setVehicleInfo={setVehicleInfo} locks={locks} setLocks={setLocks} brokenKeyInLock={brokenKeyInLock} setBrokenKeyInLock={setBrokenKeyInLock} openingReason={openingReason} setOpeningReason={setOpeningReason} price={address ? price : null} nearestDistance={nearestDistance} assumedNearby={assumedNearby} />}
    <ServiceLocationDetails value={locationContext} onChange={setLocationContext} vehicle={vehicle} />
    <CoverageNotice location={serviceLocation} known={locationContext.coordinates_confirmed} />
    {address && !locationContext.coordinates_confirmed && <p className="text-sm text-warning">Selecione o endereço nas sugestões ou use sua localização atual para verificar a cobertura.</p>}
    <p className="text-xs text-muted-foreground">Até 3 cancelamentos gratuitos por dia. Ao atingir o limite, novas solicitações ficam bloqueadas por 6 horas; cancelamentos relacionados ao mesmo atendimento podem gerar bloqueio de segurança de 2 horas.</p>
    <SearchRadiusSelector radius={searchRadius} setRadius={setSearchRadius} availableCount={inRadiusCount} />
    <UrgencySelector urgency={urgency} setUrgency={setUrgency} />
    {quote.loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Calculando valor do chamado...</p>}
    <ErrorBanner message={quote.error || searchError} onRetry={quote.error ? quote.retry : undefined} />
    {(service.isCarKey || service.isMotoKey) && !isAdminProfile && !disabled && quote.pricing && <ServerPriceSummary pricing={quote.pricing} />}
    <div className="flex gap-3"><Button variant="outline" onClick={() => goToStep(1)} className="flex-1"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button><Button onClick={() => handleConfirmConfig(quote.pricing)} disabled={submitting || coverageBlocked || !locationContext.coordinates_confirmed || (!requiresRegistration && (disabled || !quote.pricing))} className="flex-1">{submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}{programming?.dealerOnly ? "Confecção indisponível" : requiresRegistration ? "Concluir cadastro para solicitar" : "Solicitar chaveiro"}</Button></div>
  </div></ServiceQuoteScope>;
}