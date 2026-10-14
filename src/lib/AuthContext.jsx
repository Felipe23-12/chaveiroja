import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { clearAuthProvider } from '@/lib/authProvider';
import { isTemporaryConnectionError, retryConnectionRead } from '@/lib/connectionErrors';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [appleReview, setAppleReview] = useState({ enabled: false, role: null });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  const authenticatedUser = useRef(null);
  const authPending = useRef(null);
  const connectionPending = useRef(false);
  const authEpoch = useRef(0);
  useEffect(() => {
    void checkAppState();
    const reconnect = () => { if (connectionPending.current) void checkAppState(); };
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', reconnect);
    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('focus', reconnect);
    };
  }, []);

  const clearInvalidStoredSession = () => {
    // WebViews Android e iOS podem manter um JWT antigo entre atualizações/retornos do app.
    // Remova somente a credencial inválida; dados de preferência do usuário ficam intactos.
    for (const [storage, key] of [['localStorage', 'base44_access_token'], ['localStorage', 'token'], ['sessionStorage', 'active_login_session']]) {
      try { window[storage].removeItem(key); } catch { /* armazenamento restrito */ }
    }
    try { base44.auth.setToken('', false); } catch { /* SDK usa a próxima sessão */ }
    appParams.token = null;
    authenticatedUser.current = null;
    authEpoch.current += 1;
  };

  const isInvalidSessionError = (error) => {
    const status = error?.status || error?.response?.status;
    const message = String(error?.message || error?.response?.data?.message || error?.response?.data?.detail || '');
    return status === 401 || /invalid\s*(?:access\s*)?token|token\s*(?:is\s*)?invalid|token.*expir|expir.*token|jwt.*(?:invalid|expir)|unauthorized/i.test(message);
  };

  const checkAppState = async () => {
    try {
      let remember, activeSession;
      try { remember = localStorage.getItem('remember_login'); } catch { /* usar sessão do SDK */ }
      try { activeSession = sessionStorage.getItem('active_login_session'); } catch { /* usar sessão do SDK */ }
      if (appParams.token && remember === 'false' && activeSession !== 'true') {
        await base44.auth.logout();
        return;
      }
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await retryConnectionRead(() => appClient.get(`/prod/public-settings/by-id/${appParams.appId}`));
        setAppPublicSettings(publicSettings);
        
        // Consulta a sessão atual do SDK, não apenas o token capturado na inicialização.
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        // Em Android/iOS o wrapper pode restaurar um token antigo antes mesmo de
        // auth.me(). Se a própria consulta pública rejeitar essa credencial,
        // descarte-a e continue como sessão encerrada, sem expor "token inválido".
        if (isInvalidSessionError(appError)) {
          clearInvalidStoredSession();
          setIsAuthenticated(false);
          setUser(null);
          setAuthChecked(true);
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
          setIsLoadingPublicSettings(false);
          setIsLoadingAuth(false);
          return;
        }
        
        if (isTemporaryConnectionError(appError)) {
          // auth.me() pode estar disponível mesmo se a consulta pública oscilou.
          await checkUserAuth();
          setIsLoadingPublicSettings(false);
          return;
        }

        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            // Public settings may reject an OAuth callback before the SDK session
            // is ready; verify the actual user before sending them back to login.
            const currentUser = await checkUserAuth();
            if (!currentUser && !connectionPending.current) setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = () => {
    if (authPending.current) return authPending.current;
    const epoch = authEpoch.current;
    const pending = (async () => {
      setIsLoadingAuth(true);
      try {
        let currentUser = await retryConnectionRead(() => base44.auth.me());
        const recovery = await base44.functions.invoke('claimCpf', { action: 'recover_client' }).catch(() => null);
        if (recovery?.data?.recovered) currentUser = await retryConnectionRead(() => base44.auth.me());
        const review = await base44.functions.invoke('serviceTrust', { action: 'review_status' }).catch(() => null);
        if (epoch !== authEpoch.current) return null;
        if (review?.data) setAppleReview(review.data);
        authenticatedUser.current = currentUser;
        connectionPending.current = false;
        setAuthError(null);
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthChecked(true);
        return currentUser;
      } catch (error) {
        if (epoch !== authEpoch.current) return null;
        if (isTemporaryConnectionError(error)) {
          connectionPending.current = true;
          setAuthError({ type: 'connection', message: 'Não foi possível confirmar a conexão. Tente novamente.' });
          // Uma resposta de rede não é uma resposta de sessão inválida.
          setIsAuthenticated(Boolean(authenticatedUser.current));
          setAuthChecked(true);
          return null;
        }
        connectionPending.current = false;
        setAppleReview({ enabled: false, role: null });
        if (isInvalidSessionError(error)) clearInvalidStoredSession();
        authenticatedUser.current = null;
        setUser(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setAuthError({ type: 'auth_required', message: 'Authentication required' });
        return null;
      } finally {
        setIsLoadingAuth(false);
      }
    })();
    authPending.current = pending;
    pending.finally(() => { if (authPending.current === pending) authPending.current = null; });
    return pending;
  };

  const logout = (shouldRedirect = true) => {
    authEpoch.current += 1;
    authenticatedUser.current = null;
    connectionPending.current = false;
    setAppleReview({ enabled: false, role: null });
    setUser(null);
    setIsAuthenticated(false);
    try { localStorage.removeItem('remember_login'); } catch { /* armazenamento restrito */ }
    try { sessionStorage.removeItem('active_login_session'); } catch { /* armazenamento restrito */ }
    clearAuthProvider();
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    const returnTo = window.location.pathname + window.location.search;
    window.location.href = '/login?returnTo=' + encodeURIComponent(returnTo);
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      appleReview,
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};