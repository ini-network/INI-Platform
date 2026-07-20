import { MapExperience } from "../../components/map/map-experience";
import { AppShellV2 } from "../../components/shell/app-shell-v2";
import {
  getAreaGeoJson,
  getBoroughOverview,
  getNeighborhoodSignals,
  getOfficialHotspots
} from "../../lib/api";
import { buildBoroughOverview, type BoroughOverview } from "../../lib/borough-overview";
import type { NeighborhoodSignalsResponse } from "../../lib/signal-types";
import { firstParam } from "../../lib/search-params";
import type { GeoJSONFeatureCollection } from "../../lib/shared-types";
import boroughBoundary from "../../public/map/nyc-borough-boundary-simplified.json";
import boroughLabels from "../../public/map/nyc-borough-labels.json";

export const dynamic = "force-dynamic";

const BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MapPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = (await searchParams) ?? {};
  const boroughParam = firstParam(params, "borough");
  const borough = boroughParam && BOROUGHS.includes(boroughParam) ? boroughParam : "Brooklyn";
  const timeWindow = firstParam(params, "time_window") ?? "30d";
  const issueType = firstParam(params, "issue_type") ?? "all";

  // Fetch only the initial borough server-side (fast first paint). The client
  // orchestrator caches it and lazily loads/prefetches the rest. Prefer the
  // dedicated API endpoint (correct % + real news); fall back to the on-the-fly
  // aggregation if it's unavailable. The hotspots fallback is chained onto the
  // overview promise ONLY, so the three top-level fetches below all start
  // concurrently — a double failure still yields overview=null (never rejects,
  // never fails the page), identical to the prior try/catch semantics.
  const overviewPromise: Promise<BoroughOverview | null> = getBoroughOverview(borough, {
    time_window: timeWindow,
    issue_type: issueType
  }).catch(async () => {
    try {
      const collection = await getOfficialHotspots({
        issue_type: issueType,
        time_window: timeWindow,
        borough,
        area_type: "nta",
        min_reports: 1,
        limit: 500
      });
      return buildBoroughOverview(borough, collection);
    } catch {
      return null;
    }
  });

  // Signals are the map's default lens. The whole (small) set is fetched once
  // here so every borough's tint, chip counts and briefing are instant client-
  // side. The citywide neighborhood (NTA) polygons power the drill-in level and
  // the address-search point-in-polygon. The overview, signals and polygons all
  // start together; each being null degrades gracefully (calm "unavailable"
  // panel / borough-only view) and Reports still works. NTA boundaries are static
  // geography, so they ride the CDN for a day instead of no-store on every view.
  const [overview, signals, neighborhoodGeoJson] = await Promise.all([
    overviewPromise,
    getNeighborhoodSignals({ limit: 2000 }).catch((): NeighborhoodSignalsResponse | null => null),
    getAreaGeoJson(
      { area_type: "nta", limit: 1000, simplify_tolerance: 0.0004 },
      { next: { revalidate: 86400 } }
    ).catch((): GeoJSONFeatureCollection | null => null)
  ]);

  return (
    <AppShellV2>
      <MapExperience
        boroughGeoJson={boroughBoundary}
        labelsGeoJson={boroughLabels}
        neighborhoodGeoJson={neighborhoodGeoJson}
        initialBorough={borough}
        initialTimeWindow={timeWindow}
        initialIssueType={issueType}
        initialOverview={overview}
        initialSignals={signals}
      />
    </AppShellV2>
  );
}
