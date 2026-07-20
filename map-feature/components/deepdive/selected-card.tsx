"use client";

import type { NeighborhoodRow } from "../../lib/borough-overview";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "../../lib/map/severity";

function formatNum(value: number): string {
  return value.toLocaleString("en-US");
}

// Compact detail card for the selected neighborhood — kept short so the ranked
// list keeps most of the panel height.
export function SelectedNeighborhoodCard({
  row,
  rank,
  totalCount
}: {
  row: NeighborhoodRow;
  rank: number;
  totalCount: number;
}) {
  const community = row.community ?? 0;
  return (
    <section className="cs-selected-card">
      <div className="cs-selected-top">
        <span className="cs-dd-dot" style={{ background: SEVERITY_COLORS[row.severity] }} />
        <strong className="cs-selected-name">
          {row.name}
          {community > 0 ? (
            <span className="cs-comm-badge" title={`${community} community reports`}>
              Community
            </span>
          ) : null}
        </strong>
        <span className="cs-selected-rank">#{rank} of {totalCount}</span>
      </div>
      <div className="cs-selected-line">
        <span className="cs-selected-value">{formatNum(row.total)}</span>
        <span className="cs-selected-unit">reports</span>
        <span className="cs-selected-trend">
          {row.trend_label || SEVERITY_LABELS[row.severity]}
        </span>
      </div>
      <div className="cs-selected-meta">
        NYC 311 {formatNum(row.official)} · Community {community > 0 ? formatNum(community) : "—"}
      </div>
    </section>
  );
}
