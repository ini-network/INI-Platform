// Compute the lng/lat bounding box of one borough from a GeoJSON boundary
// collection (property `BoroName`). Shared by the deep-dive cluster map.

export type LngLatBounds = [[number, number], [number, number]];

// Bounds for one neighborhood/area feature (properties.id = area_id). Used by
// the interactive signals map so a mobile selection can frame the complete
// polygon instead of leaving it at the edge of the previous camera view.
export function areaBounds(areaGeoJson: unknown, areaId: number): LngLatBounds | null {
  const features = Array.isArray(areaGeoJson)
    ? areaGeoJson
    : (areaGeoJson as { features?: unknown[] })?.features ?? [];
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
    if (props.id !== areaId) {
      continue;
    }
    visit((feature.geometry as { coordinates?: unknown })?.coordinates);
    break;
  }

  if (minX === Infinity) {
    return null;
  }
  return [
    [minX, minY],
    [maxX, maxY]
  ];
}

export function boroughBounds(boroughGeoJson: unknown, borough: string): LngLatBounds | null {
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

// City-wide bounds: the same min/max walk as boroughBounds but over ALL borough
// features (no BoroName filter), so the overview map can frame all five boroughs
// on first load. Computed from the data — no hardcoded NYC coordinates.
export function cityBounds(boroughGeoJson: unknown): LngLatBounds | null {
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
