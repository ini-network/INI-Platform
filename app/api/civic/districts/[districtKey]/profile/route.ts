import {
  civicProfileProxyResponse,
  civicProfileUpstreamInit
} from "@/lib/map-feature/civic-profile-proxy";
import { isCivicDistrictKey } from "@/lib/map-feature/civic-types";
import {
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ districtKey: string }> }
) {
  const { districtKey } = await params;
  if (!isCivicDistrictKey(districtKey)) {
    return Response.json(
      { detail: "This civic district profile is not available." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const url = civicUpstreamUrl(
    `/v1/civic/districts/${encodeURIComponent(districtKey)}/profile`
  );
  if (!url) return civicUnavailableResponse();

  try {
    const upstream = await fetch(url, civicProfileUpstreamInit());
    return civicProfileProxyResponse(request, districtKey, upstream);
  } catch {
    return civicUnavailableResponse();
  }
}
