import { createHash } from "node:crypto";

import { parseCivicDistrictProfile } from "./civic-profile";

function responseHeaders(upstream: Response): Headers {
  const headers = new Headers({
    "Cache-Control": upstream.headers.get("cache-control") ?? (upstream.ok ? "no-cache" : "no-store"),
    "X-Content-Type-Options": "nosniff"
  });
  for (const name of ["last-modified", "vary"] as const) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function safeError(upstream: Response): Response {
  const detail =
    upstream.status === 404
      ? "This civic district profile is not available."
      : "Civic district profile information is temporarily unavailable.";
  const headers = responseHeaders(upstream);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return Response.json({ detail }, { status: upstream.status, headers });
}

function ifNoneMatchMatches(value: string | null, etag: string): boolean {
  if (!value) return false;
  const opaqueTag = etag.startsWith("W/") ? etag.slice(2) : etag;
  return value.split(",").some((candidate) => {
    const trimmed = candidate.trim();
    if (trimmed === "*") return true;
    return (trimmed.startsWith("W/") ? trimmed.slice(2) : trimmed) === opaqueTag;
  });
}

function ifModifiedSinceMatches(value: string | null, lastModified: string | null): boolean {
  if (!value || !lastModified) return false;
  const requestedAt = Date.parse(value);
  const modifiedAt = Date.parse(lastModified);
  if (!Number.isFinite(requestedAt) || !Number.isFinite(modifiedAt)) return false;
  return modifiedAt <= requestedAt;
}

export function civicProfileUpstreamInit(): RequestInit {
  // The proxy reserializes and hashes a validated public payload, so a browser
  // validator can never be forwarded as though it addressed the provider body.
  return { cache: "no-store", headers: new Headers() };
}

export async function civicProfileProxyResponse(
  request: Request,
  districtKey: string,
  upstream: Response
): Promise<Response> {
  const safeHeaders = responseHeaders(upstream);
  if (!upstream.ok) return safeError(upstream);

  const profile = parseCivicDistrictProfile(await upstream.json());
  if (!profile || profile.district.district_key !== districtKey) {
    return Response.json(
      { detail: "Civic district profile information is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
  const body = JSON.stringify(profile);
  const etag = `"${createHash("sha256").update(body).digest("hex")}"`;
  safeHeaders.set("ETag", etag);
  const ifNoneMatch = request.headers.get("if-none-match");
  const isNotModified = ifNoneMatch
    ? ifNoneMatchMatches(ifNoneMatch, etag)
    : ifModifiedSinceMatches(
        request.headers.get("if-modified-since"),
        safeHeaders.get("last-modified")
      );
  if (isNotModified) {
    return new Response(null, { status: 304, headers: safeHeaders });
  }
  safeHeaders.set("Content-Type", "application/json; charset=utf-8");
  return new Response(body, { status: upstream.status, headers: safeHeaders });
}
