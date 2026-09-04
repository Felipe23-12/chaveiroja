// Alarme sonoro persistente do chaveiro: toca o áudio personalizado em loop
// enquanto houver chamados pendentes e volta a tocar quando o app é reaberto.
// Se o navegador bloquear ou não conseguir reproduzir o arquivo, cai
// automaticamente para um bipe sintetizado — o chaveiro nunca fica sem alerta.

const ALARM_URL =
  "https://media.base44.com/videos/public/6a975d266a8000184833026a/66d9d5d32_WhatsAppAudio2026-09-03at191639.mp4";

let audioEl = null;
let vibrateTimer = null;
let beepTimer = null;
let listenersBound = false;
let active = false;

function getAudio() {
  if (!audioEl) {
    audioEl = new Audio(ALARM_URL);
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.volume = 1;
    audioEl.setAttribute("playsinline", "");
    // Arquivo indisponível/incompatível → garante o alerta com bipe
    audioEl.addEventListener("error", () => {
      if (active) startBeepLoop();
    });
  }
  return audioEl;
}

// Bipe sintetizado (WebAudio) usado como reserva
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

function startBeepLoop() {
  if (beepTimer) return;
  beep();
  beepTimer = setInterval(() => {
    beep();
    setTimeout(beep, 300);
  }, 3000);
}

function stopBeepLoop() {
  if (beepTimer) {
    clearInterval(beepTimer);
    beepTimer = null;
  }
}

function tryPlay() {
  const el = getAudio();
  try {
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(stopBeepLoop).catch(() => {
        // Autoplay bloqueado → mantém o bipe até o primeiro toque na tela
        if (active) startBeepLoop();
      });
    } else {
      stopBeepLoop();
    }
  } catch (e) {
    if (active) startBeepLoop();
  }
}

// Qualquer toque/clique na tela libera o áudio e retoma o alarme
function bindListeners() {
  if (listenersBound) return;
  listenersBound = true;
  const onInteract = () => {
    if (active) tryPlay();
  };
  window.addEventListener("touchstart", onInteract);
  window.addEventListener("click", onInteract);
  document.addEventListener("visibilitychange", () => {
    if (active && !document.hidden) tryPlay();
  });
}

/** Pré-carrega o áudio e prepara a liberação no primeiro toque do usuário. */
export function primeAlarmAudio() {
  getAudio().load();
  bindListeners();
}

/** Inicia (ou mantém) o alarme em loop + vibração contínua. */
export function startAlarm() {
  active = true;
  bindListeners();
  tryPlay();

  if (!vibrateTimer && navigator.vibrate) {
    const pattern = [200, 100, 200, 100, 200];
    navigator.vibrate(pattern);
    vibrateTimer = setInterval(() => navigator.vibrate(pattern), 3000);
  }
}

/** Para o alarme (chamado aceito/recusado ou som silenciado). */
export function stopAlarm() {
  active = false;
  stopBeepLoop();
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