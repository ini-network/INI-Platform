// Types + display metadata for the per-neighborhood civic SIGNALS surfaced on
// the map and the shareable report page. Mirrors the API contract for
// GET /pulse/signals and GET /pulse/signals/{id} (apps/api). The stored
// signal_type is one of the six slugs below; "Emerging Issues" is NOT a stored
// type — it is any signal whose trend is "new" or "growing" (isEmerging).
//
// HONESTY INVARIANT: headlines and counts are proven-truthful and must be used
// VERBATIM everywhere. Nothing here synthesizes new claims from a signal.

// The six stored signal-type slugs, in the boss's content order (Emerging is a
// trend, not a slug, so it is not here).
export const SIGNAL_TYPES = [
  "community_concerns",
  "neighborhood_changes",
  "public_services",
  "safety_wellbeing",
  "community_activity",
  "local_opportunities"
] as const;

export type SignalType = (typeof SIGNAL_TYPES)[number];

// Trend values the pipeline stamps. Unknown strings are tolerated by the UI.
export type SignalTrend = "new" | "growing" | "steady" | "declining";

export function isSignalType(value: string): value is SignalType {
  return (SIGNAL_TYPES as readonly string[]).includes(value);
}

// A signal is "emerging" when its trend is new or growing — the virtual 7th
// filter chip is exactly this predicate over every stored type.
export function isEmerging(trend: string): boolean {
  return trend === "new" || trend === "growing";
}

// One row from GET /pulse/signals (list grain: area × signal_type × category).
export type NeighborhoodSignal = {
  id: number;
  area_id: number;
  area: string;
  borough: string | null;
  area_type: string;
  signal_type: string;
  category: string;
  trend: string;
  headline: string;
  community_posts: number;
  reports_311: number;
  news_items: number;
  approved_cards: number;
  // Redaction-safe aggregate evidence the API now always sends (default [] when
  // the stored evidence lacks them): the top 311 complaint types, and the
  // display titles pooled from this signal's cluster members — posts AND news,
  // so an entry MAY be a news headline; only safe to attribute to a resident
  // when news_items === 0. Shown VERBATIM.
  top_complaint_types: string[];
  top_titles: string[];
  score: number;
  window_days: number;
  window_start: string;
  window_end: string;
  generated_at: string;
};

export type NeighborhoodSignalsResponse = {
  total: number;
  signals: NeighborhoodSignal[];
};

// Resolved evidence entries from GET /pulse/signals/{id}.
export type SignalPost = {
  title: string;
  url: string;
  platform: string;
  published_at: string | null;
};

export type SignalNews = {
  title: string;
  url: string;
  outlet_domain: string;
  published_at: string | null;
};

export type SignalCard = {
  id: number;
  title: string;
};

// GET /pulse/signals/{id}: the list fields for one signal PLUS resolved evidence.
export type SignalDetail = NeighborhoodSignal & {
  posts: SignalPost[];
  news: SignalNews[];
  cards: SignalCard[];
  complaint_types: string[];
};

// Query params for the list endpoint (all optional).
export type NeighborhoodSignalParams = {
  // comma-separated subset of the six slugs
  signal_type?: string;
  borough?: string;
  area_id?: number;
  // trend IN ('new','growing')
  emerging?: boolean;
  limit?: number;
};

// --- filter chip metadata (all 7, in the boss's display order) --------------
//
// The map renders one chip per entry. "emerging" is the virtual trend filter;
// the other six map 1:1 to a stored signal_type. Accents are drawn from the
// existing calm design-system palette (var(--*)) so signals read as native.

export type SignalChipKey = "emerging" | SignalType;

export type SignalChip = {
  key: SignalChipKey;
  label: string;
  description: string;
  // A CSS custom-property reference from the design system, e.g. "var(--teal)".
  accent: string;
  // Only the virtual Emerging chip filters by trend rather than by type.
  emerging: boolean;
};

export const SIGNAL_CHIPS: SignalChip[] = [
  {
    key: "emerging",
    label: "Emerging Issues",
    description: "New or fast-growing this week",
    accent: "var(--primary)",
    emerging: true
  },
  {
    key: "community_concerns",
    label: "Community Concerns",
    description: "Housing, sanitation, and quality of life",
    accent: "var(--warn)",
    emerging: false
  },
  {
    key: "neighborhood_changes",
    label: "Neighborhood Changes",
    description: "Development, rezoning, and what's shifting",
    accent: "var(--blue)",
    emerging: false
  },
  {
    key: "public_services",
    label: "Public Services",
    description: "Streets, transit, and city services",
    accent: "var(--teal)",
    emerging: false
  },
  {
    key: "safety_wellbeing",
    label: "Safety & Wellbeing",
    description: "Environment and public health",
    accent: "var(--danger)",
    emerging: false
  },
  {
    key: "community_activity",
    label: "Community Activity",
    description: "Neighbors organizing and gathering",
    accent: "var(--success)",
    emerging: false
  },
  {
    key: "local_opportunities",
    label: "Local Opportunities",
    description: "Grants, resources, and openings",
    accent: "var(--primary-strong)",
    emerging: false
  }
];

// The six content chips (Emerging excluded) in display order — the section
// order the briefing composer walks.
export const CONTENT_CHIPS: SignalChip[] = SIGNAL_CHIPS.filter((chip) => !chip.emerging);
