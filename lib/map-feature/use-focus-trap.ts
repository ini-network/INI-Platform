"use client";

import { useEffect, type RefObject } from "react";

// Traps Tab / Shift+Tab focus within `containerRef` while it's mounted, so a
// keyboard user can't step out of an open modal dialog into the page behind it
// (and open a second modal). Focusables are queried live on each Tab, so it
// tracks content that mounts after open (the async-loaded reader body, related
// cards). Extracted from PostModal and shared with the news reader.
export function useFocusTrap<T extends HTMLElement>(containerRef: RefObject<T | null>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const panel = containerRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>("a[href], button");
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [containerRef]);
}
