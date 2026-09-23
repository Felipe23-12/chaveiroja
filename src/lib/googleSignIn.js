import { appParams } from '@/lib/app-params';

// O SDK abre um popup quando o aplicativo está dentro de um iframe, e vários
// navegadores mobile bloqueiam popups — o botão fica sem reação. Aqui sempre
// fazemos uma navegação de página inteira, iniciada pelo toque do usuário.
export function loginWithGoogle(returnTo = '/') {
  const redirectUrl = new URL(returnTo, window.location.origin).toString();
  const base = appParams.appBaseUrl || window.location.origin;
  const loginUrl = new URL('/api/apps/auth/login', base);
  loginUrl.searchParams.set('app_id', appParams.appId);
  loginUrl.searchParams.set('from_url', redirectUrl);
  const target = loginUrl.toString();

  try {
    // Sai do iframe quando houver um, para o Google não bloquear o consentimento.
    if (window.top && window.top !== window.self) {
      window.top.location.href = target;
      return;
    }
  } catch {
    /* iframe de outra origem: segue com a navegação local abaixo. */
  }
  window.location.href = target;
}