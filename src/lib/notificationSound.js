// Áudio personalizado de notificação do chaveiro (solicitação de serviço no
// modo aplicativo e nova mensagem no modo livre). Reutiliza o mesmo elemento
// <audio> para permitir repetições rápidas sem recarregar.
const NOTIFICATION_AUDIO_URL =
  "https://media.base44.com/videos/public/6a975d266a8000184833026a/66d9d5d32_WhatsAppAudio2026-09-03at191639.mp4";

let audioEl = null;

// Bipe sintetizado usado quando o arquivo de áudio falha ou é bloqueado
function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    /* silencioso */
  }
}

export function playNotificationSound() {
  try {
    if (!audioEl) {
      audioEl = new Audio(NOTIFICATION_AUDIO_URL);
      audioEl.preload = "auto";
      audioEl.setAttribute("playsinline", "");
      audioEl.addEventListener("error", () => beep());
    }
    audioEl.currentTime = 0;
    const p = audioEl.play();
    if (p && typeof p.catch === "function") p.catch(() => beep());
  } catch (e) {
    beep();
  }
}