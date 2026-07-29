"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BoroughInsightsPanel } from "../insights/borough-insights-panel";
import type { BoroughOverview } from "@/lib/map-feature/borough-overview";
import type { NeighborhoodSignalsResponse } from "@/lib/map-feature/signal-types";
import { SEEN_KEY, activeSegment, startSegment } from "@/lib/map-feature/tour-progress";
import { BoroughOverviewMap } from "./borough-overview-map";
import { SignalsMapExperience } from "./signals-map-experience";
import mapStyles from "./map-signals.module.css";

const ALL_BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

// localStorage gate for the guided map tour, shared across the cross-page tour
// (SEEN_KEY, bumped v4→v5). Written once at any tour end so returning visitors
// aren't re-interrupted.
const TOUR_SEEN_KEY = SEEN_KEY;

type MapMode = "signals" | "reports";

type Props = {
  boroughGeoJson: unknown;
  labelsGeoJson: unknown;
  neighborhoodGeoJson: unknown;
  initialBorough: string;
  initialTimeWindow: string;
  initialIssueType: string;
  initialAreaId: number | null;
  initialOverview: BoroughOverview | null;
  initialSignals: NeighborhoodSignalsResponse | null;
};

function cacheKey(borough: string, timeWindow: string, issueType: string): string {
  return `${borough}|${timeWindow}|${issueType}`;
}

/**
 * Client orchestrator for the Map page. Holds the selected borough, time window
 * and issue type in client state and an in-memory cache of borough overviews.
 * Revisiting an already-loaded combination is instant (cache hit → no fetch).
 */
export function MapExperience({
  boroughGeoJson,
  labelsGeoJson,
  neighborhoodGeoJson,
  initialBorough,
  initialTimeWindow,
  initialIssueType,
  initialAreaId,
  initialOverview,
  initialSignals
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<MapMode>("signals");
  // Guided-tour host state. `tourOpen` drives the tour overlay (rendered by
  // SignalsMapExperience). `tourBlockedTick` increments each time a mode switch
  // is soft-blocked while the tour runs, so the tour can speak to the attempt.
  const [tourOpen, setTourOpen] = useState(false);
  const [tourBlockedTick, setTourBlockedTick] = useState(0);
  // A transient toast shown after the tour is closed on the map (skip/Esc/rail-end)
  // pointing at the ? launcher so the user knows the guide can be replayed.
  const [showSkipToast, setShowSkipToast] = useState(false);
  const [borough, setBorough] = useState(initialBorough);
  const [timeWindow, setTimeWindow] = useState(initialTimeWindow);
  const [issueType, setIssueType] = useState(initialIssueType);
  const [areaId, setAreaId] = useState<number | null>(initialAreaId);
  const [overview, setOverview] = useState<BoroughOverview | null>(initialOverview);
  const [loading, setLoading] = useState(false);

  const cacheRef = useRef<Map<string, BoroughOverview>>(new Map());
  const boroughRef = useRef(borough);
  boroughRef.current = borough;
  const timeWindowRef = useRef(timeWindow);
  timeWindowRef.current = timeWindow;
  const issueTypeRef = useRef(issueType);
  issueTypeRef.current = issueType;

  // Seed the cache with the server-rendered initial overview.
  if (initialOverview && !cacheRef.current.has(cacheKey(initialBorough, initialTimeWindow, initialIssueType))) {
    cacheRef.current.set(cacheKey(initialBorough, initialTimeWindow, initialIssueType), initialOverview);
  }

  const fetchOverview = useCallback(
    async (
      targetBorough: string,
      targetWindow: string,
      targetIssue: string
    ): Promise<BoroughOverview | null> => {
      const key = cacheKey(targetBorough, targetWindow, targetIssue);
      const cached = cacheRef.current.get(key);
      if (cached) {
        return cached;
      }
      const params = new URLSearchParams({
        borough: targetBorough,
        time_window: targetWindow,
        issue_type: targetIssue
      });
      const response = await fetch(`/api/map/borough-overview?${params.toString()}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as BoroughOverview;
      cacheRef.current.set(key, data);
      return data;
    },
    []
  );

  const apply = useCallback(
    async (targetBorough: string, targetWindow: string, targetIssue: string) => {
      const key = cacheKey(targetBorough, targetWindow, targetIssue);
      const cached = cacheRef.current.get(key);
      if (cached) {
        setOverview(cached);
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await fetchOverview(targetBorough, targetWindow, targetIssue);
      // Only apply if this is still the active selection (avoids races).
      if (
        boroughRef.current === targetBorough &&
        timeWindowRef.current === targetWindow &&
        issueTypeRef.current === targetIssue
      ) {
        setOverview(data);
        setLoading(false);
      }
    },
    [fetchOverview]
  );

  const handleSelectBorough = useCallback(
    (next: string) => {
      if (next === boroughRef.current) {
        return;
      }
      setBorough(next);
      setAreaId(null);
      void apply(next, timeWindowRef.current, issueTypeRef.current);
    },
    [apply]
  );

  const handleTimeWindowChange = useCallback(
    (next: string) => {
      if (next === timeWindowRef.current) {
        return;
      }
      setTimeWindow(next);
      void apply(boroughRef.current, next, issueTypeRef.current);
    },
    [apply]
  );

  const handleIssueTypeChange = useCallback(
    (next: string) => {
      if (next === issueTypeRef.current) {
        return;
      }
      setIssueType(next);
      void apply(boroughRef.current, timeWindowRef.current, next);
    },
    [apply]
  );

  // Signals mode shares the selected borough but needs no report fetch — the
  // whole signal set is already in memory. The URL-sync effect below handles the
  // shareable link.
  const handleSelectBoroughSignals = useCallback((next: string) => {
    if (next === boroughRef.current) {
      return;
    }
    setBorough(next);
  }, []);

  const handleAreaChange = useCallback((next: number | null) => {
    setAreaId(next);
  }, []);

  const handleModeChange = useCallback(
    (next: MapMode) => {
      // Soft-block 311 Reports while the tour is open: switching would unmount
      // SignalsMapExperience (the tour's host). Instead of doing nothing, bump a
      // tick the tour reads so it can say "311 opens right after the guide."
      if (next === "reports" && tourOpen) {
        setTourBlockedTick((tick) => tick + 1);
        return;
      }
      setMode(next);
      // Entering reports: make sure the panel reflects the borough that may have
      // been changed while reading signals (usually a cache hit → instant).
      if (next === "reports") {
        void apply(boroughRef.current, timeWindowRef.current, issueTypeRef.current);
      }
    },
    [apply, tourOpen]
  );

  // Closing the tour (finish, skip, Esc, or a rail navigation) persists the
  // seen-key from one place, so any close path suppresses the next auto-open.
  const handleTourClose = useCallback(() => {
    setTourOpen(false);
    setShowSkipToast(true);
    try {
      window.localStorage.setItem(TOUR_SEEN_KEY, "1");
    } catch {
      // Best-effort: a private-mode throw just means the tour may auto-open
      // again next visit. Nothing to recover.
    }
  }, []);

  // Self-dismiss the skip toast ~4s after it appears.
  useEffect(() => {
    if (!showSkipToast) {
      return;
    }
    const id = window.setTimeout(() => setShowSkipToast(false), 4000);
    return () => window.clearTimeout(id);
  }, [showSkipToast]);

  // Bridge to the /news segment: the tour's News-rail stop was clicked. Record
  // the mid-flight segment (fresh sessionStorage) and navigate; do NOT write the
  // seen-key here — the tour continues on /news, and only its true end persists.
  const handleTourBridge = useCallback(() => {
    startSegment("news");
    const url = "/news?tour=1";
    if (window.self !== window.top) {
      window.top!.location.href = url;
    } else {
      router.push(url);
    }
  }, [router]);

  // The persistent "?" launcher replays the tour. It also forces Signals mode so
  // the tour's host is mounted (the launcher lives beside the 311 toggle).
  const handleReplayTour = useCallback(() => {
    setMode("signals");
    setShowSkipToast(false);
    setTourOpen(true);
  }, []);

  // Keep the URL shareable without triggering a server navigation/refetch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("borough", borough);
    params.set("time_window", timeWindow);
    params.set("issue_type", issueType);
    if (areaId === null) {
      params.delete("area_id");
    } else {
      params.set("area_id", String(areaId));
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [borough, timeWindow, issueType, areaId]);

  // First-visit auto-open of the guided tour. Runs once after hydration; gated
  // on real signals (a null set means there's nothing on the map to teach) and
  // on the seen-key so returning visitors aren't interrupted. try/catch covers
  // private-mode localStorage throws — a throw simply skips the auto-open.
  useEffect(() => {
    if (initialSignals === null) {
      return;
    }
    // Belt-and-braces (F4): a fresh page segment mid-flight (e.g. Back to /map
    // during the tour) means the tour is running elsewhere — don't relaunch from
    // stop 1. The SEEN_KEY check below remains the load-bearing gate.
    if (activeSegment() !== null) {
      return;
    }
    try {
      if (window.localStorage.getItem(TOUR_SEEN_KEY)) {
        return;
      }
    } catch {
      return;
    }
    setTourOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warm the cache for the other boroughs (at the initial window/issue) so the
  // first switch is instant. Fired once.
  useEffect(() => {
    let cancelled = false;
    // Warm these best-effort prefetches when the main thread next goes idle (a
    // short-timeout fallback where requestIdleCallback is missing) instead of a
    // flat 3s delay — the old delay widened the desktop 311-lens cold window. A
    // borough switched before they land just fetches on demand via apply(); this
    // only warms the cache for later switches. Track which scheduler ran so the
    // cleanup cancels the matching one.
    const useIdle = "requestIdleCallback" in window;
    const schedule = useIdle
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2000 })
      : (cb: () => void) => window.setTimeout(cb, 1500);
    const handle = schedule(() => {
      for (const other of ALL_BOROUGHS) {
        if (other === initialBorough) {
          continue;
        }
        const key = cacheKey(other, initialTimeWindow, initialIssueType);
        if (cacheRef.current.has(key)) {
          continue;
        }
        const params = new URLSearchParams({
          borough: other,
          time_window: initialTimeWindow,
          issue_type: initialIssueType
        });
        fetch(`/api/map/borough-overview?${params.toString()}`, { cache: "no-store" })
          .then((response) => (response.ok ? response.json() : null))
          .then((data: BoroughOverview | null) => {
            if (data && !cancelled) {
              cacheRef.current.set(key, data);
            }
          })
          .catch((err) => {
            // Cache-warming only — don't surface to the user, but don't swallow
            // silently either (a 200-with-HTML body or network error lands here).
            console.warn(`borough overview prefetch failed (${other}):`, err);
          });
      }
    });
    return () => {
      cancelled = true;
      if (useIdle) {
        cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cs-overview">
      {mode === "signals" ? (
        <SignalsMapExperience
          initialSignals={initialSignals}
          boroughGeoJson={boroughGeoJson}
          labelsGeoJson={labelsGeoJson}
          neighborhoodGeoJson={neighborhoodGeoJson}
          activeBorough={borough}
          onSelectBorough={handleSelectBoroughSignals}
          initialAreaId={areaId}
          onAreaChange={handleAreaChange}
          tourOpen={tourOpen}
          onTourClose={handleTourClose}
          onTourBridge={handleTourBridge}
          tourBlockedTick={tourBlockedTick}
        />
      ) : (
        <>
          <BoroughOverviewMap
            boroughGeoJson={boroughGeoJson}
            labelsGeoJson={labelsGeoJson}
            selectedBorough={borough}
            onSelectBorough={handleSelectBorough}
          />
          {loading ? (
            <div className="cs-map-loading" aria-live="polite">
              Loading…
            </div>
          ) : null}
          {overview ? (
            <BoroughInsightsPanel
              overview={overview}
              timeWindow={timeWindow}
              issueType={issueType}
              loading={loading}
              onTimeWindowChange={handleTimeWindowChange}
              onIssueTypeChange={handleIssueTypeChange}
            />
          ) : (
            <aside className="cs-insights">
              <p className="cs-empty">
                Insights unavailable — start the API (apps/api) on the configured base URL.
              </p>
            </aside>
          )}
        </>
      )}

      {showSkipToast ? (
        <div className={mapStyles.tourSkipToast} role="status">
          Restart the tour anytime — click the ? up there.
        </div>
      ) : null}

      <div className={mapStyles.modeToggle} role="group" aria-label="Map view">
        <button
          type="button"
          className={`${mapStyles.modeBtn}${
            mode === "signals" ? ` ${mapStyles.modeBtnActive}` : ""
          }`}
          aria-pressed={mode === "signals"}
          onClick={() => handleModeChange("signals")}
        >
          Community Signals
        </button>
        <button
          type="button"
          className={`${mapStyles.modeBtn}${
            mode === "reports" ? ` ${mapStyles.modeBtnActive}` : ""
          }`}
          aria-pressed={mode === "reports"}
          onClick={() => handleModeChange("reports")}
        >
          311 Reports
        </button>
        {/* The guide teaches the Signals lens; when signals are unavailable its
            Filter stop is unanchorable, so hide the launcher rather than open a
            soft-broken tour (finding 2). */}
        {initialSignals !== null ? (
          <button
            type="button"
            className={mapStyles.modeBtn}
            aria-label="Replay the map guide"
            title="Replay the map guide"
            onClick={handleReplayTour}
          >
            ?
          </button>
        ) : null}
      </div>
    </div>
  );
}
