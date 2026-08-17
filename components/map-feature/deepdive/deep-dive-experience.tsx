"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { BoroughNeighborhoodsResponse } from "@/lib/map-feature/api";
import type { NeighborhoodRow } from "@/lib/map-feature/borough-overview";
import { SEVERITY_ORDER, type SeverityBucket } from "@/lib/map-feature/map/severity";
import { NeighborhoodChoroplethMap } from "../map/neighborhood-choropleth-map";
import { DeepDiveFilterRow } from "./filter-row";
import { NeighborhoodList } from "./neighborhood-list";
import { SelectedNeighborhoodCard } from "./selected-card";
import { SeverityLegend } from "./severity-legend";

type Props = {
  borough: string;
  boroughGeoJson: unknown;
  polygons: unknown;
  initialTimeWindow: string;
  initialIssueType: string;
  initialData: BoroughNeighborhoodsResponse | null;
};

function key(timeWindow: string, issueType: string): string {
  return `${timeWindow}|${issueType}`;
}

function emptyCounts(): Record<SeverityBucket, number> {
  return { high: 0, medium: 0, low: 0, info: 0 };
}

/**
 * Client orchestrator for the View 3 deep-dive: cluster map + ranked
 * neighborhood list + issue/time/severity filters. Data is loaded (and cached
 * per time-window/issue-type) through the same-origin /api/map/neighborhoods
 * route so the backend URL stays server-side.
 */
export function DeepDiveExperience({
  borough,
  boroughGeoJson,
  polygons,
  initialTimeWindow,
  initialIssueType,
  initialData
}: Props) {
  const [timeWindow, setTimeWindow] = useState(initialTimeWindow);
  const [issueType, setIssueType] = useState(initialIssueType);
  const [data, setData] = useState<BoroughNeighborhoodsResponse | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<SeverityBucket>>(() => new Set(SEVERITY_ORDER));
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [hoveredAreaId, setHoveredAreaId] = useState<number | null>(null);
  const selectedAreaIdRef = useRef(selectedAreaId);

  useLayoutEffect(() => {
    selectedAreaIdRef.current = selectedAreaId;
  }, [selectedAreaId]);

  const cacheRef = useRef<Map<string, BoroughNeighborhoodsResponse>>(new Map());
  const reqRef = useRef(0);

  // Seed server data before the loader effect reads the cache. Keeping this out
  // of render avoids mutating an imperative cache while React is reconciling.
  useEffect(() => {
    if (initialData) {
      const initialKey = key(initialTimeWindow, initialIssueType);
      if (!cacheRef.current.has(initialKey)) {
        cacheRef.current.set(initialKey, initialData);
      }
    }
  }, [initialData, initialIssueType, initialTimeWindow]);

  // Load neighborhoods whenever the time window or issue type changes.
  useEffect(() => {
    const cacheKey = key(timeWindow, issueType);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }
    const requestId = ++reqRef.current;
    setLoading(true);
    const params = new URLSearchParams({ borough, time_window: timeWindow, issue_type: issueType });
    fetch(`/api/map/neighborhoods?${params.toString()}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: BoroughNeighborhoodsResponse | null) => {
        if (requestId !== reqRef.current) {
          return;
        }
        if (payload) {
          cacheRef.current.set(cacheKey, payload);
          setData(payload);
        }
        setLoading(false);
      })
      .catch(() => {
        if (requestId === reqRef.current) {
          setLoading(false);
        }
      });
  }, [borough, timeWindow, issueType]);

  // Keep the URL shareable without a server navigation.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("time_window", timeWindow);
    params.set("issue_type", issueType);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [timeWindow, issueType]);

  const allRows = useMemo<NeighborhoodRow[]>(() => data?.neighborhoods ?? [], [data]);
  const totalCount = data?.total_count ?? allRows.length;

  // Auto-select the top hotspot so the map opens with an overlay (never empty)
  // and the click-to-detail interaction is demonstrated. Re-runs when the data
  // changes (issue/time) only if the current selection is no longer present.
  useEffect(() => {
    if (allRows.length === 0) {
      return;
    }
    const current = selectedAreaIdRef.current;
    const stillPresent = current !== null && allRows.some((row) => row.area_id === current);
    if (!stillPresent) {
      // This intentionally reconciles selection ownership when a new data set
      // no longer contains the previous area; deriving it would revive stale
      // selections when users switch filters back.
      setSelectedAreaId(allRows[0].area_id);
    }
  }, [allRows]);

  const selectedRow = selectedAreaId === null ? null : allRows.find((r) => r.area_id === selectedAreaId) ?? null;
  const selectedRank = selectedRow ? allRows.findIndex((r) => r.area_id === selectedRow.area_id) + 1 : 0;

  // Search filter first, so the legend counts reflect the current search.
  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return allRows;
    }
    return allRows.filter((row) => row.name.toLowerCase().includes(needle));
  }, [allRows, query]);

  const counts = useMemo(() => {
    const result = emptyCounts();
    for (const row of searched) {
      result[row.severity] += 1;
    }
    return result;
  }, [searched]);

  const visible = useMemo(
    () => searched.filter((row) => active.has(row.severity)),
    [searched, active]
  );

  // area_id → severity / center for ALL neighborhoods. The map shows a
  // neighborhood's color only when it's hovered or selected, so these cover the
  // whole borough regardless of the list filter.
  const severityByArea = useMemo(() => {
    const result: Record<number, SeverityBucket> = {};
    for (const row of allRows) {
      result[row.area_id] = row.severity;
    }
    return result;
  }, [allRows]);

  const centerByArea = useMemo(() => {
    const result: Record<number, [number, number]> = {};
    for (const row of allRows) {
      if (row.center) {
        result[row.area_id] = row.center;
      }
    }
    return result;
  }, [allRows]);

  const metaByArea = useMemo(() => {
    const result: Record<number, { name: string; total: number }> = {};
    for (const row of allRows) {
      result[row.area_id] = { name: row.name, total: row.total };
    }
    return result;
  }, [allRows]);

  const toggleSeverity = useCallback((severity: SeverityBucket) => {
    setActive((previous) => {
      const next = new Set(previous);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      // Never allow an all-off state (nothing on the map) — reset to all.
      return next.size === 0 ? new Set(SEVERITY_ORDER) : next;
    });
  }, []);

  return (
    <div className="cs-overview">
      <NeighborhoodChoroplethMap
        boroughGeoJson={boroughGeoJson}
        borough={borough}
        polygons={polygons}
        severityByArea={severityByArea}
        centerByArea={centerByArea}
        metaByArea={metaByArea}
        selectedAreaId={selectedAreaId}
        hoveredAreaId={hoveredAreaId}
        onSelect={setSelectedAreaId}
        onHover={setHoveredAreaId}
      />

      <Link className="cs-map-back" href={`/map?borough=${encodeURIComponent(borough)}`}>
        ← Boroughs
      </Link>

      {loading ? (
        <div className="cs-map-loading" aria-live="polite">
          Loading…
        </div>
      ) : null}

      <aside
        className={`cs-insights cs-dd-panel${loading ? " is-loading" : ""}`}
        aria-label={`${borough} neighborhood deep-dive`}
        aria-busy={loading}
      >
        <header className="cs-insights-head">
          <div className="cs-insights-title">
            <h1 className="cs-insights-title-text">{borough}, NY</h1>
            <span className="cs-badge">Deep-dive</span>
          </div>
          <p className="cs-insights-sub">Neighborhood severity and report volume</p>
        </header>

        <DeepDiveFilterRow
          issueType={issueType}
          timeWindow={timeWindow}
          topIssues={data?.top_issues ?? []}
          onIssueTypeChange={setIssueType}
          onTimeWindowChange={setTimeWindow}
        />

        <input
          className="cs-dd-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search neighborhoods…"
          aria-label="Search neighborhoods"
        />

        <SeverityLegend active={active} counts={counts} onToggle={toggleSeverity} />

        {selectedRow ? (
          <SelectedNeighborhoodCard row={selectedRow} rank={selectedRank} totalCount={totalCount} />
        ) : null}

        <div className="cs-dd-count">
          Showing <strong>{visible.length}</strong> of {totalCount} neighborhoods
        </div>

        <NeighborhoodList
          rows={visible}
          selectedAreaId={selectedAreaId}
          hoveredAreaId={hoveredAreaId}
          onSelect={setSelectedAreaId}
          onHover={setHoveredAreaId}
        />
      </aside>
    </div>
  );
}
