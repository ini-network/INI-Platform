"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Marker, type FilterSpecification, type Map as MapboxMap } from "mapbox-gl";

import { MQ } from "@/lib/map-feature/breakpoints";
import { areaBounds, boroughBounds } from "@/lib/map-feature/map/bounds";
import { BOROUGH_CENTERS, computeFitPadding, guardPadding, type Padding } from "@/lib/map-feature/map/camera";
import { neighborhoodLabelCollection } from "@/lib/map-feature/map/neighborhood-labels";
import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import type { SheetSnap } from "@/lib/map-feature/use-sheet-state";
import type { CivicGeographyFeatureCollection } from "@/lib/map-feature/civic-types";
import {
  civicDistrictBounds,
  civicDistrictFitPadding,
  civicDistrictMaxZoom,
  syncCivicDistrictOverlay,
  updateCivicDistrictSelection
} from "@/lib/map-feature/map/civic-district-overlay";
import { MapboxCanvas } from "./mapbox-canvas";

// Borough-level signals map: the neighborhood (NTA) polygons the deep-dive uses,
// tinted persistently by each neighborhood's top matching signal (neighborhoods
// with no matching signal stay a faint neutral). Clicking a neighborhood selects
// it; the parent scopes the reading panel to it. Modeled on
// NeighborhoodChoroplethMap so the proven Mapbox lifecycle is reused verbatim.

// A per-neighborhood fill: `color` is a concrete map color (Mapbox paint can't
// read CSS vars) and `opacity` is scaled by the neighborhood's top signal score.
export type AreaTint = { color: string; opacity: number };
type PointSource = "search" | "geolocation";

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
  userLocationPoint: [number, number] | null;
  searchedLocationPoint: [number, number] | null;
  searchedLocationLabel: string | null;
  onSelectArea: (areaId: number) => void;
  // Phone bottom-sheet coupling (from useSheetState, in the host). `sheetPx` is
  // the SETTLED snap height reserved as bottom fit/easeTo padding; `sheetSnap` is
  // the discrete token the refit keys on — so a keyboard-driven visual-viewport
  // change (px shifts, token doesn't) never yanks the camera. Ignored off phone.
  sheetPx: number;
  sheetSnap: SheetSnap;
  // Optional official civic-district geometry. It is deliberately non-
  // interactive so neighborhood tapping remains the map's only polygon action.
  civicGeoJson?: CivicGeographyFeatureCollection | null;
  selectedCivicDistrictKey?: string | null;
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
const SCOPE_FIT_DURATION = 450;
const BASEMAP_NEIGHBORHOOD_LABEL_LAYER = "settlement-subdivision-label";

function unselectedLabelFilter(areaId: number | null): FilterSpecification {
  return areaId === null ? ["has", "id"] : ["!=", ["get", "id"], areaId];
}

function selectedLabelFilter(areaId: number | null): FilterSpecification {
  return ["==", ["get", "id"], areaId ?? -1];
}

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
  userLocationPoint,
  searchedLocationPoint,
  searchedLocationLabel,
  onSelectArea,
  sheetPx,
  sheetSnap,
  civicGeoJson = null,
  selectedCivicDistrictKey = null
}: Props) {
  const mapRef = useRef<MapboxMap | null>(null);
  const readyRef = useRef(false);
  const selectedStateRef = useRef<number | null>(null);
  const prevBoroughRef = useRef(borough);
  // Always tracks the desired selection so onReady() can apply it even when the
  // selection was set before the map finished loading (search auto-select).
  const selectedAreaIdRef = useRef<number | null>(selectedAreaId);
  const focusPointRef = useRef<[number, number] | null>(focusPoint);
  const userLocationPointRef = useRef<[number, number] | null>(userLocationPoint);
  const searchedLocationPointRef = useRef<[number, number] | null>(searchedLocationPoint);
  const searchedLocationLabelRef = useRef<string | null>(searchedLocationLabel);
  const markerRefs = useRef<Record<PointSource, Marker | null>>({
    search: null,
    geolocation: null
  });
  const hoverStateRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelectArea);
  const tintRef = useRef(tintByArea);
  const metaRef = useRef(metaByArea);
  const civicGeoJsonRef = useRef<CivicGeographyFeatureCollection | null>(civicGeoJson);
  const selectedCivicDistrictKeyRef = useRef<string | null>(selectedCivicDistrictKey);
  const civicCameraActiveRef = useRef(false);

  // Preserve stable Mapbox subscriptions while updating every value they read
  // before paint. The refs remain imperative lifecycle state, not render data.
  useLayoutEffect(() => {
    selectedAreaIdRef.current = selectedAreaId;
    focusPointRef.current = focusPoint;
    userLocationPointRef.current = userLocationPoint;
    searchedLocationPointRef.current = searchedLocationPoint;
    searchedLocationLabelRef.current = searchedLocationLabel;
    onSelectRef.current = onSelectArea;
    tintRef.current = tintByArea;
    metaRef.current = metaByArea;
    civicGeoJsonRef.current = civicGeoJson;
    selectedCivicDistrictKeyRef.current = selectedCivicDistrictKey;
  }, [
    civicGeoJson,
    focusPoint,
    metaByArea,
    onSelectArea,
    searchedLocationLabel,
    searchedLocationPoint,
    selectedAreaId,
    selectedCivicDistrictKey,
    tintByArea,
    userLocationPoint
  ]);

  // The hover name tag is driven imperatively (textContent/transform on a ref),
  // not through React state — a state set per mousemove would re-render the
  // whole component at pointer speed for a purely cosmetic label.
  const tipRef = useRef<HTMLDivElement | null>(null);
  const center = BOROUGH_CENTERS[borough] ?? [-73.94, 40.7];
  const labelData = useMemo(() => neighborhoodLabelCollection(features), [features]);

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
    },
    []
  );

  // Form-factor aware camera geometry. Held in a ref so imperative Mapbox
  // handlers (onReady, sourcedata finish) read the CURRENT value, never a stale
  // render closure.
  const ff = useFormFactor();
  const camRef = useRef<{
    padding: Padding;
    civicPadding: Padding;
    sheetPx: number;
    isPhone: boolean;
    isCoarse: boolean;
  }>({
    padding: computeFitPadding(ff, sheetPx),
    civicPadding: civicDistrictFitPadding(ff, sheetPx),
    sheetPx,
    isPhone: ff.isPhone,
    isCoarse: ff.isCoarse
  });
  useLayoutEffect(() => {
    camRef.current = {
      padding: computeFitPadding(ff, sheetPx),
      civicPadding: civicDistrictFitPadding(ff, sheetPx),
      sheetPx,
      isPhone: ff.isPhone,
      isCoarse: ff.isCoarse
    };
  }, [ff, sheetPx]);

  // One camera owner for every navigation path. Search/GPS keeps its precise
  // point focus. Touch selections fit the complete polygon above the mobile
  // sheet. Clearing the selection restores the borough. Fine-pointer desktop
  // selections can opt out so their established click-without-camera-jump
  // behavior remains intact.
  const frameCurrentScope = useCallback(
    (
      map: MapboxMap,
      duration: number,
      { preserveDesktopSelection = false }: { preserveDesktopSelection?: boolean } = {}
    ) => {
      const camera = camRef.current;
      const selectedDistrictBounds = civicDistrictBounds(
        civicGeoJsonRef.current,
        selectedCivicDistrictKeyRef.current
      );
      if (selectedDistrictBounds) {
        civicCameraActiveRef.current = true;
        map.stop();
        map.fitBounds(selectedDistrictBounds, {
          padding: guardPadding(map, camera.civicPadding, camera.sheetPx),
          duration,
          maxZoom: civicDistrictMaxZoom({
            isPhone: camera.isPhone,
            isTabletPortrait: ff.isTabletPortrait,
            isCoarse: camera.isCoarse
          }),
          retainPadding: false
        });
        return;
      }
      civicCameraActiveRef.current = false;

      const focus = focusPointRef.current;
      if (focus) {
        map.stop();
        map.easeTo({
          ...focusEaseOptions(map, focus, camera.isPhone, camera.sheetPx),
          duration: duration === 0 ? 0 : 700
        });
        return;
      }

      const selected = selectedAreaIdRef.current;
      const frameSelectedArea = selected !== null && (camera.isPhone || camera.isCoarse);
      if (selected !== null && !frameSelectedArea && preserveDesktopSelection) {
        return;
      }

      const selectedBounds =
        selected !== null && frameSelectedArea ? areaBounds(features, selected) : null;
      const bounds = selectedBounds ?? boroughBounds(boroughGeoJson, borough);
      if (!bounds) {
        return;
      }

      map.stop();
      map.fitBounds(bounds, {
        padding: guardPadding(map, camera.padding, camera.sheetPx),
        duration,
        ...(selectedBounds ? { maxZoom: FOCUS_ZOOM } : {})
      });
    },
    [borough, boroughGeoJson, features, ff.isTabletPortrait]
  );

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
      // On touch, two quick taps must remain two selections rather than becoming
      // Mapbox's tap-to-zoom gesture. Pan and pinch zoom stay enabled.
      if (camRef.current.isCoarse) {
        map.doubleClickZoom.disable();
      }

      const data = { type: "FeatureCollection", features: toFeatureList(features) };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource("nta", { type: "geojson", data, promoteId: "id" } as any);
      // Each NTA has exactly one fixed Point anchor. Polygon symbol anchors are
      // recalculated per clipped map tile and can duplicate while zooming.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.addSource("nta-labels", { type: "geojson", data: labelData } as any);

      // The basemap has its own neighborhood-name layer. Hide only that layer
      // while the Civic Map's clearer NTA labels are active so users never see a
      // faint second copy of the same name; streets and city labels remain.
      if (map.getLayer(BASEMAP_NEIGHBORHOOD_LABEL_LAYER)) {
        map.setLayoutProperty(BASEMAP_NEIGHBORHOOD_LABEL_LAYER, "visibility", "none");
      }

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

      // Application-owned neighborhood names sit above the signal fills instead
      // of relying on the basemap's later/less-complete place labels. Collision
      // detection keeps the borough overview calm; more names naturally appear
      // as zoom creates room. Compact, familiar names get first placement.
      map.addLayer({
        id: "nta-label",
        type: "symbol",
        source: "nta-labels",
        minzoom: 8.6,
        filter: unselectedLabelFilter(selectedAreaIdRef.current),
        layout: {
          "symbol-placement": "point",
          "symbol-sort-key": ["get", "labelPriority"],
          "text-field": ["get", "labelText"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8.6,
            9.5,
            10.5,
            10.75,
            12.5,
            12,
            15,
            13
          ],
          "text-max-width": ["get", "labelMaxWidth"],
          "text-line-height": 1.05,
          "text-letter-spacing": 0.01,
          "text-padding": 2,
          "text-allow-overlap": false,
          "text-ignore-placement": false
        },
        paint: {
          "text-color": "#34423c",
          "text-opacity": 0.96,
          "text-halo-color": "rgba(255, 255, 255, 0.96)",
          "text-halo-width": 1.4,
          "text-halo-blur": 0.25
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // The active neighborhood never loses its name to collision rules. It is
      // drawn separately so selection can be guaranteed without making every
      // label overlap on a small phone screen.
      map.addLayer({
        id: "nta-selected-label",
        type: "symbol",
        source: "nta-labels",
        minzoom: 8,
        filter: selectedLabelFilter(selectedAreaIdRef.current),
        layout: {
          "symbol-placement": "point",
          "text-field": ["get", "labelText"],
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 11.5, 12, 13, 15, 14],
          "text-max-width": ["get", "labelMaxWidth"],
          "text-line-height": 1.05,
          "text-letter-spacing": 0.01,
          "text-padding": 0,
          "text-allow-overlap": true,
          "text-ignore-placement": true
        },
        paint: {
          "text-color": SELECT_INK,
          "text-halo-color": "rgba(255, 255, 255, 0.98)",
          "text-halo-width": 1.8,
          "text-halo-blur": 0.2
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Keep official district boundaries beneath NTA hover/label chrome. No
      // handlers are attached, so existing neighborhood hit targets stay exact.
      syncCivicDistrictOverlay(
        map,
        civicGeoJsonRef.current,
        selectedCivicDistrictKeyRef.current,
        "nta-hover-line"
      );

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

      map.on("click", ["nta-selected-label", "nta-label", "nta-fill"], (event) => {
        clearHover();
        hideTip();
        const feature = event.features?.[0];
        const id = feature?.id ?? feature?.properties?.id;
        if (typeof id !== "number") {
          return;
        }
        onSelectRef.current(id);
      });

      const finish = () => {
        readyRef.current = true;
        applyTints(map);
        const selected = selectedAreaIdRef.current;
        if (selected !== null) {
          map.setFeatureState({ source: "nta", id: selected }, { selected: true });
          selectedStateRef.current = selected;
        }
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
        frameCurrentScope(map, 0);
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

      // onReady just built the source for THIS borough (latest closure's value —
      // MapboxCanvas invokes the freshest onReady on load). Advance prevBoroughRef
      // to match: a cross-borough change that early-returned before the source
      // existed left it on the OLD borough, and without this a later swap BACK to
      // that old borough would hit the identity guard and silently no-op.
      prevBoroughRef.current = borough;
    },
    [
      features,
      boroughGeoJson,
      borough,
      applyTints,
      frameCurrentScope,
      labelData,
      syncPointMarker
    ]
  );

  // T7: swap boroughs IN PLACE — the host no longer remounts this via key, so a
  // cross-borough jump (only ever an address/ZIP search, which always carries a
  // focusPoint) re-points the existing map instead of tearing Mapbox down and
  // rebuilding it. Keyed on borough identity; the first run is skipped (onReady
  // owns the initial borough's source, layers and fit). Mirrors the per-borough
  // half of onReady: re-point the NTA source + outline, wipe every piece of
  // per-mount transient state a remount used to reset, then re-tint/re-select
  // once the new data has parsed. The shared camera coordinator below owns the
  // corresponding viewport change.
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
    // Clear the outgoing borough's selection/hover feature-state WHILE those
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
    // Re-point the polygon, label, and borough context sources together.
    const source = map.getSource("nta");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (source as any)?.setData({ type: "FeatureCollection", features: toFeatureList(features) });
    const labelSource = map.getSource("nta-labels");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (labelSource as any)?.setData(labelData);
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
  }, [borough, features, labelData, applyTints]);

  // Reapply tints when the active filter changes them.
  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) {
      applyTints(map);
    }
  }, [tintByArea, applyTints]);

  // Reflect selection as a highlight. The camera coordinator below independently
  // frames the selected polygon on touch without coupling rendering to movement.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }
    if (map.getLayer("nta-label")) {
      map.setFilter("nta-label", unselectedLabelFilter(selectedAreaId));
    }
    if (map.getLayer("nta-selected-label")) {
      map.setFilter("nta-selected-label", selectedLabelFilter(selectedAreaId));
    }
    if (selectedStateRef.current !== null && selectedStateRef.current !== selectedAreaId) {
      map.setFeatureState({ source: "nta", id: selectedStateRef.current }, { selected: false });
    }
    selectedStateRef.current = selectedAreaId;
    if (selectedAreaId !== null) {
      map.setFeatureState({ source: "nta", id: selectedAreaId }, { selected: true });
    }
  }, [selectedAreaId]);

  // Civic layers remain additive. A restored selection is framed as soon as its
  // geography arrives; null only tears down the overlay and deliberately avoids
  // a Community camera reset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    syncCivicDistrictOverlay(
      map,
      civicGeoJson,
      selectedCivicDistrictKeyRef.current,
      "nta-hover-line"
    );
    if (
      civicDistrictBounds(civicGeoJson, selectedCivicDistrictKeyRef.current) &&
      (camRef.current.isPhone || camRef.current.isCoarse)
    ) {
      frameCurrentScope(map, SCOPE_FIT_DURATION);
    } else if (!civicGeoJson && civicCameraActiveRef.current) {
      // Restore the already-selected Community focus/area/borough only when a
      // Civic fit actually owned the camera; initial Community mounting is
      // unchanged and no URL or selection state is touched.
      frameCurrentScope(map, SCOPE_FIT_DURATION);
    }
  }, [civicGeoJson, frameCurrentScope]);

  // Selected district changes the highlight filters and frames that exact
  // Polygon/MultiPolygon in the map area not covered by the Civic rail/sheet.
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
      (camRef.current.isPhone || camRef.current.isCoarse)
    ) {
      frameCurrentScope(map, SCOPE_FIT_DURATION);
    } else if (selectedCivicDistrictKey === null && civicCameraActiveRef.current) {
      // Removing a district from the URL/picker must also release the district
      // camera. Otherwise Mapbox keeps the last fitted zoom even though no
      // district is selected or highlighted.
      frameCurrentScope(map, SCOPE_FIT_DURATION);
    }
  }, [selectedCivicDistrictKey, frameCurrentScope]);

  // Coordinate scope, sheet, and form-factor changes through one camera routine.
  // A simultaneous area selection + peek→half sheet change frames once using the
  // new settled height; a sheet-only transition waits for its 220ms animation.
  const cameraRefitTimer = useRef<number | null>(null);
  const previousCameraInputsRef = useRef({
    borough,
    selectedAreaId,
    focusPoint,
    sheetSnap,
    isPhone: ff.isPhone,
    isTabletPortrait: ff.isTabletPortrait,
    isCoarse: ff.isCoarse
  });
  useEffect(() => {
    const previous = previousCameraInputsRef.current;
    const scopeChanged =
      previous.borough !== borough ||
      previous.selectedAreaId !== selectedAreaId ||
      previous.focusPoint !== focusPoint;
    const layoutChanged =
      previous.isPhone !== ff.isPhone ||
      previous.isTabletPortrait !== ff.isTabletPortrait ||
      previous.isCoarse !== ff.isCoarse;
    const snapChanged = previous.sheetSnap !== sheetSnap;
    previousCameraInputsRef.current = {
      borough,
      selectedAreaId,
      focusPoint,
      sheetSnap,
      isPhone: ff.isPhone,
      isTabletPortrait: ff.isTabletPortrait,
      isCoarse: ff.isCoarse
    };

    if (!scopeChanged && !layoutChanged && !snapChanged) {
      return;
    }
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }
    if (cameraRefitTimer.current !== null) {
      window.clearTimeout(cameraRefitTimer.current);
      cameraRefitTimer.current = null;
    }

    const frame = () => {
      cameraRefitTimer.current = null;
      frameCurrentScope(map, SCOPE_FIT_DURATION, {
        preserveDesktopSelection: !layoutChanged
      });
    };
    if (ff.isPhone && snapChanged && !scopeChanged && !layoutChanged) {
      cameraRefitTimer.current = window.setTimeout(frame, 280);
    } else {
      frame();
    }

    return () => {
      if (cameraRefitTimer.current !== null) {
        window.clearTimeout(cameraRefitTimer.current);
        cameraRefitTimer.current = null;
      }
    };
  }, [
    borough,
    selectedAreaId,
    focusPoint,
    sheetSnap,
    ff.isPhone,
    ff.isTabletPortrait,
    ff.isCoarse,
    frameCurrentScope
  ]);

  // Rotations can stay inside one width band, so subscribe directly and reframe
  // the current point/neighborhood/borough after the viewport settles.
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
      if (!map || !readyRef.current) {
        return;
      }
      if (orientRefitTimer.current !== null) {
        window.clearTimeout(orientRefitTimer.current);
      }
      orientRefitTimer.current = window.setTimeout(() => {
        orientRefitTimer.current = null;
        frameCurrentScope(map, SCOPE_FIT_DURATION);
      }, 280);
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      if (orientRefitTimer.current !== null) {
        window.clearTimeout(orientRefitTimer.current);
        orientRefitTimer.current = null;
      }
    };
  }, [ff.isPhone, ff.isTabletPortrait, frameCurrentScope]);

  // Keep physical location and searched address visible as separate markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }
    syncPointMarker(map, "geolocation", userLocationPoint, "Your current location");
    syncPointMarker(map, "search", searchedLocationPoint, searchedLocationLabel);
  }, [
    userLocationPoint,
    searchedLocationPoint,
    searchedLocationLabel,
    syncPointMarker
  ]);

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
      />
    </div>
  );
});
