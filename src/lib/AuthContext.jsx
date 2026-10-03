import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { clearAuthProvider } from '@/lib/authProvider';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const clearInvalidStoredSession = () => {
    // WebViews Android e iOS podem manter um JWT antigo entre atualizações/retornos do app.
    // Remova somente a credencial inválida; dados de preferência do usuário ficam intactos.
    try {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('active_login_session');
      base44.auth.setToken('', false);
      // appParams é capturado no bootstrap. Zere também a cópia em memória para
      // que a checagem pública seguinte não reutilize o JWT que acabou de falhar.
      appParams.token = null;
    } catch { /* storage pode estar indisponível em WebViews/modos restritos */ }
  };

  const isInvalidSessionError = (error) => {
    const status = error?.status || error?.response?.status;
    const message = String(error?.message || error?.response?.data?.message || error?.response?.data?.detail || '');
    return status === 401 || /invalid\s*(?:access\s*)?token|token\s*(?:is\s*)?invalid|token.*expir|expir.*token|jwt.*(?:invalid|expir)|unauthorized/i.test(message);
  };

  const checkAppState = async () => {
    try {
      if (appParams.token && localStorage.getItem('remember_login') === 'false' && sessionStorage.getItem('active_login_session') !== 'true') {
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
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
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
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            // Public settings may reject an OAuth callback before the SDK session
            // is ready; verify the actual user before sending them back to login.
            const currentUser = await checkUserAuth();
            if (!currentUser) setAuthError({
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

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setAuthError(null);
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return currentUser;
    } catch (error) {
      console.error('User auth check failed:', error);
      if (isInvalidSessionError(error)) clearInvalidStoredSession();
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (isInvalidSessionError(error) || error.status === 403 || error?.response?.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('remember_login');
    sessionStorage.removeItem('active_login_session');
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