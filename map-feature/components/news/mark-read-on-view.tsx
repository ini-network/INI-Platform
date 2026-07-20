"use client";

import { useEffect } from "react";

import { markNewsRead } from "../../lib/news-read";

// Marks an article read whenever the reader opens it — covers every entry point
// (the /news grid, related cards, the overview "Today's News" list, the map, or
// a direct link), so its unread dot and the nav badge clear on open.
export function MarkReadOnView({ id }: { id: number }) {
  useEffect(() => {
    // During the guided tour (?tour=1) the cards are staging fixtures; don't
    // write their ids into the persistent read-set (mirrors NewsCard's guard).
    if (new URLSearchParams(window.location.search).get("tour") !== "1") {
      markNewsRead(id);
    }
  }, [id]);
  return null;
}
