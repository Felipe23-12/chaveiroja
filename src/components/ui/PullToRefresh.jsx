import React, { useState, useRef, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";

const THRESHOLD = 70;

/**
 * Hook de pull-to-refresh mobile: detecta um arrasto para baixo quando a
 * página está no topo, exibe um indicador animado e dispara o callback.
 * Funciona com a rolagem nativa da janela (body scroll).
 */
export function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0);
  const refreshFn = useRef(onRefresh);
  refreshFn.current = onRefresh;

  useEffect(() => {
    const onStart = (e) => {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };
    const onMove = (e) => {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        pullRef.current = Math.min(delta * 0.5, 100);
        setPull(pullRef.current);
      }
    };
    const onEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          await refreshFn.current?.();
        } finally {
          setRefreshing(false);
          setPull(0);
          pullRef.current = 0;
        }
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [refreshing]);

  return { pull, refreshing };
}

/** Indicador visual do pull-to-refresh (spinner / seta rotacionando). */
export function PullToRefreshIndicator({ pull, refreshing }) {
  return (
    <div
      style={{
        height: refreshing ? THRESHOLD : pull,
        transition: "height 0.2s ease",
      }}
      className="flex items-center justify-center overflow-hidden"
    >
      {refreshing ? (
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      ) : (
        pull > 5 && (
          <RefreshCw
            className="w-5 h-5 text-muted-foreground"
            style={{ transform: `rotate(${pull * 3}deg)` }}
          />
        )
      )}
    </div>
  );
}