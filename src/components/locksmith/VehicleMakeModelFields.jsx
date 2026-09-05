import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { findMakes, findModels } from "@/data/carModels";

function SuggestionList({ items, onPick }) {
  if (items.length === 0) return null;
  return (
    <ul className="absolute z-30 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
      {items.map((item) => (
        <li key={item}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item)}
            className="w-full text-left px-3 py-2.5 text-sm min-h-[44px] hover:bg-accent text-foreground"
          >
            {item}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Campos de montadora e modelo com autocomplete: ao digitar a primeira letra
 * do modelo, lista todos os carros daquela montadora que começam com a letra.
 */
export default function VehicleMakeModelFields({ vehicleInfo, updateVehicle }) {
  const [makeOpen, setMakeOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const makeOptions = useMemo(
    () => findMakes(vehicleInfo.make || "").map((m) => m.label),
    [vehicleInfo.make]
  );
  const modelOptions = useMemo(
    () => findModels(vehicleInfo.make, vehicleInfo.model || ""),
    [vehicleInfo.make, vehicleInfo.model]
  );

  return (
    <>
      <div className="relative">
        <label className="text-xs text-muted-foreground mb-1 block">Montadora</label>
        <Input
          placeholder="Ex: Honda"
          autoComplete="off"
          value={vehicleInfo.make || ""}
          onChange={(e) => {
            updateVehicle("make", e.target.value);
            setMakeOpen(true);
          }}
          onFocus={() => setMakeOpen(true)}
          onBlur={() => setTimeout(() => setMakeOpen(false), 120)}
        />
        {makeOpen && (
          <SuggestionList
            items={makeOptions}
            onPick={(label) => {
              updateVehicle("make", label);
              updateVehicle("model", "");
              setMakeOpen(false);
            }}
          />
        )}
      </div>

      <div className="relative">
        <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
        <Input
          placeholder={vehicleInfo.make ? "Digite a primeira letra do modelo" : "Escolha a montadora primeiro"}
          autoComplete="off"
          value={vehicleInfo.model || ""}
          onChange={(e) => {
            updateVehicle("model", e.target.value);
            setModelOpen(true);
          }}
          onFocus={() => setModelOpen(true)}
          onBlur={() => setTimeout(() => setModelOpen(false), 120)}
        />
        {modelOpen && (
          <SuggestionList
            items={modelOptions}
            onPick={(label) => {
              updateVehicle("model", label);
              setModelOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
}