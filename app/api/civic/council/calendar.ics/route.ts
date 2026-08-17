import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = civicUpstreamUrl("/v1/civic/council/calendar.ics");
  if (!url) return civicUnavailableResponse();
  try {
    const etag = request.headers.get("if-none-match");
    const modified = request.headers.get("if-modified-since");
    const headers = new Headers();
    if (etag) headers.set("If-None-Match", etag);
    if (modified) headers.set("If-Modified-Since", modified);
    return civicProxyResponse(await fetch(url, { cache: "no-store", headers }));
  } catch {
    return civicUnavailableResponse();
  }
}
