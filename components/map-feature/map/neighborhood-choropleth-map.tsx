"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

import { boroughBounds } from "@/lib/map-feature/map/bounds";
import { BOROUGH_CENTERS } from "@/lib/map-feature/map/camera";
import { SEVERITY_COLORS, type SeverityBucket } from "@/lib/map-feature/map/severity";
import { MapboxCanvas } from "./mapbox-canvas";

type PolygonCollection = {
  features?: Array<{ properties?: Record<string, unknown> | null }>;
};

type AreaMeta = { name: string; total: number };

type Props = {
  boroughGeoJson: unknown;
  borough: string;
  polygons: unknown; // GeoJSON FeatureCollection of NTA polygons (properties.id = area_id)
  severityByArea: Record<number, SeverityBucket>;
  centerByArea: Record<number, [number, number]>;
  metaByArea: Record<number, AreaMeta>;
  selectedAreaId: number | null;
  hoveredAreaId: number | null;
  onSelect: (areaId: number) => void;
  onHover: (areaId: number | null) => void;
};

const BRAND = "#7c3aed";
const NEUTRAL = "#c7ccd1";
const BOROUGH_OUTLINE = "#2563eb";
const FIT_PADDING = { top: 70, bottom: 70, left: 70, right: 440 };

function formatNum(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Clean basemap with faint neighborhood outlines. A neighborhood is colored only
 * when hovered (light preview + tooltip) or selected (full highlight). Hover is
 * prop-driven so it links both ways with the ranked list, and selecting pans to
 * the area.
 */
export function NeighborhoodChoroplethMap({
  boroughGeoJson,
  borough,
  polygons,
  severityByArea,
  centerByArea,
  metaByArea,
  selectedAreaId,
  hoveredAreaId,
  onSelect,
  onHover
}: Props) {
  const mapRef = useRef<MapboxMap | null>(null);
  const readyRef = useRef(false);
  const selectedStateRef = useRef<number | null>(null);
  // Always tracks the desired selection so onReady() can apply it even when the
  // selection was set before the map finished loading (auto-select on open).
  const selectedAreaIdRef = useRef<number | null>(selectedAreaId);
  selectedAreaIdRef.current = selectedAreaId;
  const hoverStateRef = useRef<number | null>(null);
  const lastReportedHoverRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const severityRef = useRef(severityByArea);
  severityRef.current = severityByArea;
  const centerRef = useRef(centerByArea);
  centerRef.current = centerByArea;
  const metaRef = useRef(metaByArea);
  metaRef.current = metaByArea;

  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const center = BOROUGH_CENTERS[borough] ?? [-73.94, 40.7];

  // Give every NTA its severity color (shown only when hovered/selected).
  const applyAreaColors = useCallback((map: MapboxMap) => {
    if (!map.getSource("nta")) {
      return;
    }
    const features = (polygons as PolygonCollection)?.features ?? [];
    const severity = severityRef.current;
    for (const feature of features) {
      const id = feature.properties?.id;
      if (typeof id !== "number") {
        continue;
      }
      const bucket = severity[id];
      map.setFeatureState(
        { source: "nta", id },
        { color: bucket ? SEVERITY_COLORS[bucket] : NEUTRAL }
      );
    }
  }, [polygons]);

  const onReady = useCallback(
    (map: MapboxMap) => {
      mapRef.current = map;

      const data = polygons ?? { type: "FeatureCollection", features: [] };
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
            0.32,
            ["boolean", ["feature-state", "hover"], false],
            0.16,
            0
          ]
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Soft brand halo under the selected neighborhood's edge (premium lift).
      map.addLayer({
        id: "nta-glow",
        type: "line",
        source: "nta",
        paint: {
          "line-color": BRAND,
          "line-blur": 6,
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 8, 0],
          "line-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.28, 0]
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      map.addLayer({
        id: "nta-line",
        type: "line",
        source: "nta",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            BRAND,
            ["boolean", ["feature-state", "hover"], false],
            "rgba(124, 58, 237, 0.45)",
            "rgba(150, 140, 120, 0.3)"
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            2,
            ["boolean", ["feature-state", "hover"], false],
            1.4,
            0.6
          ]
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
          "line-opacity": 0.5
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Report hover to the parent (single source of truth → links to the list).
      map.on("mousemove", "nta-fill", (event) => {
        map.getCanvas().style.cursor = "pointer";
        const id = event.features?.[0]?.id;
        if (typeof id !== "number") {
          return;
        }
        if (id !== lastReportedHoverRef.current) {
          lastReportedHoverRef.current = id;
          onHoverRef.current(id);
          const meta = metaRef.current[id];
          setTip({
            x: event.point.x,
            y: event.point.y,
            text: meta ? `${meta.name} · ${formatNum(meta.total)} reports` : ""
          });
        }
      });
      map.on("mouseleave", "nta-fill", () => {
        map.getCanvas().style.cursor = "";
        lastReportedHoverRef.current = null;
        onHoverRef.current(null);
        setTip(null);
      });

      map.on("click", "nta-fill", (event) => {
        const id = event.features?.[0]?.id;
        if (typeof id === "number") {
          onSelectRef.current(id);
        }
      });

      const finish = () => {
        readyRef.current = true;
        applyAreaColors(map);
        const selected = selectedAreaIdRef.current;
        if (selected !== null) {
          map.setFeatureState({ source: "nta", id: selected }, { selected: true });
          selectedStateRef.current = selected;
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

      const bounds = boroughBounds(boroughGeoJson, borough);
      if (bounds) {
        map.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 });
      }
    },
    [polygons, boroughGeoJson, borough, applyAreaColors]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (map && readyRef.current) {
      applyAreaColors(map);
    }
  }, [severityByArea, applyAreaColors]);

  // Reflect hover (from the map OR the list) as feature-state.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }
    if (hoverStateRef.current !== null && hoverStateRef.current !== hoveredAreaId) {
      map.setFeatureState({ source: "nta", id: hoverStateRef.current }, { hover: false });
    }
    hoverStateRef.current = hoveredAreaId;
    if (hoveredAreaId !== null) {
      map.setFeatureState({ source: "nta", id: hoveredAreaId }, { hover: true });
    }
  }, [hoveredAreaId]);

  // Reflect selection: highlight + gently pan to it.
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
      const target = centerRef.current[selectedAreaId];
      if (target) {
        map.easeTo({ center: target, duration: 450 });
      }
    }
  }, [selectedAreaId]);

  return (
    <div className="cs-deepdive-map-wrap">
      <MapboxCanvas center={center} zoom={11} onReady={onReady} className="cs-deepdive-map" />
      {tip && tip.text ? (
        <div
          className="cs-map-tip"
          style={{ transform: `translate(${tip.x + 12}px, ${tip.y + 12}px)` }}
        >
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}
