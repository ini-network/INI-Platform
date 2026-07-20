"use client";

import { useEffect, useRef } from "react";

import type { NeighborhoodRow } from "../../lib/borough-overview";
import { SEVERITY_COLORS, SEVERITY_LABELS } from "../../lib/map/severity";

function formatNum(value: number): string {
  return value.toLocaleString("en-US");
}

export function NeighborhoodList({
  rows,
  selectedAreaId,
  hoveredAreaId,
  onSelect,
  onHover
}: {
  rows: NeighborhoodRow[];
  selectedAreaId: number | null;
  hoveredAreaId: number | null;
  onSelect: (areaId: number) => void;
  onHover: (areaId: number | null) => void;
}) {
  const selectedRef = useRef<HTMLLIElement | null>(null);

  // Keep the selected row in view when selection is driven from the map.
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedAreaId]);

  if (rows.length === 0) {
    return <p className="cs-empty">No neighborhoods match these filters.</p>;
  }

  return (
    <ol className="cs-dd-list">
      {rows.map((row, index) => {
        const selected = row.area_id === selectedAreaId;
        const hovered = row.area_id === hoveredAreaId;
        return (
          <li key={row.area_id} ref={selected ? selectedRef : null}>
            <button
              type="button"
              className={`cs-dd-item${selected ? " is-selected" : ""}${hovered ? " is-hovered" : ""}`}
              onClick={() => onSelect(row.area_id)}
              onMouseEnter={() => onHover(row.area_id)}
              onMouseLeave={() => onHover(null)}
            >
              <span className="cs-dd-rank">{index + 1}</span>
              <span
                className="cs-dd-dot"
                style={{ background: SEVERITY_COLORS[row.severity] }}
                title={SEVERITY_LABELS[row.severity]}
              />
              <span className="cs-dd-info">
                <span className="cs-dd-name">
                  {row.name}
                  {(row.community ?? 0) > 0 ? (
                    <span className="cs-comm-badge" title={`${row.community} community reports`}>
                      Community
                    </span>
                  ) : null}
                </span>
                <span className="cs-dd-sub">
                  {formatNum(row.total)} reports · {row.trend_label || SEVERITY_LABELS[row.severity]}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
