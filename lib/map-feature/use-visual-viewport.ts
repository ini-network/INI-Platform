"use client";

import { useEffect, useRef, useState } from "react";

// Tracks the VISUAL viewport (the region actually visible under the soft
// keyboard / browser chrome), which iOS Safari shrinks when a field is focused.
// Writes visual-viewport CSS variables on <html> so overlays can size to the
// visible area and sit above the soft keyboard without shrinking their whole
// layout host. Returns the same geometry for JS consumers (easeTo bias, pinned
// bubbles). No-ops gracefully where window.visualViewport is undefined (falls
// back to innerHeight).

export interface VisualViewportState {
  height: number;
  offsetTop: number;
  bottomInset: number;
}

function read(): VisualViewportState {
  if (typeof window === "undefined") return { height: 0, offsetTop: 0, bottomInset: 0 };
  const vv = window.visualViewport;
  const height = vv ? vv.height : window.innerHeight;
  // Some iOS releases update pageTop before offsetTop during the keyboard
  // animation. Use whichever reports the larger visible-page displacement.
  const offsetTop = vv
    ? Math.max(vv.offsetTop, vv.pageTop - window.scrollY, 0)
    : 0;
  return {
    height,
    offsetTop,
    // iOS keeps the layout viewport tall while the keyboard shrinks/pans only
    // the visual viewport. This is the hidden band below the visible viewport.
    // Browsers that resize innerHeight with the keyboard naturally report zero.
    bottomInset: Math.max(0, window.innerHeight - height - offsetTop)
  };
}

export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(read);
  // Last values written to CSS. The state bail below also avoids a fresh object
  // per no-op resize/scroll burst re-rendering every consumer.
  const lastVhRef = useRef<number | null>(null);
  const lastBottomInsetRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const next = read();
      setState((prev) =>
        prev.height === next.height &&
        prev.offsetTop === next.offsetTop &&
        prev.bottomInset === next.bottomInset
          ? prev
          : next
      );
      if (lastVhRef.current !== next.height) {
        lastVhRef.current = next.height;
        document.documentElement.style.setProperty("--app-vh", `${next.height}px`);
      }
      if (lastBottomInsetRef.current !== next.bottomInset) {
        lastBottomInsetRef.current = next.bottomInset;
        document.documentElement.style.setProperty(
          "--app-vv-bottom",
          `${next.bottomInset}px`
        );
      }
    };
    apply();
    const vv = window.visualViewport;
    if (vv) {
      let firstFrame: number | null = null;
      let secondFrame: number | null = null;
      const onViewportChange = () => {
        apply();
        if (firstFrame !== null) cancelAnimationFrame(firstFrame);
        if (secondFrame !== null) cancelAnimationFrame(secondFrame);
        // WebKit can publish its final visualViewport geometry after the resize
        // event. Re-read across two paint frames without holding stale values.
        firstFrame = requestAnimationFrame(() => {
          firstFrame = null;
          secondFrame = requestAnimationFrame(() => {
            secondFrame = null;
            apply();
          });
        });
      };
      vv.addEventListener("resize", onViewportChange);
      vv.addEventListener("scroll", onViewportChange);
      return () => {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
        if (firstFrame !== null) cancelAnimationFrame(firstFrame);
        if (secondFrame !== null) cancelAnimationFrame(secondFrame);
      };
    }
    // Older Android WebViews/browsers expose only innerHeight. Keep that fallback
    // live across keyboard and rotation changes instead of freezing the mount
    // value for the rest of the session.
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return state;
}
