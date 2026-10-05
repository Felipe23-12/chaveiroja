import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getEffectiveRole } from '@/lib/accessControl';

export default function LocksmithActivityTracker() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const lastSent = useRef(0);
  const isLocksmith = getEffectiveRole(user) === 'chaveiro';
  useEffect(() => {
    if (!user?.id || !isLocksmith) return;
    const record = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastSent.current < 60000) return;
      lastSent.current = Date.now();
      base44.functions.invoke('serviceTrust', { action: 'record_app_access' }).catch(() => { lastSent.current = 0; });
    };
    record();
    const timer = setInterval(record, 60000);
    window.addEventListener('focus', record);
    document.addEventListener('visibilitychange', record);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', record);
      document.removeEventListener('visibilitychange', record);
    };
  }, [user?.id, isLocksmith, pathname]);
  return null;
}