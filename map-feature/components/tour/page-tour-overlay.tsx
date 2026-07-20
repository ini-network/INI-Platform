"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { activeSegment, endTour, startSegment, type TourSegment } from "../../lib/tour-progress";
import { useVisualViewport } from "../../lib/use-visual-viewport";
import styles from "../map/tour/map-tour.module.css";

// Cross-page tour engine for the /news and /reports segments. The map tour
// (map-tour-guide.tsx) is untouched; this overlay runs on the static, server-
// rendered fixture pages.
//
// v6 (auto-enactment): the guide now OPENS the reader itself — it clicks the real
// card so the modal's history/nonce machinery runs exactly as a user click would —
// then points at the parts and lets the user read and press Next. Only ONE hands-on
// beat remains per segment: CLOSING the reader (the user learns the ×).
//
// Two stop kinds:
//  • info   — a look-at bubble; the user advances with the CTA. A reader stop
//             (autoOpen) opens the modal on entry and points at it (interactive
//             hole so the open modal stays scrollable).
//  • action — no CTA; the CLOSE stop watches the reader modal and advances when it
//             is GONE (the user clicked ×).
//
// Single-writer discipline: ONE rAF loop measures the anchor, POSITIONS the overlay
// straight on the DOM (B), AND evaluates the active stop's modal condition.

const MOVE_GATE = 0.5; // px the anchor must move before we re-position the ring
const DIM_PAD = 6; // spotlight hole pad — matches the ring's -6px inset
const SKIP_TOAST_MS = 4000; // self-dismiss window for the "restart later" toast
const SUCCESS_REVEAL_MS = 700; // quiet ✓ beat before an action stop advances
// B2: one-shot position ease as the ring/bubble settle onto a new stop's anchor.
// Held for at least SETTLE_MS, then kept until the anchor rect goes quiescent so the
// class isn't dropped mid-motion (entry scrollIntoView / reader-modal grow) — which
// would snap the trailing gap. SETTLE_CEIL_MS caps it so it can never stick.
const SETTLE_MS = 180;
const SETTLE_CEIL_MS = 1200;

// Every look-at stop's dim panels answer a stray click with this gentle nudge.
const MISS_HINT = "Take a look, then continue with the guide.";

type Rect = { top: number; left: number; width: number; height: number };

// Pure position math (B) — shared by the initial render style and the rAF writer.
function ringInset(rect: Rect): Rect {
  return { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 };
}
function holeGeom(rect: Rect) {
  const holeTop = rect.top - DIM_PAD;
  const holeLeft = rect.left - DIM_PAD;
  const holeRight = rect.left + rect.width + DIM_PAD;
  const holeBottom = rect.top + rect.height + DIM_PAD;
  return { holeTop, holeLeft, holeRight, holeBottom, bandHeight: Math.max(0, holeBottom - holeTop) };
}

type Advance =
  | { type: "next" }
  | { type: "bridge"; seg: TourSegment; url: string }
  | { type: "finish" };

type PageStop = {
  id: string;
  // null anchor → centered finish card (dim backdrop). Otherwise ring + bubble.
  anchor: string | null;
  bubbleSide: "left" | "right" | "over";
  title: string;
  body: string;
  kind: "info" | "action";
  // A reader stop OPENS the modal itself by clicking this real card (same path a
  // user click takes — history/nonce machinery runs identically). Driven by the rAF
  // loop, which clicks once the DOM holds NO modal — so a still-closing modal from a
  // Back is left to finish first (opening over it would be torn down by its pending
  // unmount).
  autoOpen?: boolean;
  openTarget?: string;
  // info stops advance via the CTA:
  cta?: string;
  advance?: Advance;
  // action stops advance when the segment's modal is GONE (the user closed it):
  watch?: "gone";
  // quiet ✓ line on an action completion.
  successText?: string;
  // reader + close stops leave the hole clickable (the modal/× underneath).
  interactiveHole?: boolean;
  // reader stops: if the modal closes early (Esc/backdrop/×), advance straight to
  // this index with one beat — never instruct closing a closed modal.
  autoReconcileTo?: number;
  // explicit Back target — overrides the default (index-1) where that would land
  // in an impossible state (e.g. the closed-modal action stop).
  backTo?: number;
  // Back off this stop must close the open modal first (over-modal reader stops).
  backCloseModal?: boolean;
};

// The reader modal each segment drives (stable data-tour hooks on the shared
// components). modalOpen = !!document.querySelector(this).
const MODAL_SELECTOR: Record<TourSegment, string> = {
  news: '[data-tour="news-modal"]',
  stories: '[data-tour="post-modal"]'
};

const SEGMENTS: Record<TourSegment, PageStop[]> = {
  news: [
    {
      id: "news-intro",
      anchor: ".cs-news-filters",
      bubbleSide: "over",
      title: "This is News",
      body: "Important local headlines from across the five boroughs.",
      kind: "info",
      cta: "Next",
      advance: { type: "next" }
    },
    {
      id: "news-reader",
      anchor: '[data-tour="news-modal"]',
      openTarget: ".cs-newscard",
      autoOpen: true,
      bubbleSide: "left",
      title: "We opened a story",
      body: "This is the reader — a quick summary up top, the full story as you scroll, all without leaving the site.",
      kind: "info",
      cta: "Next",
      advance: { type: "next" },
      interactiveHole: true,
      autoReconcileTo: 3,
      successText: "",
      backTo: 0,
      backCloseModal: true
    },
    {
      id: "news-close",
      anchor: '[data-tour="news-modal"] [data-tour="modal-close"]',
      bubbleSide: "left",
      title: "Your turn: close it",
      body: "Click the × to close the reader.",
      kind: "action",
      watch: "gone",
      successText: "Closed.",
      interactiveHole: true,
      backTo: 1
    },
    {
      id: "news-bridge",
      anchor: ".cs-newscard",
      bubbleSide: "right",
      title: "Every story, in the app",
      body: "Every card opens the whole story right here — no jumping out. Now let's look at Stories.",
      kind: "info",
      cta: "Next: Stories →",
      advance: { type: "bridge", seg: "stories", url: "/reports?tour=1" },
      backTo: 1
    }
  ],
  stories: [
    {
      id: "stories-intro",
      anchor: '[data-tour="report-readmore"]',
      bubbleSide: "right",
      title: "The stories behind the signals",
      body: "Real resident posts and the comments under them — the conversations behind each issue.",
      kind: "info",
      cta: "Next",
      advance: { type: "next" }
    },
    {
      id: "stories-reader",
      anchor: '[data-tour="post-modal"]',
      openTarget: '[data-tour="report-readmore"]',
      autoOpen: true,
      bubbleSide: "left",
      title: "We opened the post",
      body: "The full post — and underneath, the comments people left.",
      kind: "info",
      cta: "Next",
      advance: { type: "next" },
      interactiveHole: true,
      autoReconcileTo: 3,
      successText: "",
      backTo: 0,
      backCloseModal: true
    },
    {
      id: "stories-close",
      anchor: '[data-tour="post-modal"] [data-tour="modal-close"]',
      bubbleSide: "left",
      title: "Your turn: close it",
      body: "Click the × to close it.",
      kind: "action",
      watch: "gone",
      successText: "Closed.",
      interactiveHole: true,
      backTo: 1
    },
    {
      id: "finish",
      anchor: null,
      bubbleSide: "over",
      title: "You're all set",
      body:
        "That's the tour — the map, the news, and the stories behind it. Search an address anytime, or switch to 311 Reports for the city's official view. Want a refresher later? The ? button by the map toggle replays this tour.",
      kind: "info",
      cta: "Back to the map",
      advance: { type: "finish" },
      backTo: 1
    }
  ]
};

function segForPath(pathname: string): TourSegment | null {
  if (pathname === "/news") return "news";
  if (pathname === "/reports") return "stories";
  return null;
}

export function PageTourOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  // Writes --app-vh here on /news + /reports (the map's hook isn't mounted on
  // these pages) so the coarse .card cap + phone .bubble max-height track the
  // visible viewport (m10 / C2).
  useVisualViewport();

  const [seg, setSeg] = useState<TourSegment | null>(null);
  const [index, setIndex] = useState(0);
  // anchorRect is the MOUNT gate only; the live pixel position lives in lastRectRef
  // and is written straight to the DOM by the rAF loop (B).
  const [anchorRect, setAnchorRect] = useState<Rect | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "success" | "nudge"; text: string } | null>(null);
  // B2: one-shot position ease on stop change.
  const [settling, setSettling] = useState(false);
  // Kept true (with the component still mounted) only to render the skip toast
  // after the rest of the tour chrome has torn down.
  const [showSkipToast, setShowSkipToast] = useState(false);
  // A reader (autoOpen) stop reveals its Next CTA only after we've SEEN its modal
  // open — mirrors the map guide's autoReady. State (not just the ref below) so the
  // CTA re-renders when it flips; reset on every stop entry.
  const [readerReady, setReaderReady] = useState(false);

  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  // B: the overlay nodes the rAF loop positions imperatively.
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dimTopRef = useRef<HTMLDivElement | null>(null);
  const dimBottomRef = useRef<HTMLDivElement | null>(null);
  const dimLeftRef = useRef<HTMLDivElement | null>(null);
  const dimRightRef = useRef<HTMLDivElement | null>(null);
  const blockerRef = useRef<HTMLDivElement | null>(null);
  const lastRectRef = useRef<Rect | null>(null);
  // The last measured rect, NOT nulled on a stop change (lastRectRef is) — used only
  // to hold the previous spotlight geometry through the 1-frame stop-change gap so the
  // dim doesn't flash full-screen with no hole before the new anchor is first measured
  // (Fix 4). Falls back to the honest dimFull once the settle window passes.
  const heldRectRef = useRef<Rect | null>(null);
  const hasRectRef = useRef(false);
  const successActiveRef = useRef(false);
  const advanceTimerRef = useRef<number | null>(null);
  // The rAF loop's synchronous "have we seen this stop's modal GENUINELY open"
  // (not mid-close) — gates both the early-close reconcile and readerReady, so a
  // still-closing modal lingering from a Back never latches either.
  const sawOpenRef = useRef(false);
  // Clicked-once guard for the rAF-driven reader auto-open — one open click per stop
  // entry (reset below), so the loop can't spam clicks while the modal mounts.
  const openTargetClickedRef = useRef(false);

  const stops = seg ? SEGMENTS[seg] : null;
  const safeIndex = stops ? Math.min(index, stops.length - 1) : 0;
  const step = stops ? stops[safeIndex] : null;
  const modalSel = seg ? MODAL_SELECTOR[seg] : null;

  const clearTimers = useCallback(() => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  // Quiet ✓ beat, then land on `next`. Guarded so nothing double-advances.
  const succeedThenAdvance = useCallback(
    (next: number, text?: string) => {
      if (successActiveRef.current) return;
      successActiveRef.current = true;
      clearTimers();
      setFeedback(text ? { kind: "success", text } : null);
      advanceTimerRef.current = window.setTimeout(() => {
        successActiveRef.current = false;
        setIndex(next); // the [index] reset effect wipes feedback/anchor/latches
      }, SUCCESS_REVEAL_MS);
    },
    [clearTimers]
  );

  // Click the segment modal's close button if it's open. Works for both readers
  // via the shared [data-tour="modal-close"] hook — no new modal APIs.
  const closeOpenModal = useCallback(() => {
    if (!modalSel) return;
    const btn = document.querySelector<HTMLElement>(`${modalSel} [data-tour="modal-close"]`);
    btn?.click();
  }, [modalSel]);

  // Desktop/tablet bubble placement as a function of the tracked rect (the rAF loop
  // and the initial render share ONE formula; phone pins it via CSS). Held in a ref
  // so the rAF closure always calls the latest without re-subscribing.
  const bubblePosRef = useRef<(rect: Rect) => CSSProperties>(() => ({}));
  bubblePosRef.current = (rect: Rect): CSSProperties => {
    if (!step) return {};
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const top = Math.max(12, Math.min(rect.top, vh - 240));
    switch (step.bubbleSide) {
      case "left":
        return { top, right: Math.max(12, vw - rect.left + 16) };
      case "right":
        return {
          top: Math.max(12, rect.top),
          left: Math.min(rect.left + rect.width + 16, vw - 320 - 12)
        };
      case "over":
      default:
        return {
          top: Math.max(12, rect.top + rect.height + 16),
          left: rect.left,
          maxWidth: "min(320px, calc(100vw - 24px))"
        };
    }
  };

  // Self-gate: render only when a fresh progress segment matches the current
  // path AND the URL still carries ?tour=1. A stale ?tour=1 bookmark shows
  // fixtures + honesty banner (server-side) but never this chrome.
  useEffect(() => {
    const s = activeSegment();
    const expected = s ? (s === "news" ? "/news" : "/reports") : null;
    let isTour = false;
    try {
      isTour = new URLSearchParams(window.location.search).get("tour") === "1";
    } catch {
      isTour = false;
    }
    if (s && isTour && segForPath(pathname) === s && pathname === expected) {
      setSeg(s);
      setIndex(0);
    } else {
      setSeg(null);
    }
  }, [pathname]);

  // Reset per-stop transient state and bring an off-screen anchor into view. The
  // reader auto-open itself lives in the rAF loop (so it can wait out a modal still
  // closing from a Back); here we only clear its per-entry latches.
  useEffect(() => {
    setAnchorRect(null);
    setFeedback(null);
    setReaderReady(false);
    lastRectRef.current = null;
    hasRectRef.current = false;
    successActiveRef.current = false;
    sawOpenRef.current = false;
    openTargetClickedRef.current = false;
    clearTimers();
    if (!step?.anchor) return;
    const el = document.querySelector(step.anchor);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seg, index]);

  // B2: one-shot position ease on stop change. Held for at least SETTLE_MS, then
  // dropped only once the tracked anchor rect has been QUIESCENT (delta under the
  // move-gate) for ~2 consecutive frames — so the ease isn't stripped while the entry
  // scrollIntoView or the reader modal's grow is still moving the anchor, which would
  // land the trailing gap as an instant snap. The rAF loop is the single writer of
  // lastRectRef; we only OBSERVE it. A hard SETTLE_CEIL_MS ceiling guards a never-
  // settling anchor (e.g. a modal that never opens).
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
  }, [seg, index]);

  // Single rAF loop — the only writer of anchorRect, the sole POSITIONER of the
  // ring/dim/blocker/bubble (straight to the DOM, B), AND the evaluator of the
  // active stop's modal condition.
  useEffect(() => {
    if (!step?.anchor || !modalSel) return;
    const selector = step.anchor;
    const activeStep = step;
    const active = safeIndex;
    let raf = 0;

    const writePositions = (rect: Rect) => {
      if (ringRef.current) {
        const r = ringInset(rect);
        const s = ringRef.current.style;
        s.top = `${r.top}px`;
        s.left = `${r.left}px`;
        s.width = `${r.width}px`;
        s.height = `${r.height}px`;
      }
      const g = holeGeom(rect);
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
      if (bubbleRef.current) {
        // Inline top/left drive desktop/tablet; on phone the pin classes' !important
        // top/bottom win, so these writes are harmlessly overridden there.
        const b = bubblePosRef.current(rect);
        const s = bubbleRef.current.style;
        if (b.top !== undefined) s.top = typeof b.top === "number" ? `${b.top}px` : String(b.top);
        if (b.left !== undefined) s.left = typeof b.left === "number" ? `${b.left}px` : String(b.left);
        if (b.right !== undefined) s.right = typeof b.right === "number" ? `${b.right}px` : String(b.right);
        if (b.maxWidth !== undefined)
          s.maxWidth = typeof b.maxWidth === "number" ? `${b.maxWidth}px` : String(b.maxWidth);
      }
    };

    const frame = () => {
      const el = document.querySelector(selector);
      if (el) {
        const box = el.getBoundingClientRect();
        const next: Rect = { top: box.top, left: box.left, width: box.width, height: box.height };
        const prev = lastRectRef.current;
        if (
          !prev ||
          Math.abs(prev.top - next.top) >= MOVE_GATE ||
          Math.abs(prev.left - next.left) >= MOVE_GATE ||
          Math.abs(prev.width - next.width) >= MOVE_GATE ||
          Math.abs(prev.height - next.height) >= MOVE_GATE
        ) {
          lastRectRef.current = next;
          heldRectRef.current = next; // survives the next stop-change reset (Fix 4)
          writePositions(next); // B: DOM-direct, no per-frame React render
        }
        if (!hasRectRef.current) {
          hasRectRef.current = true;
          setAnchorRect(next); // mount the nodes once, initial style from lastRectRef
        }
      }

      // Modal condition — evaluated every frame, guarded against double-advance.
      // `open` = genuinely open; a mid-close modal carries data-closing and reads as
      // NOT open (news lingers CLOSE_MS during its shrink; the post modal unmounts at
      // once). `present` = open OR still-closing.
      if (!successActiveRef.current) {
        const open = !!document.querySelector(`${modalSel}:not([data-closing])`);
        const present = !!document.querySelector(modalSel);
        // Reader auto-open: click the real card ourselves — but only once the DOM
        // holds NO modal, so a modal still closing from a Back finishes first
        // (opening over it would be torn down by its pending unmount).
        if (activeStep.autoOpen && activeStep.openTarget && !present && !openTargetClickedRef.current) {
          const target = document.querySelector<HTMLElement>(activeStep.openTarget);
          // Fix 6: latch only AFTER a non-null target is found + clicked, so a card
          // that mounts a frame or two late gets retried on the next frames instead of
          // being permanently skipped.
          if (target) {
            openTargetClickedRef.current = true;
            // Fix 5: focus the card BEFORE opening so the modal captures IT as its
            // previouslyFocused element — closing the reader then restores focus here
            // instead of falling to <body>. Both live targets are natively focusable
            // (.cs-newscard is an <a>, report-readmore a <button>); the guard makes a
            // non-focusable node (e.g. a <div> card) focusable first. preventScroll so
            // this never fights the tour's own scrollIntoView.
            if (
              target.tabIndex < 0 &&
              !target.matches("a[href], button, input, select, textarea, [contenteditable]")
            ) {
              target.tabIndex = -1;
            }
            target.focus({ preventScroll: true });
            target.click();
          }
        }
        if (activeStep.kind === "action" && activeStep.watch === "gone") {
          if (!open) succeedThenAdvance(active + 1, activeStep.successText);
        } else if (activeStep.autoReconcileTo !== undefined) {
          // A reader stop: latch (and reveal Next) only once it's GENUINELY open, so
          // neither the entry gap before our open click lands NOR a lingering closing
          // modal false-latches; once seen open, its disappearance reconciles forward.
          if (open) {
            if (!sawOpenRef.current) {
              sawOpenRef.current = true;
              setReaderReady(true);
            }
          } else if (sawOpenRef.current) {
            succeedThenAdvance(activeStep.autoReconcileTo, activeStep.successText);
          }
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [seg, index, step, safeIndex, modalSel, succeedThenAdvance]);

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

  // A blocked click on any dim panel: nudge + wiggle.
  const onDimClick = useCallback(() => {
    setFeedback({ kind: "nudge", text: MISS_HINT });
    runShake(bubbleRef.current);
  }, [runShake]);

  // Skip / Esc → close any open modal, end the whole tour, strip ?tour=1
  // (fixtures revert to live), and keep this component mounted just long enough
  // to show the restart toast.
  const endSkip = useCallback(() => {
    closeOpenModal();
    clearTimers();
    endTour();
    setSeg(null);
    setShowSkipToast(true);
    router.replace(pathname);
  }, [closeOpenModal, clearTimers, router, pathname]);

  // Self-dismiss the skip toast ~4s after it appears.
  useEffect(() => {
    if (!showSkipToast) return;
    const id = window.setTimeout(() => setShowSkipToast(false), SKIP_TOAST_MS);
    return () => window.clearTimeout(id);
  }, [showSkipToast]);

  // Esc skips the tour — but YIELDS while the segment's modal is open, so Esc
  // closes the modal naturally (the modal-gone rAF then advances the stop).
  useEffect(() => {
    if (!seg) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable)) {
        return;
      }
      if (modalSel && document.querySelector(modalSel)) return; // yield to the modal
      event.preventDefault();
      endSkip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [seg, modalSel, endSkip]);

  const onCta = useCallback(() => {
    if (!step || !stops) return;
    const adv = step.advance;
    if (!adv || adv.type === "next") {
      // Advance from the render-time index (not a functional updater) so a rapid
      // double-click computes the SAME target and can't skip a stop.
      setIndex(Math.min(safeIndex + 1, stops.length - 1));
    } else if (adv.type === "bridge") {
      startSegment(adv.seg);
      const url = adv.url;
      if (window.self !== window.top) {
        window.top!.location.href = url;
      } else {
        router.push(url);
      }
    } else {
      endTour();
      setSeg(null);
      const url = "/map";
      if (window.self !== window.top) {
        window.top!.location.href = url;
      } else {
        router.push(url);
      }
    }
  }, [step, stops, safeIndex, router]);

  // Step back. Uses the stop's explicit backTo where the default (index-1) would
  // land in an impossible state, and closes the open modal first when leaving an
  // over-modal reader stop. The FIRST stop of each segment has NO Back.
  const onBack = useCallback(() => {
    if (!step) return;
    clearTimers();
    successActiveRef.current = false;
    if (step.backCloseModal) closeOpenModal();
    const dest = step.backTo ?? Math.max(0, safeIndex - 1);
    setIndex(dest);
  }, [step, safeIndex, clearTimers, closeOpenModal]);

  // The restart toast can outlive the active segment — render it whenever it's up.
  const skipToastNode = showSkipToast ? (
    <div className={styles.skipToast} role="status">
      Restart the tour anytime with the ? on the Map page.
    </div>
  ) : null;

  if (!seg || !step) return skipToastNode;

  // B: position from the live tracked rect so even a React re-render reads the
  // CURRENT position and never snaps back to a stale one. Through the ~1-frame stop-
  // change gap (settling, before the new anchor is first measured) fall back to the
  // PREVIOUS geometry (heldRectRef) so the dim doesn't flash full-screen with no hole
  // between stops; once settling clears, a still-absent anchor honestly shows the full
  // dim (Fix 4).
  const measuredRect = lastRectRef.current ?? anchorRect;
  const liveRect = measuredRect ?? (settling ? heldRectRef.current : null);
  const settleClass = settling ? ` ${styles.settleMove}` : "";

  const skipLink = (
    <button type="button" className={styles.skip} onClick={endSkip}>
      Skip tour
    </button>
  );

  const backButton =
    safeIndex > 0 ? (
      <button type="button" className={styles.back} onClick={onBack}>
        ← Back
      </button>
    ) : null;

  const feedbackNode = feedback ? (
    <p
      className={`${styles.feedback} ${
        feedback.kind === "success" ? styles.feedbackSuccess : styles.feedbackNudge
      }`}
    >
      {feedback.kind === "success" ? `✓ ${feedback.text}` : feedback.text}
    </p>
  ) : null;

  // info stops show the CTA; a reader (autoOpen) stop withholds it until readerReady
  // (its modal has been SEEN open) — mirrors the map guide's autoReady, so Next can't
  // fire before the reader exists (or when the open click found no card). action
  // stops advance on the modal, so they show a quiet step counter instead.
  const footerRightAction =
    step.kind === "info" ? (
      !step.autoOpen || readerReady ? (
        <button type="button" className={styles.cta} onClick={onCta}>
          {step.cta}
        </button>
      ) : (
        // Reader CTA withheld until its modal is SEEN open: show the same quiet step
        // counter the map guide uses so the footer is never empty (no Next-pops-in
        // layout shift, no permanent-looking dead end if the open fails). Mirrors the
        // action-stop branch below.
        <span className={styles.count}>{`Step ${safeIndex + 1} of ${stops!.length}`}</span>
      )
    ) : (
      <span className={styles.count}>{`Step ${safeIndex + 1} of ${stops!.length}`}</span>
    );

  const ctaFooter = (
    <div className={styles.footer}>
      {skipLink}
      <div className={styles.footerRight}>
        {backButton}
        {footerRightAction}
      </div>
    </div>
  );

  // Centered finish card: dim backdrop, page inert. Backdrop click only wiggles.
  if (!step.anchor) {
    return (
      <>
        <div
          className={styles.backdrop}
          data-tour-chrome=""
          onClick={() => runShake(cardRef.current)}
        >
          <div
            ref={cardRef}
            className={`${styles.card} ${styles.cardGlow}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.title}>{step.title}</h2>
            <p className={styles.body}>{step.body}</p>
            {feedbackNode}
            {ctaFooter}
          </div>
        </div>
        {skipToastNode}
      </>
    );
  }

  const arrowClass =
    step.bubbleSide === "left"
      ? styles.arrowLeft
      : step.bubbleSide === "right"
        ? styles.arrowRight
        : styles.arrowOver;

  const ringStyle: CSSProperties | undefined = liveRect ? ringInset(liveRect) : undefined;

  // Spotlight: four dim panels around the anchor answer stray clicks with a nudge.
  // A look-at stop (no interactiveHole) also covers the hole with a transparent
  // blocker so the page stays inert; a reader / close stop leaves the hole open so
  // the modal / × underneath stays clickable. Positions come from liveRect and are
  // re-written each frame by the rAF loop (B).
  let dimNode: ReactNode = null;
  if (liveRect) {
    const g = holeGeom(liveRect);
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
        {step.interactiveHole ? null : (
          <div
            ref={blockerRef}
            className={settling ? styles.settleMove : undefined}
            style={{
              position: "fixed",
              top: g.holeTop,
              left: g.holeLeft,
              width: Math.max(0, g.holeRight - g.holeLeft),
              height: g.bandHeight,
              zIndex: 1385,
              background: "transparent",
              pointerEvents: "auto"
            }}
            data-tour-chrome=""
            onClick={onDimClick}
          />
        )}
      </>
    );
  } else {
    dimNode = <div className={styles.dimFull} data-tour-chrome="" onClick={onDimClick} />;
  }

  const bubbleStyle: CSSProperties = liveRect ? bubblePosRef.current(liveRect) : { top: 16, left: 16 };

  return (
    <>
      {dimNode}
      {liveRect ? (
        <div
          ref={ringRef}
          className={`${styles.ring} ${feedback?.kind === "success" ? styles.ringSuccess : ""}${settleClass}`}
          style={ringStyle}
          data-tour-chrome=""
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={bubbleRef}
        className={`${styles.bubble} ${
          // m8: pin to the bottom band on phone for the stops that sit over the open
          // modal — the close stops (watch:"gone", × near the top) AND the reader
          // stops (keyed by autoReconcileTo) — so the bubble never covers the
          // summary/close it describes. CSS-gated to <=640, so desktop/tablet
          // placement is byte-identical.
          (step.kind === "action" && step.watch === "gone") || step.autoReconcileTo !== undefined
            ? styles.bubblePinBottom
            : ""
        }${settleClass}`}
        style={bubbleStyle}
        data-tour-chrome=""
      >
        <span className={`${styles.arrow} ${arrowClass}`} aria-hidden="true" />
        <h2 className={styles.title}>{step.title}</h2>
        <p className={styles.body}>{step.body}</p>
        {feedbackNode}
        {ctaFooter}
      </div>
      {skipToastNode}
    </>
  );
}
