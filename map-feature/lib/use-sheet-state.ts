"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { useVisualViewport } from "./use-visual-viewport";

// Owns the phone bottom-sheet snap state (peek / half / full) for the signals map.
// Heights derive from the VISUAL viewport (via useVisualViewport, which also keeps
// --app-vh live) so they shrink above the soft keyboard. The handle-only drag
// tracks the finger live; on release it snaps to the nearest state with a light
// velocity bias. Desktop/tablet never consume the returned height (the host gates
// every write behind ff.isPhone) — the hook runs unconditionally but is inert off
// phone, so React's rules-of-hooks are respected without a form-factor branch here.

export type SheetSnap = "peek" | "half" | "full";

// peek is a floored constant (grab handle + one-line brief) — NOT vv-scaled, so a
// tall phone doesn't blow the peek band out of proportion.
const PEEK_PX = 96;
// Release velocity (px/ms) past which a flick biases one snap step in its
// direction instead of settling on the nearest snap. ~500 px/s.
const FLICK = 0.5;

const ORDER: SheetSnap[] = ["peek", "half", "full"];

type Heights = Record<SheetSnap, number>;

function nearestSnap(px: number, h: Heights): SheetSnap {
  let best: SheetSnap = "peek";
  let bestDist = Infinity;
  for (const snap of ORDER) {
    const dist = Math.abs(px - h[snap]);
    if (dist < bestDist) {
      bestDist = dist;
      best = snap;
    }
  }
  return best;
}

function stepBy(snap: SheetSnap, dir: 1 | -1): SheetSnap {
  const i = ORDER.indexOf(snap);
  return ORDER[Math.max(0, Math.min(ORDER.length - 1, i + dir))];
}

// Resolve env(safe-area-inset-bottom) to px. A CSS custom property can't carry it
// to JS (custom properties store the literal env() token, unresolved); a hidden
// probe that USES it in a real property does resolve it. Only changes on rotation.
export function readSafeAreaBottom(): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

export interface SheetState {
  snap: SheetSnap;
  setSnap: (snap: SheetSnap) => void;
  isDragging: boolean;
  // Live px height: tracks the finger while dragging, else the settled snap height.
  height: number;
  // The current snap's settled px height (ignores mid-drag movement) — this is the
  // value the camera reads so keyboard/drag jitter never yanks the map.
  settledHeight: number;
  // Spread onto the grab-handle element. Pointer-captured so move/up land on the
  // handle even when the finger slides off it.
  handleProps: {
    onPointerDown: (event: ReactPointerEvent) => void;
    onPointerMove: (event: ReactPointerEvent) => void;
    onPointerUp: (event: ReactPointerEvent) => void;
    onPointerCancel: (event: ReactPointerEvent) => void;
    style: { touchAction: "none" };
  };
  // True when the just-ended gesture actually dragged (moved past a small slop),
  // read-and-reset. A mouse drag settling at peek fires a synthetic click on the
  // handle afterward; the tap-to-expand handler consumes this to ignore that
  // click. A true tap never moves past the slop, so it reports false.
  consumeDragMoved: () => boolean;
}

export function useSheetState(): SheetState {
  const vv = useVisualViewport();
  const vh = vv.height || (typeof window !== "undefined" ? window.innerHeight : 0);

  // Bottom safe-area inset (home indicator). Re-read on rotation only — a soft
  // keyboard shrinks vv.height but never the inset, so keying this to vh would
  // thrash the probe for a value that hasn't changed.
  const [safeBottom, setSafeBottom] = useState(0);
  useEffect(() => {
    const update = () => setSafeBottom(readSafeAreaBottom());
    update();
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(orientation: portrait)");
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const heights = useMemo<Heights>(() => {
    // Clamp full so the sheet top can't cross above the 60px topbar into
    // negative space on short / notched viewports (unclamped, the top ran to
    // -9..-92px, hiding the grab handle — the sole drag surface). 68 = the
    // tab-bar band the sheet is anchored above (12 + 56); 12 = top margin. The
    // CSS max-height mirrors this as a looser backstop that can't exceed it.
    // Floor at PEEK_PX: a soft keyboard shrinking vv.height can drive the clamp
    // below peek (or negative), which would invert the snap order and make the
    // drag clamps degenerate — never let full fall under peek.
    const full = Math.max(PEEK_PX, Math.min(Math.round(vh * 0.9), vh - 60 - 68 - safeBottom - 12));
    return {
      peek: PEEK_PX,
      // Compute half AFTER full and cap it there: under a soft keyboard (small vh)
      // round(vh*0.5) can exceed full, inverting the peek<=half<=full order that
      // nearestSnap/stepBy/drag clamps assume. peek stays as-is (full already
      // floors at PEEK_PX, so the chain holds).
      half: Math.min(Math.round(vh * 0.5), full),
      full
    };
  }, [vh, safeBottom]);

  const [snap, setSnap] = useState<SheetSnap>("peek");
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0); // px/ms; +ve = finger moving DOWN (collapsing)
  // The pointerId of the in-flight drag (null when idle). This — not
  // hasPointerCapture — is the single source of truth for "a drag is active", so
  // the drag can't wedge if setPointerCapture ever no-ops on a device.
  const activePointerRef = useRef<number | null>(null);
  // Whether the current/last gesture moved past the tap slop (a real drag) vs a
  // stationary tap. Reset on each pointerdown; consumed by expandFromPeek so the
  // synthetic click a settled mouse drag fires doesn't re-expand the sheet.
  const dragMovedRef = useRef(false);
  // Live mirror of heights so the pointer handlers read current values without
  // re-subscribing on every viewport tick.
  const heightsRef = useRef(heights);
  heightsRef.current = heights;
  // Drag coalescing (T3): raw pointermove can outrun the frame rate on 120Hz
  // devices, so the live clientY is buffered here and flushed to dragHeight through
  // a single rAF per frame. Velocity is still sampled per raw event (below) so the
  // release flick read stays accurate.
  const rafRef = useRef<number | null>(null);
  const pendingYRef = useRef<number | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      // Drop any move flush a previous pointer left buffered so its stale write
      // can't land against this pointer's fresh startY/startHeight (a one-frame
      // sheet jump on multi-touch). Mirrors the up/cancel cleanup below.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingYRef.current = null;
      activePointerRef.current = event.pointerId;
      dragMovedRef.current = false;
      // Keep move/up flowing to the handle even if the finger slides off it.
      // Best-effort: a failed capture doesn't break the drag (we guard on the ref).
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore — the active-pointer ref still tracks the drag.
      }
      const h = heightsRef.current[snap];
      startYRef.current = event.clientY;
      startHeightRef.current = h;
      lastYRef.current = event.clientY;
      lastTRef.current = performance.now();
      velocityRef.current = 0;
      setIsDragging(true);
      setDragHeight(h);
    },
    [snap]
  );

  const onPointerMove = useCallback((event: ReactPointerEvent) => {
    if (activePointerRef.current !== event.pointerId) {
      return;
    }
    // Once the finger travels past a small slop this is a real drag, not a tap —
    // latch it so the post-drag synthetic click can be ignored.
    if (Math.abs(event.clientY - startYRef.current) > 6) {
      dragMovedRef.current = true;
    }
    // Finger up (clientY decreases) grows the sheet. Sample velocity on every raw
    // event so the release flick bias stays accurate.
    const now = performance.now();
    const dt = now - lastTRef.current;
    if (dt > 0) {
      velocityRef.current = (event.clientY - lastYRef.current) / dt;
    }
    lastYRef.current = event.clientY;
    lastTRef.current = now;
    // Buffer the live position; flush at most once per frame.
    pendingYRef.current = event.clientY;
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const y = pendingYRef.current;
        if (y === null) {
          return;
        }
        const h = heightsRef.current;
        // Clamp to [peek, full].
        const next = Math.max(h.peek, Math.min(h.full, startHeightRef.current + (startYRef.current - y)));
        setDragHeight(next);
      });
    }
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent) => {
    if (activePointerRef.current !== event.pointerId) {
      return;
    }
    activePointerRef.current = null;
    // Cancel any buffered move flush; the settle below reads event.clientY (the
    // true release position), so no stale rAF write may survive it.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingYRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // capture may already be gone (e.g. pointercancel) — ignore.
    }
    const h = heightsRef.current;
    const current = startHeightRef.current + (startYRef.current - event.clientY);
    const clamped = Math.max(h.peek, Math.min(h.full, current));
    const base = nearestSnap(clamped, h);
    const v = velocityRef.current;
    const target = v > FLICK ? stepBy(base, -1) : v < -FLICK ? stepBy(base, 1) : base;
    setIsDragging(false);
    setDragHeight(null);
    setSnap(target);
  }, []);

  // A browser-fired pointercancel (system gesture takeover, etc.) means no
  // pointerup will follow — resolve the drag here so it can't wedge (isDragging /
  // data-dragging stuck on). No trustworthy final velocity on cancel, so settle to
  // the nearest snap of wherever the finger last sat, with no flick bias.
  const onPointerCancel = useCallback((event: ReactPointerEvent) => {
    if (activePointerRef.current !== event.pointerId) {
      return;
    }
    activePointerRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingYRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // capture may already be gone — ignore.
    }
    const h = heightsRef.current;
    const current = startHeightRef.current + (startYRef.current - lastYRef.current);
    const clamped = Math.max(h.peek, Math.min(h.full, current));
    setIsDragging(false);
    setDragHeight(null);
    setSnap(nearestSnap(clamped, h));
  }, []);

  // Read-and-reset the "did the last gesture drag" flag. Stable so consumers can
  // list it in effect/callback deps without re-subscribing.
  const consumeDragMoved = useCallback(() => {
    const moved = dragMovedRef.current;
    dragMovedRef.current = false;
    return moved;
  }, []);

  // Cancel a buffered drag flush if we unmount mid-drag.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const settledHeight = heights[snap];
  const height = isDragging && dragHeight !== null ? dragHeight : settledHeight;

  return {
    snap,
    setSnap,
    isDragging,
    height,
    settledHeight,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      style: { touchAction: "none" }
    },
    consumeDragMoved
  };
}
