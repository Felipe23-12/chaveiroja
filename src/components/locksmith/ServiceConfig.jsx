import React from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PriceSummary from "./PriceSummary";

export default function ServiceConfig({
  service,
  address,
  setAddress,
  description,
  setDescription,
  selectedOptions,
  toggleOption,
  customAddons,
  setCustomAddon,
  vehicleInfo,
  setVehicleInfo,
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
          placeholder="Ex: Perdi a chave de casa..."
          rows={2}
        />
      </div>

      <PriceSummary price={price} />
    </div>
  );
}