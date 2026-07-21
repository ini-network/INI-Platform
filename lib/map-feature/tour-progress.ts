// Shared transport for the cross-page guided tour (v6). Two cheap signals:
//
//  • SEEN_KEY (localStorage) — the tour has been seen; suppresses first-visit
//    auto-open. Bumped v4→v5 for the materially-new cross-page tour, then v5→v6
//    for the auto-enactment rewrite (the guide now performs the walkthrough and
//    paces it) — a materially-new tour, so every prior viewer sees it once.
//    Written EXACTLY once per tour end (map onClose/finish or page endTour) —
//    never on a segment handoff.
//
//  • PROGRESS_KEY (sessionStorage) — which page segment is mid-flight, with a
//    timestamp. Freshness TTL = 5 min. Written at each handoff (map→news,
//    news→stories); read by the page overlay to self-gate; cleared on tour end.
//    A `?tour=1` URL alone never resurrects tour chrome — the fresh, matching
//    progress key is the deliberate guard.

export const SEEN_KEY = "vngle-map-tour-v6";
const PROGRESS_KEY = "vngle-tour-v6";
const FRESH_MS = 300_000; // 5 min

export type TourSegment = "news" | "stories";

type Progress = { seg: TourSegment; ts: number };

// Record that a page segment is starting. Called just before the tour navigates
// to /news?tour=1 or /reports?tour=1.
export function startSegment(seg: TourSegment): void {
  try {
    window.sessionStorage.setItem(
      PROGRESS_KEY,
      JSON.stringify({ seg, ts: Date.now() } satisfies Progress)
    );
  } catch {
    // Private-mode throw: the page overlay simply won't render. Fixtures + the
    // honesty banner still show (they key off the URL), so nothing misleads.
  }
}

// The fresh segment, or null. Stale/absent entries are deleted so a later
// genuine first visit still works.
export function activeSegment(): TourSegment | null {
  try {
    const raw = window.sessionStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Progress;
    if (
      (parsed.seg === "news" || parsed.seg === "stories") &&
      typeof parsed.ts === "number" &&
      Date.now() - parsed.ts < FRESH_MS
    ) {
      return parsed.seg;
    }
    window.sessionStorage.removeItem(PROGRESS_KEY);
    return null;
  } catch {
    return null;
  }
}

// Terminal: mark the tour seen and clear the mid-flight progress. Idempotent.
export function endTour(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Best-effort — a throw just means the tour may auto-open again next visit.
  }
  try {
    window.sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    // no-op
  }
}
