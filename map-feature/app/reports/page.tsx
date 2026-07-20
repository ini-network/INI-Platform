import Link from "next/link";

import { ReportCard } from "../../components/reports/report-card";
import { AppShellV2 } from "../../components/shell/app-shell-v2";
import { getCommunityReports } from "../../lib/api";
import type { ReportItem } from "../../lib/report-types";
import { TOUR_REPORTS } from "../../lib/tour-fixtures";
import { firstParam } from "../../lib/search-params";

export const dynamic = "force-dynamic";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
// One fetch per render sized by ?count= — "Show more" is a plain link bump, so
// the whole page stays a server component (no client fetching, no proxy route).
const PAGE_SIZE = 20;
const MAX_COUNT = 100; // the API clamps /pulse/reports at limit=100

type SearchParams = Record<string, string | string[] | undefined>;

function reportsHref(borough: string | undefined, count: number): string {
  const query = new URLSearchParams();
  if (borough) query.set("borough", borough);
  if (count > PAGE_SIZE) query.set("count", String(count));
  const suffix = query.toString();
  return suffix ? `/reports?${suffix}` : "/reports";
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = (await searchParams) ?? {};
  const boroughParam = firstParam(params, "borough");
  const borough = boroughParam && BOROUGHS.includes(boroughParam) ? boroughParam : undefined;
  const countParam = Number(firstParam(params, "count"));
  const count = Number.isFinite(countParam)
    ? Math.min(Math.max(Math.trunc(countParam), PAGE_SIZE), MAX_COUNT)
    : PAGE_SIZE;
  // Guided-tour demo mode: frozen fixture stories instead of live reports. Param
  // present only on tour-pushed links; borough chips never carry it. Banner
  // always shows with the param so sample data is never presented as live.
  const isTour = firstParam(params, "tour") === "1";

  let reports: ReportItem[] = [];
  let total = 0;
  if (isTour) {
    reports = TOUR_REPORTS;
    total = TOUR_REPORTS.length;
  } else {
    try {
      const data = await getCommunityReports({ borough, limit: count });
      reports = data.reports;
      total = data.total;
    } catch {
      reports = [];
    }
  }

  // `total` counts every approved card in scope; cards with no showable resident
  // post are dropped server-side, so gate "Show more" on the requested page
  // coming back full rather than on reports.length reaching total.
  const canShowMore = count < MAX_COUNT && total > count;

  return (
    <AppShellV2>
      <div className="cs-news-page">
        <header className="cs-news-page-head">
          <h1>Community stories</h1>
          <p>
            What New Yorkers are posting and saying about their neighborhoods — every
            story backed by real resident posts and the comments under them.
          </p>
          {isTour ? (
            <p className="cs-tour-note">Example content for this tour</p>
          ) : null}
          <div className="cs-news-filters">
            <Link href="/reports" className={`cs-news-chip${!borough ? " is-active" : ""}`}>
              All of NYC
            </Link>
            {BOROUGHS.map((name) => (
              <Link
                key={name}
                href={reportsHref(name, PAGE_SIZE)}
                className={`cs-news-chip${borough === name ? " is-active" : ""}`}
              >
                {name}
              </Link>
            ))}
          </div>
        </header>

        {reports.length === 0 ? (
          <p className="cs-empty">
            No community stories{borough ? ` for ${borough}` : ""} yet.
          </p>
        ) : (
          <div className="cs-reports-feed">
            {reports.map((item) => (
              <ReportCard key={item.card_id} item={item} />
            ))}
          </div>
        )}
        {/* Outside the empty-state ternary on purpose: the API drops cards with
            no showable resident post AFTER paging, so an empty page can still
            have reachable stories deeper in — the link must survive that. */}
        {canShowMore ? (
          <div className="cs-reports-more">
            <Link href={reportsHref(borough, count + PAGE_SIZE)} className="cs-news-chip" scroll={false}>
              Show more stories
            </Link>
          </div>
        ) : null}
      </div>
    </AppShellV2>
  );
}
