// API response types vendored VERBATIM from the backend's shared contract
// (packages/shared/src/index.ts in the source monorepo) so this standalone
// export has no workspace dependency. This file contains exactly the members
// the app's import closure references — the types imported by lib/api.ts,
// lib/borough-overview.ts and the two map pages — plus their transitive type
// dependencies. Keep in sync with the backend's /issues, /map, /news, /pulse,
// /sources and /source-runs endpoints.

export type PaginationMeta = {
  total: number;
  limit: number;
  offset: number;
  next_offset: number | null;
};

export type AreaSummary = {
  id: number;
  name: string;
  area_type: string;
  borough: string | null;
};

export type ScoreSummary = {
  community_signal_score: number | null;
  official_signal_score: number | null;
  news_coverage_score: number | null;
  confidence_score: number | null;
  severity_score: number | null;
  growth_score: number | null;
  geo_confidence_score: number | null;
  source_diversity_score: number | null;
  coverage_gap_score: number | null;
  community_coverage_gap_score: number | null;
  official_gap_score: number | null;
  overall_issue_score: number | null;
};

export type EvidenceCounts = {
  total: number;
  by_source: Record<string, number>;
  by_source_group: Record<string, number>;
};

export type IssueListItem = {
  id: number;
  cluster_id: number;
  title: string;
  short_summary: string;
  status: string;
  category: string;
  subcategory: string | null;
  time_window: string | null;
  area: AreaSummary | null;
  evidence_count: number;
  evidence_counts: EvidenceCounts;
  issue_source_mix: string | null;
  is_community_coverage_gap: boolean | null;
  is_official_only_gap: boolean | null;
  is_community_led: boolean | null;
  is_correlated_community_official: boolean | null;
  is_news_covered: boolean | null;
  primary_area: AreaSummary | null;
  rollup_borough: string | null;
  affected_area_overflow_count: number;
  geographic_cohesion_score: number | null;
  baseline_status: string | null;
  source_provenance: Record<string, unknown>;
  scores: ScoreSummary;
  score_components: Record<string, unknown>;
  latest_evidence_published_at: string | null;
  generated_at: string | null;
  scored_at: string | null;
};

export type IssueDetail = IssueListItem & {
  summary: string;
  what_people_report: string;
  official_data_context: string;
  news_context: string;
  affected_areas: Record<string, unknown>[];
  confidence_notes: string;
  safety_notes: string;
  evidence_item_ids: number[];
  model_info: Record<string, unknown>;
  llm_provider: string;
  llm_model: string;
  prompt_version: string;
};

export type EvidenceItemResponse = {
  id: number;
  source_id: number;
  source_name: string;
  source_type: string;
  source_group: string;
  external_id: string;
  item_type: string;
  source_url: string | null;
  published_at: string | null;
  title: string | null;
  text_excerpt: string | null;
  category: string | null;
  redaction_status: string;
  areas: AreaSummary[];
  source_provenance: Record<string, unknown>;
};

export type EvidenceListResponse = {
  pagination: PaginationMeta;
  items: EvidenceItemResponse[];
};

export type SourceResponse = {
  id: number;
  name: string;
  source_type: string;
  base_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type SourceListResponse = {
  pagination: PaginationMeta;
  items: SourceResponse[];
};

export type SourceRunResponse = {
  id: number;
  source_id: number;
  source_name: string;
  run_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_fetched: number | null;
  rows_inserted: number | null;
  rows_updated: number | null;
  attempts: number | null;
  rate_limit: Record<string, unknown> | null;
  config: Record<string, unknown>;
  stats: Record<string, unknown>;
  error_message: string | null;
};

export type SourceRunListResponse = {
  pagination: PaginationMeta;
  items: SourceRunResponse[];
};

export type GeoJSONGeometry = {
  type: string;
  coordinates: unknown;
};

export type GeoJSONFeature = {
  type: "Feature";
  geometry: GeoJSONGeometry | null;
  properties: Record<string, unknown>;
};

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  pagination: PaginationMeta | null;
  features: GeoJSONFeature[];
};

export type HotspotNewsScanRequest = {
  area_id: number;
  area_name?: string | null;
  borough?: string | null;
  issue_type: string;
  issue_label: string;
  time_window: string;
  lookback_days?: number | null;
};

export type HotspotNewsScanItem = {
  title: string;
  source_url: string | null;
  source_name: string | null;
  published_at: string | null;
  snippet: string | null;
  status: string;
  reasons: string[];
};

export type HotspotNewsScanResponse = {
  status: string;
  message: string;
  cached: boolean;
  provider: string;
  area: AreaSummary | null;
  issue_type: string;
  issue_label: string;
  time_window: string;
  query: string | null;
  recency_window: Record<string, unknown>;
  scanned_at: string | null;
  expires_at: string | null;
  local_matches: HotspotNewsScanItem[];
  broad_issue_context: HotspotNewsScanItem[];
  stale_context: HotspotNewsScanItem[];
  undated_context: HotspotNewsScanItem[];
  rejected_count: number;
};

export type OfficialHotspotType = {
  id: string;
  label: string;
  group?: string;
  report_count?: number;
};

export type OfficialHotspotTypesResponse = {
  items: OfficialHotspotType[];
  time_windows: OfficialHotspotType[];
};

export type OpsFunnelStage = {
  stage: string;
  decisions: Record<string, number>;
};

export type OpsGate = {
  name: string;
  value: number;
  last_eval_precision: number | null;
  last_eval_recall: number | null;
};

export type OpsRun = {
  run_id: string;
  stage: string;
  started_at: string | null;
  finished_at: string | null;
  items_in: number | null;
  items_out: number | null;
  dropped: number | null;
  error: string | null;
};

export type OpsStatus = {
  configured: boolean;
  generated_at: string;
  funnel: OpsFunnelStage[];
  gates: OpsGate[];
  recent_runs: OpsRun[];
  stage_backlog: Record<string, number>;
};

export type PulseFeedItem = {
  card_id: number;
  cluster_id: number;
  title: string;
  summary: string;
  category: string | null;
  subcategory: string | null;
  area_id: number | null;
  item_count: number;
  source_count: number;
  last_seen: string | null;
};

export type PulseFeedResponse = {
  configured: boolean;
  generated_at: string;
  total_count: number;
  items: PulseFeedItem[];
};

export type PulseNoticeItem = {
  id: number;
  headline: string;
  source_name: string | null;
  source_url: string | null;
  agency: string | null;
  category: string | null;
  urgency: string | null;
  importance_score: number | null;
  visibility_tier: string | null;
  impact_scope: string | null;
  key_date: string | null;
  published_at: string | null;
  why_this_matters: string | null;
  resident_impact_summary: string | null;
};

export type PulseNoticeListResponse = {
  configured: boolean;
  generated_at: string;
  items: PulseNoticeItem[];
};

export type PulseReviewEvidence = {
  text: string;
  source_name: string | null;
  source_type: string | null;
  source_url: string | null;
  published_at: string | null;
  judge_decision: string | null;
  judge_confidence: number | null;
  dropped_reason: string | null;
  comment_count: number;
  comment_confirmations: number;
  comment_support: string | null;
};

export type PulseReviewItem = {
  card_id: number;
  cluster_id: number;
  title: string;
  summary: string;
  category: string | null;
  item_count: number;
  source_count: number;
  comment_confirmations: number;
  comment_support: string | null;
  status: string;
  generated_at: string | null;
  evidence_sample: string[];
  evidence_details: PulseReviewEvidence[];
};

export type PulseReviewResponse = {
  configured: boolean;
  generated_at: string;
  total: number;
  items: PulseReviewItem[];
};
