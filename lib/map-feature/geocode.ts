// Client-side geocoding (Mapbox Geocoding v6) + a dependency-free point-in-
// polygon test, both scoped to New York City. Used by the signals map's
// address/ZIP/neighborhood search to fly to a location and resolve which polygon
// contains it. Everything here runs in the browser with the publishable
// NEXT_PUBLIC_MAPBOX_TOKEN (the same token the map tiles use).

// NYC bounding box [minLng, minLat, maxLng, maxLat]. Passed as the geocoder's
// `bbox` so a bare ZIP or street name resolves locally instead of nationwide.
export const NYC_BBOX: [number, number, number, number] = [
  -74.2591, 40.4774, -73.7002, 40.9176
];

export type GeocodeResult = {
  id: string;
  // Primary line, e.g. "350 5th Avenue".
  label: string;
  // Secondary line, e.g. "New York, New York 10118" ("" when none).
  context: string;
  // [lng, lat].
  center: [number, number];
  featureType: GeocodeFeatureType;
};

export type GeocodeFeatureType =
  | "address"
  | "street"
  | "postcode"
  | "neighborhood"
  | "locality"
  | "place";

const V6_FORWARD = "https://api.mapbox.com/search/geocode/v6/forward";

/**
 * Forward-geocode an address, ZIP code or neighborhood within NYC. Throws on a network
 * error or non-OK response so the caller can show a calm inline error; returns
 * an empty array for a valid query with no matches.
 */
export async function geocodeNyc(
  query: string,
  token: string,
  signal?: AbortSignal
): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const params = new URLSearchParams({
    q: trimmed,
    access_token: token,
    bbox: NYC_BBOX.join(","),
    types: "address,street,postcode,neighborhood,locality,place",
    country: "us",
    autocomplete: "true",
    limit: "10",
    language: "en",
    worldview: "us"
  });
  const response = await fetch(`${V6_FORWARD}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Geocoding request failed: ${response.status}`);
  }
  const data = (await response.json()) as { features?: unknown[] };
  const features = Array.isArray(data.features) ? data.features : [];
  const results: GeocodeResult[] = [];
  for (const raw of features) {
    const parsed = parseFeature(raw);
    if (parsed) {
      results.push(parsed);
    }
  }
  // Keep the complete (API-limited) ranked set here. The search box applies
  // the true five-borough polygon filter before trimming the visible list, so
  // nearby New Jersey matches cannot crowd valid NYC suggestions out.
  return rankAndDedupeResults(trimmed, results);
}

const SUPPORTED_FEATURE_TYPES = new Set<GeocodeFeatureType>([
  "address",
  "street",
  "postcode",
  "neighborhood",
  "locality",
  "place"
]);

function parseFeatureType(value: unknown): GeocodeFeatureType {
  return typeof value === "string" && SUPPORTED_FEATURE_TYPES.has(value as GeocodeFeatureType)
    ? (value as GeocodeFeatureType)
    : "place";
}

function parseFeature(raw: unknown): GeocodeResult | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const feature = raw as {
    id?: unknown;
    geometry?: { coordinates?: unknown } | null;
    properties?: {
      name?: unknown;
      full_address?: unknown;
      place_formatted?: unknown;
      mapbox_id?: unknown;
      feature_type?: unknown;
    } | null;
  };
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || typeof coords[0] !== "number" || typeof coords[1] !== "number") {
    return null;
  }
  const props = feature.properties ?? {};
  const name = typeof props.name === "string" ? props.name : "";
  const full = typeof props.full_address === "string" ? props.full_address : "";
  const placeFormatted = typeof props.place_formatted === "string" ? props.place_formatted : "";
  const label = name || full || "Result";
  const context = placeFormatted || (full && full !== label ? full : "");
  const featureType = parseFeatureType(props.feature_type);
  const id =
    typeof props.mapbox_id === "string"
      ? props.mapbox_id
      : typeof feature.id === "string" || typeof feature.id === "number"
        ? String(feature.id)
        : `${coords[0]},${coords[1]}`;
  return { id, label, context, center: [coords[0], coords[1]], featureType };
}

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function intentTypeScore(query: string, featureType: GeocodeFeatureType): number {
  const looksLikeZip = /^\d{5}(?:-\d{4})?$/.test(query);
  const startsWithStreetNumber = /^\d+\b/.test(query);

  if (looksLikeZip) {
    return featureType === "postcode" ? 50 : featureType === "address" ? 20 : 0;
  }
  if (startsWithStreetNumber) {
    return featureType === "address" ? 50 : featureType === "street" ? 25 : 0;
  }
  if (featureType === "neighborhood" || featureType === "locality") {
    return 40;
  }
  if (featureType === "place") {
    return 25;
  }
  if (featureType === "street") {
    return 10;
  }
  return 0;
}

function resultScore(query: string, result: GeocodeResult): number {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedLabel = normalizeSearchText(result.label);
  const normalizedFull = normalizeSearchText(`${result.label} ${result.context}`);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  let score = intentTypeScore(normalizedQuery, result.featureType);

  if (normalizedLabel === normalizedQuery) {
    score += 100;
  } else if (normalizedFull === normalizedQuery) {
    score += 90;
  } else if (normalizedLabel.startsWith(normalizedQuery)) {
    score += 65;
  } else if (normalizedFull.startsWith(normalizedQuery)) {
    score += 55;
  } else if (queryTokens.every((token) => normalizedFull.includes(token))) {
    score += 30;
  }
  return score;
}

function rankAndDedupeResults(query: string, results: GeocodeResult[]): GeocodeResult[] {
  const seen = new Set<string>();
  const unique = results.filter((result) => {
    const key = `${result.featureType}|${normalizeSearchText(result.label)}|${normalizeSearchText(result.context)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return unique
    .map((result, index) => ({ result, index, score: resultScore(query, result) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ result }) => result);
}

// --- point-in-polygon (ray casting) ----------------------------------------

type Position = [number, number];

// Standard even-odd ray-cast for a single ring.
function pointInRing(x: number, y: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

// Even-odd across a polygon's rings (outer ring + any holes): a point inside the
// outer ring but also inside a hole toggles twice and correctly reads as outside.
function pointInPolygon(x: number, y: number, rings: Position[][]): boolean {
  let inside = false;
  for (const ring of rings) {
    if (Array.isArray(ring) && pointInRing(x, y, ring)) {
      inside = !inside;
    }
  }
  return inside;
}

export type PipGeometry = { type?: string; coordinates?: unknown } | null | undefined;

/** Whether a [lng, lat] point falls inside a GeoJSON Polygon or MultiPolygon. */
export function pointInGeometry(point: Position, geometry: PipGeometry): boolean {
  if (!geometry) {
    return false;
  }
  const [x, y] = point;
  if (geometry.type === "Polygon") {
    const rings = geometry.coordinates as Position[][] | undefined;
    return Array.isArray(rings) ? pointInPolygon(x, y, rings) : false;
  }
  if (geometry.type === "MultiPolygon") {
    const polys = geometry.coordinates as Position[][][] | undefined;
    if (!Array.isArray(polys)) {
      return false;
    }
    for (const rings of polys) {
      if (Array.isArray(rings) && pointInPolygon(x, y, rings)) {
        return true;
      }
    }
    return false;
  }
  return false;
}

type PolygonFeature = {
  properties?: Record<string, unknown> | null;
  geometry?: PipGeometry;
};

export type AreaMatch = { areaId: number; name: string; borough: string | null };

/**
 * The first area polygon whose geometry contains the point. Features come from
 * GET /map/areas.geojson, whose properties carry `id` (= area_id), `name` and
 * `borough`. Returns null when the point falls in no polygon.
 */
export function findAreaContaining(point: Position, features: PolygonFeature[]): AreaMatch | null {
  for (const feature of features) {
    if (!pointInGeometry(point, feature.geometry)) {
      continue;
    }
    const props = feature.properties ?? {};
    const id = props.id;
    if (typeof id !== "number") {
      continue;
    }
    return {
      areaId: id,
      name: typeof props.name === "string" ? props.name : "",
      borough: typeof props.borough === "string" ? props.borough : null
    };
  }
  return null;
}

/**
 * The borough polygon (property `BoroName`) containing the point — used when a
 * geocoded spot falls in no neighborhood (parks, water edges, simplification
 * gaps) so the map can still fly to the right borough.
 */
export function findBoroughContaining(point: Position, features: PolygonFeature[]): string | null {
  for (const feature of features) {
    if (!pointInGeometry(point, feature.geometry)) {
      continue;
    }
    const name = (feature.properties ?? {}).BoroName;
    if (typeof name === "string") {
      return name;
    }
  }
  return null;
}
