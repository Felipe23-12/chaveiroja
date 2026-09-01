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