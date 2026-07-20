"use client";

import type { BoroughTopIssue } from "../../lib/borough-overview";

const TIME_WINDOWS = [
  { id: "24h", label: "Last 24 hours" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "6m", label: "Last 6 months" }
];

// Issue filter = the borough's top issues (community-first), as quick chips,
// plus the time window. A chip with community reports gets a dot so it's clear
// why it ranks where it does.
export function DeepDiveFilterRow({
  issueType,
  timeWindow,
  topIssues,
  onIssueTypeChange,
  onTimeWindowChange
}: {
  issueType: string;
  timeWindow: string;
  topIssues?: BoroughTopIssue[];
  onIssueTypeChange: (value: string) => void;
  onTimeWindowChange: (value: string) => void;
}) {
  return (
    <div className="cs-dd-filters">
      <div className="cs-issue-chips" role="group" aria-label="Top issues reported">
        <button
          type="button"
          className={`cs-issue-chip${issueType === "all" ? " is-active" : ""}`}
          onClick={() => onIssueTypeChange("all")}
        >
          All issues
        </button>
        {(topIssues ?? []).map((issue) => (
          <button
            key={issue.issue_type}
            type="button"
            className={`cs-issue-chip${issueType === issue.issue_type ? " is-active" : ""}`}
            onClick={() => onIssueTypeChange(issue.issue_type)}
            title={`${issue.total.toLocaleString("en-US")} reports${
              issue.community > 0 ? ` · ${issue.community} community` : ""
            }`}
          >
            {issue.community > 0 ? <span className="cs-issue-comm" aria-hidden="true" /> : null}
            {issue.issue_label}
          </button>
        ))}
      </div>
      <label className="cs-dd-field cs-dd-time">
        <span>Time</span>
        <select value={timeWindow} onChange={(event) => onTimeWindowChange(event.target.value)}>
          {TIME_WINDOWS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
