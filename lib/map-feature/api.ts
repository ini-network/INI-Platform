import type { NewsArticle, NewsListResponse } from "./news";

import type {
  EvidenceListResponse,
  GeoJSONFeatureCollection,
  HotspotNewsScanRequest,
  HotspotNewsScanResponse,
  IssueDetail,
  OfficialHotspotTypesResponse,
  OpsStatus,
  PulseFeedResponse,
  PulseNoticeListResponse,
  PulseReviewResponse,
  SourceListResponse,
  SourceRunListResponse
} from "./shared-types";

import { getApiBaseUrl, missingApiBaseUrlMessage } from "./api-base-url";
import type { BoroughOverview, BoroughTopIssue, NeighborhoodRow } from "./borough-overview";
import type { ReportsListResponse } from "./report-types";
import type {
  NeighborhoodSignalParams,
  NeighborhoodSignalsResponse,
  SignalDetail
} from "./signal-types";

type QueryValue = string | number | boolean | null | undefined;

// Per-call cache override for fetchJson. Backward-compatible: omitted → the
// default no-store. `next` (Next.js ISR revalidate) and `cache` are mutually
// exclusive at the fetch layer, so a caller supplies at most one.
type FetchInit = {
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
};

export type OfficialHotspotFilters = {
  issue_type?: string;
  time_window?: string;
  borough?: string;
  area_type?: string;
  zipcode?: string;
  min_reports?: number;
  include_news?: boolean;
  limit?: number;
  offset?: number;
};

export type AreaGeoJsonFilters = {
  area_ids?: number[];
  area_type?: string;
  borough?: string;
  zipcode?: string;
  simplify_tolerance?: number;
  limit?: number;
  offset?: number;
};

export type SourceRunFilters = {
  latest_per_source?: boolean;
  limit?: number;
  offset?: number;
};

export class ApiFetchError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
  }
}

function queryString(params: Record<string, QueryValue>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function fetchJson<T>(
  path: string,
  params: Record<string, QueryValue> = {},
  init?: FetchInit
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new ApiFetchError(missingApiBaseUrlMessage(), 500);
  }
  const response = await fetch(`${apiBaseUrl}${path}${queryString(params)}`, {
    // `next` (ISR revalidate) and `cache` can't coexist; opt into revalidation
    // when a caller asks for it, otherwise keep the default no-store.
    ...(init?.next ? { next: init.next } : { cache: init?.cache ?? "no-store" })
  });
  if (!response.ok) {
    throw new ApiFetchError(`API request failed: ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new ApiFetchError(missingApiBaseUrlMessage(), 500);
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!response.ok) {
    throw new ApiFetchError(`API request failed: ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export async function getIssue(issueId: number): Promise<IssueDetail> {
  return fetchJson<IssueDetail>(`/issues/${issueId}`);
}

export async function getIssueEvidence(issueId: number): Promise<EvidenceListResponse> {
  return fetchJson<EvidenceListResponse>(`/issues/${issueId}/evidence`, { limit: 50 });
}

export async function getEvidenceComments(evidenceId: number): Promise<EvidenceListResponse> {
  return fetchJson<EvidenceListResponse>(`/evidence/${evidenceId}/comments`, { limit: 10 });
}

export async function getOpsStatus(): Promise<OpsStatus> {
  return fetchJson<OpsStatus>("/ops/status");
}

export async function getPulseFeed(limit = 25): Promise<PulseFeedResponse> {
  return fetchJson<PulseFeedResponse>("/pulse/feed", { limit });
}

export async function getPulseReview(limit = 50): Promise<PulseReviewResponse> {
  return fetchJson<PulseReviewResponse>("/pulse/review", { limit });
}

export async function getPulseNotices(limit = 20): Promise<PulseNoticeListResponse> {
  return fetchJson<PulseNoticeListResponse>("/pulse/notices", { limit });
}

export async function getSources(): Promise<SourceListResponse> {
  return fetchJson<SourceListResponse>("/sources", { limit: 100 });
}

export async function getSourceRuns(filters: SourceRunFilters = {}): Promise<SourceRunListResponse> {
  return fetchJson<SourceRunListResponse>("/source-runs", {
    latest_per_source: filters.latest_per_source,
    limit: filters.limit ?? 100,
    offset: filters.offset
  });
}

export async function getAreaGeoJson(
  filters: AreaGeoJsonFilters = {},
  init?: FetchInit
): Promise<GeoJSONFeatureCollection> {
  return fetchJson<GeoJSONFeatureCollection>(
    "/map/areas.geojson",
    {
      area_ids: filters.area_ids?.join(","),
      area_type: filters.area_type,
      borough: filters.borough,
      zipcode: filters.zipcode,
      simplify_tolerance: filters.simplify_tolerance,
      limit: filters.limit ?? 1000,
      offset: filters.offset
    },
    init
  );
}

export async function getOfficialHotspots(
  filters: OfficialHotspotFilters = {}
): Promise<GeoJSONFeatureCollection> {
  return fetchJson<GeoJSONFeatureCollection>("/map/signals.geojson", {
    issue_type: filters.issue_type,
    time_window: filters.time_window,
    borough: filters.borough,
    area_type: filters.area_type,
    zipcode: filters.zipcode,
    min_reports: filters.min_reports,
    include_news: filters.include_news,
    limit: filters.limit,
    offset: filters.offset
  });
}

export async function getOfficialHotspotTypes(): Promise<OfficialHotspotTypesResponse> {
  return fetchJson<OfficialHotspotTypesResponse>("/map/signal-types");
}

export type BoroughQuery = {
  time_window?: string;
  issue_type?: string;
};

// GET /map/boroughs/{borough}/overview — borough-level aggregation with a
// window-matched period-over-period % (the source of truth for View 1). The
// response is a superset of BoroughOverview, so it drops straight into the UI.
export async function getBoroughOverview(
  borough: string,
  query: BoroughQuery = {}
): Promise<BoroughOverview> {
  return fetchJson<BoroughOverview>(
    `/map/boroughs/${encodeURIComponent(borough)}/overview`,
    { time_window: query.time_window, issue_type: query.issue_type }
  );
}

// GET /news — recent important, borough-attributed news for the /news page.
export async function getNews(
  query: { borough?: string; limit?: number; lookback_days?: number } = {}
): Promise<NewsListResponse> {
  return fetchJson<NewsListResponse>("/news", {
    borough: query.borough,
    limit: query.limit,
    lookback_days: query.lookback_days
  });
}

// GET /news/{id} — one article + related, for the in-app reader.
export async function getNewsArticle(id: number | string): Promise<NewsArticle> {
  return fetchJson<NewsArticle>(`/news/${encodeURIComponent(String(id))}`);
}

// GET /pulse/reports — vetted community stories (approved cards) with the
// resident posts + comments behind them, newest activity first. Server-only:
// the /reports page is a server component and the comments toggle expands
// already-delivered data, so no browser proxy route is needed.
export async function getCommunityReports(
  query: { borough?: string; limit?: number; offset?: number } = {}
): Promise<ReportsListResponse> {
  const apiBaseUrl = (
    process.env.COMMUNITY_REPORTS_API_BASE_URL?.trim() || getApiBaseUrl()
  ).replace(/\/$/, "");
  if (!apiBaseUrl) {
    throw new ApiFetchError(missingApiBaseUrlMessage(), 500);
  }
  const response = await fetch(
    `${apiBaseUrl}/pulse/reports${queryString({
      borough: query.borough,
      limit: query.limit,
      offset: query.offset
    })}`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    throw new ApiFetchError(`API request failed: ${response.status}`, response.status);
  }
  return (await response.json()) as ReportsListResponse;
}

export type BoroughNeighborhoodsResponse = {
  borough: string;
  time_window: string;
  issue_type: string;
  total_count: number;
  neighborhoods: NeighborhoodRow[];
  top_issues?: BoroughTopIssue[];
};

// GET /map/boroughs/{borough}/neighborhoods — ranked NTA list + total_count
// (powers the View 3 deep-dive list and cluster map).
export async function getBoroughNeighborhoods(
  borough: string,
  query: BoroughQuery & { limit?: number } = {}
): Promise<BoroughNeighborhoodsResponse> {
  return fetchJson<BoroughNeighborhoodsResponse>(
    `/map/boroughs/${encodeURIComponent(borough)}/neighborhoods`,
    { time_window: query.time_window, issue_type: query.issue_type, limit: query.limit }
  );
}

export async function scanOfficialHotspotNews(
  request: HotspotNewsScanRequest
): Promise<HotspotNewsScanResponse> {
  if (typeof window !== "undefined") {
    const response = await fetch("/api/map/signals/news-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store"
    });
    if (!response.ok) {
      throw new ApiFetchError(`API request failed: ${response.status}`, response.status);
    }
    return (await response.json()) as HotspotNewsScanResponse;
  }
  return postJson<HotspotNewsScanResponse>("/map/signals/news-scan", request);
}

// --- Neighborhood signals (Phase 3) ----------------------------------------
// Dual-mode like scanOfficialHotspotNews: on the server we hit the API directly
// (the base URL is server-only); in the browser we go through the same-origin
// /api/pulse/* proxy so CIVIC_SIGNAL_API_BASE_URL never reaches the client.

function signalListQuery(params: NeighborhoodSignalParams): Record<string, QueryValue> {
  return {
    signal_type: params.signal_type,
    borough: params.borough,
    area_id: params.area_id,
    emerging: params.emerging,
    limit: params.limit
  };
}

// GET /pulse/signals — the per-neighborhood signal list, ordered by score DESC.
export async function getNeighborhoodSignals(
  params: NeighborhoodSignalParams = {}
): Promise<NeighborhoodSignalsResponse> {
  const query = signalListQuery(params);
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/pulse/signals${queryString(query)}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new ApiFetchError(`API request failed: ${response.status}`, response.status);
    }
    return (await response.json()) as NeighborhoodSignalsResponse;
  }
  return fetchJson<NeighborhoodSignalsResponse>("/pulse/signals", query);
}

// GET /pulse/signals/{id} — one signal plus resolved evidence (posts / news /
// cards / 311 complaint types). Throws ApiFetchError(404) when the id has
// churned away (signals are recomputed each run, so callers must tolerate that).
export async function getSignalDetail(id: number): Promise<SignalDetail> {
  if (typeof window !== "undefined") {
    const response = await fetch(`/api/pulse/signals/${id}`, { cache: "no-store" });
    if (!response.ok) {
      throw new ApiFetchError(`API request failed: ${response.status}`, response.status);
    }
    return (await response.json()) as SignalDetail;
  }
  return fetchJson<SignalDetail>(`/pulse/signals/${id}`);
}
