import { NextResponse } from "next/server";

import { getBoroughOverview, getOfficialHotspots } from "@/lib/map-feature/api";
import { buildBoroughOverview } from "@/lib/map-feature/borough-overview";

// Same-origin endpoint the client uses to load (and cache) a borough's overview.
// Runs server-side so CIVIC_SIGNAL_API_BASE_URL never reaches the browser and no
// CORS config is needed. Prefers the dedicated API endpoint (correct window-
// matched %, real borough news); if that's unavailable it falls back to the
// client-side aggregation of /map/signals.geojson, which returns the same shape.
export const dynamic = "force-dynamic";

// Borough overview data changes at most hourly (ingestion is throttled), so a
// short shared CDN cache with SWR is honest and keeps the client's mount-time
// prefetches off the origin. Applied to successful responses only — errors must
// not be cached.
const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
} as const;

const BOROUGHS = new Set(["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const borough = searchParams.get("borough") ?? "";
  if (!BOROUGHS.has(borough)) {
    return NextResponse.json({ detail: "Unknown borough" }, { status: 400 });
  }
  const timeWindow = searchParams.get("time_window") ?? "6m";
  const issueType = searchParams.get("issue_type") ?? "all";

  try {
    const overview = await getBoroughOverview(borough, {
      time_window: timeWindow,
      issue_type: issueType
    });
    return NextResponse.json(overview, { headers: CACHE_HEADERS });
  } catch {
    // Fallback: aggregate the per-NTA signals on the fly (older API / API down).
    try {
      const collection = await getOfficialHotspots({
        issue_type: issueType,
        time_window: timeWindow,
        borough,
        area_type: "nta",
        min_reports: 1,
        limit: 500
      });
      return NextResponse.json(buildBoroughOverview(borough, collection), {
        headers: CACHE_HEADERS
      });
    } catch {
      return NextResponse.json({ detail: "Borough overview unavailable" }, { status: 502 });
    }
  }
}
