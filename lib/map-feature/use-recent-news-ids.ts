"use client";

import { useEffect, useState } from "react";

// The universe of "recent news" the unread badge counts against. Cached at
// module scope (the rail can remount on navigation) but with a short TTL +
// revalidation when the tab regains focus, so newly published stories enter the
// badge instead of it drifting stale for the whole session. The count itself
// drops as articles are marked read — that's driven by the read-store. Goes
// through the same-origin /api/news/ids route so the server-only API base URL
// never reaches the browser.

const TTL_MS = 3 * 60 * 1000;

let cache: number[] | null = null;
let cachedAt = 0;
let inflight: Promise<number[]> | null = null;

function isFresh(): boolean {
  return cache !== null && Date.now() - cachedAt < TTL_MS;
}

function fetchRecentIds(force = false): Promise<number[]> {
  if (!force && isFresh()) return Promise.resolve(cache as number[]);
  if (!inflight) {
    inflight = fetch("/api/news/ids?limit=60&lookback_days=30", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { ids: [] }))
      .then((data: { ids?: number[] }) => {
        cache = Array.isArray(data.ids) ? data.ids : [];
        cachedAt = Date.now();
        inflight = null;
        return cache;
      })
      .catch(() => {
        inflight = null;
        return cache ?? []; // keep the last good list on a transient failure
      });
  }
  return inflight;
}

export function useRecentNewsIds(): number[] {
  const [ids, setIds] = useState<number[]>(cache ?? []);
  useEffect(() => {
    let active = true;
    const load = (force = false) => {
      fetchRecentIds(force).then((value) => {
        if (active) setIds(value);
      });
    };
    load();
    // Re-check when the user comes back to the tab (cheap, only refetches if stale).
    const onFocus = () => {
      if (!isFresh()) load(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
  return ids;
}
