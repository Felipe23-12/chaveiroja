import React from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import PriceSummary from "./PriceSummary";
import AddressAutocomplete from "./AddressAutocomplete";
import { CAR_KEY_TYPES } from "@/lib/pricing";
import CarKeyProgrammingNotice from "./CarKeyProgrammingNotice";
import VehicleMakeModelFields from "./VehicleMakeModelFields";
import KeyOriginSelector from "./KeyOriginSelector";

export default function CarKeyConfig({
  service,
  vehicleInfo,
  setVehicleInfo,
  carKeyType,
  setCarKeyType,
  fipeValue,
  address,
  setAddress,
  onAddressSelect,
  description,
  setDescription,
  keyValue,
  searching,
  searchError,
  onSearch,
  programming,
  price,
  keyOrigin,
  setKeyOrigin,
  keyCatalog,
}) {
  const updateVehicle = (field, value) =>
    setVehicleInfo((v) => ({ ...v, [field]: value }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">{service.label}</h2>
        <p className="text-sm text-muted-foreground">{service.description}</p>
      </div>

      {/* Dados do veículo + pesquisa do valor da chave */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground block">Dados do veículo</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <VehicleMakeModelFields vehicleInfo={vehicleInfo} updateVehicle={updateVehicle} />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ano do veículo</label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Ex: 2020"
              value={vehicleInfo.year || ""}
              onChange={(e) => updateVehicle("year", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">A porta do carro está</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateVehicle("doorStatus", "aberta")}
              className={`min-h-[44px] rounded-xl border-2 text-sm font-medium transition-colors ${
                vehicleInfo.doorStatus === "aberta" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              Aberta
            </button>
            <button
              type="button"
              onClick={() => updateVehicle("doorStatus", "fechada")}
              className={`min-h-[44px] rounded-xl border-2 text-sm font-medium transition-colors ${
                vehicleInfo.doorStatus === "fechada" ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              Fechada
            </button>
          </div>
        </div>

        <Button type="button" variant="outline" onClick={onSearch} disabled={searching} className="w-full">
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Consultando disponibilidade...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" /> Consultar disponibilidade da chave
            </>
          )}
        </Button>
        {searchError && <p className="text-sm text-red-600">{searchError}</p>}
      </div>

      {/* O sistema mantém os dados necessários para calcular o serviço, mas não expõe valores nesta etapa. */}
      {fipeValue != null && (
        <div className="p-4 rounded-xl border border-border bg-muted/40 text-center">
          <p className="text-sm font-medium text-foreground">Veículo e chave consultados</p>
          <p className="text-xs text-muted-foreground mt-1">
            O valor do serviço será informado após a confirmação da solicitação.
          </p>
        </div>
      )}

      <CarKeyProgrammingNotice programming={programming} />

      {fipeValue != null && (
        <KeyOriginSelector value={keyOrigin} onChange={setKeyOrigin} catalog={keyCatalog} />
      )}

      {/* Tipo de chave escolhido pelo cliente */}
      {fipeValue != null && !programming?.dealerOnly && (
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo de chave</label>
          <div className="grid grid-cols-1 gap-2">
            {CAR_KEY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCarKeyType(t.id)}
                className={`p-3 rounded-xl border-2 text-left min-h-[44px] transition-all ${
                  carKeyType === t.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <p className="text-sm font-medium text-foreground">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
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
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição (opcional)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Perdi a única chave do carro..."
          rows={2}
        />
      </div>

      <PriceSummary price={price} />
    </div>
  );
}