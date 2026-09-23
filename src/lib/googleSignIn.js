import { appParams } from '@/lib/app-params';

// Use o mesmo endpoint de Google do SDK, mas com navegação de página inteira
// para não abrir um popup bloqueado pelo WebView ou pelo navegador móvel.
export function loginWithGoogle(returnTo = '/') {
  const redirectUrl = new URL(returnTo, window.location.origin).toString();
  const base = appParams.appBaseUrl || window.location.origin;
  const loginUrl = new URL('/api/apps/auth/login', base);
  loginUrl.searchParams.set('app_id', appParams.appId);
  loginUrl.searchParams.set('from_url', redirectUrl);

  try {
    localStorage.removeItem('base44_access_token');
    localStorage.removeItem('token');
  } catch { /* armazenamento indisponível: siga para o login */ }

  // O Google recusa autenticação dentro de um iframe; saia dele pelo mesmo toque.
  if (window.top && window.top !== window.self) {
    try {
      window.top.location.href = loginUrl.toString();
      return;
    } catch { /* navegador não permite sair do iframe */ }
  }
  window.location.href = loginUrl.toString();
}