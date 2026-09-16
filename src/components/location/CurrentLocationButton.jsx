import React, { useState } from "react";
import { LocateFixed, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CurrentLocationButton({ onSelect }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const locate = () => {
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const { data } = await base44.functions.invoke("googlePlacesAutocomplete", {
          action: "reverse",
          lat: coords.latitude,
          lng: coords.longitude
        });
        onSelect({ address: data.address || "Localização atual", lat: coords.latitude, lng: coords.longitude });
      } catch {
        setError("Não foi possível identificar o endereço atual.");
      } finally {
        setLoading(false);
      }
    }, () => {
      setError("Permita o acesso à localização para usar esta opção.");
      setLoading(false);
    }, { enableHighAccuracy: true, timeout: 12000 });
  };

  return <div>
    <button type="button" onClick={locate} disabled={loading} className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary disabled:opacity-60">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
      {loading ? "Obtendo localização…" : "Usar minha localização atual"}
    </button>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>;
}