// The briefing COMPOSER (decision D9: deterministic templates only, no AI, no
// free-text generation). A pure function that turns the proven-honest signals
// for one area into a structured, readable briefing object. It NEVER rewrites a
// headline or invents a claim — headlines and counts pass through VERBATIM; the
// only generated strings are fixed count-driven templates (overview + evidence
// lines) assembled from the stored numbers.

import {
  CONTENT_CHIPS,
  isEmerging,
  isSignalType,
  type NeighborhoodSignal,
  type SignalType
} from "./signal-types";

// How a row reads at card level: a genuine resident voice, a thin 311-dominated
// rollup, or a pure-news signal with no resident/311 to show. Computed per row
// by classifySource() from the raw counts (see the CONTRACT rule there); the
// compact map panel shows "resident" as cards and "city311" as a rollup, and
// omits "news" entirely.
export type SourceKind = "resident" | "city311" | "news";

// One rendered signal inside a section.
export type BriefingItem = {
  id: number;
  // the signal's own area — items in a borough-wide briefing span neighborhoods
  areaId: number;
  area: string;
  // stored headline, VERBATIM
  headline: string;
  trend: string;
  // trend is new/growing
  emerging: boolean;
  // count-driven evidence line, zero parts omitted (e.g.
  // "5 resident posts · 32 city complaints · 5 community stories"); "" if none
  evidenceLine: string;
  signalType: string;
  category: string;
  score: number;
  // raw counts carried through so the compact panel can classify + sort by voice
  communityPosts: number;
  reports311: number;
  newsItems: number;
  approvedCards: number;
  // redaction-safe aggregate evidence, shown VERBATIM (each defaults to [])
  topComplaintTypes: string[];
  // cluster-member display titles — pooled from posts AND news, so an entry MAY
  // be a news headline; only safe to attribute to a resident when newsItems === 0
  topTitles: string[];
  // computed voice vs. 311-rollup classification (see classifySource)
  sourceKind: SourceKind;
};

export type BriefingSection = {
  key: SignalType;
  label: string;
  description: string;
  accent: string;
  items: BriefingItem[];
};

export type NeighborhoodBriefing = {
  areaId: number | null;
  areaName: string;
  borough: string | null;
  windowDays: number;
  totalSignals: number;
  emergingCount: number;
  // count-only overview line (never a synthesized claim)
  overview: string;
  // non-empty sections in the fixed content order
  sections: BriefingSection[];
  isEmpty: boolean;
};

function plural(count: number, singular: string, pluralForm?: string): string {
  const word = count === 1 ? singular : pluralForm ?? `${singular}s`;
  return `${count} ${word}`;
}

// Evidence line from the stored counts only — omit any zero part. Resident
// posts and community stories are resident voice; 311 is city complaints; news
// is local articles. Order keeps voice first, then official, then coverage.
export function buildEvidenceLine(signal: NeighborhoodSignal): string {
  const parts: string[] = [];
  if (signal.community_posts > 0) {
    parts.push(plural(signal.community_posts, "resident post"));
  }
  if (signal.approved_cards > 0) {
    parts.push(plural(signal.approved_cards, "community story", "community stories"));
  }
  if (signal.reports_311 > 0) {
    parts.push(plural(signal.reports_311, "city complaint"));
  }
  if (signal.news_items > 0) {
    parts.push(plural(signal.news_items, "news article"));
  }
  return parts.join(" · ");
}

// Grammatical list of section labels: up to three named, then "and N more
// categories" so the overview stays tight without ever inflating the count.
function joinLabels(labels: string[], maxNamed = 3): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length <= maxNamed) {
    return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  }
  const named = labels.slice(0, maxNamed).join(", ");
  const rest = labels.length - maxNamed;
  return `${named}, and ${plural(rest, "more category", "more categories")}`;
}

function buildOverview(
  areaName: string,
  total: number,
  sections: BriefingSection[],
  emergingCount: number
): string {
  if (total === 0) {
    return `It's been a quiet week in ${areaName} — nothing notable has come up yet.`;
  }
  const typeList = joinLabels(sections.map((section) => section.label.toLowerCase()));
  let line = `${areaName} has ${plural(total, "active civic signal")} this week, spanning ${typeList}.`;
  if (emergingCount > 0) {
    const verb = emergingCount === 1 ? "is" : "are";
    line += ` ${plural(emergingCount, "signal")} ${verb} new or growing.`;
  }
  return line;
}

// CONTRACT classification (verbatim thresholds — a reviewer can check these
// against the shared contract), evaluated IN ORDER:
//   1. "resident" if  community_posts >= 2  OR  approved_cards >= 1
//                  (a genuine resident voice or a vetted community story)
//   2. "city311"  else if reports_311 >= 1 AND community_posts <= 1 AND approved_cards === 0
//                  (311-dominated, thin/no voice — the "1 post vs 182
//                   complaints" rows land HERE)
//   3. "resident" else if community_posts >= 1
//                  (a lone resident post, not 311-dominated — still a real voice)
//   4. "news"     otherwise
//                  (no resident posts, no stories, no 311 — a pure-news signal)
export function classifySource(signal: NeighborhoodSignal): SourceKind {
  // 1. a genuine resident voice, or a vetted community story
  if (signal.community_posts >= 2 || signal.approved_cards >= 1) {
    return "resident";
  }
  // 2. 311-dominated with thin/no voice — the "1 post vs 182 complaints" rows
  if (
    signal.reports_311 >= 1 &&
    signal.community_posts <= 1 &&
    signal.approved_cards === 0
  ) {
    return "city311";
  }
  // 3. a lone resident post, not 311-dominated — still a real voice
  if (signal.community_posts >= 1) {
    return "resident";
  }
  // 4. no resident posts, no stories, no 311 — a pure-news signal
  return "news";
}

function toItem(signal: NeighborhoodSignal): BriefingItem {
  return {
    id: signal.id,
    areaId: signal.area_id,
    area: signal.area,
    headline: signal.headline,
    trend: signal.trend,
    emerging: isEmerging(signal.trend),
    evidenceLine: buildEvidenceLine(signal),
    signalType: signal.signal_type,
    category: signal.category,
    score: signal.score,
    communityPosts: signal.community_posts,
    reports311: signal.reports_311,
    newsItems: signal.news_items,
    approvedCards: signal.approved_cards,
    topComplaintTypes: signal.top_complaint_types ?? [],
    topTitles: signal.top_titles ?? [],
    sourceKind: classifySource(signal)
  };
}

// Compose a per-area briefing. Input: the signals for ONE area (in any order)
// plus a display name. Output: a structured briefing — sections in the fixed
// content order, each item highest-score first. Only recognized signal types
// are shown, and the overview count matches exactly what the sections render.
export function composeBriefing(
  signals: NeighborhoodSignal[],
  areaName: string
): NeighborhoodBriefing {
  const name = areaName.trim() || "this neighborhood";
  const known = (signals ?? []).filter((signal) => isSignalType(signal.signal_type));

  const byType = new Map<string, NeighborhoodSignal[]>();
  for (const signal of known) {
    const bucket = byType.get(signal.signal_type);
    if (bucket) {
      bucket.push(signal);
    } else {
      byType.set(signal.signal_type, [signal]);
    }
  }

  const sections: BriefingSection[] = CONTENT_CHIPS.map((chip) => {
    const group = (byType.get(chip.key) ?? [])
      .slice()
      .sort((a, b) => b.score - a.score);
    return {
      key: chip.key as SignalType,
      label: chip.label,
      description: chip.description,
      accent: chip.accent,
      items: group.map(toItem)
    };
  }).filter((section) => section.items.length > 0);

  const total = known.length;
  const emergingCount = known.filter((signal) => isEmerging(signal.trend)).length;

  return {
    areaId: known[0]?.area_id ?? null,
    areaName: name,
    borough: known[0]?.borough ?? null,
    windowDays: known[0]?.window_days ?? 7,
    totalSignals: total,
    emergingCount,
    overview: buildOverview(name, total, sections, emergingCount),
    sections,
    isEmpty: total === 0
  };
}
