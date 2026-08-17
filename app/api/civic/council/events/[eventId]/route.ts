import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(request: Request, context: Context) {
  const { eventId } = await context.params;
  const numericId = Number(eventId);
  if (!/^\d+$/.test(eventId) || !Number.isSafeInteger(numericId) || numericId < 1) {
    return Response.json({ error: "Invalid event id" }, { status: 400 });
  }
  const url = civicUpstreamUrl(`/v1/civic/council/events/${encodeURIComponent(eventId)}`);
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
