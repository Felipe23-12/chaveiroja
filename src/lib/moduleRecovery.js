const KEY = 'app-module-recovery-at';
const COOLDOWN = 5 * 60 * 1000;
export function isModuleLoadError(error) {
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|failed to load module script|chunkloaderror|loading chunk .+ failed/i.test(String(error?.message || error || ''));
}
export async function importWithRetry(loader, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  try { return await loader(); }
  catch (error) {
    if (!isModuleLoadError(error)) throw error;
    await wait(800);
    return loader();
  }
}
export function recoverModuleLoad(error, win = window, now = Date.now()) {
  if (!isModuleLoadError(error) || win.navigator?.onLine === false) return false;
  try {
    const previous = Number(win.sessionStorage.getItem(KEY));
    if (previous && now - previous < COOLDOWN) return false;
    win.sessionStorage.setItem(KEY, String(now));
  } catch { return false; } // A blocked storage must never cause a reload loop.
  const url = new URL(win.location.href);
  url.searchParams.set('app_refresh', String(now));
  win.location.replace(url.toString());
  return true;
}
