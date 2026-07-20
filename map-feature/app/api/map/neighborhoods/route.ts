import { NextResponse } from "next/server";

import {
  getBoroughNeighborhoods,
  getOfficialHotspots,
  type BoroughNeighborhoodsResponse
} from "../../../../lib/api";
import { buildBoroughOverview } from "../../../../lib/borough-overview";

// Same-origin endpoint for the View 3 deep-dive: ranked neighborhoods + total
// count for a borough. Prefers the dedicated API endpoint; falls back to the
// on-the-fly aggregation of /map/signals.geojson so the deep-dive still works
// against an older API.
export const dynamic = "force-dynamic";

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
    const data = await getBoroughNeighborhoods(borough, {
      time_window: timeWindow,
      issue_type: issueType,
      limit: 500
    });
    return NextResponse.json(data);
  } catch {
    try {
      const collection = await getOfficialHotspots({
        issue_type: issueType,
        time_window: timeWindow,
        borough,
        area_type: "nta",
        min_reports: 1,
        limit: 500
      });
      const overview = buildBoroughOverview(borough, collection);
      const fallback: BoroughNeighborhoodsResponse = {
        borough,
        time_window: timeWindow,
        issue_type: issueType,
        total_count: overview.total_neighborhoods,
        neighborhoods: overview.neighborhoods,
        top_issues: overview.top_issues
      };
      return NextResponse.json(fallback);
    } catch {
      return NextResponse.json({ detail: "Neighborhoods unavailable" }, { status: 502 });
    }
  }
}
