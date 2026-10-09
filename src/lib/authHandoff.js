export function needsAppHandoff() {
  return /Android/i.test(navigator.userAgent) && !/; wv\b/i.test(navigator.userAgent) && !new URLSearchParams(window.location.search).has('native_return') && !window.opener;
}
