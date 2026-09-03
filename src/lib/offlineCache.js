// Cache offline usando localStorage — armazena atendimento ativo, rota,
// solicitações pendentes e perfis de chaveiros para acesso sem conexão.
const SERVICE_KEY = "chaveiro_offline_last_service";
const ROUTE_KEY = "chaveiro_offline_last_route";
const PENDING_KEY = "chaveiro_offline_pending_requests";
const LOCKSMITH_PREFIX = "chaveiro_offline_locksmith_";

export function saveLastService(service) {
  if (!service) return;
  try {
    localStorage.setItem(SERVICE_KEY, JSON.stringify({
      ...service,
      _cached_at: new Date().toISOString(),
    }));
  } catch (e) {
    /* storage cheio ou indisponível */
  }
}

export function getLastService() {
  try {
    const data = localStorage.getItem(SERVICE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearLastService() {
  try {
    localStorage.removeItem(SERVICE_KEY);
    localStorage.removeItem(ROUTE_KEY);
  } catch (e) {
    /* storage indisponível */
  }
}

// Rota traçada (coordenadas OSRM + ETA) para navegação offline
export function saveLastRoute(routePath, eta) {
  try {
    localStorage.setItem(ROUTE_KEY, JSON.stringify({ routePath, eta, _cached_at: new Date().toISOString() }));
  } catch (e) {
    /* storage indisponível */
  }
}

export function getLastRoute() {
  try {
    const data = localStorage.getItem(ROUTE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

// Solicitações pendentes (fila de "toques") para visualização offline
export function savePendingRequests(requests) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      requests,
      _cached_at: new Date().toISOString(),
    }));
  } catch (e) {
    /* storage indisponível */
  }
}

export function getPendingRequests() {
  try {
    const data = localStorage.getItem(PENDING_KEY);
    return data ? JSON.parse(data).requests : [];
  } catch (e) {
    return [];
  }
}

export function saveLocksmithProfile(locksmith) {
  if (!locksmith?.id) return;
  try {
    localStorage.setItem(LOCKSMITH_PREFIX + locksmith.id, JSON.stringify(locksmith));
  } catch (e) {
    /* storage cheio ou indisponível */
  }
}

export function getLocksmithProfile(id) {
  if (!id) return null;
  try {
    const data = localStorage.getItem(LOCKSMITH_PREFIX + id);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}