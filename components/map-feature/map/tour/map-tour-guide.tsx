"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";

import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import { useVisualViewport } from "@/lib/map-feature/use-visual-viewport";
import type { SheetSnap } from "@/lib/map-feature/use-sheet-state";
import { useShellTop } from "../../tour/use-shell-top";
import { liveStops, type TourEnact, type TourStop } from "./tour-stops";
import styles from "./map-tour.module.css";

// Deliberate, proven timings (Amendment 6 — adopted as choices, not guesses):
const SUCCESS_REVEAL_MS = 700; // quiet ✓ beat before advancing (action stops)
const MAP_MISS_MS = 500; // a canvas click may land on water → no state change; wait before nudging
const LOST_LATCH_FRAMES = 25; // ~0.4s of missing frames before latching anchorLost
const MOVE_GATE = 0.5; // px the anchor must move before we re-position (idle frames stay quiet)
// One-shot position ease as the ring/bubble settle onto a new stop's anchor (B2).
// SETTLE_MS is the MINIMUM the ease is held; it is then kept until the anchor rect
// goes quiescent (the stop's own choreography — scrollIntoView ~300-500ms, sheet
// snap 220ms, reader grow 440ms — has come to rest) so the class isn't dropped mid-
// motion (which would snap the trailing gap). After the ease the overlay tracks the
// anchor RAW — no position transition — so a scrolling anchor stays glued instead of
// easing toward a stale target. SETTLE_CEIL_MS caps it so it can never stick.
const SETTLE_MS = 180;
// 700 (was 1200): long enough for the slowest stop choreography above, short
// enough that a late-reflowing anchor (e.g. images loading under it) stops
// "chasing" through the eased writes well under a second.
const SETTLE_CEIL_MS = 700;

type Rect = { top: number; left: number; width: number; height: number };

// The dim/spotlight pad — matches the ring's -6px inset so the hole frames the
// target exactly as the ring does.
const DIM_PAD = 6;

// Pure position math (B): ring inset + the spotlight hole geometry, both derived
// from the tracked anchor rect. Written straight to the DOM every rAF frame.
function ringInset(rect: Rect, minTop = 0): Rect {
  // Clamp the ring's top to the shell edge (minTop) so a tall anchor that scrolls
  // up behind the host header doesn't draw ring borders through the dimmed header
  // band — the ring frames only the visible (spotlit) part, matching holeGeom.
  const top = Math.max(rect.top - 6, minTop);
  const bottom = rect.top + rect.height + 6;
  return { top, left: rect.left - 6, width: rect.width + 12, height: Math.max(0, bottom - top) };
}
function holeGeom(rect: Rect, minTop = 0) {
  // minTop: the map shell's top edge in viewport space. The host site renders
  // its own sticky header above the shell — the spotlight hole must never
  // extend into it, so the top dim band always covers the host chrome fully.
  const holeTop = Math.max(rect.top - DIM_PAD, minTop);
  const holeLeft = rect.left - DIM_PAD;
  const holeRight = rect.left + rect.width + DIM_PAD;
  const holeBottom = rect.top + rect.height + DIM_PAD;
  return { holeTop, holeLeft, holeRight, holeBottom, bandHeight: Math.max(0, holeBottom - holeTop) };
}

type Props = {
  onClose: () => void; // skip / Esc / rail-nav: writes the seen-key + closes (parent handleTourClose)
  onFinish: () => void; // finish: resets the map to city, then closes (parent handleTourFinish)
  onBridge: () => void; // bridge-news stop: real News rail click → hand off to the /news segment (no seen-key)
  // Step back into a stop: rewind the host to the destination stop's nav depth so
  // its context is true. keepDrawer=true (only when stepping back INTO filter-pick,
  // which spotlights the chips) leaves the filter drawer open; otherwise it's closed.
  // See stops' backRewindDepth.
  rewindHostTo: (depth: 0 | 1 | 2, keepDrawer?: boolean) => void;
  // Drives the phone bottom sheet per stop (M4). The host wires it to setSnap; the
  // tour calls it with the active stop's sheetOnActivate at the top of the [index]
  // reset effect (phone only), so the sheet is at the height the stop needs before
  // its ring draws. Geometry only — no advancement logic, like rewindHostTo.
  setSheetForTour: (snap: SheetSnap) => void;
  // v6 auto-enactment: the guide asks the host to PERFORM the step it's narrating
  // (select a borough, browse in, open a neighborhood, open the filters). The host
  // reuses its real click handlers; the guide never touches host internals.
  enactTourAction: (action: TourEnact) => void;
  // The borough the host currently has active — spliced into the narration copy so
  // an auto stop names the borough it actually opened ({borough} in tour-stops).
  activeBorough: string;
  view: "city" | "borough";
  selectedAreaId: number | null;
  filtersOpen: boolean;
  // Bumped on every filter-chip pick; the filter-pick stop advances on each pick
  // (even re-picking the already-active chip), so a Back-then-repick can't wedge.
  chipPickTick: number;
  canDrill: boolean;
  boroughClickTick: number;
  blockedTick: number; // parent bumps this when it soft-blocks a switch to 311 Reports
};

const BLOCKED_HINT = "311 Reports opens right after the guide — you're almost done.";

// Calm nudge for a stray click on an auto/info stop's dim (nothing to click there —
// the guide performed the step; the user just reads and presses Next).
const INFO_MISS = "Take a look, then continue with the guide.";

export function MapTourGuide({
  onClose,
  onFinish,
  onBridge,
  rewindHostTo,
  setSheetForTour,
  enactTourAction,
  activeBorough,
  view,
  selectedAreaId,
  filtersOpen,
  chipPickTick,
  canDrill,
  boroughClickTick,
  blockedTick
}: Props) {
  // Form factor is the single source of truth for every geometry/copy branch
  // (m9: useFormFactor lazily inits from matchMedia, so the first paint already
  // has the right geometry — no desktop-flash). visualViewport keeps mobile
  // offsets/caps sized to the region under the soft keyboard (m10).
  const ff = useFormFactor();
  const vv = useVisualViewport();
  // Where the map shell starts in viewport space (the host site's sticky header
  // sits above it) — floors every bubble/hole placement so no tour chrome ever
  // lands on the host's own chrome.
  const shellTop = useShellTop();
  const steps = useMemo(
    () => liveStops(canDrill, { isPhone: ff.isPhone, isCoarse: ff.isCoarse }),
    [canDrill, ff.isPhone, ff.isCoarse]
  );

  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "nudge"; text: string } | null>(null);
  // anchorRect is the MOUNT gate only (null → the ring/dim aren't rendered). The
  // live PIXEL position lives in lastRectRef and is written straight to the DOM by
  // the rAF loop (B) — so a scroll never round-trips through React render.
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);
  const [anchorLost, setAnchorLost] = useState(false);
  // C1: a panel-anchored stop whose control has scrolled out of the sheet's
  // visible box. Written ONLY by the rAF loop (single-writer), like anchorLost.
  const [anchorClipped, setAnchorClipped] = useState(false);
  // v6: an auto stop's enactment has been CONFIRMED by live host state → reveal the
  // Next button. Reset on every stop entry; set by the per-signal confirm effects.
  const [autoReady, setAutoReady] = useState(false);
  // B2: one-shot 120ms position ease as the overlay settles onto a new stop's
  // anchor; cleared after SETTLE_MS so scroll-tracking is raw.
  const [settling, setSettling] = useState(false);

  // Refs the effects share. Only the rAF loop writes anchorRect/anchorLost.
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // B: the overlay nodes the rAF loop positions imperatively (bypassing render).
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dimTopRef = useRef<HTMLDivElement | null>(null);
  const dimBottomRef = useRef<HTMLDivElement | null>(null);
  const dimLeftRef = useRef<HTMLDivElement | null>(null);
  const dimRightRef = useRef<HTMLDivElement | null>(null);
  const blockerRef = useRef<HTMLDivElement | null>(null);
  const advanceTimerRef = useRef<number | null>(null);
  const missTimerRef = useRef<number | null>(null);
  const successActiveRef = useRef(false);
  const lastRectRef = useRef<Rect | null>(null);
  const hasRectRef = useRef(false); // has the current stop been measured at least once?
  const missFramesRef = useRef(0);
  const anchorLostRef = useRef(false);
  const clippedRef = useRef(false); // C1: mirrors anchorClipped for the rAF loop
  const boroughBaselineRef = useRef(boroughClickTick);
  const chipPickBaselineRef = useRef(chipPickTick);
  const blockedBaselineRef = useRef(blockedTick);
  // v6: guards enactTourAction to fire exactly once per stop ENTRY (the [index]
  // reset effect clears it, so a Back re-entry re-enacts). This IS the per-entry
  // enactment token — React's effect cleanup discards any confirm that lands for a
  // stop we've already left, so a Back can't race a stale enact confirmation.
  const enactDoneRef = useRef(false);
  // Latest committed stop index — kept in sync by the [index] reset effect so a
  // rapid double-click on Back reads the already-decremented target (each click
  // regresses one more stop) instead of a stale render-time index.
  const indexRef = useRef(0);

  const safeIndex = Math.min(index, steps.length - 1);
  const step = steps[safeIndex];

  // navDepth derived from live host state — the single truth an auto nav stop
  // reconciles against to CONFIRM its enactment (Amendment 1).
  const navDepth = view === "borough" ? (selectedAreaId !== null ? 2 : 1) : 0;

  // Splice the active borough name into narration copy ({borough} in tour-stops),
  // so an auto stop names the borough it actually opened — never a hard-coded one.
  const resolveCopy = useCallback(
    (text: string) => text.replace(/\{borough\}/g, activeBorough || "this borough"),
    [activeBorough]
  );

  const clearTimers = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (missTimerRef.current !== null) {
      window.clearTimeout(missTimerRef.current);
      missTimerRef.current = null;
    }
  }, []);

  const clearMiss = useCallback(() => {
    if (missTimerRef.current !== null) {
      window.clearTimeout(missTimerRef.current);
      missTimerRef.current = null;
    }
  }, []);

  // A brief shake via the Web Animations API — avoids a class-toggle that would
  // replay the element's entrance animation on removal.
  const runShake = useCallback((el: HTMLElement | null) => {
    if (!el || typeof el.animate !== "function") return;
    el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" }
      ],
      { duration: 360, easing: "cubic-bezier(0.2, 0, 0, 1)" }
    );
  }, []);

  const nudge = useCallback(
    (text: string, shake = true) => {
      clearMiss();
      setFeedback({ kind: "nudge", text });
      if (shake) {
        runShake(bubbleRef.current);
      }
    },
    [clearMiss, runShake]
  );

  // Quiet ✓ beat, then land on `next`. Guarded so nothing double-advances. Used by
  // the hands-on filter-pick stop (the only stop that still auto-advances on a
  // real user action).
  const succeedThenAdvance = useCallback(
    (next: number, text: string) => {
      if (successActiveRef.current) return;
      successActiveRef.current = true;
      clearTimers();
      setFeedback(text ? { kind: "success", text } : null);
      advanceTimerRef.current = window.setTimeout(() => {
        successActiveRef.current = false;
        setIndex(next); // the [index] reset effect wipes feedback/timers/anchor state
      }, SUCCESS_REVEAL_MS);
    },
    [clearTimers]
  );

  const closeSkip = useCallback(() => {
    clearTimers();
    onClose();
  }, [clearTimers, onClose]);

  // Desktop/tablet bubble placement, as a function of the tracked rect so the rAF
  // loop and the initial render share ONE formula (phone pins the bubble via CSS).
  // Held in a ref so the rAF closure always calls the latest without re-subscribing.
  const bubblePosRef = useRef<(rect: Rect) => CSSProperties>(() => ({}));
  bubblePosRef.current = (rect: Rect): CSSProperties => {
    // m10: on touch, clamp against the VISUAL viewport (shrunk under the soft
    // keyboard) instead of window.innerHeight. Desktop keeps innerHeight so its
    // geometry stays byte-identical.
    const vh =
      ff.isPhone || ff.isTabletPortrait
        ? vv.height
        : typeof window !== "undefined"
          ? window.innerHeight
          : 800;
    // Floor at the shell's top edge (+12), not the viewport's: the host site's
    // sticky header lives above the shell and the bubble must never sit on it.
    const topFloor = shellTop.current + 12;
    const top = Math.max(topFloor, Math.min(rect.top, vh - 240));
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    switch (step.bubbleSide) {
      case "left":
        return {
          top,
          right: Math.max(12, vw - rect.left + 16),
          // Amendment 2: tablet-portrait keeps the desktop side placement, but the
          // bubble must fit in the gap left of the narrowed ~320px panel — cap its
          // width to that gap (min 220) so it never overlaps the panel or the edge.
          ...(ff.isTabletPortrait ? { maxWidth: Math.max(220, rect.left - 24) } : {})
        };
      case "right":
        return { top: Math.max(topFloor, rect.top), left: rect.left + rect.width + 16 };
      case "over":
      default:
        return {
          top: Math.max(topFloor, rect.top + 16),
          left: rect.left + rect.width / 2,
          transform: "translateX(-50%)"
        };
    }
  };

  // Readiness gate: the host reset the map to the city view in the same commit as
  // open; flip ready true only after one rAF so no gated advance can fire against
  // stale drilled-in state (kills the replay-auto-satisfy class of bug).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // ONE reset effect, keyed on the active stop. Wipes all transient state, resets
  // the anchor tracker, captures per-stop baselines, and scrolls panel anchors in.
  useEffect(() => {
    setFeedback(null);
    setAnchorLost(false);
    setAnchorRect(null);
    setAnchorClipped(false);
    setAutoReady(false);
    anchorLostRef.current = false;
    clippedRef.current = false;
    missFramesRef.current = 0;
    lastRectRef.current = null;
    hasRectRef.current = false;
    enactDoneRef.current = false;
    clearTimers();
    successActiveRef.current = false;

    const active = steps[Math.min(index, steps.length - 1)];
    indexRef.current = Math.min(index, steps.length - 1);
    // M4 (amendment 6): drive the phone bottom sheet to the height this stop needs
    // BEFORE the anchor is scrolled/measured, so a panel anchor sits inside the
    // visible sheet box when the rAF loop first reads it. Phone only — desktop/
    // tablet ignore sheetOnActivate. Because this runs on EVERY activation,
    // Back/rewind re-asserts the destination stop's sheet state for free.
    if (ff.isPhone && active.sheetOnActivate) {
      setSheetForTour(active.sheetOnActivate);
    }
    // Amendment 3: capture the borough tick at activation → the borough auto stop
    // confirms only on an increment (its own enacted click).
    if (active.enact === "select-borough") {
      boroughBaselineRef.current = boroughClickTick;
    }
    // filter-pick: capture the pick tick at activation → advance on the next pick
    // (any chip, including re-picking the active one, since we compare ticks).
    if (active.id === "filter-pick") {
      chipPickBaselineRef.current = chipPickTick;
    }
    // Bring an off-screen panel anchor into view (map/rail anchors are already on screen).
    if (active.anchor && !active.mapRegion && active.id !== "bridge-news") {
      const el = document.querySelector(active.anchor);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // B2: one-shot position ease on stop change. Held for at least SETTLE_MS, then
  // dropped only once the tracked anchor rect has been QUIESCENT (delta under the
  // move-gate) for ~2 consecutive frames — so the ease isn't stripped while the
  // stop's own choreography (entry scrollIntoView, sheet snap, reader grow) is still
  // moving the anchor, which would land the trailing gap as an instant snap. These
  // choreographies ease OUT, so by the time the per-frame delta drops under the gate
  // the transition's catch-up distance is sub-pixel → dropping the class is invisible.
  // The rAF loop is the single writer of lastRectRef; we only OBSERVE it here. A hard
  // SETTLE_CEIL_MS ceiling guarantees the class can never stick (e.g. a lost anchor).
  useEffect(() => {
    setSettling(true);
    let raf = 0;
    const start =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    let prevRect: Rect | null = null;
    let stableFrames = 0;
    const tick = () => {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = now - start;
      const rect = lastRectRef.current;
      const stable =
        !!prevRect &&
        !!rect &&
        Math.abs(prevRect.top - rect.top) < MOVE_GATE &&
        Math.abs(prevRect.left - rect.left) < MOVE_GATE &&
        Math.abs(prevRect.width - rect.width) < MOVE_GATE &&
        Math.abs(prevRect.height - rect.height) < MOVE_GATE;
      prevRect = rect;
      if (elapsed >= SETTLE_MS) {
        stableFrames = stable ? stableFrames + 1 : 0;
        if (stableFrames >= 2 || elapsed >= SETTLE_CEIL_MS) {
          setSettling(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index]);

  // Downward self-heal (v6). The dim panels + hole blocker stop POINTER events on
  // every auto/info stop, but we deliberately do NOT inert / focus-trap the page
  // root — so keyboard focus can still tunnel under the dim (Tab to a breadcrumb,
  // Enter → backToCity) and regress the host beneath the stop we're narrating.
  // Scoped to the two enacts whose CONFIRM is navDepth-based — browse (doneAtDepth
  // 1) and select-area (doneAtDepth 2): when their live depth falls below the
  // confirm depth, drop the confirm + the enactment token here so the enact effect
  // below re-fires (navDepth is in its deps) and re-drives the host forward — the
  // confirm then re-gates Next. The re-enact lifts navDepth back to/above
  // doneAtDepth, so this condition clears and cannot loop. select-borough must NOT
  // be depth-gated: a borough click never changes `view`, so that stop legitimately
  // sits at navDepth 0 (its confirm is the boroughClickTick edge, and its narration
  // isn't invalidated by a depth regression) — a depth gate there would clear
  // autoReady perpetually and Next could never appear. open-filter's confirm is
  // filtersOpen — no depth to heal. Declared BEFORE the enact effect so, on a
  // shared navDepth change, the token is cleared before the enact effect reads it.
  useEffect(() => {
    if (!ready || (step.enact !== "browse" && step.enact !== "select-area")) return;
    if (navDepth < step.doneAtDepth) {
      setAutoReady(false);
      enactDoneRef.current = false;
    }
  }, [navDepth, ready, step.enact, step.doneAtDepth]);

  // v6 enactment: once ready, an auto stop asks the host to PERFORM its action.
  // Declared AFTER the reset effect so enactDoneRef is cleared and every confirm
  // baseline captured before this fires. enactTourAction is synchronous host state,
  // so there is no deferred enact to race; enactDoneRef makes it exactly-once per
  // entry and re-triggerable on a Back re-entry OR a downward reconcile (navDepth in
  // the deps re-runs this after the reconcile above clears the token).
  useEffect(() => {
    if (!ready) return;
    const active = steps[Math.min(index, steps.length - 1)];
    if (active.kind !== "auto" || !active.enact) return;
    if (enactDoneRef.current) return;
    enactDoneRef.current = true;
    enactTourAction(active.enact);
  }, [index, ready, steps, enactTourAction, navDepth]);

  // Single rAF loop — the ONLY writer of anchorRect/anchorLost AND the sole
  // positioner of the ring/dim/blocker/bubble. It writes PIXEL positions straight
  // to the DOM every frame (raw) so a scroll never round-trips through React render
  // (B). 0.5px move-gate keeps idle frames quiet; anchorLost latches after ~25
  // missing frames and clears when the node returns.
  useEffect(() => {
    if (!ready || !step.anchor) {
      return;
    }
    const selector = step.anchor;
    const mapRegion = step.mapRegion;
    // C1: panel-anchored stops (digest/area-detail/filter/filter-pick) live inside
    // the scrolling .cs-insights sheet. bridge-news lives on the rail, map stops on
    // the canvas — neither is a panel stop.
    const panelStop = !mapRegion && step.id !== "bridge-news";
    const isPhone = ff.isPhone;
    const isCoarse = ff.isCoarse;
    let raf = 0;
    // T9: resolve the anchor + the .cs-insights panel once and reuse the nodes
    // across frames — re-querying the DOM 2–3× per frame was the loop's hot cost.
    let cachedAnchor: Element | null = null;
    let cachedPanel: Element | null = null;
    const resolvePanel = (): Element | null => {
      if (!cachedPanel || !cachedPanel.isConnected) {
        cachedPanel = document.querySelector(".cs-insights");
      }
      return cachedPanel;
    };
    // Panel-clip scrollport: on phone the sheet's SCROLLER is .cs-sheet-body (the
    // grab handle + brief now sit OUTSIDE it); on tablet the aside itself scrolls.
    let cachedScroller: Element | null = null;
    const resolveScroller = (): Element | null => {
      if (!cachedScroller || !cachedScroller.isConnected) {
        cachedScroller =
          document.querySelector(".cs-sheet-body") ?? document.querySelector(".cs-insights");
      }
      return cachedScroller;
    };

    const clampMapRect = (rect: Rect): Rect => {
      // On the phone the map rect runs under the bottom sheet — clamp the ring's
      // bottom to just above the panel so it frames the visible band only.
      if (!isPhone) return rect;
      const panel = resolvePanel();
      const panelTop = panel ? panel.getBoundingClientRect().top : window.innerHeight;
      const bottom = Math.min(rect.top + rect.height, panelTop - 8);
      return { top: rect.top, left: rect.left, width: rect.width, height: Math.max(0, bottom - rect.top) };
    };

    // C1: clip a panel anchor to the sheet's visible client rect. Fully outside →
    // clipped (caller suppresses ring/hole + scrolls it back); partially clipped →
    // clamp the hole/ring to the intersection.
    const clampPanelRect = (rect: Rect): { rect: Rect; clipped: boolean } => {
      const panel = resolveScroller();
      if (!panel) return { rect, clipped: false };
      const p = panel.getBoundingClientRect();
      const top = Math.max(rect.top, p.top);
      const left = Math.max(rect.left, p.left);
      const right = Math.min(rect.left + rect.width, p.right);
      const bottom = Math.min(rect.top + rect.height, p.bottom);
      if (right <= left || bottom <= top) return { rect, clipped: true };
      return { rect: { top, left, width: right - left, height: bottom - top }, clipped: false };
    };

    // B: write the tracked rect straight onto the overlay nodes. Only the changing
    // props are set per frame; the edge-anchored props (right/bottom/left:0) come
    // from the initial render style and never move. The bubble follows the SAME
    // regime as the ring (desktop/tablet only — phone pins it via CSS).
    const writePositions = (rect: Rect) => {
      if (ringRef.current) {
        const r = ringInset(rect, shellTop.current);
        const s = ringRef.current.style;
        s.top = `${r.top}px`;
        s.left = `${r.left}px`;
        s.width = `${r.width}px`;
        s.height = `${r.height}px`;
      }
      const g = holeGeom(rect, shellTop.current);
      if (dimTopRef.current) dimTopRef.current.style.height = `${Math.max(0, g.holeTop)}px`;
      if (dimBottomRef.current) dimBottomRef.current.style.top = `${g.holeBottom}px`;
      if (dimLeftRef.current) {
        const s = dimLeftRef.current.style;
        s.top = `${g.holeTop}px`;
        s.width = `${Math.max(0, g.holeLeft)}px`;
        s.height = `${g.bandHeight}px`;
      }
      if (dimRightRef.current) {
        const s = dimRightRef.current.style;
        s.top = `${g.holeTop}px`;
        s.left = `${g.holeRight}px`;
        s.height = `${g.bandHeight}px`;
      }
      if (blockerRef.current) {
        const s = blockerRef.current.style;
        s.top = `${g.holeTop}px`;
        s.left = `${g.holeLeft}px`;
        s.width = `${Math.max(0, g.holeRight - g.holeLeft)}px`;
        s.height = `${g.bandHeight}px`;
      }
      if (!isPhone && bubbleRef.current) {
        const b = bubblePosRef.current(rect);
        const s = bubbleRef.current.style;
        if (b.top !== undefined) s.top = typeof b.top === "number" ? `${b.top}px` : String(b.top);
        if (b.left !== undefined) s.left = typeof b.left === "number" ? `${b.left}px` : String(b.left);
        if (b.right !== undefined) s.right = typeof b.right === "number" ? `${b.right}px` : String(b.right);
        if (b.transform !== undefined) s.transform = String(b.transform);
        if (b.maxWidth !== undefined)
          s.maxWidth = typeof b.maxWidth === "number" ? `${b.maxWidth}px` : String(b.maxWidth);
      }
    };

    const frame = () => {
      // Reuse the resolved anchor across frames; re-query only when it's absent or
      // has detached — either way `el` may be null, which the miss path handles.
      if (!cachedAnchor || !cachedAnchor.isConnected) {
        cachedAnchor = document.querySelector(selector);
      }
      const el = cachedAnchor;
      if (!el) {
        missFramesRef.current += 1;
        // Never latch anchorLost during a success beat: on the filter-pick advance
        // the anchor can unmount in the same commit the success window opens, so
        // keeping the latch off holds both the green ring and the body stable.
        if (
          missFramesRef.current >= LOST_LATCH_FRAMES &&
          !anchorLostRef.current &&
          !successActiveRef.current
        ) {
          anchorLostRef.current = true;
          setAnchorLost(true);
        }
        raf = requestAnimationFrame(frame);
        return;
      }
      if (missFramesRef.current !== 0) missFramesRef.current = 0;
      if (anchorLostRef.current) {
        anchorLostRef.current = false;
        setAnchorLost(false);
      }
      const box = el.getBoundingClientRect();
      const raw: Rect = { top: box.top, left: box.left, width: box.width, height: box.height };
      let next = raw;
      if (mapRegion) {
        next = clampMapRect(raw);
      } else if (isCoarse && panelStop) {
        const res = clampPanelRect(raw);
        if (res.clipped) {
          // Anchor scrolled out of the sheet: suppress ring/hole and scroll it back
          // once (guarded so we don't re-fire scrollIntoView every frame).
          if (!clippedRef.current) {
            clippedRef.current = true;
            setAnchorClipped(true);
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          }
          raf = requestAnimationFrame(frame);
          return;
        }
        next = res.rect;
      }
      if (clippedRef.current) {
        clippedRef.current = false;
        setAnchorClipped(false);
      }
      const prev = lastRectRef.current;
      if (
        !prev ||
        Math.abs(prev.top - next.top) >= MOVE_GATE ||
        Math.abs(prev.left - next.left) >= MOVE_GATE ||
        Math.abs(prev.width - next.width) >= MOVE_GATE ||
        Math.abs(prev.height - next.height) >= MOVE_GATE
      ) {
        lastRectRef.current = next;
        writePositions(next); // B: DOM-direct, no per-frame React render
      }
      if (!hasRectRef.current) {
        // First measurement of this stop: one setState so the nodes mount, with
        // their initial style read from lastRectRef (already set above → no flash).
        hasRectRef.current = true;
        setAnchorRect(next);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [index, ready, step.anchor, step.mapRegion, step.id, ff.isPhone, ff.isCoarse]);

  // v6 confirm — borough auto stop: the enacted click bumps boroughClickTick past
  // the activation baseline → reveal Next (no auto-advance; the user presses Next).
  useEffect(() => {
    if (!ready || step.enact !== "select-borough") return;
    if (boroughClickTick > boroughBaselineRef.current) setAutoReady(true);
  }, [boroughClickTick, ready, step.enact]);

  // v6 confirm — filter auto stop: the enacted open flips filtersOpen true.
  useEffect(() => {
    if (!ready || step.enact !== "open-filter") return;
    if (filtersOpen) setAutoReady(true);
  }, [filtersOpen, ready, step.enact]);

  // v6 confirm — browse / neighborhood auto stops: the enacted drill-in / selection
  // reaches the stop's target nav depth (browse→1, select-area→2). Same live-state
  // machinery that once detected a USER action now confirms the ENACTED one.
  useEffect(() => {
    if (!ready) return;
    if (step.enact !== "browse" && step.enact !== "select-area") return;
    if (navDepth >= step.doneAtDepth) setAutoReady(true);
  }, [navDepth, ready, step.enact, step.doneAtDepth]);

  // filter-pick stop (hands-on): advance on the next chip pick (tick past the
  // activation baseline), so re-picking the already-active chip still counts.
  useEffect(() => {
    if (!ready || step.id !== "filter-pick") return;
    if (chipPickTick > chipPickBaselineRef.current) {
      succeedThenAdvance(safeIndex + 1, step.successText);
    }
  }, [chipPickTick, ready, step.id, step.successText, safeIndex, succeedThenAdvance]);

  // A soft-blocked 311 switch: speak to it (works on any stop, no shake).
  useEffect(() => {
    if (!ready) return;
    if (blockedTick > blockedBaselineRef.current) {
      blockedBaselineRef.current = blockedTick;
      nudge(BLOCKED_HINT, false);
    }
  }, [blockedTick, ready, nudge]);

  // Capture-phase click handler — active only on the hands-on action stops
  // (filter-pick / bridge-news), suppressed during a success window. The guided dim
  // panels + hole blocker already BLOCK every click on auto/info stops, so this only
  // handles the interactive-hole stops that leave a real control clickable.
  useEffect(() => {
    if (!ready || step.kind !== "action") return;
    const anchorSel = step.anchor;
    const mapRegion = step.mapRegion;
    const missHint = step.missHint ?? "";

    const onCapture = (event: MouseEvent) => {
      if (successActiveRef.current) return;
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest("[data-tour-chrome]")) return; // bubble / ring / dim panels
      if (target.closest('[data-tour="rail"], [data-tour="tabbar"]')) return; // rail/tab-bar nav → bridge listener owns it

      const anchorEl = anchorSel ? document.querySelector(anchorSel) : null;
      if (anchorEl && anchorEl.contains(target)) {
        // Right region. Map canvases can swallow a click on water with no state
        // change, so arm a delayed miss; the state-diff advance cancels it.
        if (mapRegion) {
          clearMiss();
          const missMs = ff.isCoarse ? 1400 : MAP_MISS_MS;
          missTimerRef.current = window.setTimeout(() => {
            if (!successActiveRef.current) nudge(missHint);
          }, missMs);
        }
        return;
      }
      nudge(missHint);
    };

    document.addEventListener("click", onCapture, true);
    return () => document.removeEventListener("click", onCapture, true);
  }, [index, ready, step.kind, step.anchor, step.mapRegion, step.missHint, ff.isCoarse, clearMiss, nudge]);

  // (The old rail/tab-bar click listener lived here: bridge-news used to advance
  // on a real News-link click, any other rail click gracefully ended the tour.
  // This design has no rail or tab bar — the bridge is the stop's own CTA now —
  // so the listener is gone rather than left waiting for selectors that no
  // longer exist.)

  // Esc skips — but never when focus is in an input/textarea/contenteditable (so
  // Esc inside the search box or a form field doesn't end the tour).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const ae = document.activeElement as HTMLElement | null;
      if (
        ae &&
        (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      closeSkip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeSkip]);

  const advanceInfo = useCallback(() => {
    // bridge-news is now an info stop whose CTA hands off to the /news tour
    // segment (this design has no sidebar for the old hands-on click, so the
    // guide navigates itself). onBridge records the segment and routes.
    if (steps[safeIndex]?.id === "bridge-news") {
      onBridge();
      return;
    }
    if (safeIndex >= steps.length - 1) {
      onFinish();
      return;
    }
    setIndex(safeIndex + 1);
  }, [safeIndex, steps, onFinish, onBridge]);

  // Step back one stop. Rewind the host to the destination stop's nav depth (closing
  // the filter drawer unless the destination is filter-pick) BEFORE landing, so its
  // context is true and — for an auto destination — its enactment RE-RUNS from a
  // clean base (the [index] reset clears enactDoneRef in the same commit).
  const handleBack = useCallback(() => {
    const current = indexRef.current;
    if (current <= 0) return;
    clearTimers();
    successActiveRef.current = false;
    const dest = steps[current - 1];
    if (dest.backRewindDepth !== undefined) {
      // Keep the filter drawer open only when landing on filter-pick (it spotlights
      // the chips); every other destination wants it shut.
      rewindHostTo(dest.backRewindDepth, dest.id === "filter-pick");
    }
    // Advance the ref synchronously so a second Back in the same frame regresses
    // from the already-decremented index rather than repeating this one.
    indexRef.current = current - 1;
    setIndex(current - 1);
  }, [steps, rewindHostTo, clearTimers]);

  // --- placement ------------------------------------------------------------
  // B: position comes from the live tracked rect (lastRectRef), NOT the mount-gate
  // state — so even a React re-render (feedback etc.) reads the CURRENT position
  // and never snaps back to a stale one. The rAF loop keeps this ref fresh.
  const liveRect = lastRectRef.current ?? anchorRect;

  const arrowClass =
    step.bubbleSide === "left"
      ? styles.arrowLeft
      : step.bubbleSide === "right"
        ? styles.arrowRight
        : styles.arrowOver;

  const stepCount = `Step ${safeIndex + 1} of ${steps.length}`;

  const feedbackNode = feedback ? (
    <p
      className={`${styles.feedback} ${
        feedback.kind === "success" ? styles.feedbackSuccess : styles.feedbackNudge
      }`}
    >
      {feedback.kind === "success" ? `✓ ${feedback.text}` : feedback.text}
    </p>
  ) : null;

  const skipLink = (
    <button type="button" className={styles.skip} onClick={closeSkip}>
      Skip tour
    </button>
  );

  // Quiet Back control — shown on every stop past welcome (index 0). Sits left of
  // the step counter / CTA inside the footer's right group.
  const backButton =
    safeIndex > 0 ? (
      <button type="button" className={styles.back} onClick={handleBack}>
        ← Back
      </button>
    ) : null;

  // Footer-right: info stops always show the CTA; an auto stop shows it once its
  // enactment is confirmed (autoReady). Otherwise — a hands-on action stop, OR an
  // auto stop whose enactment hasn't confirmed yet (e.g. a drill enact that no-ops
  // because the borough has no polygons) — show a quiet step counter, so the footer
  // is never empty and the bubble never renders with only Back/Skip.
  const showCta = step.kind === "info" || (step.kind === "auto" && autoReady);
  const footerRight = showCta ? (
    <button type="button" className={styles.cta} onClick={advanceInfo}>
      {step.cta}
    </button>
  ) : (
    <span className={styles.count}>{stepCount}</span>
  );

  // --- render ---------------------------------------------------------------
  if (step.placement === "center") {
    return (
      <div
        className={styles.backdrop}
        data-tour-chrome=""
        onClick={() => {
          // Backdrop click never dismisses — it only wiggles the card.
          runShake(cardRef.current);
        }}
      >
        <div
          ref={cardRef}
          className={`${styles.card} ${styles.cardGlow}`}
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className={styles.title}>{resolveCopy(step.title)}</h2>
          <p className={styles.body}>{resolveCopy(step.body)}</p>
          {feedbackNode}
          <div className={styles.footer}>
            {skipLink}
            <div className={styles.footerRight}>
              {backButton}
              <button type="button" className={styles.cta} onClick={advanceInfo}>
                {step.cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Anchored stop: ring (if measured) + bubble. Position from liveRect; the rAF
  // loop overwrites it each frame straight on the DOM.
  const ringStyle: CSSProperties | undefined = liveRect ? ringInset(liveRect, shellTop.current) : undefined;
  const showRing = liveRect && !anchorLost && !anchorClipped;
  // Auto + info anchored stops block ALL interaction (the guide drove the step —
  // nothing for the user to click but Next/Back/Skip); the hands-on action stops
  // (filter-pick chips / bridge News) keep the hole clickable.
  const blockHole = step.kind !== "action";
  const settleClass = settling ? ` ${styles.settleMove}` : "";

  // Spotlight + click-block. A click on any dim panel (or the hole blocker on an
  // auto/info stop) is intercepted and answered with the stop's nudge; only an
  // action stop's hole stays interactive. Positions come from liveRect and are
  // re-written each frame by the rAF loop (B).
  const dimHint = step.missHint ?? INFO_MISS;
  const onDimClick = () => nudge(dimHint);
  let dimNode: ReactNode = null;
  if (liveRect && !anchorLost && !anchorClipped) {
    const g = holeGeom(liveRect, shellTop.current);
    const dimClass = `${styles.dim}${settleClass}`;
    dimNode = (
      <>
        <div
          ref={dimTopRef}
          className={dimClass}
          style={{ top: 0, left: 0, right: 0, height: Math.max(0, g.holeTop) }}
          data-tour-chrome=""
          onClick={onDimClick}
        />
        <div
          ref={dimBottomRef}
          className={dimClass}
          style={{ top: g.holeBottom, left: 0, right: 0, bottom: 0 }}
          data-tour-chrome=""
          onClick={onDimClick}
        />
        <div
          ref={dimLeftRef}
          className={dimClass}
          style={{ top: g.holeTop, left: 0, width: Math.max(0, g.holeLeft), height: g.bandHeight }}
          data-tour-chrome=""
          onClick={onDimClick}
        />
        <div
          ref={dimRightRef}
          className={dimClass}
          style={{ top: g.holeTop, left: g.holeRight, right: 0, height: g.bandHeight }}
          data-tour-chrome=""
          onClick={onDimClick}
        />
        {blockHole ? (
          <div
            ref={blockerRef}
            className={settling ? styles.settleMove : undefined}
            style={{
              position: "fixed",
              zIndex: 1385,
              top: g.holeTop,
              left: g.holeLeft,
              width: Math.max(0, g.holeRight - g.holeLeft),
              height: g.bandHeight,
              background: "transparent",
              pointerEvents: "auto"
            }}
            data-tour-chrome=""
            onClick={onDimClick}
          />
        ) : null}
      </>
    );
  } else if ((anchorLost || anchorClipped) && step.id !== "filter-pick") {
    // Anchor lost OR clipped out of the sheet (C1): fall back to a full-viewport
    // dim (no hole) until it's back on screen. filter-pick is the exception — its
    // anchor vanishes when the drawer closes, and a full block would trap the user.
    dimNode = <div className={styles.dimFull} data-tour-chrome="" onClick={onDimClick} />;
  }

  const anchorLostBody =
    step.id === "filter-pick"
      ? "Open Filter again to pick a topic."
      : "One sec — finding that on screen…";

  // Phone bubble slot (M4, amendment 2) — THREE mutually exclusive branches, so no
  // two !important bottoms ever stack. All three classes are CSS-gated to <=640, so
  // desktop + tablet-portrait placement stays byte-identical.
  let phoneBubble = "";
  if (ff.isPhone) {
    // (bridge-news no longer pins here — it's a centered card now, rendered by
    // the placement:"center" branch above, so it never reaches this path.)
    if (step.mapRegion) {
      phoneBubble = `${styles.bubblePinMap} ${styles.bubbleCompact}`;
    } else {
      phoneBubble = styles.bubbleAboveSheet;
    }
  }
  const bubbleClass = `${styles.bubble} ${phoneBubble}${settleClass}`;
  const bubbleStyle: CSSProperties = liveRect ? bubblePosRef.current(liveRect) : { top: 16, left: 16 };

  return (
    <>
      {dimNode}
      {showRing ? (
        <div
          ref={ringRef}
          className={`${styles.ring} ${feedback?.kind === "success" ? styles.ringSuccess : ""}${settleClass}`}
          style={ringStyle}
          data-tour-chrome=""
          aria-hidden="true"
        />
      ) : null}
      <div ref={bubbleRef} className={bubbleClass} style={bubbleStyle} data-tour-chrome="">
        {!ff.isPhone ? <span className={`${styles.arrow} ${arrowClass}`} aria-hidden="true" /> : null}
        <h2 className={styles.title}>{resolveCopy(step.title)}</h2>
        <p className={styles.body}>
          {/* Only the hands-on action stops show the lost/reopen recovery line; auto
              + info stops keep narrating their body through a transient anchor-miss
              (e.g. the deep-dive map mounting after an enacted drill-in). */}
          {anchorLost && step.kind === "action" ? anchorLostBody : resolveCopy(step.body)}
        </p>
        {feedbackNode}
        <div className={styles.footer}>
          {skipLink}
          <div className={styles.footerRight}>
            {backButton}
            {footerRight}
          </div>
        </div>
      </div>
    </>
  );
}
