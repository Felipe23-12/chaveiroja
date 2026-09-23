// No Android o WebView pode abrir o consentimento do Google em uma janela
// separada. Ao voltar, o aplicativo ficaria carregado dentro dessa janela.
// Aqui devolvemos o destino para a janela original e fechamos a auxiliar;
// quando não existe janela original, seguimos normalmente na atual.
export default function finishAuthWindow(destination) {
  const url = new URL(destination, window.location.origin);
  try {
    const parent = window.opener && !window.opener.closed ? window.opener : null;
    if (parent && parent !== window.self && parent.location.origin === window.location.origin) {
      // Janelas WebView podem ter armazenamentos separados. Entregue à janela
      // principal a sessão validada antes de fechar a janela de autenticação.
      const token = localStorage.getItem('base44_access_token');
      if (token) url.searchParams.set('access_token', token);
      parent.location.replace(url.toString());
      window.close();
      return;
    }
  } catch { /* Sem acesso à janela principal: permaneça nesta. */ }
  window.location.replace(destination);
}