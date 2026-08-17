import {
  civicProxyResponse,
  civicUnavailableResponse,
  civicUpstreamUrl,
  readBoundedBody
} from "@/lib/map-feature/civic-proxy";

export const dynamic = "force-dynamic";

const MAX_LOCATION_BODY_BYTES = 2048;
const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const mediaType = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim();
  if (mediaType !== "application/json") {
    return Response.json({ detail: "Location request is invalid." }, { status: 415, headers: NO_STORE });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_LOCATION_BODY_BYTES) {
    return Response.json({ detail: "Location request is invalid." }, { status: 413, headers: NO_STORE });
  }
  const body = await readBoundedBody(request, MAX_LOCATION_BODY_BYTES);
  if (body === null) {
    return Response.json({ detail: "Location request is invalid." }, { status: 413, headers: NO_STORE });
  }
  const outboundBody = new ArrayBuffer(body.byteLength);
  new Uint8Array(outboundBody).set(body);
  const url = civicUpstreamUrl("/v1/civic/location-context");
  if (!url) return civicUnavailableResponse();
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: outboundBody,
      cache: "no-store"
    });
    return civicProxyResponse(upstream);
  } catch {
    return civicUnavailableResponse();
  }
}
