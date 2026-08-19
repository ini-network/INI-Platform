import {
  CIVIC_GEOGRAPHY_TYPES,
  isCivicGeographyType
} from "@/lib/map-feature/civic-types";
import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const geographyType = new URL(request.url).searchParams.get("geography_type");
  if (!isCivicGeographyType(geographyType)) {
    return Response.json(
      { detail: `geography_type must be one of: ${CIVIC_GEOGRAPHY_TYPES.join(", ")}` },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  const query = new URLSearchParams({ geography_type: geographyType, geometry: "simplified" });
  const url = civicUpstreamUrl(`/v1/civic/geographies.geojson?${query.toString()}`);
  if (!url) return civicUnavailableResponse();
  try {
    const etag = request.headers.get("if-none-match");
    const upstream = await fetch(url, {
      cache: "no-store",
      headers: etag ? { "If-None-Match": etag } : undefined
    });
    return civicProxyResponse(upstream);
  } catch {
    return civicUnavailableResponse();
  }
}
