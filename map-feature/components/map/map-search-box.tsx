"use client";

import { memo, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { geocodeNyc, type GeocodeResult } from "../../lib/geocode";
import { useFormFactor } from "../../lib/use-form-factor";
import styles from "./map-signals.module.css";

// Address / ZIP search for the signals map. Debounced Mapbox forward-geocoding
// (NYC-bounded) with a keyboard-navigable suggestion list. Purely about turning
// text into a [lng, lat] + label; the parent decides what to do with the pick
// (fly + resolve the containing neighborhood).

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

type Status = "idle" | "loading" | "results" | "empty" | "error";

type Props = {
  token: string | undefined;
  onPick: (center: [number, number], label: string) => void;
  // A short status line shown under the field, set by the parent after it
  // resolves a pick against the polygons (e.g. "No neighborhood matched").
  note?: string | null;
  // Phone only: fired when the field gains focus so the host can raise the bottom
  // sheet to full (clearing the soft keyboard). No-op off phone (host gates it).
  onPhoneFocus?: () => void;
};

export const MapSearchBox = memo(function MapSearchBox({ token, onPick, note, onPhoneFocus }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { isPhone } = useFormFactor();

  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Set when a result is chosen: writing the label back into the input would
  // otherwise re-fire the geocoder and reopen the list. Skip that one run.
  const justPickedRef = useRef(false);

  // Debounced geocode as the user types.
  useEffect(() => {
    const trimmed = query.trim();
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }
    if (!token || trimmed.length < MIN_CHARS) {
      abortRef.current?.abort();
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    timerRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      geocodeNyc(trimmed, token, controller.signal)
        .then((next) => {
          setResults(next);
          setActiveIndex(next.length > 0 ? 0 : -1);
          setStatus(next.length > 0 ? "results" : "empty");
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setResults([]);
          setStatus("error");
          setOpen(true);
        });
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [query, token]);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Close the suggestion list on an outside click.
  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const pick = useCallback(
    (result: GeocodeResult) => {
      abortRef.current?.abort();
      justPickedRef.current = true;
      setQuery(result.label);
      setResults([]);
      setStatus("idle");
      setOpen(false);
      setActiveIndex(-1);
      onPick(result.center, result.label);
    },
    [onPick]
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (results.length > 0) {
        event.preventDefault();
        const index = activeIndex >= 0 && activeIndex < results.length ? activeIndex : 0;
        pick(results[index]);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      if (results.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((prev) => (prev + 1) % results.length);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      if (results.length > 0) {
        event.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  // No token → the map itself renders the token error; a search box would be
  // dead, so we render nothing.
  if (!token) {
    return null;
  }

  const showDropdown = open && status !== "idle";

  return (
    <div className={styles.search} ref={wrapRef} data-tour="search">
      <div className={styles.searchField}>
        <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (status !== "idle") {
              setOpen(true);
            }
            // Phone: lift the search up inside the bottom sheet so the field and
            // its upward-opening suggestions clear the soft keyboard. Leave ~35%
            // of the visible sheet above the field for the upward popover.
            if (isPhone) {
              onPhoneFocus?.();
              const wrap = wrapRef.current;
              // The phone sheet's SCROLLER is .cs-sheet-body (the handle + brief are
              // static siblings OUTSIDE it); the aside is overflow:hidden now, so
              // scrollTop/scrollTo must target the body, not .cs-insights.
              const sheet = wrap?.closest(".cs-sheet-body") as HTMLElement | null;
              if (wrap && sheet) {
                // Measure the field's offset within the sheet's scroll content
                // via rects, not offsetTop — offsetTop is relative to the nearest
                // positioned ancestor, which isn't guaranteed to be the sheet.
                const offsetInSheet =
                  sheet.scrollTop +
                  wrap.getBoundingClientRect().top -
                  sheet.getBoundingClientRect().top;
                sheet.scrollTo({
                  top: Math.max(0, offsetInSheet - sheet.clientHeight * 0.35),
                  behavior: "smooth"
                });
              }
            }
          }}
          placeholder="Find your block — address or ZIP…"
          aria-label="Find your block — search an address or ZIP code"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>

      {showDropdown ? (
        <div className={styles.searchPop} id={listId} role="listbox">
          {status === "loading" ? (
            <p className={styles.searchNote}>Searching…</p>
          ) : status === "error" ? (
            <p className={`${styles.searchNote} ${styles.searchNoteError}`}>
              Couldn&apos;t reach the search service. Please try again.
            </p>
          ) : status === "empty" ? (
            <p className={styles.searchNote}>No matches in New York City.</p>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`${styles.searchOption}${
                  index === activeIndex ? ` ${styles.searchOptionActive}` : ""
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(result)}
              >
                <span className={styles.searchOptionLabel}>{result.label}</span>
                {result.context ? (
                  <span className={styles.searchOptionContext}>{result.context}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}

      {note ? <p className={styles.searchStatus}>{note}</p> : null}
    </div>
  );
});
