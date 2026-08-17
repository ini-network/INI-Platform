import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = civicUpstreamUrl("/v1/civic/geography-layers");
  if (!url) return civicUnavailableResponse();
  try {
    const upstream = await fetch(url, {
      cache: "no-store",
      headers: request.headers.get("if-none-match")
        ? { "If-None-Match": request.headers.get("if-none-match")! }
        : undefined
    });
    return civicProxyResponse(upstream);
  } catch {
    return civicUnavailableResponse();
  }
}
