"use client";

import { useEffect, useRef, type RefObject } from "react";

// The tour chrome is position:fixed in VIEWPORT space, but the map shell no
// longer owns the viewport — the host site renders its own sticky header above
// it. This hook measures where the shell actually starts and shares it two ways:
//  • returns a ref for the engines' JS placement clamps (bubble floors, the
//    spotlight hole's top edge), and
//  • writes --tour-shell-top on <html> for the CSS that pins tour chrome
//    (phone bubble pinning, the skip toast, the centered card's padding).
// Host-agnostic: it reads the shell's own bounding box, so any header height —
// or none at all (standalone app) — just works. Re-measured on resize.
export function useShellTop(): RefObject<number> {
  const topRef = useRef(0);
  useEffect(() => {
    const measure = () => {
      const shell = document.querySelector(".cs-shell");
      const top = shell ? Math.max(0, Math.round(shell.getBoundingClientRect().top)) : 0;
      topRef.current = top;
      document.documentElement.style.setProperty("--tour-shell-top", `${top}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  return topRef;
}
