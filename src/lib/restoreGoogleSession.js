import { base44 } from '@/api/base44Client';

// O retorno do Android pode atualizar o armazenamento sem recriar o cliente SDK.
// Reaplica somente a credencial entregue pelo login; a API valida a sessão.
export default async function restoreGoogleSession() {
  const params = new URLSearchParams(window.location.search);
  const incomingToken = params.get('access_token');
  const token = incomingToken || localStorage.getItem('base44_access_token') || localStorage.getItem('token');
  if (token) {
    base44.auth.setToken(token);
    if (incomingToken) {
      params.delete('access_token');
      params.delete('clear_access_token');
      window.history.replaceState({}, document.title, `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
    }
  }
  const authenticated = await base44.auth.isAuthenticated();
  if (authenticated) sessionStorage.setItem('active_login_session', 'true');
  return authenticated;
}