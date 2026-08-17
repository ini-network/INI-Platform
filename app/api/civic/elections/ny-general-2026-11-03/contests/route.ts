import { isCivicDistrictKey } from "@/lib/map-feature/civic-types";
import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

const EXPECTED = {
  us_house: "us_congressional",
  nys_senate: "state_senate",
  nys_assembly: "state_assembly"
} as const;
const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const query = new URLSearchParams();
  const seen = new Set<string>();

  for (const [name, value] of incoming.searchParams) {
    const geographyType = EXPECTED[name as keyof typeof EXPECTED];
    if (
      !geographyType ||
      seen.has(name) ||
      !isCivicDistrictKey(value, geographyType)
    ) {
      return Response.json(
        { detail: "Request parameters are invalid." },
        { status: 422, headers: NO_STORE }
      );
    }
    seen.add(name);
    query.set(name, value);
  }

  const url = civicUpstreamUrl(
    `/v1/civic/elections/ny-general-2026-11-03/contests${
      query.size > 0 ? `?${query.toString()}` : ""
    }`
  );
  if (!url) return civicUnavailableResponse();

  try {
    const headers = new Headers();
    const etag = request.headers.get("if-none-match");
    if (etag) headers.set("If-None-Match", etag);
    return civicProxyResponse(await fetch(url, { cache: "no-store", headers }));
  } catch {
    return civicUnavailableResponse();
  }
}
