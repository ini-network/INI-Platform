"use client";

import { useEffect, useState, type ReactNode } from "react";

import { NavRail } from "./nav-rail";
import { TabBar } from "./tab-bar";
import { TopBar } from "./top-bar";
import { PageTourOverlay } from "../tour/page-tour-overlay";

// New app shell for the redesign: left icon rail + top bar. Built alongside the
// legacy app-shell.tsx so routes can migrate one at a time.
export function AppShellV2({ children }: { children: ReactNode }) {
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    const _isIframe = window.self !== window.top;
    setIsIframe(_isIframe);

    if (!_isIframe) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor || !anchor.href) return;

      const url = new URL(anchor.href);
      // Intercept internal links to different pages
      if (
        url.origin === window.location.origin &&
        url.pathname !== window.location.pathname
      ) {
        e.preventDefault();
        e.stopPropagation();
        window.top!.location.href = url.pathname + url.search + url.hash;
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, []);

  if (isIframe) {
    return (
      <div className="cs-shell" style={{ background: "transparent" }}>
        <div className="cs-shell-main">
          <main className="cs-shell-content">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-shell">
      <div className="cs-shell-main" style={{ width: '100%' }}>
        <main className="cs-shell-content" style={{ padding: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
