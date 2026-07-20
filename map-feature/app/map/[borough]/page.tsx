import { notFound } from "next/navigation";

import { DeepDiveExperience } from "../../../components/deepdive/deep-dive-experience";
import { AppShellV2 } from "../../../components/shell/app-shell-v2";
import {
  getAreaGeoJson,
  getBoroughNeighborhoods,
  type BoroughNeighborhoodsResponse
} from "../../../lib/api";
import { firstParam } from "../../../lib/search-params";
import type { GeoJSONFeatureCollection } from "../../../lib/shared-types";
import boroughBoundary from "../../../public/map/nyc-borough-boundary-simplified.json";

export const dynamic = "force-dynamic";

const BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DeepDivePage({
  params,
  searchParams
}: {
  params: Promise<{ borough: string }>;
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const { borough: rawBorough } = await params;
  const borough = decodeURIComponent(rawBorough);
  if (!BOROUGHS.includes(borough)) {
    notFound();
  }

  const sp = (await searchParams) ?? {};
  const timeWindow = firstParam(sp, "time_window") ?? "30d";
  const issueType = firstParam(sp, "issue_type") ?? "all";

  // Neighborhood data depends on filters; the NTA polygons don't, so fetch both
  // in parallel for the first paint.
  const [initialData, polygons] = await Promise.all([
    getBoroughNeighborhoods(borough, {
      time_window: timeWindow,
      issue_type: issueType,
      limit: 500
    }).catch((): BoroughNeighborhoodsResponse | null => null),
    getAreaGeoJson({
      area_type: "nta",
      borough,
      simplify_tolerance: 0.0002,
      limit: 500
    }).catch((): GeoJSONFeatureCollection | null => null)
  ]);

  return (
    <AppShellV2>
      <DeepDiveExperience
        borough={borough}
        boroughGeoJson={boroughBoundary}
        polygons={polygons}
        initialTimeWindow={timeWindow}
        initialIssueType={issueType}
        initialData={initialData}
      />
    </AppShellV2>
  );
}
