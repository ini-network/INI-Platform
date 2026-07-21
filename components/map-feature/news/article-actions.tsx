"use client";

import { useState } from "react";

// Share copies a link to the in-app reader. Save is stubbed until Phase 3 (auth).
export function ArticleActions({ articleId }: { articleId: number }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/news/${articleId}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  return (
    <div className="cs-reader-actions">
      <button type="button" className="cs-reader-btn" onClick={share}>
        {copied ? "Link copied" : "Share"}
      </button>
    </div>
  );
}
