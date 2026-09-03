// Cache offline usando localStorage — armazena último atendimento e perfis de chaveiros
const SERVICE_KEY = "chaveiro_offline_last_service";
const LOCKSMITH_PREFIX = "chaveiro_offline_locksmith_";

export function saveLastService(service) {
  if (!service) return;
  try {
    localStorage.setItem(SERVICE_KEY, JSON.stringify(service));
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
  } catch (e) {
    /* storage indisponível */
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