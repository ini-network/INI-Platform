import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function invalidQuery(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const start = requestUrl.searchParams.get("start");
  const end = requestUrl.searchParams.get("end");
  const rawLimit = requestUrl.searchParams.get("limit") ?? "3";
  const limit = Number(rawLimit);
  if (start !== null && !ISO_DATE.test(start)) return invalidQuery("Invalid start date");
  if (end !== null && !ISO_DATE.test(end)) return invalidQuery("Invalid end date");
  if (start !== null && end !== null && start > end) return invalidQuery("Invalid date range");
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) return invalidQuery("Invalid limit");
  const query = new URLSearchParams({ limit: String(limit) });
  if (start) query.set("start", start);
  if (end) query.set("end", end);
  const url = civicUpstreamUrl(`/v1/civic/council/events?${query.toString()}`);
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
