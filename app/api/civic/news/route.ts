import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const rawLimit = incoming.searchParams.get("limit") ?? "20";
  const limit = Number(rawLimit);
  const cursor = incoming.searchParams.get("cursor");
  const allowedNames = new Set(["limit", "cursor"]);
  const hasUnknownParameter = [...incoming.searchParams.keys()].some(
    (name) => !allowedNames.has(name)
  );
  if (
    hasUnknownParameter ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    (cursor !== null && cursor.length > 512)
  ) {
    return Response.json({ detail: "Request parameters are invalid." }, { status: 422, headers: NO_STORE });
  }

  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor) query.set("cursor", cursor);
  const url = civicUpstreamUrl(`/v1/civic/news?${query.toString()}`);
  if (!url) return civicUnavailableResponse();

  try {
    const headers = new Headers();
    const etag = request.headers.get("if-none-match");
    const modified = request.headers.get("if-modified-since");
    if (etag) headers.set("If-None-Match", etag);
    if (modified) headers.set("If-Modified-Since", modified);
    return civicProxyResponse(await fetch(url, { cache: "no-store", headers }));
  } catch {
    return civicUnavailableResponse();
  }
}
