import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

const SAFE_DISTRICT_KEY = /^[a-z_]+:[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ districtKey: string }> }
) {
  const { districtKey } = await params;
  if (districtKey.length > 120 || !SAFE_DISTRICT_KEY.test(districtKey)) {
    return Response.json(
      { detail: "Civic district is not available." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  const url = civicUpstreamUrl(`/v1/civic/districts/${encodeURIComponent(districtKey)}`);
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
