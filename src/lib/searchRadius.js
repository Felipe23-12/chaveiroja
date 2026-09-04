// Raio de busca de chaveiros configurado pelo cliente.
// Se nenhum chaveiro dentro do raio aceitar em 5 minutos, o raio aumenta 20%.

export const RADIUS_OPTIONS = [5, 10, 20, 30, 50];
export const DEFAULT_RADIUS_KM = 10;
export const RADIUS_EXPAND_RATE = 0.2;
export const RADIUS_EXPAND_INTERVAL_MS = 5 * 60 * 1000;
export const MAX_RADIUS_KM = 150;

export function expandRadius(radiusKm) {
  const next = Math.round(radiusKm * (1 + RADIUS_EXPAND_RATE) * 10) / 10;
  return Math.min(next, MAX_RADIUS_KM);
}