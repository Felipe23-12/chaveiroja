import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import preserveAccountProfile from '@/lib/preserveAccountProfile';
import { disconnectBrowserPush } from '@/components/notifications/browserPushSdk';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

preserveAccountProfile(base44.auth, base44.functions);

// Remove only this browser's push association before any account logout.
const logout = base44.auth.logout.bind(base44.auth);
base44.auth.logout = async (...args) => {
  await disconnectBrowserPush();
  return logout(...args);
};