// Types for the in-app news reader + /news list. Mirrors the API's
// NewsListItem / NewsArticleResponse (apps/api .../schemas.py).

export type NewsListItem = {
  id: number;
  title: string;
  summary: string | null;
  image_url: string | null;
  source_url: string | null;
  outlet: string | null;
  published_at: string | null;
  borough: string | null;
  category: string | null;
  category_label: string | null;
};

export type NewsListResponse = {
  total: number;
  items: NewsListItem[];
};

export type NewsArticle = {
  id: number;
  title: string;
  summary: string | null;
  ai_summary: string | null;
  image_url: string | null;
  source_url: string | null;
  outlet: string | null;
  source_name: string | null;
  published_at: string | null;
  borough: string | null;
  category: string | null;
  category_label: string | null;
  verified: boolean;
  related: NewsListItem[];
};

// Deterministic date label (no Date.now()) so server and client render the same
// string and hydration doesn't drift.
export function formatNewsDate(
  iso: string | null,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  if (!iso) return "";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}
