// Server-side borough aggregation, derived from the existing
// /map/signals.geojson (per-NTA features). This is the Phase-1 interim for the
// planned GET /map/boroughs/{borough}/overview endpoint — same shape, so the UI
// won't change when the aggregation moves into the API.

import type { GeoJSONFeature, GeoJSONFeatureCollection } from "./shared-types";

import { numberProp, percentile, stringProp } from "./map/intensity";
import { type SeverityBucket } from "./map/severity";

export type OverviewNewsItem = {
  id?: number | null;
  title: string;
  source_url: string | null;
  source_name: string | null;
  published_at: string | null;
  image_url?: string | null;
};

export type NeighborhoodRow = {
  area_id: number;
  name: string;
  total: number;
  official: number;
  community: number;
  previous?: number;
  severity: SeverityBucket;
  trend_status?: string;
  trend_label: string;
  center: [number, number] | null; // [lng, lat]
};

export type BoroughTopIssue = {
  issue_type: string;
  issue_label: string;
  official: number;
  community: number;
  total: number;
};

export type BoroughOverview = {
  borough: string;
  total: number;
  previous: number;
  pct_change: number | null;
  // Human label for what the pct is measured against ("prior 6 months",
  // "prior month", …). The API supplies it; the client fallback derives it.
  pct_basis?: string | null;
  source_breakdown: { official_311: number; community: number; partner: number };
  neighborhoods: NeighborhoodRow[];
  total_neighborhoods: number;
  top_issues?: BoroughTopIssue[];
  top_news: OverviewNewsItem[];
};

// Community reports are rare and easily drowned out, so they dominate ranking:
// any item with community presence outranks any without (community always wins).
// Mirrors COMMUNITY_PRIORITY_WEIGHT in the API.
const COMMUNITY_PRIORITY_WEIGHT = 10_000_000;
export function communityPriorityScore(total: number, community: number): number {
  return community * COMMUNITY_PRIORITY_WEIGHT + total;
}

function pointCenter(geometry: GeoJSONFeature["geometry"]): [number, number] | null {
  if (geometry && geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates as unknown[];
    if (typeof lng === "number" && typeof lat === "number") {
      return [lng, lat];
    }
  }
  return null;
}

function newsFromProps(props: Record<string, unknown>): OverviewNewsItem[] {
  const value = props.news_items;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item): OverviewNewsItem[] => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title : "";
    if (!title.trim()) {
      return [];
    }
    const id = typeof record.id === "number" ? record.id : null;
    const source_url = typeof record.source_url === "string" ? record.source_url : null;
    // A reader can only open an item via its in-app id or an external link.
    // Drop items with neither — they'd render as dead, unclickable text.
    if (id === null && !source_url) {
      return [];
    }
    return [
      {
        id: id ?? undefined,
        title,
        source_url,
        source_name: typeof record.source_name === "string" ? record.source_name : null,
        published_at: typeof record.published_at === "string" ? record.published_at : null,
        image_url: typeof record.image_url === "string" ? record.image_url : null
      }
    ];
  });
}

export function buildBoroughOverview(
  borough: string,
  collection: GeoJSONFeatureCollection
): BoroughOverview {
  type Agg = {
    name: string;
    total: number;
    official: number;
    community: number;
    // Month-over-month counts (complete prior calendar months) — these are the
    // only like-for-like fields available client-side, so the % is computed from
    // them. (Summing a full-window `current_count` against a single-month
    // `previous_count`, as before, produced the inflated "+543%".)
    trendCurrent: number;
    trendPrevious: number;
    trendStatus: string;
    center: [number, number] | null;
  };
  const byArea = new Map<number, Agg>();

  for (const feature of collection.features) {
    const props = feature.properties;
    const areaId = numberProp(props, "area_id");
    if (areaId <= 0) {
      continue;
    }
    const current = numberProp(props, "current_count");
    const existing = byArea.get(areaId);
    if (existing) {
      existing.total += current;
      existing.official += numberProp(props, "official_count") || current;
      existing.community += numberProp(props, "community_count");
      existing.trendCurrent += numberProp(props, "trend_current_count");
      existing.trendPrevious += numberProp(props, "trend_previous_count");
    } else {
      byArea.set(areaId, {
        name: stringProp(props, "area_name") || stringProp(props, "name") || "Area",
        total: current,
        official: numberProp(props, "official_count") || current,
        community: numberProp(props, "community_count"),
        trendCurrent: numberProp(props, "trend_current_count"),
        trendPrevious: numberProp(props, "trend_previous_count"),
        trendStatus: stringProp(props, "trend_status") || stringProp(props, "trend_direction"),
        center: pointCenter(feature.geometry)
      });
    }
  }

  const entries = [...byArea.entries()];
  // Relative (within-borough) severity cutoffs — mirrors the API's
  // severity_thresholds so the choropleth shows a gradient, not all-high.
  const totals = entries.map(([, agg]) => agg.total);
  const highCut = percentile(totals, 0.88);
  const mediumCut = percentile(totals, 0.65);
  const lowCut = percentile(totals, 0.35);
  const rankSeverity = (total: number): SeverityBucket => {
    if (total <= 0) return "info";
    if (total >= highCut) return "high";
    if (total >= mediumCut) return "medium";
    if (total >= lowCut) return "low";
    return "info";
  };
  const trendLabel = (current: number, previous: number): string => {
    if (previous < 10 || previous <= 0) return "";
    const pct = ((current - previous) / previous) * 100;
    if (pct >= 20) return `Up ${pct.toFixed(0)}% from prior month`;
    if (pct <= -20) return `Down ${Math.abs(pct).toFixed(0)}% from prior month`;
    return "Little change from prior month";
  };

  const neighborhoods: NeighborhoodRow[] = entries
    .map(([areaId, agg]) => ({
      area_id: areaId,
      name: agg.name,
      total: agg.total,
      official: agg.official,
      community: agg.community,
      previous: agg.trendPrevious,
      severity: rankSeverity(agg.total),
      trend_status: agg.trendStatus,
      trend_label: trendLabel(agg.trendCurrent, agg.trendPrevious),
      center: agg.center
    }))
    .sort(
      (left, right) =>
        communityPriorityScore(right.total, right.community) -
        communityPriorityScore(left.total, left.community)
    );

  const total = neighborhoods.reduce((sum, row) => sum + row.total, 0);
  const official = neighborhoods.reduce((sum, row) => sum + row.official, 0);
  const community = neighborhoods.reduce((sum, row) => sum + row.community, 0);
  // Borough month-over-month, with the same minimum-baseline guard as the API.
  const trendCurrent = entries.reduce((sum, [, agg]) => sum + agg.trendCurrent, 0);
  const trendPrevious = entries.reduce((sum, [, agg]) => sum + agg.trendPrevious, 0);
  const previous = trendPrevious;
  const pctChange = trendPrevious >= 10 ? ((trendCurrent - trendPrevious) / trendPrevious) * 100 : null;
  const pctBasis = pctChange === null ? null : "prior month";

  const allNews = collection.features.flatMap((feature) => newsFromProps(feature.properties));
  allNews.sort((left, right) =>
    String(right.published_at ?? "").localeCompare(String(left.published_at ?? ""))
  );
  const seen = new Set<string>();
  const topNews: OverviewNewsItem[] = [];
  for (const item of allNews) {
    const key = (item.source_url ?? item.title).toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    topNews.push(item);
    if (topNews.length >= 5) {
      break;
    }
  }

  // Top issues for the borough (community-first), aggregated by issue_type
  // across the per-(area, issue) features.
  const byIssue = new Map<string, { label: string; official: number; community: number }>();
  for (const feature of collection.features) {
    const props = feature.properties;
    const issueType = stringProp(props, "issue_type");
    if (!issueType) {
      continue;
    }
    const current = numberProp(props, "current_count");
    const off = numberProp(props, "official_count") || current;
    const com = numberProp(props, "community_count");
    const existing = byIssue.get(issueType);
    if (existing) {
      existing.official += off;
      existing.community += com;
    } else {
      byIssue.set(issueType, {
        label: stringProp(props, "issue_type_label") || issueType,
        official: off,
        community: com
      });
    }
  }
  const topIssues: BoroughTopIssue[] = [...byIssue.entries()]
    .map(([issue_type, value]) => ({
      issue_type,
      issue_label: value.label,
      official: value.official,
      community: value.community,
      total: value.official + value.community
    }))
    .filter((issue) => issue.total > 0)
    .sort(
      (left, right) =>
        communityPriorityScore(right.total, right.community) -
        communityPriorityScore(left.total, left.community)
    )
    .slice(0, 5);

  return {
    borough,
    total,
    previous,
    pct_change: pctChange,
    pct_basis: pctBasis,
    source_breakdown: { official_311: official, community, partner: 0 },
    neighborhoods,
    total_neighborhoods: neighborhoods.length,
    top_issues: topIssues,
    top_news: topNews
  };
}
