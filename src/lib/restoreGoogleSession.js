import { base44 } from '@/api/base44Client';

// O retorno do Android pode atualizar o armazenamento sem recriar o cliente SDK.
// Reaplica somente a credencial entregue pelo login; a API valida a sessão.
export default async function restoreGoogleSession() {
  const params = new URLSearchParams(window.location.search);
  const incomingToken = params.get('access_token');
  let token = incomingToken;
  if (!token) { try { token = localStorage.getItem('base44_access_token') || localStorage.getItem('token'); } catch { /* blocked storage: use authenticated cookie */ } }
  if (token) {
    base44.auth.setToken(token);
    if (incomingToken) {
      params.delete('access_token');
      params.delete('clear_access_token');
      window.history.replaceState({}, document.title, `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
    }
  }
  const authenticated = await base44.auth.isAuthenticated();
  if (authenticated) { try { sessionStorage.setItem('active_login_session', 'true'); } catch { /* blocked storage */ } }
  return authenticated;
}