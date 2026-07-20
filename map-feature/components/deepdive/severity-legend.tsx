"use client";

import {
  SEVERITY_COLORS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
  type SeverityBucket
} from "../../lib/map/severity";

// Doubles as the map legend and the severity filter: clicking a level toggles
// whether neighborhoods of that severity are shown.
export function SeverityLegend({
  active,
  counts,
  onToggle
}: {
  active: Set<SeverityBucket>;
  counts: Record<SeverityBucket, number>;
  onToggle: (severity: SeverityBucket) => void;
}) {
  return (
    <div className="cs-legend" role="group" aria-label="Filter by severity">
      {SEVERITY_ORDER.map((severity) => {
        const on = active.has(severity);
        return (
          <button
            key={severity}
            type="button"
            className={`cs-legend-chip${on ? "" : " is-off"}`}
            onClick={() => onToggle(severity)}
            aria-pressed={on}
          >
            <span className="cs-legend-dot" style={{ background: SEVERITY_COLORS[severity] }} />
            {SEVERITY_LABELS[severity]}
            <span className="cs-legend-count">{counts[severity] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
