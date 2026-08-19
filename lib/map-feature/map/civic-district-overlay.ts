import type { FeatureCollection } from "geojson";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MapboxMap
} from "mapbox-gl";

import type { CivicGeographyFeatureCollection } from "@/lib/map-feature/civic-types";
import type { Padding } from "@/lib/map-feature/map/camera";
import { civicDistrictLabelCollection } from "@/lib/map-feature/map/civic-district-labels";
import type { FormFactor } from "@/lib/map-feature/use-form-factor";

export const CIVIC_DISTRICT_SOURCE_ID = "civic-district-source";
export const CIVIC_DISTRICT_LABEL_SOURCE_ID = "civic-district-label-source";
export const CIVIC_DISTRICT_HIT_LAYER_ID = "civic-district-hit";
export const CIVIC_DISTRICT_BOUNDARY_LAYER_ID = "civic-district-boundary";
export const CIVIC_DISTRICT_HOVER_FILL_LAYER_ID = "civic-district-hover-fill";
export const CIVIC_DISTRICT_LABEL_LAYER_ID = "civic-district-label";
export const CIVIC_DISTRICT_SELECTED_LABEL_LAYER_ID = "civic-district-selected-label";

const CIVIC_DISTRICT_BADGE_IMAGE_ID = "civic-district-badge";
const CIVIC_DISTRICT_SELECTED_BADGE_IMAGE_ID = "civic-district-selected-badge";

const CIVIC_DISTRICT_LAYER_IDS = [
  CIVIC_DISTRICT_HIT_LAYER_ID,
  CIVIC_DISTRICT_BOUNDARY_LAYER_ID,
  CIVIC_DISTRICT_HOVER_FILL_LAYER_ID,
  CIVIC_DISTRICT_LABEL_LAYER_ID,
  CIVIC_DISTRICT_SELECTED_LABEL_LAYER_ID
] as const;

const QUIET_GOLD = "#8f7a54";
const SELECTED_PURPLE = "#7c3aed";
const JIA_NEUTRAL = "#64748b";

// Other civic layers do not carry administrative_kind. Treat only an explicit
// non-board administrative feature as a JIA so elected-district styling stays
// unchanged while the 12 shared-interest geometries remain visibly secondary.
const IS_JOINT_INTEREST_AREA: ExpressionSpecification = [
  "all",
  ["has", "administrative_kind"],
  ["!=", ["get", "administrative_kind"], "community_district"]
];

export type CivicDistrictBounds = [[number, number], [number, number]];

// The Civic workspace is wider than the Community reading rail. Keep a quiet
// gutter between the fitted district and that rail on desktop/tablet; phone
// continues to use the host's exact settled sheet height.
export function civicDistrictFitPadding(
  formFactor: FormFactor,
  sheetPx: number
): Padding {
  if (formFactor.isPhone) {
    return { top: 40, bottom: sheetPx + 40, left: 24, right: 24 };
  }
  if (formFactor.isTabletPortrait) {
    return { top: 58, bottom: 58, left: 48, right: 400 };
  }
  return { top: 72, bottom: 72, left: 64, right: 520 };
}

// Touch users need enough context to understand where a selected district sits
// within NYC. Small Manhattan districts previously hit 13.25, which felt like
// an abrupt street-level jump. Phones stay widest; tablets retain a little more
// detail. Desktop selection does not auto-fit, but keeps the legacy ceiling for
// callers that explicitly request one.
export function civicDistrictMaxZoom(formFactor: FormFactor): number {
  if (formFactor.isPhone) return 10.2;
  if (formFactor.isTabletPortrait) return 10.4;
  if (formFactor.isCoarse) return 10.55;
  return 13.25;
}

// District data is currently emitted as MultiPolygon, but treating Polygon and
// MultiPolygon as first-class inputs makes restored selections safe across data
// releases. Invalid/non-finite coordinates are ignored instead of poisoning a
// Mapbox fit with Infinity or NaN.
export function civicDistrictBounds(
  collection: CivicGeographyFeatureCollection | null,
  districtKey: string | null
): CivicDistrictBounds | null {
  if (!collection || !districtKey) {
    return null;
  }

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const visitCoordinates = (coordinates: unknown): void => {
    if (
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number"
    ) {
      const lng = coordinates[0];
      const lat = coordinates[1];
      if (
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        lng >= -180 &&
        lng <= 180 &&
        lat >= -90 &&
        lat <= 90
      ) {
        minLng = Math.min(minLng, lng);
        minLat = Math.min(minLat, lat);
        maxLng = Math.max(maxLng, lng);
        maxLat = Math.max(maxLat, lat);
      }
      return;
    }
    if (Array.isArray(coordinates)) {
      coordinates.forEach(visitCoordinates);
    }
  };

  for (const feature of collection.features) {
    const featureKey = feature.properties.geography_key ?? feature.id;
    if (featureKey !== districtKey) {
      continue;
    }
    const geometry = feature.geometry as { type?: unknown; coordinates?: unknown } | null;
    if (geometry?.type !== "Polygon" && geometry?.type !== "MultiPolygon") {
      continue;
    }
    visitCoordinates(geometry.coordinates);
  }

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    return null;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ];
}

export function civicDistrictHighlightFilter(
  selectedDistrictKey: string | null,
  hoveredDistrictKey: string | null = null
): FilterSpecification {
  const keys = [selectedDistrictKey, hoveredDistrictKey].filter(
    (key): key is string => typeof key === "string" && key.length > 0
  );
  if (keys.length === 0) {
    return ["==", ["get", "geography_key"], ""];
  }
  if (keys.length === 1) {
    return ["==", ["get", "geography_key"], keys[0]];
  }
  return ["in", ["get", "geography_key"], ["literal", [...new Set(keys)]]];
}

function beforeLayer(map: MapboxMap, preferredLayerId?: string): string | undefined {
  return preferredLayerId && map.getLayer(preferredLayerId) ? preferredLayerId : undefined;
}

type BadgeImage = { width: number; height: number; data: Uint8Array };

function badgeImage(
  fill: readonly [number, number, number, number],
  stroke: readonly [number, number, number, number]
): BadgeImage {
  const width = 48;
  const height = 48;
  const data = new Uint8Array(width * height * 4);
  const center = (width - 1) / 2;
  const outerRadius = 21;
  const innerRadius = 17.5;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const distance = Math.hypot(x - center, y - center);
      if (distance > outerRadius + 0.5) continue;
      const color = distance >= innerRadius ? stroke : fill;
      const alpha = Math.min(1, outerRadius + 0.5 - distance);
      const offset = (y * width + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = Math.round(color[3] * alpha);
    }
  }

  return { width, height, data };
}

function ensureBadgeImages(map: MapboxMap): void {
  if (!map.hasImage(CIVIC_DISTRICT_BADGE_IMAGE_ID)) {
    map.addImage(
      CIVIC_DISTRICT_BADGE_IMAGE_ID,
      badgeImage([255, 252, 245, 255], [143, 122, 84, 255]),
      { pixelRatio: 2 }
    );
  }
  if (!map.hasImage(CIVIC_DISTRICT_SELECTED_BADGE_IMAGE_ID)) {
    map.addImage(
      CIVIC_DISTRICT_SELECTED_BADGE_IMAGE_ID,
      badgeImage([124, 58, 237, 255], [255, 255, 255, 255]),
      { pixelRatio: 2 }
    );
  }
}

export function civicDistrictLayerSpecifications(
  districtKey: string | null
): LayerSpecification[] {
  return [
    {
      id: CIVIC_DISTRICT_HIT_LAYER_ID,
      type: "fill",
      source: CIVIC_DISTRICT_SOURCE_ID,
      // A nearly transparent fill gives mouse/touch users a generous target
      // across the whole district, while the visible boundary styling below
      // remains unchanged.
      paint: { "fill-color": "#ffffff", "fill-opacity": 0.01 }
    },
    {
      id: CIVIC_DISTRICT_HOVER_FILL_LAYER_ID,
      type: "fill",
      source: CIVIC_DISTRICT_SOURCE_ID,
      filter: civicDistrictHighlightFilter(districtKey),
      paint: {
        "fill-color": SELECTED_PURPLE,
        "fill-opacity": 0.36
      }
    },
    {
      id: CIVIC_DISTRICT_LABEL_LAYER_ID,
      type: "symbol",
      source: CIVIC_DISTRICT_LABEL_SOURCE_ID,
      minzoom: 8,
      layout: {
        "icon-image": CIVIC_DISTRICT_BADGE_IMAGE_ID,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.56, 9.5, 0.72, 12, 0.94],
        // Each feature already has one carefully chosen anchor. Let every
        // district retain its number while users pan and zoom instead of
        // Mapbox collision placement silently removing dense-area badges.
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "text-field": ["get", "external_id"],
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 8, 9.5, 9.5, 12, 11.5],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-anchor": "center"
      },
      paint: {
        "text-color": "#3f3425",
        "text-halo-color": "rgba(255,255,255,0.82)",
        "text-halo-width": 0.6
      }
    },
    {
      id: CIVIC_DISTRICT_SELECTED_LABEL_LAYER_ID,
      type: "symbol",
      source: CIVIC_DISTRICT_LABEL_SOURCE_ID,
      minzoom: 7.5,
      filter: civicDistrictHighlightFilter(districtKey),
      layout: {
        "icon-image": CIVIC_DISTRICT_SELECTED_BADGE_IMAGE_ID,
        "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.9, 12, 1.08],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "text-field": ["get", "external_id"],
        "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10.5, 12, 12.5],
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        "text-anchor": "center"
      },
      paint: {
        "text-color": "#ffffff",
        "text-halo-color": "rgba(76,29,149,0.72)",
        "text-halo-width": 0.5
      }
    },
    {
      id: CIVIC_DISTRICT_BOUNDARY_LAYER_ID,
      type: "line",
      source: CIVIC_DISTRICT_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["case", IS_JOINT_INTEREST_AREA, JIA_NEUTRAL, QUIET_GOLD],
        "line-opacity": ["case", IS_JOINT_INTEREST_AREA, 0.24, 0.42],
        "line-width": [
          "case",
          IS_JOINT_INTEREST_AREA,
          ["interpolate", ["linear"], ["zoom"], 8, 0.55, 13, 0.8, 16, 1.05],
          ["interpolate", ["linear"], ["zoom"], 8, 0.7, 13, 1.05, 16, 1.35]
        ]
      }
    }
  ];
}

export function removeCivicDistrictOverlay(map: MapboxMap): void {
  for (const layerId of [...CIVIC_DISTRICT_LAYER_IDS].reverse()) {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  }
  if (map.getSource(CIVIC_DISTRICT_SOURCE_ID)) {
    map.removeSource(CIVIC_DISTRICT_SOURCE_ID);
  }
  if (map.getSource(CIVIC_DISTRICT_LABEL_SOURCE_ID)) {
    map.removeSource(CIVIC_DISTRICT_LABEL_SOURCE_ID);
  }
  if (map.hasImage(CIVIC_DISTRICT_BADGE_IMAGE_ID)) {
    map.removeImage(CIVIC_DISTRICT_BADGE_IMAGE_ID);
  }
  if (map.hasImage(CIVIC_DISTRICT_SELECTED_BADGE_IMAGE_ID)) {
    map.removeImage(CIVIC_DISTRICT_SELECTED_BADGE_IMAGE_ID);
  }
}

export function updateCivicDistrictSelection(
  map: MapboxMap,
  districtKey: string | null,
  civicGeoJson: CivicGeographyFeatureCollection | null
): void {
  void civicGeoJson;
  if (map.getLayer(CIVIC_DISTRICT_HOVER_FILL_LAYER_ID)) {
    map.setFilter(
      CIVIC_DISTRICT_HOVER_FILL_LAYER_ID,
      civicDistrictHighlightFilter(districtKey)
    );
  }
  if (map.getLayer(CIVIC_DISTRICT_SELECTED_LABEL_LAYER_ID)) {
    map.setFilter(
      CIVIC_DISTRICT_SELECTED_LABEL_LAYER_ID,
      civicDistrictHighlightFilter(districtKey)
    );
  }
}

export function syncCivicDistrictOverlay(
  map: MapboxMap,
  civicGeoJson: CivicGeographyFeatureCollection | null,
  selectedDistrictKey: string | null,
  preferredBeforeLayerId?: string
): void {
  if (!civicGeoJson) {
    removeCivicDistrictOverlay(map);
    return;
  }

  const data = civicGeoJson as FeatureCollection;
  const labelData = civicDistrictLabelCollection(civicGeoJson) as FeatureCollection;
  const existingSource = map.getSource(CIVIC_DISTRICT_SOURCE_ID);
  if (existingSource && typeof (existingSource as GeoJSONSource).setData === "function") {
    (existingSource as GeoJSONSource).setData(data);
  } else {
    // A non-GeoJSON source with this private id would make the overlay unsafe to
    // update. Recreate only our isolated source/layers before continuing.
    if (existingSource) {
      removeCivicDistrictOverlay(map);
    }
    map.addSource(CIVIC_DISTRICT_SOURCE_ID, { type: "geojson", data });
  }

  const existingLabelSource = map.getSource(CIVIC_DISTRICT_LABEL_SOURCE_ID);
  if (existingLabelSource && typeof (existingLabelSource as GeoJSONSource).setData === "function") {
    (existingLabelSource as GeoJSONSource).setData(labelData);
  } else {
    map.addSource(CIVIC_DISTRICT_LABEL_SOURCE_ID, { type: "geojson", data: labelData });
  }
  ensureBadgeImages(map);

  const insertionPoint = beforeLayer(map, preferredBeforeLayerId);
  for (const layer of civicDistrictLayerSpecifications(selectedDistrictKey)) {
    if (!map.getLayer(layer.id)) {
      try {
        map.addLayer(layer, insertionPoint);
      } catch (error) {
        if (layer.id !== CIVIC_DISTRICT_BOUNDARY_LAYER_ID) throw error;
        // The line is supplemental chrome. A style-expression incompatibility
        // must never suppress district hit targets, fills, or number badges.
        console.warn("Civic district boundary styling was skipped.", error);
      }
    }
  }
  updateCivicDistrictSelection(map, selectedDistrictKey, civicGeoJson);
}
