// Never include name, phone, address, browser identity or credentials in analytics.
export function trackGuestEvent(name, key, fields = {}) {
  try {
    const tag = Reflect.get(window, 'gtag');
    if (typeof tag !== 'function' || sessionStorage.getItem(key) === 'sent') return;
    tag('event', name, { request_source: 'web_guest', ...fields });
    sessionStorage.setItem(key, 'sent');
  } catch { /* Analytics must never interrupt a service. */ }
}
