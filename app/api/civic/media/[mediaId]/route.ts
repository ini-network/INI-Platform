import {
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";
import {
  civicMediaProxyResponse,
  civicMediaUpstreamInit,
  isCivicMediaId
} from "@/lib/map-feature/civic-media-proxy";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  if (!isCivicMediaId(mediaId)) {
    return Response.json(
      { detail: "Portrait not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const url = civicUpstreamUrl(`/v1/civic/media/${encodeURIComponent(mediaId)}`);
  if (!url) return civicUnavailableResponse();

  try {
    const upstream = await fetch(url, civicMediaUpstreamInit(request));
    return civicMediaProxyResponse(upstream);
  } catch {
    return civicUnavailableResponse();
  }
}
