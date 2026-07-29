"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

import { MQ } from "@/lib/map-feature/breakpoints";
import { cityBounds } from "@/lib/map-feature/map/bounds";
import { BOROUGH_CENTERS, computeFitPadding, guardPadding, type Padding } from "@/lib/map-feature/map/camera";
import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import { useVisualViewport } from "@/lib/map-feature/use-visual-viewport";
import { readSafeAreaBottom, type SheetSnap } from "@/lib/map-feature/use-sheet-state";
import { MapboxCanvas } from "./mapbox-canvas";

// Per-borough fill for the signals lens: `color` is a concrete map color (Mapbox
// paint can't read CSS vars) and `opacity` is scaled by the borough's top signal
// score. Only boroughs with a signal matching the active filter appear here.
export type BoroughStyles = Record<string, { color: string; opacity: number }>;

type Props = {
  boroughGeoJson: unknown;
  labelsGeoJson: unknown;
  selectedBorough: string;
  onSelectBorough: (borough: string) => void;
  // Optional: fires on EVERY borough click, including a re-click of the already-
  // selected one. The signals lens (signals-map-experience) passes it as
  // notifyBoroughClick, which advances the guided tour (boroughClickTick) and
  // flips the camera to the clicked borough; the 311 Reports lens omits it.
  onDrillIn?: (borough: string) => void;
  // When provided (signals mode), each borough is tinted by its top signal.
  // When omitted (reports mode), the map keeps its original single-accent look.
  boroughStyles?: BoroughStyles;
  // First-load framing: 'city' fits all five boroughs, 'borough' the selected
  // one. OPTIONAL, defaults to 'borough' so the 311 Reports lens (which omits it)
  // stays byte-identical. The signals host flips it to 'borough' on the first
  // borough click and back to 'city' via the "All boroughs" pill.
  cameraScope?: "city" | "borough";
  // Phone bottom-sheet coupling (from useSheetState, in the signals host).
  // `sheetPx` is the SETTLED snap height reserved as bottom fit padding;
  // `sheetSnap` is the discrete token the refit keys on — so a keyboard-driven
  // visual-viewport change (which shifts px but NOT the token) never yanks the
  // camera. Both are ignored off phone (computeFitPadding branches on ff.isPhone).
  // OPTIONAL: the 311 Reports lens (map-experience) has no draggable sheet, so it
  // omits these and falls back to the visual-viewport-derived band below.
  sheetPx?: number;
  sheetSnap?: SheetSnap;
};

// Flat fill for reports mode only (no per-borough signal tints there).
const BRAND = "#7c3aed";
// Selected-borough outline is a neutral ink (near var(--ink)), NOT a data hue:
// in signals mode the fill match already carries the signal colors, so the
// selection edge must read as interaction state, never be mistaken for the
// purple "Emerging" tint.
const SELECT_INK = "#111c18";
const MUTED_LINE = "#b9bfc9";
const NEUTRAL_FILL = "#c7ccd1";

type Bounds = [[number, number], [number, number]];

function hasStyles(styles?: BoroughStyles): styles is BoroughStyles {
  return !!styles && Object.keys(styles).length > 0;
}

// Fill color: in signals mode, a per-borough `match` on BoroName (default to the
// neutral grey for boroughs with no matching signal); otherwise the flat brand.
function fillColorExpression(styles?: BoroughStyles): unknown {
  if (!hasStyles(styles)) {
    return BRAND;
  }
  const match: unknown[] = ["match", ["get", "BoroName"]];
  for (const [name, style] of Object.entries(styles)) {
    match.push(name, style.color);
  }
  match.push(NEUTRAL_FILL);
  return match;
}

// Fill opacity: selected + hovered boroughs read strongest; the rest fall back to
// their signal-weighted opacity (signals mode) or the original faint look.
function fillOpacityExpression(borough: string, styles?: BoroughStyles): unknown {
  if (!hasStyles(styles)) {
    return [
      "case",
      ["==", ["get", "BoroName"], borough],
      0.14,
      ["boolean", ["feature-state", "hover"], false],
      0.08,
      0.03
    ];
  }
  const match: unknown[] = ["match", ["get", "BoroName"]];
  for (const [name, style] of Object.entries(styles)) {
    match.push(name, style.opacity);
  }
  match.push(0.05);
  return [
    "case",
    ["==", ["get", "BoroName"], borough],
    0.52,
    ["boolean", ["feature-state", "hover"], false],
    0.4,
    match
  ];
}

function boundsOfSelected(boroughGeoJson: unknown, borough: string): Bounds | null {
  const features = (boroughGeoJson as { features?: unknown[] })?.features ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const visit = (coords: unknown) => {
    if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
      minX = Math.min(minX, coords[0]);
      minY = Math.min(minY, coords[1]);
      maxX = Math.max(maxX, coords[0]);
      maxY = Math.max(maxY, coords[1]);
    } else if (Array.isArray(coords)) {
      coords.forEach(visit);
    }
  };
  for (const feature of features as Array<Record<string, unknown>>) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    if (props.BoroName !== borough) {
      continue;
    }
    visit((feature.geometry as { coordinates?: unknown })?.coordinates);
  }
  if (minX === Infinity) {
    return null;
  }
  return [
    [minX, minY],
    [maxX, maxY]
  ];
}

export const BoroughOverviewMap = memo(function BoroughOverviewMap({
  boroughGeoJson,
  labelsGeoJson,
  selectedBorough,
  onSelectBorough,
  onDrillIn,
  boroughStyles,
  cameraScope = "borough",
  sheetPx: sheetPxProp,
  sheetSnap
}: Props) {
  const mapRef = useRef<MapboxMap | null>(null);
  const hoveredRef = useRef<number | string | null>(null);
  const selectedRef = useRef(selectedBorough);
  selectedRef.current = selectedBorough;
  const scopeRef = useRef(cameraScope);
  scopeRef.current = cameraScope;
  const onSelectRef = useRef(onSelectBorough);
  onSelectRef.current = onSelectBorough;
  const onDrillInRef = useRef(onDrillIn);
  onDrillInRef.current = onDrillIn;
  const stylesRef = useRef(boroughStyles);
  stylesRef.current = boroughStyles;

  // Form-factor aware fit padding. Held in a ref so imperative Mapbox handlers
  // (click, onReady) read the CURRENT value, never a stale render closure.
  const ff = useFormFactor();
  // Signals lens threads the settled snap height; the 311 lens omits it, so fall
  // back to the non-sheet .cs-insights band (T3): its phone cap (45% of the
  // visual viewport) plus its 12px bottom margin. AppShellV2 has no map tab bar.
  const vv = useVisualViewport();
  // The .cs-insights CSS anchor includes env(safe-area-inset-bottom); the fallback
  // band must add it too, or on notched phones the modeled sheet sits ~34px high
  // and eats the fit's breathing pad. Probed once (changes only on rotation);
  // readSafeAreaBottom is SSR-guarded (returns 0 with no document).
  const safeBottom = useMemo(() => readSafeAreaBottom(), []);
  const sheetPx = sheetPxProp ?? Math.round(vv.height * 0.45) + 12 + safeBottom;
  const fitRef = useRef<{ padding: Padding; sheetPx: number }>({
    padding: computeFitPadding(ff, sheetPx),
    sheetPx
  });
  fitRef.current = { padding: computeFitPadding(ff, sheetPx), sheetPx };

  // Initial pre-style-load frame. When first-load scope is city, seed a city-wide
  // center/zoom so the frame before onReady's duration:0 fit doesn't flash the
  // selected borough; otherwise the selected borough's center.
  const cityScope = cameraScope === "city";
  const center: [number, number] = cityScope
    ? [-73.98, 40.71]
    : BOROUGH_CENTERS[selectedBorough] ?? [-73.94, 40.7];
  const zoom = cityScope ? 9.6 : 10.6;

  const fitTo = useCallback(
    (map: MapboxMap, borough: string, animate: boolean) => {
      const bounds =
        scopeRef.current === "city"
          ? cityBounds(boroughGeoJson)
          : boundsOfSelected(boroughGeoJson, borough);
      if (bounds) {
        const { padding, sheetPx: sp } = fitRef.current;
        map.fitBounds(bounds, {
          padding: guardPadding(map, padding, sp),
          duration: animate ? 550 : 0
        });
      }
    },
    [boroughGeoJson]
  );

  // Recolor the selected borough's fill + outline. Cheap + synchronous, so the
  // map reacts the instant a borough is clicked or the active filter changes (no
  // waiting on any fetch). Reads the current styles from the ref.
  const applyPaint = useCallback((map: MapboxMap, borough: string, styles?: BoroughStyles) => {
    if (typeof map.getLayer !== "function" || !map.getLayer("borough-fill")) {
      return;
    }
    map.setPaintProperty("borough-fill", "fill-color", fillColorExpression(styles) as never);
    map.setPaintProperty(
      "borough-fill",
      "fill-opacity",
      fillOpacityExpression(borough, styles) as never
    );
    map.setPaintProperty("borough-line", "line-color", [
      "case",
      ["==", ["get", "BoroName"], borough],
      SELECT_INK,
      MUTED_LINE
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
    map.setPaintProperty("borough-line", "line-width", [
      "case",
      ["==", ["get", "BoroName"], borough],
      2.6,
      1
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);
  }, []);

  const onReady = useCallback(
    (map: MapboxMap) => {
      mapRef.current = map;
      const borough = selectedRef.current;
      const styles = stylesRef.current;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource("boroughs", { type: "geojson", data: boroughGeoJson, generateId: true } as any);
      map.addLayer({
        id: "borough-fill",
        type: "fill",
        source: "boroughs",
        paint: {
          "fill-color": fillColorExpression(styles),
          "fill-opacity": fillOpacityExpression(borough, styles)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      map.addLayer({
        id: "borough-line",
        type: "line",
        source: "boroughs",
        paint: {
          "line-color": ["case", ["==", ["get", "BoroName"], borough], SELECT_INK, MUTED_LINE],
          "line-width": ["case", ["==", ["get", "BoroName"], borough], 2.6, 1]
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource("borough-labels", { type: "geojson", data: labelsGeoJson } as any);
      map.addLayer({
        id: "borough-labels",
        type: "symbol",
        source: "borough-labels",
        layout: {
          "text-field": ["get", "BoroName"],
          "text-size": 12,
          "text-transform": "uppercase",
          "text-letter-spacing": 0.08,
          "text-allow-overlap": true
        },
        paint: { "text-color": "#525a65", "text-halo-color": "#ffffff", "text-halo-width": 1.4 }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Hover: pointer cursor + highlight the borough under the cursor. Touch
      // devices synthesize mousemove on tap but never mouseleave, which would
      // strand a borough in its hover highlight — so hover only runs where a
      // real pointer exists (checked per event; cheap and always current).
      const hoverCapable = window.matchMedia(MQ.hoverFine);
      const clearHover = () => {
        if (hoveredRef.current !== null) {
          map.setFeatureState({ source: "boroughs", id: hoveredRef.current }, { hover: false });
        }
        hoveredRef.current = null;
      };
      map.on("mousemove", "borough-fill", (event) => {
        if (!hoverCapable.matches) {
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const feature = event.features?.[0];
        if (!feature) {
          return;
        }
        if (hoveredRef.current !== null) {
          map.setFeatureState({ source: "boroughs", id: hoveredRef.current }, { hover: false });
        }
        hoveredRef.current = feature.id ?? null;
        if (hoveredRef.current !== null) {
          map.setFeatureState({ source: "boroughs", id: hoveredRef.current }, { hover: true });
        }
      });
      map.on("mouseleave", "borough-fill", () => {
        map.getCanvas().style.cursor = "";
        clearHover();
      });

      // Click a borough → respond instantly (highlight + camera glide), then let
      // the orchestrator update its selection. Clicking the already-selected
      // borough re-runs the camera glide so the click is never silent.
      // Coarse pointers use the same immediate selection behavior. Boroughs are
      // large targets with always-on symbol labels, so one tap is clear and
      // matches the neighborhood map's touch behavior.
      map.on("click", "borough-fill", (event) => {
        const name = event.features?.[0]?.properties?.BoroName;
        if (typeof name !== "string") {
          return;
        }
        clearHover();
        if (name !== selectedRef.current) {
          selectedRef.current = name;
          applyPaint(map, name, stylesRef.current);
          fitTo(map, name, true);
          onSelectRef.current(name);
        } else {
          fitTo(map, name, true);
        }
        onDrillInRef.current?.(name);
      });

      fitTo(map, borough, false);
    },
    [boroughGeoJson, labelsGeoJson, fitTo, applyPaint]
  );

  // Reconcile when the borough prop OR the camera scope changes from elsewhere
  // (shared URL, mode toggle, or the city↔borough flip a click/back triggers):
  // repaint + fit per scope. The click path already did this, so this is usually
  // a no-op for direct map clicks.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    applyPaint(map, selectedBorough, stylesRef.current);
    fitTo(map, selectedBorough, true);
  }, [selectedBorough, cameraScope, applyPaint, fitTo]);

  // Repaint (no pan) when the active filter changes the per-borough tint.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    applyPaint(map, selectedRef.current, boroughStyles);
  }, [boroughStyles, applyPaint]);

  // Re-fit when the form-factor CLASS changes mid-session (e.g. rotation moving
  // between phone / tablet-portrait / desktop) so the reserved band tracks the
  // new layout. Keyed on the class booleans only, NOT sheetPx, so a soft
  // keyboard resizing the visual viewport doesn't yank the camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    fitTo(map, selectedRef.current, true);
  }, [ff.isPhone, ff.isTabletPortrait, fitTo]);

  // Rotations that stay within one form-factor band (iPad portrait<->landscape,
  // small phones whose landscape width stays <=640) don't change ff.isPhone/
  // isTabletPortrait, so the band-keyed refit above misses them and the framing
  // goes stale. Subscribe to orientation directly and refit (debounced ~280ms,
  // phone/tablet only — desktop keeps no orientation refit).
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
      if (!map) {
        return;
      }
      if (orientRefitTimer.current !== null) {
        window.clearTimeout(orientRefitTimer.current);
      }
      orientRefitTimer.current = window.setTimeout(() => {
        fitTo(map, selectedRef.current, true);
      }, 280);
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      if (orientRefitTimer.current !== null) {
        window.clearTimeout(orientRefitTimer.current);
      }
    };
  }, [ff.isPhone, ff.isTabletPortrait, fitTo]);

  // Re-fit when the bottom sheet SETTLES on a new snap (phone only), so the
  // reserved bottom band tracks the sheet. Keyed on the discrete snap TOKEN (not
  // the continuous sheetPx) so a soft keyboard resizing the viewport never yanks
  // the camera; debounced ~280ms (just past the sheet's snap animation) so a fast
  // peek→full→half only refits once. Skips the first run (token unchanged) so it
  // never double-fits over onReady's initial fit.
  const prevSnapRef = useRef(sheetSnap);
  const snapRefitTimer = useRef<number | null>(null);
  useEffect(() => {
    // No sheetSnap → the 311 lens (no draggable sheet); never refit on snap there.
    if (!ff.isPhone || sheetSnap === undefined || prevSnapRef.current === sheetSnap) {
      prevSnapRef.current = sheetSnap;
      return;
    }
    prevSnapRef.current = sheetSnap;
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (snapRefitTimer.current !== null) {
      window.clearTimeout(snapRefitTimer.current);
    }
    snapRefitTimer.current = window.setTimeout(() => {
      fitTo(map, selectedRef.current, true);
    }, 280);
    return () => {
      if (snapRefitTimer.current !== null) {
        window.clearTimeout(snapRefitTimer.current);
      }
    };
  }, [sheetSnap, ff.isPhone, fitTo]);

  return <MapboxCanvas center={center} zoom={zoom} onReady={onReady} className="cs-overview-map" />;
});
