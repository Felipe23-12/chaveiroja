// Áudio personalizado de notificação do chaveiro (solicitação de serviço no
// modo aplicativo e nova mensagem no modo livre). Reutiliza o mesmo elemento
// <audio> para permitir repetições rápidas sem recarregar.
const NOTIFICATION_AUDIO_URL =
  "https://media.base44.com/videos/public/6a975d266a8000184833026a/66d9d5d32_WhatsAppAudio2026-09-03at191639.mp4";

let audioEl = null;

export function playNotificationSound() {
  try {
    if (!audioEl) {
      audioEl = new Audio(NOTIFICATION_AUDIO_URL);
      audioEl.preload = "auto";
    }
    audioEl.currentTime = 0;
    const p = audioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (e) {
    // silencioso se o navegador bloquear áudio
  }
}