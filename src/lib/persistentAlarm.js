// Alarme sonoro persistente do chaveiro: toca em loop enquanto houver
// chamados pendentes, mesmo com o app minimizado (o áudio em loop continua
// no WebView/navegador) e volta a tocar quando o app é reaberto.

const ALARM_URL =
  "https://media.base44.com/videos/public/6a975d266a8000184833026a/66d9d5d32_WhatsAppAudio2026-09-03at191639.mp4";

let audioEl = null;
let vibrateTimer = null;
let visibilityBound = false;
let active = false;

function getAudio() {
  if (!audioEl) {
    audioEl = new Audio(ALARM_URL);
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.volume = 1;
  }
  return audioEl;
}

function tryPlay() {
  const el = getAudio();
  const p = el.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

/**
 * Libera o áudio no primeiro toque do usuário (exigência dos navegadores
 * móveis). Deve ser chamado uma vez ao carregar o painel do chaveiro.
 */
export function primeAlarmAudio() {
  const unlock = () => {
    const el = getAudio();
    el.muted = true;
    const p = el.play();
    const done = () => {
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      if (active) tryPlay();
    };
    if (p && typeof p.then === "function") p.then(done).catch(() => { el.muted = false; });
    else done();
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
  };
  window.addEventListener("touchstart", unlock, { once: true });
  window.addEventListener("click", unlock, { once: true });
}

/** Inicia (ou mantém) o alarme em loop + vibração contínua. */
export function startAlarm() {
  active = true;
  tryPlay();

  if (!vibrateTimer && navigator.vibrate) {
    navigator.vibrate([400, 200, 400]);
    vibrateTimer = setInterval(() => navigator.vibrate([400, 200, 400]), 4000);
  }

  // Ao voltar do segundo plano, garante que o som continue tocando
  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (active && !document.hidden) tryPlay();
    });
  }
}

/** Para o alarme (chamado aceito/recusado ou som silenciado). */
export function stopAlarm() {
  active = false;
  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
  if (vibrateTimer) {
    clearInterval(vibrateTimer);
    vibrateTimer = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);
}