// Raio de busca de chaveiros configurado pelo cliente.
// Se nenhum chaveiro dentro do raio aceitar em 5 minutos, o raio aumenta 20%.

export const RADIUS_OPTIONS = [5, 10, 20, 30, 50];
export const DEFAULT_RADIUS_KM = 10;
export const RADIUS_EXPAND_RATE = 0.2;
export const RADIUS_EXPAND_INTERVAL_MS = 5 * 60 * 1000;
export const MAX_RADIUS_KM = 100;

export function expandRadius(radiusKm) {
  const next = Math.round(radiusKm * (1 + RADIUS_EXPAND_RATE) * 10) / 10;
  return Math.min(next, MAX_RADIUS_KM);
}

/**
 * Se nenhum chaveiro estiver dentro do raio escolhido, amplia o raio em 20%
 * (mesma regra da expansão automática) até encontrar chaveiros ou atingir o
 * limite máximo. Retorna o raio usado e todos os chaveiros dentro dele.
 */
export function expandUntilFound(queue, startRadiusKm) {
  let radiusKm = startRadiusKm;
  let inRadius = queue.filter((q) => q.d <= radiusKm);
  while (inRadius.length === 0 && radiusKm < MAX_RADIUS_KM) {
    radiusKm = expandRadius(radiusKm);
    inRadius = queue.filter((q) => q.d <= radiusKm);
  }
  return { radiusKm, inRadius };
}