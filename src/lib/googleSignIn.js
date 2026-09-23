import { appParams } from '@/lib/app-params';

// O SDK abre um popup quando o aplicativo está dentro de um iframe, e vários
// navegadores mobile bloqueiam popups — o botão fica sem reação. Aqui sempre
// fazemos uma navegação de página inteira, iniciada pelo toque do usuário.
//
// No Android, uma credencial antiga inválida guardada no aparelho fazia a tela
// de entrada voltar em loop: o aplicativo reaproveitava o token expirado e
// caía novamente no login. Por isso a entrada passa primeiro pela saída do
// servidor, que limpa os cookies da sessão anterior, e o aparelho descarta a
// credencial local antes de sair da página.
export function loginWithGoogle(returnTo = '/') {
  const redirectUrl = new URL(returnTo, window.location.origin).toString();
  const base = appParams.appBaseUrl || window.location.origin;

  const loginUrl = new URL('/api/apps/auth/login', base);
  loginUrl.searchParams.set('app_id', appParams.appId);
  loginUrl.searchParams.set('from_url', redirectUrl);

  const target = new URL('/api/apps/auth/logout', base);
  target.searchParams.set('from_url', loginUrl.toString());

  try {
    localStorage.removeItem('base44_access_token');
    localStorage.removeItem('token');
  } catch { /* armazenamento indisponível: segue para o login */ }

  try {
    // Sai do iframe quando houver um, para o Google não bloquear o consentimento.
    if (window.top && window.top !== window.self) {
      window.top.location.href = target.toString();
      return;
    }
  } catch {
    /* iframe de outra origem: segue com a navegação local abaixo. */
  }
  window.location.href = target.toString();
}