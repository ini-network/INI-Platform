// Pure intensity/property helpers shared by the legacy Leaflet map and the new
// Mapbox map. Extracted from region-atlas-map.tsx so both can use them without
// duplicating logic (and without regressing the live map).

export function numberProp(props: Record<string, unknown> | null | undefined, key: string): number {
  const value = props?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function stringProp(props: Record<string, unknown> | null | undefined, key: string): string {
  const value = props?.[key];
  return typeof value === "string" ? value : "";
}

export function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

// Log-scaled volume → 0..1 intensity, relative to the 95th-percentile count.
export function volumeIntensity(count: number, percentile95: number): number {
  if (count <= 0 || percentile95 <= 0) {
    return 0;
  }
  return Math.min(1, Math.log1p(count) / Math.log1p(percentile95));
}
