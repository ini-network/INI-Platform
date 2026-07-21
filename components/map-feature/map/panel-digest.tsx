"use client";

import Link from "next/link";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { formatNewsDate, type NewsListItem, type NewsListResponse } from "@/lib/map-feature/news";
import { openNewsModal } from "@/lib/map-feature/news-modal-store";
import { markNewsRead } from "@/lib/map-feature/news-read";
import { buildEvidenceLine } from "@/lib/map-feature/signal-briefing";
import { isEmerging, type NeighborhoodSignal } from "@/lib/map-feature/signal-types";
import { TOUR_NEWS, TOUR_SIGNALS } from "@/lib/map-feature/tour-fixtures";
import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import styles from "./map-signals.module.css";

// The map panel's reading digest. Now LEVEL-AWARE (Travis, 2026-07-15): the top
// block (brief line) and the Stories link are constant, but the block beneath
// changes with how deep the reader has gone —
//   • LEVEL 1 (city / overview): the borough's local news headlines.
//   • LEVEL 2 (street / borough, no neighborhood picked): the borough's top
//     signals, resident-voice first — "browse into a neighborhood for detail".
//   • LEVEL 3 (one neighborhood selected): that area's signals as full cards.
// News is fetched ONLY at level 1 (levels 2-3 never touch the network). Honesty:
// headlines, counts and complaint types render VERBATIM from the signals; a
// resident quote (top_titles[0]) shows ONLY when the signal has news_items===0.

type NewsState = "loading" | "ready" | "error";

// A signal's resident-voice weight for the level-2 ordering: a real voice (a
// posting resident or a vetted story) sorts ahead of a 311-only rollup. Mirrors
// the classifySource idea without pulling in its 4-way return.
function hasResidentVoice(signal: NeighborhoodSignal): boolean {
  return signal.community_posts >= 1 || signal.approved_cards >= 1;
}

export const PanelDigest = memo(function PanelDigest({
  briefCount,
  briefPosts,
  activeBorough,
  areaName,
  level,
  signals,
  tourOpen
}: {
  // Number of signals in the current scope AFTER the active filter chip.
  briefCount: number;
  // Sum of those signals' stored community_posts counts.
  briefPosts: number;
  activeBorough: string;
  // The selected neighborhood's name (level 3 heading). Ignored at levels 1-2.
  areaName: string;
  // 1 = overview (city), 2 = street (borough), 3 = area (neighborhood).
  level: 1 | 2 | 3;
  // The current filtered scope signals — the SAME array that tints the map/panel.
  // Drives the level-2 top-signals list and the level-3 area cards.
  signals: NeighborhoodSignal[];
  // While the guided tour is open, level 1 shows frozen demo headlines and levels
  // 2-3 render from TOUR_SIGNALS (guaranteed-good rows); every row/link is INERT.
  tourOpen: boolean;
}) {
  const [news, setNews] = useState<NewsListItem[]>([]);
  const [state, setState] = useState<NewsState>("loading");
  // Per-borough cache so re-clicking a borough never refetches.
  const cacheRef = useRef<Map<string, NewsListItem[]>>(new Map());
  // Touch pointers get "tap … tap again" copy for the two-step neighborhood peek.
  const { isCoarse } = useFormFactor();

  useEffect(() => {
    // News only exists at the overview level — levels 2-3 never fetch it.
    if (level !== 1) {
      return;
    }
    // Tour mode: short-circuit to the frozen fixtures, no network round-trip.
    if (tourOpen) {
      setNews(TOUR_NEWS);
      setState("ready");
      return;
    }
    const borough = activeBorough;
    const cached = cacheRef.current.get(borough);
    if (cached) {
      setNews(cached);
      setState("ready");
      return;
    }
    let active = true;
    setState("loading");
    setNews([]);
    fetch(`/api/news?borough=${encodeURIComponent(borough)}&limit=5`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: NewsListResponse) => {
        if (!active) return;
        const items = data.items ?? [];
        cacheRef.current.set(borough, items);
        setNews(items);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      // Ignore a stale response when the borough switches mid-flight.
      active = false;
    };
  }, [activeBorough, level, tourOpen]);

  // The data behind levels 2-3: frozen demo rows while touring, live scope
  // signals otherwise.
  const scopeSignals = tourOpen && level !== 1 ? TOUR_SIGNALS : signals;

  // The brief line follows the same source as the cards below it: while touring
  // levels 2-3 it counts the demo rows, so the header can't read inconsistently
  // against them. Live scope uses the parent-supplied counts unchanged.
  const displayCount =
    tourOpen && level !== 1 ? scopeSignals.length : briefCount;
  const displayPosts =
    tourOpen && level !== 1
      ? scopeSignals.reduce((sum, signal) => sum + signal.community_posts, 0)
      : briefPosts;

  const issuesLabel = displayCount === 1 ? "issue" : "issues";
  const postsLabel = displayPosts === 1 ? "post" : "posts";

  // Level 2: the borough's top signals, resident-voice first then score.
  const topSignals = useMemo(() => {
    if (level !== 2) return [];
    return [...scopeSignals]
      .sort(
        (a, b) =>
          Number(hasResidentVoice(b)) - Number(hasResidentVoice(a)) || b.score - a.score
      )
      .slice(0, 5);
  }, [level, scopeSignals]);

  // Level 3: this neighborhood's signals as cards, highest score first, capped.
  const areaCards = useMemo(() => {
    if (level !== 3) return [];
    return [...scopeSignals].sort((a, b) => b.score - a.score).slice(0, 6);
  }, [level, scopeSignals]);

  const newsEmpty = state === "error" || (state === "ready" && news.length === 0);
  const tourNote = tourOpen ? (
    <p className={styles.tourNote}>Example content for this tour</p>
  ) : null;

  return (
    <div className={styles.digest} data-tour="digest">
      <p className={styles.brief}>
        <strong className={styles.briefLead}>
          {displayCount} {issuesLabel} this week
        </strong>{" "}
        · {displayPosts} community {postsLabel} talking about them
      </p>

      {tourOpen ? (
        // Inert during the tour — a navigation here would leave the tour
        // mid-flight without writing the seen-key.
        <span className={styles.storiesLink} aria-disabled="true">
          Read the full posts on Stories <span aria-hidden="true">→</span>
        </span>
      ) : (
        <Link
          className={styles.storiesLink}
          href={`/reports?borough=${encodeURIComponent(activeBorough)}`}
        >
          Read the full posts on Stories <span aria-hidden="true">→</span>
        </Link>
      )}

      {level === 1 ? (
        <div className="cs-news">
          <div className="cs-news-head">
            <h2>Local news · {activeBorough}</h2>
          </div>
          {tourNote}
          {newsEmpty ? (
            <p className="cs-empty">No recent local news for {activeBorough}.</p>
          ) : state === "ready" ? (
            <>
              <ul className="cs-news-list">
                {news.map((item) => {
                  const when = formatNewsDate(item.published_at);
                  const meta = [item.outlet, when].filter(Boolean).join(" · ");
                  return (
                    <li key={item.id} className="cs-news-item">
                      <span className="cs-news-thumb" aria-hidden="true">
                        {item.image_url ? (
                          // Lazy real image over the gradient placeholder; a rotted
                          // og:image URL hides the img (onError) → gradient shows.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            loading="lazy"
                            decoding="async"
                            alt=""
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </span>
                      <div className="cs-news-body">
                        {tourOpen ? (
                          // Plain text row — no <Link>, no openNewsModal (the
                          // fixture id would live-fetch /news/{id} → 404).
                          <span>{item.title}</span>
                        ) : (
                          <Link
                            href={`/news/${item.id}`}
                            onClick={(event) => {
                              if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.button !== 0
                              ) {
                                return;
                              }
                              event.preventDefault();
                              const row = event.currentTarget.closest(".cs-news-item");
                              openNewsModal(
                                item.id,
                                (row ?? event.currentTarget).getBoundingClientRect()
                              );
                              markNewsRead(item.id);
                            }}
                          >
                            {item.title}
                          </Link>
                        )}
                        {meta ? <small>{meta}</small> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {tourOpen ? (
                <span className={styles.newsMore} aria-disabled="true">
                  More on News <span aria-hidden="true">→</span>
                </span>
              ) : (
                <Link className={styles.newsMore} href="/news">
                  More on News <span aria-hidden="true">→</span>
                </Link>
              )}
            </>
          ) : null}
        </div>
      ) : level === 2 ? (
        <div className={styles.scopeBlock}>
          <div className="cs-news-head">
            <h2>{tourOpen ? "Top signals" : `Top signals · ${activeBorough}`}</h2>
          </div>
          <p className={styles.scopeSub}>
            {isCoarse
              ? "Tap a colored neighborhood, then tap again to open it."
              : "Click a colored neighborhood for its full picture."}
          </p>
          {tourNote}
          {topSignals.length === 0 ? (
            <p className="cs-empty">No signals match here right now.</p>
          ) : (
            <ul className={styles.signalList}>
              {topSignals.map((signal) => {
                const evidence = buildEvidenceLine(signal);
                return (
                  <li key={signal.id} className={styles.signalRow}>
                    <p className={styles.signalHead}>{signal.headline}</p>
                    {evidence ? <p className={styles.signalCounts}>{evidence}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className={styles.scopeBlock}>
          <div className="cs-news-head">
            <h2>{tourOpen ? "What's happening here" : `What's happening in ${areaName}`}</h2>
          </div>
          {tourNote}
          {areaCards.length === 0 ? (
            <p className="cs-empty">Nothing notable in {areaName} this week.</p>
          ) : (
            <ul className={styles.signalList}>
              {areaCards.map((signal) => {
                const evidence = buildEvidenceLine(signal);
                const emerging = isEmerging(signal.trend);
                // Honesty gate: a resident quote is only safe to attribute when
                // the signal carries no news items (top_titles pools posts AND
                // news headlines).
                const quote = signal.news_items === 0 ? signal.top_titles[0] : undefined;
                const complaints = signal.top_complaint_types ?? [];
                return (
                  <li key={signal.id} className={styles.signalCard}>
                    <div className={styles.signalCardHead}>
                      <p className={styles.signalHead}>{signal.headline}</p>
                      {emerging ? (
                        <span className={styles.trendPill}>
                          {signal.trend === "new" ? "New" : "Growing"}
                        </span>
                      ) : null}
                    </div>
                    {quote ? <p className={styles.signalQuote}>“{quote}”</p> : null}
                    {evidence ? <p className={styles.signalCounts}>{evidence}</p> : null}
                    {complaints.length > 0 ? (
                      <p className={styles.complaintRow}>
                        Neighbors report: {complaints.join(" · ")}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});
