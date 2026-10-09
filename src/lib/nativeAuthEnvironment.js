// Require a native bridge, not just an iPhone/iPad user agent: Safari stays web.
export function isNativeIOS() {
  if (typeof window === 'undefined') return false;
  const capacitor = window.Capacitor;
  if (capacitor?.isNativePlatform?.() && capacitor?.getPlatform?.() === 'ios') return true;
  const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const nativeBridge = window.webkit?.messageHandlers?.bridge
    || window.webkit?.messageHandlers?.capacitor
    || window.ReactNativeWebView?.postMessage;
  return iosDevice && Boolean(nativeBridge);
}