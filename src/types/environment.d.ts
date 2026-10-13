/// <reference types="vite/client" />
interface Window {
  Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  webkit?: { messageHandlers?: { bridge?: unknown; capacitor?: unknown } };
  ReactNativeWebView?: { postMessage: (message: string) => void };
  webkitAudioContext?: typeof AudioContext;
}
