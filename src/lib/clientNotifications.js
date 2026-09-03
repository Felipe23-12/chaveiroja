/**
 * Utilitário de notificações para o cliente durante o acompanhamento.
 * Combina toast in-app (sempre visível) com notificação nativa do navegador
 * (funciona com o app em segundo plano, se permissão concedida).
 */

export async function ensureNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export function notifyClient(title, body) {
  // Notificação nativa do navegador (PWA em segundo plano)
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "https://media.base44.com/images/public/6a975d266a8000184833026a/dd1b4ee70_ChatGPTImage3desetde202614_01_55.png",
        badge: "https://media.base44.com/images/public/6a975d266a8000184833026a/dd1b4ee70_ChatGPTImage3desetde202614_01_55.png",
        tag: "chaveiro-status",
        renotify: true,
      });
    } catch {
      /* silencioso */
    }
  }
  // Vibração curta no celular
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {
      /* silencioso */
    }
  }
}