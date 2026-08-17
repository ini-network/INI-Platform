"use client";

import { useEffect, useState } from "react";

import {
  CivicApiError,
  getCouncilEvents,
  getCouncilRepresentative
} from "@/lib/map-feature/civic-api";
import { formatPersonName } from "@/lib/map-feature/civic-display";
import type {
  CouncilDistrictRepresentative,
  CouncilEventSummary
} from "@/lib/map-feature/civic-types";
import styles from "./council-district-card.module.css";

type CardState =
  | { status: "loading"; districtId: number }
  | { status: "hidden"; districtId: number }
  | {
      status: "ready";
      districtId: number;
      representative: CouncilDistrictRepresentative;
      events: CouncilEventSummary[] | null;
    }
  | { status: "error"; districtId: number };

function dateLabel(value: string): string {
  const date = new Date(`${value}T12:00:00-04:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York"
  }).format(date);
}

function timeLabel(event: CouncilEventSummary): string {
  if (event.time_tbd || !event.start_time) return "Time to be announced";
  const [hour = "0", minute = "00"] = event.start_time.split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function representativeInitials(fullName: string): string {
  return (formatPersonName(fullName) ?? fullName)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M8 13h3v3H8z" />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 12h17M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 6h16v12H4z" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.1 4.5 10 8.7 7.6 10a14.3 14.3 0 0 0 6.4 6.4l1.3-2.4 4.2 1.9-.7 3a2 2 0 0 1-2 1.6C9.5 20.5 3.5 14.5 3.5 7.2a2 2 0 0 1 1.6-2Z" />
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

function CouncilEvents({ events }: { events: CouncilEventSummary[] | null }) {
  return (
    <div className={styles.events}>
      <div className={styles.eventsHeading}>
        <span className={styles.eventsIcon} aria-hidden="true">
          <CalendarIcon />
        </span>
        <div>
          <h3>Upcoming NYC Council meetings</h3>
          <p className={styles.eventsNote}>
            Citywide schedule; meetings are not matched to a district.
          </p>
        </div>
      </div>
      {events === null ? (
        <p className={styles.empty} role="status">
          The meeting schedule is temporarily unavailable.
        </p>
      ) : events.length > 0 ? (
        <ul>
          {events.map((event) => (
            <li key={event.event_id}>
              <div>
                <strong>{event.title}</strong>
                <span>
                  {dateLabel(event.event_date)} · {timeLabel(event)} · {event.body.name}
                </span>
              </div>
              {event.details_url || event.agenda_url ? (
                <a
                  href={event.details_url ?? event.agenda_url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open official details for ${event.title}`}
                >
                  <ArrowUpRightIcon />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No meetings are listed in the next 30 days.</p>
      )}
    </div>
  );
}

export function CouncilMeetingsCard({ districtName }: { districtName: string }) {
  const [events, setEvents] = useState<CouncilEventSummary[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getCouncilEvents({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setEvents(result.events);
      })
      .catch(() => {
        if (!controller.signal.aborted) setEvents(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <section
      className={`${styles.card} ${styles.meetingsCard}`}
      aria-label={`Citywide Council meetings shown with ${districtName}`}
      aria-busy={!loaded}
    >
      <a
        className={styles.calendarLink}
        href="/api/civic/council/calendar.ics"
        aria-label="Add the citywide NYC Council meetings calendar"
      >
        <CalendarIcon />
        <span>Add citywide Council calendar</span>
      </a>
      {loaded ? (
        <CouncilEvents events={events} />
      ) : (
        <p className={styles.loading}>Loading Council meetings…</p>
      )}
    </section>
  );
}

export function CouncilDistrictCard({
  districtId,
  districtName
}: {
  districtId: number;
  districtName: string;
}) {
  const [state, setState] = useState<CardState>({ status: "loading", districtId });

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      getCouncilRepresentative(districtId, controller.signal),
      getCouncilEvents({ signal: controller.signal })
    ]).then(([representativeResult, eventsResult]) => {
      if (controller.signal.aborted) return;
      if (representativeResult.status === "rejected") {
        if (
          representativeResult.reason instanceof CivicApiError &&
          representativeResult.reason.status === 404
        ) {
          setState({ status: "hidden", districtId });
        } else {
          setState({ status: "error", districtId });
        }
        return;
      }
      setState({
        status: "ready",
        districtId,
        representative: representativeResult.value,
        events: eventsResult.status === "fulfilled" ? eventsResult.value.events : null
      });
    });
    return () => controller.abort();
  }, [districtId]);

  if (state.districtId !== districtId) {
    return (
      <section className={styles.card} aria-label="Loading City Council information" aria-busy="true">
        <p className={styles.loading}>Loading City Council information…</p>
      </section>
    );
  }
  if (state.status === "hidden") return null;
  if (state.status === "loading") {
    return (
      <section className={styles.card} aria-label="Loading City Council information" aria-busy="true">
        <p className={styles.loading}>Loading City Council information…</p>
      </section>
    );
  }
  if (state.status === "error") {
    return (
      <section className={styles.card} role="status">
        <p className={styles.loading}>City Council information is temporarily unavailable.</p>
      </section>
    );
  }

  const representative = state.representative.representative;
  return (
    <section className={styles.card} aria-label={`City Council information for ${districtName}`}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <span className={styles.headingIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 20h16M6 17h12M7 8h10v9H7zM5 8l7-4 7 4M10 11v3m4-3v3" />
            </svg>
          </span>
          <div>
            <p className={styles.eyebrow}>City Council</p>
            <h2 className={styles.title}>Your City Council representative</h2>
          </div>
        </div>
        <a
          className={styles.calendarLink}
          href="/api/civic/council/calendar.ics"
          aria-label="Add the citywide NYC Council meetings calendar"
        >
          <CalendarIcon />
          <span>Add citywide Council calendar</span>
        </a>
      </header>

      <div className={styles.representative}>
        {state.representative.occupant_status === "vacant" || !representative ? (
          <div className={styles.vacantState}>
            <span className={styles.avatar} aria-hidden="true">
              NYC
            </span>
            <div>
              <strong>Seat currently vacant</strong>
              <span>The official Council record does not list a current representative.</span>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.person}>
              <span className={styles.avatar} aria-hidden="true">
                {representativeInitials(representative.full_name)}
              </span>
              <div className={styles.personText}>
                <strong>{formatPersonName(representative.full_name) ?? representative.full_name}</strong>
                <span>
                  {state.representative.office_title ?? "New York City Council Member"}
                </span>
              </div>
            </div>
            <div className={styles.contacts}>
              {representative.official_url ? (
                <a href={representative.official_url} target="_blank" rel="noreferrer">
                  <WebsiteIcon />
                  <span>Official page</span>
                </a>
              ) : null}
              {representative.public_email ? (
                <a href={`mailto:${representative.public_email}`}>
                  <MailIcon />
                  <span>Email</span>
                </a>
              ) : null}
              {representative.public_phone ? (
                <a href={`tel:${representative.public_phone}`}>
                  <PhoneIcon />
                  <span>Call</span>
                </a>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className={styles.events}>
        <div className={styles.eventsHeading}>
          <span className={styles.eventsIcon} aria-hidden="true">
            <CalendarIcon />
          </span>
          <div>
            <h3>Upcoming NYC Council meetings</h3>
            <p className={styles.eventsNote}>
              Citywide schedule; meetings are not matched to a district.
            </p>
          </div>
        </div>
        {state.events === null ? (
          <p className={styles.empty} role="status">
            The meeting schedule is temporarily unavailable.
          </p>
        ) : state.events.length > 0 ? (
          <ul>
            {state.events.map((event) => (
              <li key={event.event_id}>
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {dateLabel(event.event_date)} · {timeLabel(event)} · {event.body.name}
                  </span>
                </div>
                {event.details_url || event.agenda_url ? (
                  <a
                    href={event.details_url ?? event.agenda_url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open official details for ${event.title}`}
                  >
                    <ArrowUpRightIcon />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No meetings are listed in the next 30 days.</p>
        )}
      </div>
    </section>
  );
}
