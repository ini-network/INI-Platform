"use client";

import { useState } from "react";

export function TopBar() {
  const [copied, setCopied] = useState(false);

  function share() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        })
        .catch(() => {});
    }
  }

  return (
    <header className="cs-topbar">
      <div className="cs-brand-lockup">
        <strong>Vngle</strong>
        <span>Civic Signal</span>
      </div>
      <div className="cs-topbar-actions">
        <button type="button" className="cs-tb-btn" onClick={share}>
          {copied ? "Copied!" : "Share"}
        </button>
      </div>
    </header>
  );
}
