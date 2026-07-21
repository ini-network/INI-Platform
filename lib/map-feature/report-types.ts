// Shapes served by GET /pulse/reports (mirrors ReportItem/ReportPost/ReportComment
// in apps/api .../signals_endpoints.py). Community stories only: every post is a
// resident post (never news/311), text is server-redacted, and no author is ever
// present in the payload.

export type ReportComment = {
  text: string;
  score: number | null;
  published_at: string | null;
};

export type ReportPost = {
  title: string;
  excerpt: string;
  // Full cleaned post text for the in-site reader; server-capped (~6000 chars).
  // Always present; equals excerpt for short posts, "" when unavailable.
  body: string;
  url: string | null;
  platform: string;
  published_at: string | null;
  comments: ReportComment[];
};

export type ReportItem = {
  card_id: number;
  title: string;
  summary: string;
  category: string | null;
  area_id: number | null;
  area: string | null;
  borough: string | null;
  area_type: string | null;
  last_seen: string | null;
  posts: ReportPost[];
};

export type ReportsListResponse = {
  total: number;
  reports: ReportItem[];
};
