import Link from "next/link";

import { NewsCard } from "@/components/map-feature/news/news-card";
import { AppShellV2 } from "@/components/map-feature/shell/app-shell-v2";
import { getNews } from "@/lib/map-feature/api";
import type { NewsListItem } from "@/lib/map-feature/news";
import { TOUR_NEWS } from "@/lib/map-feature/tour-fixtures";
import { firstParam } from "@/lib/map-feature/search-params";

export const dynamic = "force-dynamic";

const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewsPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const params = (await searchParams) ?? {};
  const boroughParam = firstParam(params, "borough");
  const borough = boroughParam && BOROUGHS.includes(boroughParam) ? boroughParam : undefined;
  // Guided-tour demo mode: render frozen fixtures instead of live news. The
  // param is present ONLY on links the tour pushes; borough chips below never
  // carry it, so leaving the tour reverts to live data. The banner always shows
  // with the param, so sample data is never presented as live.
  const isTour = firstParam(params, "tour") === "1";

  let items: NewsListItem[] = [];
  if (isTour) {
    items = TOUR_NEWS;
  } else {
    try {
      items = (await getNews({ borough, limit: 40, lookback_days: 30 })).items;
    } catch {
      items = [];
    }
  }

  return (
    <AppShellV2>
      <div className="cs-news-page">
        <header className="cs-news-page-head">
          <h1>News</h1>
          <p>Important local news across the five boroughs.</p>
          {isTour ? (
            <p className="cs-tour-note">Example content for this tour</p>
          ) : null}
          <div className="cs-news-filters">
            <Link href="/news" className={`cs-news-chip${!borough ? " is-active" : ""}`}>
              All
            </Link>
            {BOROUGHS.map((name) => (
              <Link
                key={name}
                href={`/news?borough=${encodeURIComponent(name)}`}
                className={`cs-news-chip${borough === name ? " is-active" : ""}`}
              >
                {name}
              </Link>
            ))}
          </div>
        </header>

        {items.length === 0 ? (
          <p className="cs-empty">No recent news{borough ? ` for ${borough}` : ""} yet.</p>
        ) : (
          <div className="cs-newscard-grid">
            {items.map((item, index) => (
              // Eager-load the first row (~4) so their thumbnails stay instant like
              // the old CSS backgrounds did; the rest lazy-load.
              <NewsCard key={item.id} item={item} eager={index < 4} />
            ))}
          </div>
        )}
      </div>
    </AppShellV2>
  );
}
