import { useEffect, useLayoutEffect, useRef } from 'react';

let owner = null;
let routes = {};
let scroll = {};
const subroutes = { '/': ['/chat', '/chaveiro', '/acompanhamento'] };
export const isTabActive = (tab, path) => tab === path || (tab !== '/' && path.startsWith(`${tab}/`)) || (subroutes[tab] || []).some(prefix => path === prefix || path.startsWith(`${prefix}/`));

export default function useMobileTabNavigation(location, tabs, identity) {
  if (owner !== identity) { owner = identity; routes = {}; scroll = {}; }
  const path = `${location.pathname}${location.search}${location.hash}`;
  const active = tabs.find(tab => isTabActive(tab.path, location.pathname));
  const lastPosition = useRef(window.scrollY);
  useLayoutEffect(() => {
    if (active) routes[active.path] = path;
    lastPosition.current = scroll[path] ?? 0;
    const remember = () => { lastPosition.current = window.scrollY; };
    window.addEventListener('scroll', remember, { passive: true });
    return () => {
      scroll[path] = lastPosition.current;
      window.removeEventListener('scroll', remember);
    };
  }, [path, active?.path, identity]);
  useEffect(() => {
    if (!window.matchMedia('(max-width: 767px)').matches || location.hash) return;
    const saved = scroll[path];
    if (saved == null) return;
    const restore = () => window.scrollTo({ top: saved, left: 0, behavior: 'instant' });
    const frame = requestAnimationFrame(restore);
    const timer = setTimeout(restore, 220);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [path, identity, location.hash]);
  const destination = tab => active?.path === tab ? path : routes[tab] || tab;
  const onClick = (event, tab) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    scroll[path] = window.scrollY;
    lastPosition.current = window.scrollY;
    if (destination(tab) === path) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  };
  return { destination, onClick };
}