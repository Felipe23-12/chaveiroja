import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PriceSummary from "./PriceSummary";
import AddressAutocomplete from "./AddressAutocomplete";
import LocksConfig from "./LocksConfig";

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

      {/* Fechaduras: quantas portas abrir e quais miolos trocar */}
      {service.hasLocks && <LocksConfig locks={locks} setLocks={setLocks} />}

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
                  {opt.price === "custom" && checked && (
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Modelo"
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
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Complexidade do serviço</p>
            <div className="grid grid-cols-3 gap-2">
              {["simples", "media", "alta"].map((c) => (
                <button
                  key={c}
                  onClick={() => updateVehicle("complexity", c)}
                  className={`p-2 rounded-lg border-2 text-sm capitalize transition-all ${
                    vehicleInfo.complexity === c
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
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
          placeholder="Ex: Perdi a chave de casa..."
          rows={2}
        />
      </div>

      {price ? (
        <PriceSummary price={price} />
      ) : (
        <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground text-center">
          Informe o endereço acima para calcularmos o valor do serviço.
        </div>
      )}
    </div>
  );
}