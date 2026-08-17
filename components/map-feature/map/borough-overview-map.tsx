"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Marker, type Map as MapboxMap } from "mapbox-gl";

import { MQ } from "@/lib/map-feature/breakpoints";
import type { CivicGeographyFeatureCollection } from "@/lib/map-feature/civic-types";
import { cityBounds } from "@/lib/map-feature/map/bounds";
import { BOROUGH_CENTERS, computeFitPadding, guardPadding, type Padding } from "@/lib/map-feature/map/camera";
import {
  CIVIC_DISTRICT_HIT_LAYER_ID,
  CIVIC_DISTRICT_HOVER_FILL_LAYER_ID,
  CIVIC_DISTRICT_LABEL_LAYER_ID,
  CIVIC_DISTRICT_SELECTED_LABEL_LAYER_ID,
  civicDistrictHighlightFilter,
  civicDistrictBounds,
  civicDistrictFitPadding,
  civicDistrictMaxZoom,
  syncCivicDistrictOverlay,
  updateCivicDistrictSelection
} from "@/lib/map-feature/map/civic-district-overlay";
import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import { useVisualViewport } from "@/lib/map-feature/use-visual-viewport";
import { readSafeAreaBottom, type SheetSnap } from "@/lib/map-feature/use-sheet-state";
import { MapboxCanvas } from "./mapbox-canvas";
import mapStyles from "./map-signals.module.css";

// Per-borough fill for the signals lens: `color` is a concrete map color (Mapbox
// paint can't read CSS vars) and `opacity` is scaled by the borough's top signal
// score. Only boroughs with a signal matching the active filter appear here.
export type BoroughStyles = Record<string, { color: string; opacity: number }>;
type PointSource = "search" | "geolocation";

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
  // Civic uses this canvas only as a neutral citywide base for its own district
  // geometry. Disable borough hover/click state there so a district tap cannot
  // accidentally select or outline the borough underneath it.
  boroughInteractionEnabled?: boolean;
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
  // Optional official civic-district geometry. The Civic workspace adds a
  // direct map selection target while other map modes ignore this overlay.
  civicGeoJson?: CivicGeographyFeatureCollection | null;
  selectedCivicDistrictKey?: string | null;
  civicLayerLabel?: string | null;
  // Civic boundaries are direct map targets in the Civic workspace. Keeping
  // this callback optional preserves the 311/Community map behavior.
  onSelectCivicDistrict?: (districtKey: string) => void;
  // Civic can show both the physical GPS fix and a separately searched address.
  // Null/omitted keeps the historical Community/Reports overview unchanged.
  userLocationPoint?: [number, number] | null;
  searchedLocationPoint?: [number, number] | null;
  searchedLocationLabel?: string | null;
  // A non-address search such as a ZIP code may focus the Civic map without
  // selecting (and therefore implying) a representative at the point center.
  civicFocusPoint?: [number, number] | null;
  civicFocusZoom?: number | null;
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
  boroughInteractionEnabled = true,
  boroughStyles,
  cameraScope = "borough",
  sheetPx: sheetPxProp,
  sheetSnap,
  civicGeoJson = null,
  selectedCivicDistrictKey = null,
  onSelectCivicDistrict,
  civicLayerLabel = null,
  userLocationPoint = null,
  searchedLocationPoint = null,
  searchedLocationLabel = null,
  civicFocusPoint = null,
  civicFocusZoom = null
}: Props) {
  const mapRef = useRef<MapboxMap | null>(null);
  const hoveredRef = useRef<number | string | null>(null);
  const selectedRef = useRef(selectedBorough);
  const scopeRef = useRef(cameraScope);
  const onSelectRef = useRef(onSelectBorough);
  const onDrillInRef = useRef(onDrillIn);
  const onSelectCivicDistrictRef = useRef(onSelectCivicDistrict);
  const civicLayerLabelRef = useRef(civicLayerLabel);
  const boroughInteractionEnabledRef = useRef(boroughInteractionEnabled);
  const stylesRef = useRef(boroughStyles);
  const civicGeoJsonRef = useRef<CivicGeographyFeatureCollection | null>(civicGeoJson);
  const selectedCivicDistrictKeyRef = useRef<string | null>(selectedCivicDistrictKey);
  const civicCameraActiveRef = useRef(false);
  const userLocationPointRef = useRef<[number, number] | null>(userLocationPoint);
  const searchedLocationPointRef = useRef<[number, number] | null>(searchedLocationPoint);
  const searchedLocationLabelRef = useRef<string | null>(searchedLocationLabel);
  const civicFocusPointRef = useRef<[number, number] | null>(civicFocusPoint);
  const civicFocusZoomRef = useRef<number | null>(civicFocusZoom);
  const markerRefs = useRef<Record<PointSource, Marker | null>>({
    search: null,
    geolocation: null
  });
  const civicTipRef = useRef<HTMLDivElement | null>(null);

  // Mapbox listeners are registered once, so mirror their changing inputs before
  // paint without mutating refs during render or rebuilding the map lifecycle.
  useLayoutEffect(() => {
    selectedRef.current = selectedBorough;
    scopeRef.current = cameraScope;
    onSelectRef.current = onSelectBorough;
    onDrillInRef.current = onDrillIn;
    onSelectCivicDistrictRef.current = onSelectCivicDistrict;
    civicLayerLabelRef.current = civicLayerLabel;
    boroughInteractionEnabledRef.current = boroughInteractionEnabled;
    stylesRef.current = boroughStyles;
    civicGeoJsonRef.current = civicGeoJson;
    selectedCivicDistrictKeyRef.current = selectedCivicDistrictKey;
    userLocationPointRef.current = userLocationPoint;
    searchedLocationPointRef.current = searchedLocationPoint;
    searchedLocationLabelRef.current = searchedLocationLabel;
    civicFocusPointRef.current = civicFocusPoint;
    civicFocusZoomRef.current = civicFocusZoom;
  }, [
    boroughStyles,
    boroughInteractionEnabled,
    cameraScope,
    civicGeoJson,
    onDrillIn,
    onSelectCivicDistrict,
    civicLayerLabel,
    civicFocusPoint,
    civicFocusZoom,
    onSelectBorough,
    searchedLocationLabel,
    searchedLocationPoint,
    selectedBorough,
    selectedCivicDistrictKey,
    userLocationPoint
  ]);

  const syncPointMarker = useCallback(
    (
      map: MapboxMap,
      source: PointSource,
      point: [number, number] | null,
      label: string | null
    ) => {
      markerRefs.current[source]?.remove();
      markerRefs.current[source] = null;
      if (!point) {
        return;
      }
      const element = document.createElement("div");
      element.className = `cs-focus-marker cs-focus-marker--${source}`;
      element.dataset.locationKind = source;
      element.setAttribute("role", "img");
      const fallbackLabel = source === "geolocation" ? "Your current location" : "Searched address";
      element.setAttribute("aria-label", label ?? fallbackLabel);
      element.title = label ?? fallbackLabel;
      markerRefs.current[source] = new Marker({
        element,
        anchor: source === "geolocation" ? "bottom" : "center"
      })
        .setLngLat(point)
        .addTo(map);
    },
    []
  );

  useEffect(
    () => () => {
      markerRefs.current.search?.remove();
      markerRefs.current.geolocation?.remove();
      markerRefs.current.search = null;
      markerRefs.current.geolocation = null;
      civicTipRef.current?.remove();
      civicTipRef.current = null;
    },
    []
  );

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
  const fitRef = useRef<{ padding: Padding; civicPadding: Padding; sheetPx: number }>({
    padding: computeFitPadding(ff, sheetPx),
    civicPadding: civicDistrictFitPadding(ff, sheetPx),
    sheetPx
  });
  useLayoutEffect(() => {
    fitRef.current = {
      padding: computeFitPadding(ff, sheetPx),
      civicPadding: civicDistrictFitPadding(ff, sheetPx),
      sheetPx
    };
  }, [ff, sheetPx]);

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
      const selectedDistrictBounds = civicDistrictBounds(
        civicGeoJsonRef.current,
        selectedCivicDistrictKeyRef.current
      );
      const civicPoint = selectedDistrictBounds ? null : civicFocusPointRef.current;
      if (civicPoint) {
        const { sheetPx: sp } = fitRef.current;
        const containerHeight = map.getContainer().clientHeight;
        const offset: [number, number] = ff.isPhone
          ? [0, -Math.min(sp, Math.floor(containerHeight / 2)) / 2]
          : [0, 0];
        civicCameraActiveRef.current = true;
        map.stop();
        map.easeTo({
          center: civicPoint,
          zoom: civicFocusZoomRef.current ?? 11.2,
          offset,
          duration: animate ? 550 : 0,
          retainPadding: false
        });
        return;
      }
      const bounds =
        selectedDistrictBounds ??
        (scopeRef.current === "city"
          ? cityBounds(boroughGeoJson)
          : boundsOfSelected(boroughGeoJson, borough));
      civicCameraActiveRef.current = selectedDistrictBounds !== null;
      if (bounds) {
        const { padding, civicPadding, sheetPx: sp } = fitRef.current;
        if (selectedDistrictBounds) {
          map.stop();
        }
        map.fitBounds(bounds, {
          padding: guardPadding(map, selectedDistrictBounds ? civicPadding : padding, sp),
          duration: animate ? 550 : 0,
          ...(selectedDistrictBounds
            ? { maxZoom: civicDistrictMaxZoom(ff), retainPadding: false }
            : {})
        });
      }
    },
    [boroughGeoJson, ff]
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
      const civicTip = document.createElement("div");
      civicTip.className = mapStyles.civicMapTip;
      civicTip.setAttribute("role", "status");
      civicTip.setAttribute("aria-live", "polite");
      civicTip.style.opacity = "0";
      map.getContainer().appendChild(civicTip);
      civicTipRef.current = civicTip;
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

      // Civic boundaries stay below borough labels; a separate map-level
      // handler below targets them only when the Civic workspace is active.
      syncCivicDistrictOverlay(
        map,
        civicGeoJsonRef.current,
        selectedCivicDistrictKeyRef.current,
        "borough-labels"
      );
      syncPointMarker(
        map,
        "geolocation",
        userLocationPointRef.current,
        "Your current location"
      );
      syncPointMarker(
        map,
        "search",
        searchedLocationPointRef.current,
        searchedLocationLabelRef.current
      );

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
        if (!boroughInteractionEnabledRef.current || !hoverCapable.matches) {
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
        if (!boroughInteractionEnabledRef.current) return;
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

      // Bind directly to the full-area civic hit layer. Delegated Mapbox layer
      // events remain registered while async civic geometry is swapped in and
      // expose the exact feature under the pointer without a second canvas query.
      map.on(
        "click",
        [
          CIVIC_DISTRICT_SELECTED_LABEL_LAYER_ID,
          CIVIC_DISTRICT_LABEL_LAYER_ID,
          CIVIC_DISTRICT_HIT_LAYER_ID
        ],
        (event) => {
        if (!onSelectCivicDistrictRef.current || !civicGeoJsonRef.current) return;
        const districtKey = event.features?.[0]?.properties?.geography_key;
        if (typeof districtKey !== "string" || !districtKey) return;
        onSelectCivicDistrictRef.current(districtKey);
        }
      );

      const clearCivicHover = () => {
        const tip = civicTipRef.current;
        if (tip) {
          tip.style.opacity = "0";
        }
        if (map.getLayer(CIVIC_DISTRICT_HOVER_FILL_LAYER_ID)) {
          map.setFilter(
            CIVIC_DISTRICT_HOVER_FILL_LAYER_ID,
            civicDistrictHighlightFilter(selectedCivicDistrictKeyRef.current)
          );
        }
        map.getCanvas().style.cursor = "";
      };

      map.on("mousemove", CIVIC_DISTRICT_HIT_LAYER_ID, (event) => {
        const tip = civicTipRef.current;
        if (!tip || !onSelectCivicDistrictRef.current || !civicGeoJsonRef.current) return;
        if (!hoverCapable.matches) {
          clearCivicHover();
          return;
        }
        const feature = event.features?.[0];
        const districtName = feature?.properties?.display_name;
        const districtKey = feature?.properties?.geography_key;
        if (
          typeof districtName !== "string" ||
          !districtName ||
          typeof districtKey !== "string" ||
          !districtKey
        ) {
          clearCivicHover();
          return;
        }
        if (map.getLayer(CIVIC_DISTRICT_HOVER_FILL_LAYER_ID)) {
          map.setFilter(
            CIVIC_DISTRICT_HOVER_FILL_LAYER_ID,
            civicDistrictHighlightFilter(selectedCivicDistrictKeyRef.current, districtKey)
          );
        }
        tip.textContent = `${civicLayerLabelRef.current ? `${civicLayerLabelRef.current} · ` : ""}${districtName} · Click to view details`;
        const container = map.getContainer();
        const gap = 14;
        const edge = 8;
        const tipWidth = tip.offsetWidth;
        const tipHeight = tip.offsetHeight;
        let tipX = event.point.x + gap;
        let tipY = event.point.y + gap;
        if (tipX + tipWidth > container.clientWidth - edge) {
          tipX = event.point.x - tipWidth - gap;
        }
        if (tipY + tipHeight > container.clientHeight - edge) {
          tipY = event.point.y - tipHeight - gap;
        }
        tipX = Math.max(edge, Math.min(tipX, container.clientWidth - tipWidth - edge));
        tipY = Math.max(edge, Math.min(tipY, container.clientHeight - tipHeight - edge));
        tip.style.transform = `translate(${tipX}px, ${tipY}px)`;
        tip.style.opacity = "1";
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", CIVIC_DISTRICT_HIT_LAYER_ID, clearCivicHover);

      fitTo(map, borough, false);
    },
    [boroughGeoJson, labelsGeoJson, fitTo, applyPaint, syncPointMarker]
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

  // ZIP and similar broad Civic searches frame a point without selecting the
  // district at that point. Reuse fitTo so phone sheet padding and rotations
  // keep the focus stable.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    fitTo(map, selectedRef.current, true);
  }, [civicFocusPoint, civicFocusZoom, fitTo]);

  // Swap civic geography in place (including layer-type changes) without
  // recreating Mapbox. A restored selection is framed once its geometry arrives;
  // null still removes only this overlay and leaves Community's camera untouched.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    syncCivicDistrictOverlay(
      map,
      civicGeoJson,
      selectedCivicDistrictKeyRef.current,
      "borough-labels"
    );
    if (
      civicDistrictBounds(civicGeoJson, selectedCivicDistrictKeyRef.current) &&
      (ff.isPhone || ff.isCoarse)
    ) {
      fitTo(map, selectedRef.current, true);
    } else if (!civicGeoJson && civicCameraActiveRef.current) {
      // Re-entering Community restores its existing city/borough scope without
      // clearing selection state or leaking Civic's wider rail padding.
      fitTo(map, selectedRef.current, true);
    }
  }, [civicGeoJson, ff.isCoarse, ff.isPhone, fitTo]);

  // Selection updates the two highlight filters and frames that exact Polygon or
  // MultiPolygon. No source reload or Mapbox remount is involved.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    updateCivicDistrictSelection(
      map,
      selectedCivicDistrictKey,
      civicGeoJsonRef.current
    );
    if (
      civicDistrictBounds(civicGeoJsonRef.current, selectedCivicDistrictKey) &&
      (ff.isPhone || ff.isCoarse)
    ) {
      fitTo(map, selectedRef.current, true);
    } else if (selectedCivicDistrictKey === null && civicCameraActiveRef.current) {
      // Clear the camera fit together with the district highlight. Without this,
      // switching back to the layer overview leaves the previous close zoom.
      fitTo(map, selectedRef.current, true);
    }
  }, [selectedCivicDistrictKey, ff.isCoarse, ff.isPhone, fitTo]);

  // Keep the two meanings distinct even when both coordinates happen to be the
  // same: GPS uses the pin treatment; a searched address uses the target marker.
  // Null removes only that marker, including on a Civic → Community transition.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    syncPointMarker(map, "geolocation", userLocationPoint, "Your current location");
    syncPointMarker(map, "search", searchedLocationPoint, searchedLocationLabel);
  }, [userLocationPoint, searchedLocationPoint, searchedLocationLabel, syncPointMarker]);

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
