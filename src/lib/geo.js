// Utilitários de geolocalização para o ChaveiroJá

export const DEFAULT_CENTER = { lat: -23.55, lng: -46.63 };

// Distância em km entre dois pontos (fórmula de Haversine)
export function haversineKm(a, b) {
  if (!a || !b) return 0;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// Distância registrada no momento da criação do chamado. Esse valor permanece
// salvo no serviço mesmo quando a posição ao vivo do chaveiro é atualizada.
export function calculateInitialServiceDistance(locksmithLocation, customerDestination) {
  return haversineKm(locksmithLocation, customerDestination);
}

// Move um ponto em direção a outro por uma fração (0..1)
export function stepToward(from, to, fraction) {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

// Busca a rota de carro entre dois pontos via OSRM (gratuito, sem chave de API).
// Retorna { coordinates: [{lat,lng}...], duration: segundos, distance: metros } ou null.
export async function fetchDrivingRoute(from, to) {
  if (!from || !to || !from.lat || !to.lat) return null;
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || data.routes.length === 0) return null;
    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      duration: route.duration,
      distance: route.distance,
    };
  } catch (e) {
    return null;
  }
}

// Converte duração (segundos) em minutos arredondados (mínimo 1)
export function etaMinutes(durationSeconds) {
  if (!durationSeconds) return 0;
  return Math.max(1, Math.round(durationSeconds / 60));
}

// Tenta obter a localização do navegador; usa o centro padrão como fallback
export function getCustomerLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(DEFAULT_CENTER);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(DEFAULT_CENTER),
      { timeout: 4000 }
    );
  });
}