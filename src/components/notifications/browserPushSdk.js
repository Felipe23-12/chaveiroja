import workerUrl from '@/components/notifications/OneSignalWorker.js?worker&url';

let initialization;
let sdk;
export function isNativeNotificationDevice() {
  return Boolean(window.Capacitor?.isNativePlatform?.() || window.ReactNativeWebView || window.webkit?.messageHandlers?.bridge || window.webkit?.messageHandlers?.capacitor);
}
export function initializeBrowserPush(appId) {
  if (!initialization) initialization = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Não foi possível carregar os avisos. Tente novamente.')), 20000);
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async OneSignal => {
      try {
        const worker = new URL(workerUrl, window.location.href);
        await OneSignal.init({ appId, serviceWorkerPath: worker.pathname.replace(/^\//, '') + worker.search,
          serviceWorkerParam: { scope: new URL('./', worker).pathname },
          welcomeNotification: { disable: true }, autoResubscribe: true,
          promptOptions: { slidedown: { prompts: [{ type: 'push', autoPrompt: false }] } },
          notificationClickHandlerMatch: 'origin', notificationClickHandlerAction: 'navigate',
        });
        sdk = OneSignal;
        clearTimeout(timeout);
        resolve(OneSignal);
      } catch (error) { clearTimeout(timeout); reject(error); }
    });
    if (!document.getElementById('browser-push-sdk')) {
      const script = document.createElement('script');
      script.id = 'browser-push-sdk'; script.async = true;
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Não foi possível carregar os avisos.')); };
      document.head.appendChild(script);
    }
  }).catch(error => { initialization = undefined; throw error; });
  return initialization;
}
export async function disconnectBrowserPush() {
  if (!sdk) return;
  try { await sdk.logout(); } catch (error) { console.warn('Não foi possível desvincular os avisos web:', error.message); }
}