"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import { PageTourOverlay } from "../tour/page-tour-overlay";

const subscribeToFrameContext = () => () => {};
const getFrameContext = () => window.self !== window.top;
const getServerFrameContext = () => false;

// New app shell for the redesign: left icon rail + top bar. Built alongside the
// legacy app-shell.tsx so routes can migrate one at a time.
export function AppShellV2({ children }: { children: ReactNode }) {
  const isIframe = useSyncExternalStore(
    subscribeToFrameContext,
    getFrameContext,
    getServerFrameContext
  );

  useEffect(() => {
    if (!isIframe) return;

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
  }, [isIframe]);

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
      {/* Cross-page tour engine for the /news and /reports guide segments.
          Renders nothing unless a tour segment is actually mid-flight, so it
          costs nothing on normal visits. */}
      <PageTourOverlay />
    </div>
  );
}
