import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getEffectiveRole } from '@/lib/accessControl';
import { initializeBrowserPush, isNativeNotificationDevice } from '@/components/notifications/browserPushSdk';

export default function useBrowserNotifications() {
  const { user, appleReview } = useAuth();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sdkRef = useRef(null);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installIOS = ios && !navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches;
  const visible = Boolean(user && getEffectiveRole(user) === 'cliente' && !appleReview?.enabled && !isNativeNotificationDevice() && window.top === window.self);
  const unsupported = !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window);
  useEffect(() => {
    if (!visible || installIOS || unsupported) return;
    let active = true;
    let cleanup;
    setBusy(true); setError('');
    (async () => {
      const { data } = await base44.functions.invoke('browserNotifications', { action: 'configure' });
      const sdk = await initializeBrowserPush(data.appId);
      if (!active) return;
      await sdk.login(data.externalId);
      if (!active) return;
      sdkRef.current = sdk;
      const update = () => { if (active) { setSubscribed(Boolean(sdk.User.PushSubscription.optedIn)); setDenied(Notification.permission === 'denied'); } };
      sdk.User.PushSubscription.addEventListener('change', update);
      sdk.Notifications.addEventListener('permissionChange', update);
      cleanup = () => { sdk.User.PushSubscription.removeEventListener('change', update); sdk.Notifications.removeEventListener('permissionChange', update); };
      update();
    })().catch(() => { if (active) setError('Não foi possível ativar os avisos. Tente novamente no site publicado.'); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; cleanup?.(); };
  }, [user?.id, visible, installIOS, unsupported, attempt]);
  const change = async enable => {
    if (!sdkRef.current) return;
    setBusy(true); setError('');
    try {
      if (enable) await sdkRef.current.User.PushSubscription.optIn();
      else await sdkRef.current.User.PushSubscription.optOut();
      setSubscribed(Boolean(sdkRef.current.User.PushSubscription.optedIn));
      setDenied(Notification.permission === 'denied');
    } catch { setError('Não foi possível alterar os avisos. Verifique as permissões do navegador.'); }
    finally { setBusy(false); }
  };
  return { visible, busy, subscribed, denied, installIOS, unsupported, error, enable: () => change(true), disable: () => change(false), retry: () => setAttempt(value => value + 1) };
}