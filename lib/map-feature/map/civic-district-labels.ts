import type { CivicGeographyFeatureCollection } from "@/lib/map-feature/civic-types";
import {
  labelPolygons,
  visualCenter,
  type Position
} from "@/lib/map-feature/map/neighborhood-labels";

export type CivicDistrictLabelCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: Position };
    properties: {
      geography_key: string;
      external_id: string;
      display_name: string;
    };
  }>;
};

// Civic boundaries are commonly MultiPolygons because islands and detached
// shoreline pieces share the district identity. Produce one deterministic
// anchor on the largest usable landmass so Mapbox never repeats a district
// number for each component.
export function civicDistrictLabelCollection(
  collection: CivicGeographyFeatureCollection | null
): CivicDistrictLabelCollection {
  const labels: CivicDistrictLabelCollection["features"] = [];
  const seenKeys = new Set<string>();

  for (const feature of collection?.features ?? []) {
    const geographyKey = feature.properties.geography_key?.trim();
    const externalId = feature.properties.external_id?.trim();
    const displayName = feature.properties.display_name?.trim();
    if (!geographyKey || !externalId || !displayName || seenKeys.has(geographyKey)) {
      continue;
    }

    let anchor: Position | null = null;
    for (const polygon of labelPolygons(feature.geometry)) {
      anchor = visualCenter(polygon);
      if (anchor) break;
    }
    if (!anchor) continue;

    seenKeys.add(geographyKey);
    labels.push({
      type: "Feature",
      id: geographyKey,
      geometry: { type: "Point", coordinates: anchor },
      properties: {
        geography_key: geographyKey,
        external_id: externalId,
        display_name: displayName
      }
    });
  }

  return { type: "FeatureCollection", features: labels };
}
