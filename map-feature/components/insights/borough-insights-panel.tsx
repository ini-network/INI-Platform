"use client";

import Link from "next/link";

import type { BoroughOverview } from "../../lib/borough-overview";
import { StatBlock } from "./stat-block";
import { TopNewsList } from "./top-news-list";

const TIME_WINDOWS = [
  { id: "24h", label: "Last 24 hours" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "6m", label: "Last 6 months" }
];

function formatNum(value: number): string {
  return value.toLocaleString("en-US");
}

export function BoroughInsightsPanel({
  overview,
  timeWindow,
  issueType,
  loading = false,
  onTimeWindowChange,
  onIssueTypeChange
}: {
  overview: BoroughOverview;
  timeWindow: string;
  issueType: string;
  loading?: boolean;
  onTimeWindowChange: (timeWindow: string) => void;
  onIssueTypeChange: (issueType: string) => void;
}) {
  const topIssues = overview.top_issues ?? [];
  const basis = overview.pct_basis ?? "the prior period";
  const rounded = overview.pct_change === null ? null : Math.round(overview.pct_change);
  const tone = rounded === null ? "flat" : rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  const pctLabel =
    rounded === null
      ? "No prior-period data"
      : rounded > 0
        ? `Up ${rounded}% from ${basis}`
        : rounded < 0
          ? `Down ${Math.abs(rounded)}% from ${basis}`
          : `Level with ${basis}`;

  return (
    <aside
      className={`cs-insights${loading ? " is-loading" : ""}`}
      aria-label={`${overview.borough} insights`}
      aria-busy={loading}
    >
      <header className="cs-insights-head">
        <div className="cs-insights-title">
          <h1 className="cs-insights-title-text">{overview.borough}, NY</h1>
          <span className="cs-badge">Borough</span>
        </div>
        <p className="cs-insights-sub">Community insights and activity overview</p>
      </header>

      <section className="cs-total-card">
        <div className="cs-total-row">
          <span className="cs-total-value">{formatNum(overview.total)}</span>
          <select
            className="cs-window-select"
            value={timeWindow}
            onChange={(event) => onTimeWindowChange(event.target.value)}
            aria-label="Time range"
          >
            {TIME_WINDOWS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="cs-total-meta">
          <span className="cs-total-label">Total Reports</span>
          <span className={`cs-delta is-${tone}`}>{pctLabel}</span>
        </div>
      </section>

      <section className="cs-substats">
        <StatBlock value={formatNum(overview.source_breakdown.official_311)} label="From NYC 311" />
        <StatBlock value={formatNum(overview.source_breakdown.community)} label="Community" />
      </section>

      {topIssues.length > 0 ? (
        <section className="cs-issues-section">
          <h2 className="cs-section-label">Top issues reported</h2>
          <div className="cs-issue-chips" role="group" aria-label="Filter by top issue">
            <button
              type="button"
              className={`cs-issue-chip${issueType === "all" ? " is-active" : ""}`}
              onClick={() => onIssueTypeChange("all")}
            >
              All issues
            </button>
            {topIssues.map((issue) => (
              <button
                key={issue.issue_type}
                type="button"
                className={`cs-issue-chip${issueType === issue.issue_type ? " is-active" : ""}`}
                onClick={() => onIssueTypeChange(issue.issue_type)}
                title={`${formatNum(issue.total)} reports${
                  issue.community > 0 ? ` · ${issue.community} community` : ""
                }`}
              >
                {issue.community > 0 ? <span className="cs-issue-comm" aria-hidden="true" /> : null}
                {issue.issue_label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <Link
        className="cs-explore-link"
        href={`/map/${encodeURIComponent(overview.borough)}?time_window=${encodeURIComponent(timeWindow)}&issue_type=${encodeURIComponent(issueType)}`}
      >
        Explore {formatNum(overview.total_neighborhoods)} neighborhoods
        <span aria-hidden="true">→</span>
      </Link>

      <section className="cs-news">
        <div className="cs-news-head">
          <h2>Today&apos;s News</h2>
        </div>
        <TopNewsList items={overview.top_news} />
      </section>
    </aside>
  );
}
