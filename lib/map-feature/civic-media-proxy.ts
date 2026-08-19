const SAFE_MEDIA_ID = /^sha256:[0-9a-f]{64}$/;
const SAFE_MEDIA_TYPE = "image/webp";

export function isCivicMediaId(value: string): boolean {
  return SAFE_MEDIA_ID.test(value);
}

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers({
    "Cache-Control":
      upstream.headers.get("cache-control") ??
      (upstream.ok || upstream.status === 304
        ? "public, max-age=31536000, immutable"
        : "no-store"),
    "X-Content-Type-Options": "nosniff"
  });
  for (const name of ["etag", "last-modified", "vary"] as const) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function safeError(upstream: Response): Response {
  const detail = upstream.status === 404 ? "Portrait not found." : "Portrait temporarily unavailable.";
  const headers = responseHeaders(upstream);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return Response.json({ detail }, { status: upstream.status, headers });
}

export function civicMediaUpstreamInit(request: Request): RequestInit {
  const headers = new Headers({ Accept: SAFE_MEDIA_TYPE });
  const etag = request.headers.get("if-none-match");
  const modified = request.headers.get("if-modified-since");
  if (etag) headers.set("If-None-Match", etag);
  if (modified) headers.set("If-Modified-Since", modified);
  return { cache: "no-store", headers };
}

export function civicMediaProxyResponse(upstream: Response): Response {
  const safeHeaders = responseHeaders(upstream);
  if (upstream.status === 304) return new Response(null, { status: 304, headers: safeHeaders });
  if (!upstream.ok) return safeError(upstream);

  const mediaType = (upstream.headers.get("content-type") ?? "").split(";", 1)[0].trim();
  if (mediaType !== SAFE_MEDIA_TYPE) {
    return Response.json(
      { detail: "Portrait temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
  safeHeaders.set("Content-Type", mediaType);
  return new Response(upstream.body, { status: upstream.status, headers: safeHeaders });
}
