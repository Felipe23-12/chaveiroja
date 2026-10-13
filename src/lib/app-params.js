const isNode = typeof window === 'undefined';
const memory = new Map();
const memoryStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => { memory.set(key, String(value)); },
  removeItem: key => { memory.delete(key); },
};
const storage = {
  getItem(key) { try { return isNode ? memoryStorage.getItem(key) : window.localStorage.getItem(key); } catch { return memoryStorage.getItem(key); } },
  setItem(key, value) { memoryStorage.setItem(key, value); try { if (!isNode) window.localStorage.setItem(key, value); } catch { /* blocked storage */ } },
  removeItem(key) { memoryStorage.removeItem(key); try { if (!isNode) window.localStorage.removeItem(key); } catch { /* blocked storage */ } },
};

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
  if (isNode) return { appId: import.meta.env?.VITE_BASE44_APP_ID, token: null, fromUrl: '', functionsVersion: import.meta.env?.VITE_BASE44_FUNCTIONS_VERSION, appBaseUrl: import.meta.env?.VITE_BASE44_APP_BASE_URL };
	// Limpar a sessão é uma ação única, não uma preferência persistente.
	const callbackParams = new URLSearchParams(window.location.search);
	const incomingToken = callbackParams.get('access_token');
	storage.removeItem('base44_clear_access_token');
	if (callbackParams.get('clear_access_token') === 'true' && !incomingToken) {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	if (callbackParams.has('clear_access_token')) {
		callbackParams.delete('clear_access_token');
		window.history.replaceState({}, document.title, `${window.location.pathname}${callbackParams.size ? `?${callbackParams}` : ''}${window.location.hash}`);
	}
	// Um retorno autenticado inicia uma nova sessão mesmo se o Android recriou a janela.
	if (incomingToken) { try { window.sessionStorage.setItem('active_login_session', 'true'); } catch { /* blocked storage */ } }
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}