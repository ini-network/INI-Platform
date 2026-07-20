"use client";

import { useEffect, useRef, useState } from "react";

// Tracks the VISUAL viewport (the region actually visible under the soft
// keyboard / browser chrome), which iOS Safari shrinks when a field is focused.
// Writes `--app-vh` on <html> so CSS (map sheet height, tour offsets) can size to
// the visible area instead of `100vh`, and returns { height, offsetTop } for JS
// geometry (easeTo bias, pinned bubbles). No-ops gracefully where
// window.visualViewport is undefined (falls back to innerHeight).

export interface VisualViewportState {
  height: number;
  offsetTop: number;
}

function read(): VisualViewportState {
  if (typeof window === "undefined") return { height: 0, offsetTop: 0 };
  const vv = window.visualViewport;
  return {
    height: vv ? vv.height : window.innerHeight,
    offsetTop: vv ? vv.offsetTop : 0
  };
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(read);
  // Last height written to --app-vh: only offsetTop-changing events (page scroll
  // under the keyboard) skip the style write, and the state bail below avoids a
  // fresh object per no-op resize/scroll burst re-rendering every consumer.
  const lastVhRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const next = read();
      setState((prev) =>
        prev.height === next.height && prev.offsetTop === next.offsetTop ? prev : next
      );
      if (lastVhRef.current !== next.height) {
        lastVhRef.current = next.height;
        document.documentElement.style.setProperty("--app-vh", `${next.height}px`);
      }
    };
    apply();
    const vv = window.visualViewport;
    if (!vv) return; // graceful no-op: no visualViewport, keep innerHeight fallback
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  return state;
}
