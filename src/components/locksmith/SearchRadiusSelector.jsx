import React from "react";
import { Radar } from "lucide-react";
import { RADIUS_OPTIONS, RADIUS_EXPAND_RATE } from "@/lib/searchRadius";

/**
 * O cliente escolhe até que distância o app deve procurar chaveiros.
 */
export default function SearchRadiusSelector({ radius, setRadius, availableCount = null }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
        <Radar className="w-4 h-4 text-primary" /> Raio de busca
      </label>
      <div className="grid grid-cols-5 gap-2">
        {RADIUS_OPTIONS.map((km) => (
          <button
            key={km}
            onClick={() => setRadius(km)}
            className={`p-2 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px] ${
              radius === km ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {km} km
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {availableCount != null && `${availableCount} chaveiro${availableCount === 1 ? "" : "s"} nesse raio · `}
        Sem resposta em 5 minutos, o raio aumenta automaticamente {RADIUS_EXPAND_RATE * 100}%.
      </p>
    </div>
  );
}