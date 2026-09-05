import React from "react";
import { Radar, LocateFixed } from "lucide-react";
import { RADIUS_OPTIONS, RADIUS_EXPAND_RATE, DEFAULT_RADIUS_KM } from "@/lib/searchRadius";

/**
 * O cliente escolhe até que distância o app deve procurar chaveiros.
 * Sem escolha (opção "Chaveiro perto de mim"), a busca começa em 10 km e o
 * raio aumenta automaticamente se ninguém aceitar. Ao escolher um raio, o
 * chamado toca para todos os chaveiros online que atendem o serviço.
 */
export default function SearchRadiusSelector({ radius, setRadius, availableCount = null }) {
  const auto = radius == null;

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
        <Radar className="w-4 h-4 text-primary" /> Raio de busca
      </label>

      <button
        onClick={() => setRadius(null)}
        className={`w-full mb-2 p-2.5 rounded-xl border-2 text-sm font-medium transition-all min-h-[44px] flex items-center justify-center gap-1.5 ${
          auto ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
        }`}
      >
        <LocateFixed className="w-4 h-4" /> Chaveiro perto de mim
      </button>

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
        {availableCount != null && `${availableCount} chaveiro${availableCount === 1 ? "" : "s"} disponíve${availableCount === 1 ? "l" : "is"} · `}
        {auto
          ? `Busca começa em ${DEFAULT_RADIUS_KM} km e aumenta ${RADIUS_EXPAND_RATE * 100}% a cada 5 minutos sem resposta.`
          : "O chamado toca de uma vez para todos os chaveiros online que atendem esse serviço."}
      </p>
    </div>
  );
}