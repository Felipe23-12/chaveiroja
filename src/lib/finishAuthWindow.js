// No Android o WebView pode abrir o consentimento do Google em uma janela
// separada. Ao voltar, o aplicativo ficaria carregado dentro dessa janela.
// Aqui devolvemos o destino para a janela original e fechamos a auxiliar;
// quando não existe janela original, seguimos normalmente na atual.
export default function finishAuthWindow(destination) {
  const url = new URL(destination, window.location.origin).toString();
  try {
    const parent = window.opener && !window.opener.closed ? window.opener : null;
    if (parent && parent !== window.self) {
      parent.location.replace(url);
      window.close();
      // Se o navegador não permitir fechar, mostramos o app nesta janela.
      setTimeout(() => window.location.replace(url), 800);
      return;
    }
  } catch { /* janela de outra origem: continua nesta. */ }
  window.location.replace(url);
}