// Aguarda o GPS refinar a primeira leitura, sem usar coordenadas do cadastro.
export default function getLocksmithLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS indisponível. Ative a localização do aparelho.'));
    let best = null, watchId, finished = false;
    const finish = (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      if (error) reject(error);
      else resolve({ lat: best.coords.latitude, lng: best.coords.longitude, accuracy: best.coords.accuracy });
    };
    const timer = setTimeout(() => finish(best ? null : { code: 3 }), 20000);
    watchId = navigator.geolocation.watchPosition(position => {
      const { latitude, longitude, accuracy } = position.coords;
      if (finished || ![latitude, longitude, accuracy].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || Date.now() - position.timestamp > 30000) return;
      if (!best || accuracy < best.coords.accuracy) best = position;
      if (accuracy <= 100) finish();
    }, error => {
      if (error.code === 1) finish(error);
      // Falhas transitórias ainda permitem uma nova leitura dentro do prazo.
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
}