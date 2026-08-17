import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId: rawDistrictId } = await params;
  if (!/^\d{1,2}$/.test(rawDistrictId)) {
    return Response.json(
      { detail: "Council district is not available." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  const districtId = Number(rawDistrictId);
  if (districtId < 1 || districtId > 51) {
    return Response.json(
      { detail: "Council district is not available." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  const url = civicUpstreamUrl(`/v1/civic/council/districts/${districtId}/representative`);
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
