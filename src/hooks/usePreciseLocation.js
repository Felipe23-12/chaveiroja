import { useCallback, useEffect, useState } from "react";
import { DEFAULT_CENTER, GEO_OPTIONS, locationErrorMessage } from "@/lib/geo";

export default function usePreciseLocation() {
  const [location, setLocation] = useState(DEFAULT_CENTER);
  const [status, setStatus] = useState("locating");
  const [error, setError] = useState("");
  const [accuracy, setAccuracy] = useState(null);
  // True assim que o callback de sucesso do watchPosition dispara pela primeira
  // vez, independente da precisão — indica que já tivemos uma leitura utilizável.
  const [hasFix, setHasFix] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("fallback");
      setError("Este aparelho não disponibilizou o GPS. Informe o endereço manualmente.");
      return;
    }
    setStatus("locating");
    setError("");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setAccuracy(Math.round(position.coords.accuracy || 0));
        setStatus("ready");
        setError("");
        setHasFix(true);
      },
      (reason) => {
        setStatus("fallback");
        setError(locationErrorMessage(reason));
      },
      GEO_OPTIONS
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [attempt]);

  return { location, status, error, accuracy, hasFix, retry };
}