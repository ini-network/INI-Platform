"use client";

import { useEffect, useState } from "react";

import { CivicApiError, getElection2026Contests } from "@/lib/map-feature/civic-api";
import { formatCandidateName } from "@/lib/map-feature/civic-display";
import type { Election2026Response } from "@/lib/map-feature/civic-types";
import styles from "./election-context-card.module.css";

export type ElectionDistrictKeys = {
  us_house: string;
  nys_senate: string;
  nys_assembly: string;
};

function BallotIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 4h10v4H7zM5 8h14l1 3v9H4v-9l1-3Z" />
      <path d="M8 13h8M8 16h5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m7 12 3 3 7-7" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m8 10 4 4 4-4" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export function ElectionContextCard({
  districtKeys,
  embedded = false
}: {
  districtKeys: ElectionDistrictKeys;
  embedded?: boolean;
}) {
  const { us_house: usHouse, nys_senate: stateSenate, nys_assembly: stateAssembly } =
    districtKeys;
  const requestKey = `${usHouse}|${stateSenate}|${stateAssembly}`;
  const [loaded, setLoaded] = useState<{
    requestKey: string;
    election: Election2026Response;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getElection2026Contests(
      {
        us_house: usHouse,
        nys_senate: stateSenate,
        nys_assembly: stateAssembly
      },
      controller.signal
    )
      .then((result) => {
        if (!controller.signal.aborted) setLoaded({ requestKey, election: result });
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          !(error instanceof CivicApiError && error.status === 404)
        ) {
          // Election context is additive. A failed or not-yet-released response
          // stays invisible and cannot interfere with the established map flow.
          setLoaded(null);
        }
      });
    return () => controller.abort();
  }, [requestKey, stateAssembly, stateSenate, usHouse]);

  const election = loaded?.requestKey === requestKey ? loaded.election : null;

  if (!election) return null;

  return (
    <section
      className={`${styles.card}${embedded ? ` ${styles.embedded}` : ""}`}
      aria-label="Key 2026 election races near this address"
    >
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.headingIcon} aria-hidden="true">
            <BallotIcon />
          </span>
          <div>
            <p className={styles.eyebrow}>November 3, 2026 general election</p>
            <h2>Key races near this address</h2>
          </div>
        </div>
        <span className={styles.certified} title="Verified against certified ballot records">
          <CheckIcon />
          Verified ballot data
        </span>
      </header>

      <div className={styles.notice}>
        <InfoIcon />
        <p>{election.coverage_notice}</p>
      </div>
      <div className={styles.contests}>
        {election.contests.map((contest) => (
          <details key={contest.contest_key} className={styles.contest}>
            <summary>
              <span>{contest.title}</span>
              <span className={styles.summaryIcon}>
                <ChevronIcon />
              </span>
            </summary>
            <ul>
              {contest.candidacies.map((candidacy) => (
                <li key={candidacy.candidacy_key}>
                  <span>{formatCandidateName(candidacy)}</span>
                  <small>
                    {candidacy.ballot_lines.map((line) => line.party_name).join(" · ")}
                  </small>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <p className={styles.residenceNotice}>{election.voting_residence_notice}</p>
      <a
        className={styles.officialLink}
        href={election.official_voter_tools.poll_site_and_sample_ballot_url}
        target="_blank"
        rel="noreferrer"
      >
        <span>Check your official poll site and sample ballot</span>
        <ArrowUpRightIcon />
      </a>
    </section>
  );
}
