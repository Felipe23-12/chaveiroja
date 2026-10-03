import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function MobileMenuViewport({ children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const viewport = window.visualViewport;
    let unlock;
    const sync = () => {
      if (!media.matches) { unlock?.(); unlock = null; return; }
      if (!unlock) {
        const body = document.body;
        const scrollY = window.scrollY;
        const previous = Object.fromEntries(['position', 'top', 'width', 'overflow'].map(key => [key, body.style[key]]));
        Object.assign(body.style, { position: 'fixed', top: `-${scrollY}px`, width: '100%', overflow: 'hidden' });
        unlock = () => {
          Object.assign(body.style, previous);
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        };
      }
      ref.current.style.height = `${viewport?.height || window.innerHeight}px`;
      ref.current.style.top = `${viewport?.offsetTop || 0}px`;
    };
    sync();
    window.addEventListener('resize', sync);
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    media.addEventListener('change', sync);
    return () => {
      window.removeEventListener('resize', sync);
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      media.removeEventListener('change', sync);
      unlock?.();
    };
  }, []);
  return createPortal(
    <div ref={ref} className="md:hidden fixed inset-x-0 top-0 z-50 flex h-full overflow-hidden overscroll-none">
      {children}
    </div>,
    document.body
  );
}