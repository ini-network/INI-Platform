"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

import { MQ } from "@/lib/map-feature/breakpoints";
import { boroughBounds } from "@/lib/map-feature/map/bounds";
import { BOROUGH_CENTERS, computeFitPadding, guardPadding, type Padding } from "@/lib/map-feature/map/camera";
import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import type { SheetSnap } from "@/lib/map-feature/use-sheet-state";
import { MapboxCanvas } from "./mapbox-canvas";

// Borough-level signals map: the neighborhood (NTA) polygons the deep-dive uses,
// tinted persistently by each neighborhood's top matching signal (neighborhoods
// with no matching signal stay a faint neutral). Clicking a neighborhood selects
// it; the parent scopes the reading panel to it. Modeled on
// NeighborhoodChoroplethMap so the proven Mapbox lifecycle is reused verbatim.

// A per-neighborhood fill: `color` is a concrete map color (Mapbox paint can't
// read CSS vars) and `opacity` is scaled by the neighborhood's top signal score.
export type AreaTint = { color: string; opacity: number };

type PolygonFeature = { properties?: Record<string, unknown> | null };
type PolygonCollection = { features?: PolygonFeature[] };

// Accept a FeatureCollection OR a bare feature array. Mapbox itself only takes
// the collection form — feeding it an array yields a silently EMPTY source
// (the exact bug behind "Browse neighborhoods showed nothing but the borough
// outline"), so everything downstream normalizes through here.
function toFeatureList(features: unknown): PolygonFeature[] {
  if (Array.isArray(features)) {
    return features as PolygonFeature[];
  }
  const list = (features as PolygonCollection | null)?.features;
  return Array.isArray(list) ? list : [];
}

type Props = {
  borough: string;
  boroughGeoJson: unknown;
  // GeoJSON FeatureCollection of THIS borough's NTA polygons (properties.id = area_id).
  features: unknown;
  tintByArea: Record<number, AreaTint>;
  metaByArea: Record<number, { name: string; signals: number }>;
  selectedAreaId: number | null;
  // When set (from a search result), fly to this [lng, lat] instead of fitting
  // the borough bounds. Null on a plain drill-in / neighborhood click.
  focusPoint: [number, number] | null;
  onSelectArea: (areaId: number) => void;
  // Phone bottom-sheet coupling (from useSheetState, in the host). `sheetPx` is
  // the SETTLED snap height reserved as bottom fit/easeTo padding; `sheetSnap` is
  // the discrete token the refit keys on — so a keyboard-driven visual-viewport
  // change (px shifts, token doesn't) never yanks the camera. Ignored off phone.
  sheetPx: number;
  sheetSnap: SheetSnap;
};

// Selection/hover chrome is a neutral ink family, deliberately outside every
// MAP_ACCENTS data hue — the "Emerging" signal is itself purple, so the old
// brand-purple chrome made interaction state indistinguishable from data.
const SELECT_INK = "#111c18"; // near var(--ink): selected neighborhood edge + glow
// Hover outline: a mid neutral, one step quieter than SELECT_INK so a hovered
// shape never outshines the selected one (SELECT_INK 2px + glow).
const HOVER_LINE = "#47554e";
const NEUTRAL = "#c7ccd1";
const BOROUGH_OUTLINE = "#2563eb";
const NEUTRAL_OPACITY = 0.14;
const FOCUS_ZOOM = 13.5;

// Fly-to options for a searched/selected point. On phone the target is biased
// into the visible band ABOVE the sheet (an upward offset lifts the center so it
// lands centered in the top ~44%), clamped so it never exceeds half the height.
// Desktop/tablet are unchanged.
function focusEaseOptions(map: MapboxMap, center: [number, number], isPhone: boolean, sheetPx: number) {
  const base = { center, zoom: FOCUS_ZOOM, duration: 700 };
  if (!isPhone) {
    return base;
  }
  const ch = map.getContainer().clientHeight;
  // easeTo `padding` PERSISTS as the map's global padding (mapbox-gl v3), skewing
  // later fitBounds; the equivalent upward `offset` biases the target above the
  // sheet with nothing left on the transform.
  return { ...base, offset: [0, -Math.min(sheetPx, Math.floor(ch / 2)) / 2] as [number, number] };
}

export const NeighborhoodSignalsMap = memo(function NeighborhoodSignalsMap({
  borough,
  boroughGeoJson,
  features,
  tintByArea,
  metaByArea,
  selectedAreaId,
  focusPoint,
  onSelectArea,
  sheetPx,
  sheetSnap
}: Props) {
  const mapRef = useRef<MapboxMap | null>(null);
  const readyRef = useRef(false);
  const selectedStateRef = useRef<number | null>(null);
  // Always tracks the desired selection so onReady() can apply it even when the
  // selection was set before the map finished loading (search auto-select).
  const selectedAreaIdRef = useRef<number | null>(selectedAreaId);
  selectedAreaIdRef.current = selectedAreaId;
  const focusPointRef = useRef<[number, number] | null>(focusPoint);
  focusPointRef.current = focusPoint;
  const hoverStateRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelectArea);
  onSelectRef.current = onSelectArea;
  const tintRef = useRef(tintByArea);
  tintRef.current = tintByArea;
  const metaRef = useRef(metaByArea);
  metaRef.current = metaByArea;

  // The hover name tag is driven imperatively (textContent/transform on a ref),
  // not through React state — a state set per mousemove would re-render the
  // whole component at pointer speed for a purely cosmetic label.
  const tipRef = useRef<HTMLDivElement | null>(null);
  const center = BOROUGH_CENTERS[borough] ?? [-73.94, 40.7];

  // Form-factor aware camera geometry. Held in a ref so imperative Mapbox
  // handlers (onReady, sourcedata finish) read the CURRENT value, never a stale
  // render closure.
  const ff = useFormFactor();
  const camRef = useRef<{ padding: Padding; sheetPx: number; isPhone: boolean; isCoarse: boolean }>({
    padding: computeFitPadding(ff, sheetPx),
    sheetPx,
    isPhone: ff.isPhone,
    isCoarse: ff.isCoarse
  });
  camRef.current = {
    padding: computeFitPadding(ff, sheetPx),
    sheetPx,
    isPhone: ff.isPhone,
    isCoarse: ff.isCoarse
  };

  // Tap-to-peek (coarse pointers only): the FIRST tap on an NTA shows its outline
  // + name/count tag WITHOUT selecting; a SECOND tap on the same NTA (or a tap on
  // the tag) commits onSelectArea. Held in a ref so the imperative Mapbox click
  // handler reads the current peek without re-subscribing. Fine-pointer devices
  // never enter this path (guarded by camRef.current.isCoarse), so a single click
  // still selects exactly as before.
  const peekIdRef = useRef<number | null>(null);
  // The keydown listener attached while the peek tag is a focusable button; held
  // in a ref so the off-branch can detach the exact listener the on-branch added.
  const peekKeyHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Enter/exit the tag's touch affordance: a 44px, tappable pill (default
  // .cs-map-tip is pointer-events:none). Styled inline to avoid touching the
  // shared redesign.css tip block.
  const setPeekTagAffordance = useCallback((on: boolean, label?: string) => {
    const el = tipRef.current;
    if (!el) return;
    if (on) {
      el.style.pointerEvents = "auto";
      el.style.minHeight = "44px";
      el.style.display = "inline-flex";
      el.style.alignItems = "center";
      // While it's an actual tap target, expose it as a button (it's an aria-
      // hidden decorative hover label the rest of the time).
      el.setAttribute("role", "button");
      if (label) el.setAttribute("aria-label", label);
      el.removeAttribute("aria-hidden");
      // Keyboard AT parity with the onClick: make the pill focusable and commit
      // on Enter / Space (preventDefault on Space so it doesn't scroll the page).
      el.setAttribute("tabindex", "0");
      if (!peekKeyHandlerRef.current) {
        const handler = (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            commitPeekRef.current();
          } else if (e.key === " ") {
            e.preventDefault();
            commitPeekRef.current();
          }
        };
        peekKeyHandlerRef.current = handler;
        el.addEventListener("keydown", handler);
      }
    } else {
      el.style.pointerEvents = "";
      el.style.minHeight = "";
      el.style.display = "";
      el.style.alignItems = "";
      el.removeAttribute("role");
      el.removeAttribute("aria-label");
      el.removeAttribute("tabindex");
      if (peekKeyHandlerRef.current) {
        el.removeEventListener("keydown", peekKeyHandlerRef.current);
        peekKeyHandlerRef.current = null;
      }
      el.setAttribute("aria-hidden", "true");
      el.style.opacity = "0";
    }
  }, []);

  const clearPeek = useCallback(() => {
    // No active peek: nothing to clear. Guard FIRST so a desktop pan/zoom
    // (movestart → clearPeek) never runs setPeekTagAffordance(false), whose
    // off-branch zeroes the shared hover tag's opacity and hides the live hover
    // name until the cursor crosses to a different NTA.
    if (peekIdRef.current === null) {
      return;
    }
    const map = mapRef.current;
    if (map) {
      map.setFeatureState({ source: "nta", id: peekIdRef.current }, { hover: false });
    }
    peekIdRef.current = null;
    setPeekTagAffordance(false);
  }, [setPeekTagAffordance]);

  const commitPeek = useCallback(() => {
    const id = peekIdRef.current;
    clearPeek();
    if (id !== null) {
      onSelectRef.current(id);
    }
  }, [clearPeek]);
  // Mirror so the tag's keydown listener (attached in setPeekTagAffordance, which
  // is declared above commitPeek) can call the current commitPeek without a
  // forward reference or re-subscribing.
  const commitPeekRef = useRef(commitPeek);
  commitPeekRef.current = commitPeek;

  // Give every NTA its tint (persistent for signal-bearing neighborhoods, a
  // faint neutral otherwise). Setting a cleared state on neutral areas ensures a
  // filter change correctly removes a tint an area no longer qualifies for.
  const applyTints = useCallback(
    (map: MapboxMap) => {
      if (!map.getSource("nta")) {
        return;
      }
      const list = toFeatureList(features);
      const tint = tintRef.current;
      for (const feature of list) {
        const id = feature.properties?.id;
        if (typeof id !== "number") {
          continue;
        }
        const entry = tint[id];
        map.setFeatureState(
          { source: "nta", id },
          entry
            ? { color: entry.color, tintOpacity: entry.opacity, hasTint: true }
            : { color: NEUTRAL, tintOpacity: NEUTRAL_OPACITY, hasTint: false }
        );
      }
    },
    [features]
  );

  const onReady = useCallback(
    (map: MapboxMap) => {
      mapRef.current = map;

      const data = { type: "FeatureCollection", features: toFeatureList(features) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource("nta", { type: "geojson", data, promoteId: "id" } as any);

      map.addLayer({
        id: "nta-fill",
        type: "fill",
        source: "nta",
        paint: {
          "fill-color": ["coalesce", ["feature-state", "color"], NEUTRAL],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            0.6,
            ["boolean", ["feature-state", "hover"], false],
            0.3,
            ["boolean", ["feature-state", "hasTint"], false],
            ["coalesce", ["feature-state", "tintOpacity"], 0.22],
            NEUTRAL_OPACITY
          ]
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Soft dark halo under the selected neighborhood's edge (premium lift).
      map.addLayer({
        id: "nta-glow",
        type: "line",
        source: "nta",
        paint: {
          "line-color": SELECT_INK,
          "line-blur": 6,
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 8, 0],
          "line-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.28, 0]
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Base edges stay quiet — the hover outline lives on its own top-most
      // layer (nta-hover-line) so neighbors' grey lines never overdraw it on
      // shared borders.
      map.addLayer({
        id: "nta-line",
        type: "line",
        source: "nta",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            SELECT_INK,
            "rgba(120, 120, 120, 0.5)"
          ],
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2, 0.9]
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Blue outline of the whole borough for context ("you're viewing Brooklyn").
      map.addSource("borough", {
        type: "geojson",
        data: (boroughGeoJson ?? { type: "FeatureCollection", features: [] }) as never
      });
      map.addLayer({
        id: "borough-outline",
        type: "line",
        source: "borough",
        filter: ["==", ["get", "BoroName"], borough],
        paint: {
          "line-color": BOROUGH_OUTLINE,
          "line-width": 2,
          "line-opacity": 0.45
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Top-most hover outline: draws AFTER every other line layer, so the
      // hovered shape gets one crisp, unbroken border even on edges it shares
      // with neighbors.
      map.addLayer({
        id: "nta-hover-line",
        type: "line",
        source: "nta",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": HOVER_LINE,
          "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.5, 0],
          "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0]
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Hover = bright outline + name tag by the cursor. Touch devices
      // synthesize mousemove on tap but never mouseleave, which would strand
      // both forever — so hover only runs where a real pointer exists (checked
      // per event), and clicks always clear it.
      const hoverCapable = window.matchMedia(MQ.hoverFine);
      const hideTip = () => {
        if (tipRef.current) {
          tipRef.current.style.opacity = "0";
        }
      };
      const clearHover = () => {
        if (hoverStateRef.current !== null) {
          map.setFeatureState({ source: "nta", id: hoverStateRef.current }, { hover: false });
        }
        hoverStateRef.current = null;
      };
      map.on("mousemove", "nta-fill", (event) => {
        if (!hoverCapable.matches) {
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const id = event.features?.[0]?.id;
        if (typeof id !== "number") {
          return;
        }
        const tipEl = tipRef.current;
        if (id !== hoverStateRef.current) {
          if (hoverStateRef.current !== null) {
            map.setFeatureState({ source: "nta", id: hoverStateRef.current }, { hover: false });
          }
          hoverStateRef.current = id;
          map.setFeatureState({ source: "nta", id }, { hover: true });
          if (tipEl) {
            const meta = metaRef.current[id];
            const name = meta?.name ?? "";
            const count = meta?.signals ?? 0;
            const tail =
              count === 0 ? "no signals yet" : `${count} ${count === 1 ? "signal" : "signals"}`;
            tipEl.textContent = name ? `${name} · ${tail}` : "";
            tipEl.style.opacity = name ? "1" : "0";
          }
        }
        // Position every event, but only via transform — compositor-only work.
        if (tipEl) {
          tipEl.style.transform = `translate(${event.point.x + 14}px, ${event.point.y + 14}px)`;
        }
      });
      map.on("mouseleave", "nta-fill", () => {
        map.getCanvas().style.cursor = "";
        clearHover();
        hideTip();
      });

      map.on("click", "nta-fill", (event) => {
        clearHover();
        const id = event.features?.[0]?.id;
        if (typeof id !== "number") {
          return;
        }
        // Fine pointer: single click selects, exactly as before.
        if (!camRef.current.isCoarse) {
          hideTip();
          onSelectRef.current(id);
          return;
        }
        // Coarse pointer: two-step peek. Second tap on the same NTA commits.
        if (peekIdRef.current === id) {
          commitPeek();
          return;
        }
        // First tap here (or moving the peek off another NTA): borrow the hover
        // feature-state for the same outline the desktop hover shows, and park
        // the name/count tag just above the tap point (finger-safe) with a clear
        // "Tap again to open" affordance — this also keeps the guided tour's
        // "tap a neighborhood" step legible on touch (the map takes no tourOpen
        // prop, so peek is always two-tap; the affordance carries the intent).
        if (peekIdRef.current !== null) {
          map.setFeatureState({ source: "nta", id: peekIdRef.current }, { hover: false });
        }
        peekIdRef.current = id;
        map.setFeatureState({ source: "nta", id }, { hover: true });
        const tipEl = tipRef.current;
        if (tipEl) {
          const meta = metaRef.current[id];
          const name = meta?.name ?? "";
          const count = meta?.signals ?? 0;
          const tail =
            count === 0 ? "no signals yet" : `${count} ${count === 1 ? "signal" : "signals"}`;
          if (name) {
            tipEl.textContent = `${name} · ${tail} · Tap again to open`;
            setPeekTagAffordance(true, `Open ${name}`);
            tipEl.style.opacity = "1";
            const y = Math.max(8, event.point.y - 48);
            tipEl.style.transform = `translate(${event.point.x + 12}px, ${y}px)`;
          } else {
            clearPeek();
          }
        }
      });

      // A tap on water / empty canvas clears the peek (coarse only). The layer
      // handler above fires for NTA taps; this general handler only acts when the
      // tap missed every NTA, so the two never fight over the same tap.
      map.on("click", (event) => {
        if (!camRef.current.isCoarse || peekIdRef.current === null) {
          return;
        }
        const hits = map.queryRenderedFeatures(event.point, { layers: ["nta-fill"] });
        if (hits.length === 0) {
          clearPeek();
        }
      });

      // The peek tag is parked at fixed screen pixels for the tapped point; a pan
      // or zoom (user gesture OR the search easeTo) moves the polygon out from
      // under it, so drop the peek when the camera starts moving rather than let
      // the tag float disconnected. clearPeek no-ops when there's no active peek,
      // so the fine-pointer path is unaffected.
      map.on("movestart", clearPeek);

      const finish = () => {
        readyRef.current = true;
        applyTints(map);
        const selected = selectedAreaIdRef.current;
        if (selected !== null) {
          map.setFeatureState({ source: "nta", id: selected }, { selected: true });
          selectedStateRef.current = selected;
        }
        const focus = focusPointRef.current;
        if (focus) {
          const { isPhone, sheetPx: sp } = camRef.current;
          map.easeTo(focusEaseOptions(map, focus, isPhone, sp));
        }
      };
      if (map.isSourceLoaded("nta")) {
        finish();
      } else {
        const handler = (event: { sourceId?: string }) => {
          if (event.sourceId === "nta" && map.isSourceLoaded("nta")) {
            map.off("sourcedata", handler);
            finish();
          }
        };
        map.on("sourcedata", handler);
      }

      // Fit the borough only when we're not flying to a searched point.
      if (!focusPointRef.current) {
        const bounds = boroughBounds(boroughGeoJson, borough);
        if (bounds) {
          const { padding, sheetPx: sp } = camRef.current;
          map.fitBounds(bounds, { padding: guardPadding(map, padding, sp), duration: 0 });
        }
      }

      // onReady just built the source for THIS borough (latest closure's value —
      // MapboxCanvas invokes the freshest onReady on load). Advance prevBoroughRef
      // to match: a cross-borough change that early-returned before the source
      // existed left it on the OLD borough, and without this a later swap BACK to
      // that old borough would hit the identity guard and silently no-op.
      prevBoroughRef.current = borough;
    },
    [features, boroughGeoJson, borough, applyTints, commitPeek, clearPeek, setPeekTagAffordance]
  );

  // T7: swap boroughs IN PLACE — the host no longer remounts this via key, so a
  // cross-borough jump (only ever an address/ZIP search, which always carries a
  // focusPoint) re-points the existing map instead of tearing Mapbox down and
  // rebuilding it. Keyed on borough identity; the first run is skipped (onReady
  // owns the initial borough's source, layers and fit). Mirrors the per-borough
  // half of onReady: re-point the NTA source + outline, wipe every piece of
  // per-mount transient state a remount used to reset, then re-tint/re-select
  // once the new data has parsed. The camera is left to the focusPoint effect and
  // the borough-keyed refit effect below.
  const prevBoroughRef = useRef(borough);
  useEffect(() => {
    if (prevBoroughRef.current === borough) {
      return;
    }
    const map = mapRef.current;
    if (!map || !map.getSource("nta")) {
      // Gate on the source existing, not readyRef: a cross-borough change during
      // the source-parse window (onReady added the source but finish() hasn't set
      // readyRef yet) must still swap — gating on readiness would early-return with
      // prevBoroughRef already advanced and never re-fire, stranding the old
      // polygons. Running the swap while readyRef is false is safe: setFeatureState
      // persists across the data load and finishSwap's own sourcedata gate handles
      // timing. Leave prevBoroughRef unadvanced here: this effect won't re-fire (its
      // deps are unchanged), but onReady — invoked with the latest closure — builds
      // that borough's source and advances prevBoroughRef itself, so a later swap
      // back to the original borough isn't stranded.
      return;
    }
    prevBoroughRef.current = borough;
    // Clear the outgoing borough's selection/hover/peek feature-state WHILE those
    // features still exist, so none can resurface (setData may preserve state by
    // id). Tints aren't cleared here — applyTints below rewrites every feature.
    if (hoverStateRef.current !== null) {
      map.setFeatureState({ source: "nta", id: hoverStateRef.current }, { hover: false });
      hoverStateRef.current = null;
    }
    if (selectedStateRef.current !== null) {
      map.setFeatureState({ source: "nta", id: selectedStateRef.current }, { selected: false });
      selectedStateRef.current = null;
    }
    clearPeek();
    // Re-point the polygon source + the borough context outline.
    const source = map.getSource("nta");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (source as any)?.setData({ type: "FeatureCollection", features: toFeatureList(features) });
    if (map.getLayer("borough-outline")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.setFilter("borough-outline", ["==", ["get", "BoroName"], borough] as any);
    }
    // setFeatureState needs the new features parsed, so re-tint + re-assert the
    // selection once the source finishes loading (onReady's finish()/sourcedata
    // gate). Guarded so a rapid re-swap detaches the pending handler first.
    const finishSwap = () => {
      applyTints(map);
      const selected = selectedAreaIdRef.current;
      if (selected !== null) {
        map.setFeatureState({ source: "nta", id: selected }, { selected: true });
        selectedStateRef.current = selected;
      }
    };
    let detach = () => {};
    if (map.isSourceLoaded("nta")) {
      finishSwap();
    } else {
      const handler = (event: { sourceId?: string }) => {
        if (event.sourceId === "nta" && map.isSourceLoaded("nta")) {
          detach();
          finishSwap();
        }
      };
      map.on("sourcedata", handler);
      detach = () => map.off("sourcedata", handler);
    }
    return () => detach();
  }, [borough, features, applyTints, clearPeek]);

  // Reapply tints when the active filter changes them.
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) {
      applyTints(map);
    }
  }, [tintByArea, applyTints]);

  // Re-fit the borough when the form-factor CLASS changes mid-session (e.g.
  // rotation) so the reserved band tracks the new layout. Skipped while flying
  // to a searched point (focusPoint owns the camera there). Keyed on the class
  // booleans only, NOT sheetPx, so a soft keyboard doesn't yank the camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || focusPointRef.current) {
      return;
    }
    const bounds = boroughBounds(boroughGeoJson, borough);
    if (bounds) {
      const { padding, sheetPx: sp } = camRef.current;
      map.fitBounds(bounds, { padding: guardPadding(map, padding, sp), duration: 550 });
    }
  }, [ff.isPhone, ff.isTabletPortrait, boroughGeoJson, borough]);

  // Rotations that stay within one form-factor band (iPad portrait<->landscape,
  // small phones whose landscape width stays <=640) don't change ff.isPhone/
  // isTabletPortrait, so the band-keyed refit above misses them and the framing
  // goes stale. Subscribe to orientation directly and refit (debounced ~280ms,
  // phone/tablet only, and skipped while a searched focusPoint owns the camera —
  // desktop keeps no orientation refit).
  const orientRefitTimer = useRef<number | null>(null);
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      !(ff.isPhone || ff.isTabletPortrait)
    ) {
      return;
    }
    const mq = window.matchMedia("(orientation: portrait)");
    const onChange = () => {
      const map = mapRef.current;
      if (!map || !readyRef.current || focusPointRef.current) {
        return;
      }
      if (orientRefitTimer.current !== null) {
        window.clearTimeout(orientRefitTimer.current);
      }
      orientRefitTimer.current = window.setTimeout(() => {
        const bounds = boroughBounds(boroughGeoJson, borough);
        if (bounds) {
          const { padding, sheetPx: sp } = camRef.current;
          map.fitBounds(bounds, { padding: guardPadding(map, padding, sp), duration: 550 });
        }
      }, 280);
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      if (orientRefitTimer.current !== null) {
        window.clearTimeout(orientRefitTimer.current);
      }
    };
  }, [ff.isPhone, ff.isTabletPortrait, boroughGeoJson, borough]);

  // Re-fit when the bottom sheet SETTLES on a new snap (phone only). Keyed on the
  // discrete snap TOKEN, not the continuous sheetPx, so a soft keyboard never
  // yanks the camera; debounced ~280ms (past the snap animation) so a rapid
  // peek→full→half refits once. Skipped while a searched focusPoint owns the
  // camera, and skipped on the first run (token unchanged) so it never double-fits
  // over onReady's initial fit.
  const prevSnapRef = useRef(sheetSnap);
  const snapRefitTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!ff.isPhone || prevSnapRef.current === sheetSnap) {
      prevSnapRef.current = sheetSnap;
      return;
    }
    prevSnapRef.current = sheetSnap;
    const map = mapRef.current;
    if (!map || !readyRef.current || focusPointRef.current) {
      return;
    }
    if (snapRefitTimer.current !== null) {
      window.clearTimeout(snapRefitTimer.current);
    }
    snapRefitTimer.current = window.setTimeout(() => {
      const bounds = boroughBounds(boroughGeoJson, borough);
      if (bounds) {
        const { padding, sheetPx: sp } = camRef.current;
        map.fitBounds(bounds, { padding: guardPadding(map, padding, sp), duration: 550 });
      }
    }, 280);
    return () => {
      if (snapRefitTimer.current !== null) {
        window.clearTimeout(snapRefitTimer.current);
      }
    };
  }, [sheetSnap, ff.isPhone, boroughGeoJson, borough]);

  // Reflect selection as a highlight (movement is handled by focusPoint so a
  // plain click doesn't yank the map — the neighborhood is already in view).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }
    if (selectedStateRef.current !== null && selectedStateRef.current !== selectedAreaId) {
      map.setFeatureState({ source: "nta", id: selectedStateRef.current }, { selected: false });
    }
    selectedStateRef.current = selectedAreaId;
    if (selectedAreaId !== null) {
      map.setFeatureState({ source: "nta", id: selectedAreaId }, { selected: true });
    }
  }, [selectedAreaId]);

  // Fly to a searched point.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !focusPoint) {
      return;
    }
    const { isPhone, sheetPx: sp } = camRef.current;
    map.easeTo(focusEaseOptions(map, focusPoint, isPhone, sp));
  }, [focusPoint]);

  return (
    <div className="cs-deepdive-map-wrap">
      <MapboxCanvas center={center} zoom={11} onReady={onReady} className="cs-deepdive-map" />
      {/* Always mounted; the map's hover handlers drive text/position/opacity
          directly so the tag tracks the cursor without React re-renders. */}
      <div
        ref={tipRef}
        className="cs-map-tip"
        style={{ opacity: 0 }}
        aria-hidden="true"
        onClick={commitPeek}
      />
    </div>
  );
});
