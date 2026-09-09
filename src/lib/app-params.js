const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

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
	if (incomingToken) window.sessionStorage.setItem('active_login_session', 'true');
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