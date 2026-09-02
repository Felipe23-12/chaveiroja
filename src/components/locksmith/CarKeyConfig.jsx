import React from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import PriceSummary from "./PriceSummary";

export default function CarKeyConfig({
  service,
  vehicleInfo,
  setVehicleInfo,
  address,
  setAddress,
  description,
  setDescription,
  keyValue,
  searching,
  searchError,
  onSearch,
  price,
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
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Modelo (ex: Honda Civic)"
            value={vehicleInfo.model || ""}
            onChange={(e) => updateVehicle("model", e.target.value)}
          />
          <Input
            type="number"
            placeholder="Ano"
            value={vehicleInfo.year || ""}
            onChange={(e) => updateVehicle("year", e.target.value)}
          />
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
      {keyValue != null && (
        <div className="p-4 rounded-xl border border-border bg-muted/40 text-center">
          <p className="text-sm font-medium text-foreground">Dados da chave consultados</p>
          <p className="text-xs text-muted-foreground mt-1">
            O valor será informado após a confirmação da solicitação.
          </p>
        </div>
      )}

      {/* Endereço e descrição */}
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
          placeholder="Ex: Perdi a única chave do carro..."
          rows={2}
        />
      </div>

      <PriceSummary price={price} />
    </div>
  );
}