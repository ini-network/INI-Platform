import "server-only";

import { getApiBaseUrl } from "./api-base-url";

const SAFE_RESPONSE_HEADERS = [
  "cache-control",
  "content-disposition",
  "content-type",
  "etag",
  "last-modified",
  "vary",
  "x-content-type-options"
] as const;

export function civicUpstreamUrl(path: string): string | null {
  // Local/staging civic work can target the additive v1 API independently
  // while the established map/news routes keep using their proven upstream.
  // Production normally leaves this unset and falls back to the shared API.
  const civicBaseUrl = process.env.CIVIC_SIGNAL_CIVIC_API_BASE_URL?.trim().replace(/\/$/, "");
  const baseUrl = civicBaseUrl || getApiBaseUrl();
  return baseUrl ? `${baseUrl}${path}` : null;
}

export function civicProxyResponse(upstream: Response): Response {
  const headers = new Headers();
  for (const name of SAFE_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("cache-control")) {
    headers.set("Cache-Control", upstream.ok ? "no-cache" : "no-store");
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}

export function civicUnavailableResponse(): Response {
  return Response.json(
    { detail: "Civic information is temporarily unavailable." },
    { status: 502, headers: { "Cache-Control": "no-store" } }
  );
}

export async function readBoundedBody(
  request: Request,
  maxBytes: number
): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
