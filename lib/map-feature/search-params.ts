export type SearchParams = Record<string, string | string[] | undefined>;

// Unwrap a Next.js searchParams entry to a single value — the first element of a
// repeated key, or the string/undefined as-is. Shared by the server pages that
// read filters from the URL; accepts an undefined bag so callers can pass an
// un-defaulted `await searchParams` straight through.
export function firstParam(params: SearchParams | undefined, key: string): string | undefined {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Read a URL parameter only when it is a safe, positive integer. */
export function positiveIntParam(params: SearchParams | undefined, key: string): number | null {
  const value = firstParam(params, key);
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
