type Position = [number, number];
type PolygonCoordinates = Position[][];

const MIN_RING_AREA = 1e-14;
const LONG_LABEL_THRESHOLD = 28;
const FEATURED_LABEL_BONUS = 1_000_000_000_000;

// These are the two concrete discovery examples from mobile feedback. Giving
// them first placement is deliberately narrow: the rest of the city still uses
// area-aware collision priority instead of a broad, subjective popularity list.
const FEATURED_NEIGHBORHOOD_NAMES = new Set(["Brownsville", "Flatbush"]);

type RawFeature = {
  geometry?: { type?: unknown; coordinates?: unknown } | null;
  properties?: Record<string, unknown> | null;
};

export type NeighborhoodLabelCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: number;
    geometry: { type: "Point"; coordinates: Position };
    properties: {
      id: number;
      name: string;
      labelText: string;
      labelMaxWidth: number;
      labelPriority: number;
    };
  }>;
};

function displayLabel(name: string): {
  text: string;
  maxWidth: number;
} {
  if (name.length <= LONG_LABEL_THRESHOLD) {
    return { text: name, maxWidth: 8.5 };
  }

  // Long official NTA composites can become a four-line block on a phone.
  // Split once, near the visual midpoint, and give that balanced two-line label
  // enough em width that Mapbox does not wrap it a second time.
  const isComposite = name.includes("-");
  const parts = name
    .split(isComposite ? "-" : " ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return { text: name, maxWidth: 12 };
  }

  const joiner = isComposite ? "–" : " ";
  let bestLeft = parts[0];
  let bestRight = parts.slice(1).join(joiner);
  let bestBalance = Math.abs(bestLeft.length - bestRight.length);
  for (let index = 2; index < parts.length; index += 1) {
    const left = parts.slice(0, index).join(joiner);
    const right = parts.slice(index).join(joiner);
    const balance = Math.abs(left.length - right.length);
    if (balance < bestBalance) {
      bestLeft = left;
      bestRight = right;
      bestBalance = balance;
    }
  }

  const longestLine = Math.max(bestLeft.length, bestRight.length);
  return {
    text: `${bestLeft}\n${bestRight}`,
    maxWidth: Math.min(18, Math.max(10, Math.ceil(longestLine * 1.2) / 2)),
  };
}

function asPosition(value: unknown): Position | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [lng, lat] = value;
  return typeof lng === "number" &&
    Number.isFinite(lng) &&
    typeof lat === "number" &&
    Number.isFinite(lat)
    ? [lng, lat]
    : null;
}

function samePosition(left: Position, right: Position): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function asRing(value: unknown): Position[] | null {
  if (!Array.isArray(value)) return null;
  const ring: Position[] = [];
  for (const rawPosition of value) {
    const position = asPosition(rawPosition);
    // Fail closed instead of silently deleting a malformed vertex. Deleting the
    // outer ring could otherwise promote a hole into the neighborhood outline.
    if (!position) return null;
    ring.push(position);
  }
  if (ring.length < 3) return null;

  const openRing =
    ring.length > 1 && samePosition(ring[0], ring[ring.length - 1])
      ? ring.slice(0, -1)
      : ring;
  const distinct = new Set(openRing.map(([lng, lat]) => `${lng},${lat}`));
  if (distinct.size < 3) return null;

  const closedRing = [...openRing, openRing[0]];
  return Math.abs(signedRingArea(closedRing)) > MIN_RING_AREA
    ? closedRing
    : null;
}

function asPolygon(value: unknown): PolygonCoordinates | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const polygon: PolygonCoordinates = [];
  for (const rawRing of value) {
    const ring = asRing(rawRing);
    // A malformed hole changes the usable interior just as much as a malformed
    // outer ring, so reject the component rather than reshaping it silently.
    if (!ring) return null;
    polygon.push(ring);
  }
  return polygonArea(polygon) > MIN_RING_AREA ? polygon : null;
}

function signedRingArea(ring: Position[]): number {
  let twiceArea = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    twiceArea += current[0] * next[1] - next[0] * current[1];
  }
  return twiceArea / 2;
}

function polygonArea(polygon: PolygonCoordinates): number {
  const [outer, ...holes] = polygon;
  return Math.max(
    0,
    Math.abs(signedRingArea(outer)) -
      holes.reduce((sum, hole) => sum + Math.abs(signedRingArea(hole)), 0),
  );
}

function labelPolygons(
  geometry: RawFeature["geometry"],
): PolygonCoordinates[] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    const polygon = asPolygon(geometry.coordinates);
    return polygon ? [polygon] : [];
  }
  if (
    geometry.type !== "MultiPolygon" ||
    !Array.isArray(geometry.coordinates)
  ) {
    return [];
  }

  // One label belongs on the main landmass, not on every island or detached
  // polygon part carrying the same NTA name. Keep all valid parts ranked so a
  // degenerate largest part can fall back to the next real landmass.
  const candidates: Array<{
    polygon: PolygonCoordinates;
    area: number;
    sourceIndex: number;
  }> = [];
  for (const [sourceIndex, rawPolygon] of geometry.coordinates.entries()) {
    const polygon = asPolygon(rawPolygon);
    if (!polygon) continue;
    candidates.push({ polygon, area: polygonArea(polygon), sourceIndex });
  }
  candidates.sort(
    (left, right) =>
      right.area - left.area || left.sourceIndex - right.sourceIndex,
  );
  return candidates.map(({ polygon }) => polygon);
}

function pointInRing(point: Position, ring: Position[]): boolean {
  let inside = false;
  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    const crosses =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1] &&
      point[0] <
        ((previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point: Position, polygon: PolygonCoordinates): boolean {
  if (!pointInRing(point, polygon[0])) return false;
  return polygon.slice(1).every((hole) => !pointInRing(point, hole));
}

function ringCentroid(ring: Position[]): Position | null {
  let crossSum = 0;
  let lngSum = 0;
  let latSum = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    const cross = current[0] * next[1] - next[0] * current[1];
    crossSum += cross;
    lngSum += (current[0] + next[0]) * cross;
    latSum += (current[1] + next[1]) * cross;
  }
  if (Math.abs(crossSum) < Number.EPSILON) return null;
  return [lngSum / (3 * crossSum), latSum / (3 * crossSum)];
}

function segmentDistanceSquared(
  point: Position,
  start: Position,
  end: Position,
): number {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
  }
  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  const nearestLng = start[0] + progress * dx;
  const nearestLat = start[1] + progress * dy;
  return (point[0] - nearestLng) ** 2 + (point[1] - nearestLat) ** 2;
}

function edgeDistanceSquared(
  point: Position,
  polygon: PolygonCoordinates,
): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (const ring of polygon) {
    for (let index = 0; index < ring.length; index += 1) {
      minimum = Math.min(
        minimum,
        segmentDistanceSquared(
          point,
          ring[index],
          ring[(index + 1) % ring.length],
        ),
      );
    }
  }
  return minimum;
}

function scanlineMidpoints(
  polygon: PolygonCoordinates,
  latitude: number,
): Position[] {
  const intersections: number[] = [];
  for (const ring of polygon) {
    for (let index = 0; index < ring.length; index += 1) {
      const start = ring[index];
      const end = ring[(index + 1) % ring.length];
      if (start[1] > latitude === end[1] > latitude) continue;
      const longitude =
        start[0] +
        ((latitude - start[1]) * (end[0] - start[0])) / (end[1] - start[1]);
      if (Number.isFinite(longitude)) intersections.push(longitude);
    }
  }
  intersections.sort((a, b) => a - b);

  const candidates: Position[] = [];
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    const start = intersections[index];
    const end = intersections[index + 1];
    if (end > start) candidates.push([(start + end) / 2, latitude]);
  }
  return candidates;
}

// Return one deterministic point well inside the polygon. A Point source is
// intentional: polygon symbols are re-anchored after GeoJSON tiling/clipping,
// which can draw the same neighborhood name multiple times at close zooms.
function visualCenter(polygon: PolygonCoordinates): Position | null {
  const outer = polygon[0];
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  for (const [lng, lat] of outer) {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  }
  const width = maxLng - minLng;
  const height = maxLat - minLat;
  if (!(width > 0) || !(height > 0)) return null;

  let best: Position | null = null;
  let bestDistance = -1;
  const consider = (candidate: Position) => {
    if (!pointInPolygon(candidate, polygon)) return;
    const distance = edgeDistanceSquared(candidate, polygon);
    if (distance > bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  };

  const centroid = ringCentroid(outer);
  if (centroid) consider(centroid);
  consider([(minLng + maxLng) / 2, (minLat + maxLat) / 2]);

  const gridSize = 16;
  for (let xIndex = 0; xIndex < gridSize; xIndex += 1) {
    for (let yIndex = 0; yIndex < gridSize; yIndex += 1) {
      consider([
        minLng + ((xIndex + 0.5) / gridSize) * width,
        minLat + ((yIndex + 0.5) / gridSize) * height,
      ]);
    }
  }
  for (let yIndex = 1; yIndex < gridSize; yIndex += 1) {
    const latitude = minLat + (yIndex / gridSize) * height;
    for (const candidate of scanlineMidpoints(polygon, latitude))
      consider(candidate);
  }

  if (!best) return null;
  let stepLng = width / gridSize / 2;
  let stepLat = height / gridSize / 2;
  for (let pass = 0; pass < 6; pass += 1) {
    const origin = best;
    for (const lngOffset of [-stepLng, 0, stepLng]) {
      for (const latOffset of [-stepLat, 0, stepLat]) {
        consider([origin[0] + lngOffset, origin[1] + latOffset]);
      }
    }
    stepLng /= 2;
    stepLat /= 2;
  }
  return best;
}

function sourceArea(
  properties: Record<string, unknown>,
  polygon: PolygonCoordinates,
): number {
  const nested = properties.properties;
  const shapeArea =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>).shape_area
      : undefined;
  const parsed =
    typeof shapeArea === "number"
      ? shapeArea
      : Number.parseFloat(String(shapeArea ?? ""));
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : polygonArea(polygon) * 1e10;
}

export function neighborhoodLabelCollection(
  areaGeoJson: unknown,
): NeighborhoodLabelCollection {
  const rawFeatures = Array.isArray(areaGeoJson)
    ? areaGeoJson
    : ((areaGeoJson as { features?: unknown[] } | null)?.features ?? []);
  const labels: NeighborhoodLabelCollection["features"] = [];
  const seenIds = new Set<number>();

  for (const rawFeature of rawFeatures) {
    if (!rawFeature || typeof rawFeature !== "object") continue;
    const feature = rawFeature as RawFeature;
    const properties = feature.properties ?? {};
    const id = properties.id;
    const name =
      typeof properties.name === "string" ? properties.name.trim() : "";
    if (
      typeof id !== "number" ||
      !Number.isSafeInteger(id) ||
      !name ||
      seenIds.has(id)
    ) {
      continue;
    }

    let polygon: PolygonCoordinates | null = null;
    let anchor: Position | null = null;
    for (const candidate of labelPolygons(feature.geometry)) {
      const candidateAnchor = visualCenter(candidate);
      if (!candidateAnchor) continue;
      polygon = candidate;
      anchor = candidateAnchor;
      break;
    }
    if (!polygon || !anchor) continue;
    seenIds.add(id);
    const display = displayLabel(name);
    const areaPriority =
      -sourceArea(properties, polygon) / Math.max(name.length, 8);

    labels.push({
      type: "Feature",
      id,
      geometry: { type: "Point", coordinates: anchor },
      properties: {
        id,
        name,
        labelText: display.text,
        labelMaxWidth: display.maxWidth,
        // Lower symbol sort keys win collisions. Area per character favors names
        // people can scan quickly instead of letting long administrative names
        // occupy the borough view. The two explicit mobile-feedback examples get
        // a fixed first-placement bonus so they are visible at the initial fit.
        labelPriority:
          areaPriority -
          (FEATURED_NEIGHBORHOOD_NAMES.has(name) ? FEATURED_LABEL_BONUS : 0),
      },
    });
  }

  return { type: "FeatureCollection", features: labels };
}
