import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import locksmithEntryPath from '@/lib/locksmithEntryPath';

export default function useExistingLocksmithSession(enabled, returnTo = '/') {
  const [checking, setChecking] = useState(enabled);
  useEffect(() => {
    if (!enabled) { setChecking(false); return; }
    let active = true;
    setChecking(true);
    // An absent session is normal on a public registration page.
    base44.auth.me().then(user => {
      if (!active) return;
      if (user.role !== 'admin' && user.account_type === 'chaveiro' && user.is_verified === true) {
        sessionStorage.setItem('active_login_session', 'true');
        window.location.replace(locksmithEntryPath(user, returnTo));
      } else setChecking(false);
    }).catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [enabled, returnTo]);
  return checking;
}