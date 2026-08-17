"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent
} from "react";

import {
  geocodeNyc,
  type GeocodeFeatureType,
  type GeocodeResult
} from "@/lib/map-feature/geocode";
import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import styles from "./map-signals.module.css";

// Address / ZIP / neighborhood search for the signals map. Debounced Mapbox forward-geocoding
// (NYC-bounded) with a keyboard-navigable suggestion list. Purely about turning
// text into a [lng, lat] + label; the parent decides what to do with the pick
// (fly + resolve the containing neighborhood).

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;
const MAX_VISIBLE_RESULTS = 6;

const RESULT_TYPE_LABELS: Record<GeocodeFeatureType, string> = {
  address: "Address",
  street: "Street",
  postcode: "ZIP code",
  neighborhood: "Neighborhood",
  locality: "Neighborhood",
  place: "Place"
};

type Status = "idle" | "loading" | "results" | "empty" | "error";

type Props = {
  token: string | undefined;
  onPick: (result: GeocodeResult) => void;
  // The Mapbox bbox is rectangular and overlaps New Jersey around Staten Island.
  // The host can apply the actual five-borough polygons before suggestions show.
  isResultAllowed?: (result: GeocodeResult) => boolean;
  // A short status line shown under the field, set by the parent after it
  // resolves a pick against the polygons (e.g. "No neighborhood matched").
  note?: string | null;
  // Clears any previously resolved location note as soon as a new search begins.
  onSearchStart?: () => void;
  // Phone only: records the pre-focus sheet state without moving anything. This
  // runs on pointer-down so a later focus/blur can restore the correct snap.
  onPhoneFocusIntent?: () => void;
  // Raises the phone sheet only after the native tap has completed. Moving the
  // field during pointer-down can make iOS Safari finish the tap on content that
  // slid underneath the finger instead of opening the keyboard.
  onPhoneFocus?: () => void;
  // Restores the sheet state that preceded keyboard focus.
  onPhoneBlur?: () => void;
};

export const MapSearchBox = memo(
  forwardRef<HTMLInputElement, Props>(function MapSearchBox(
    {
      token,
      onPick,
      isResultAllowed,
      note,
      onSearchStart,
      onPhoneFocusIntent,
      onPhoneFocus,
      onPhoneBlur
    },
    forwardedRef
  ) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resultsQuery, setResultsQuery] = useState("");

  const { isPhone } = useFormFactor();

  const listId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const pointerFocusRef = useRef(false);
  const pointerSequenceRef = useRef(false);
  const pendingBlurRef = useRef(false);

  const schedulePhoneBlur = useCallback(
    (delayMs = 0) => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
      blurTimerRef.current = window.setTimeout(() => {
        blurTimerRef.current = null;
        if (!pendingBlurRef.current) {
          return;
        }
        pendingBlurRef.current = false;
        if (document.activeElement !== inputRef.current) {
          onPhoneBlur?.();
        }
      }, delayMs);
    },
    [onPhoneBlur]
  );

  const queuePhoneExpansion = useCallback(() => {
    if (!isPhone) {
      return;
    }
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    pendingBlurRef.current = false;
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
    }
    // A zero-delay task scheduled by click runs after Safari has committed the
    // native tap/focus and keyboard request, so resizing the sheet cannot change
    // that tap's target midway through the gesture.
    focusTimerRef.current = window.setTimeout(() => {
      focusTimerRef.current = null;
      if (document.activeElement === inputRef.current) {
        onPhoneFocus?.();
      }
    }, 0);
  }, [isPhone, onPhoneFocus]);

  // A different control receives focus on pointer-down, before its click. Never
  // collapse the sheet during that gap: the target would slide away under the
  // finger and the click could be lost or land elsewhere. Finish blur recovery
  // only after the document click, with a pointer-up fallback for canceled taps.
  useEffect(() => {
    if (!isPhone) {
      return;
    }
    const onPointerDown = () => {
      pointerSequenceRef.current = true;
    };
    const onPointerUp = () => {
      pointerSequenceRef.current = false;
      if (pendingBlurRef.current) {
        // Modern mobile browsers dispatch click immediately after pointer-up.
        // The fallback also covers a canceled activation or older delayed click;
        // a real click below replaces this timer with an immediate post-click one.
        schedulePhoneBlur(500);
      }
    };
    const onPointerCancel = () => {
      pointerSequenceRef.current = false;
      if (pendingBlurRef.current) {
        schedulePhoneBlur();
      }
    };
    const onDocumentClick = () => {
      pointerSequenceRef.current = false;
      if (pendingBlurRef.current) {
        schedulePhoneBlur();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerCancel, true);
    document.addEventListener("click", onDocumentClick, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, [isPhone, schedulePhoneBlur]);

  const pick = useCallback(
    (result: GeocodeResult) => {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      setQuery(result.label);
      setResults([]);
      setResultsQuery("");
      setStatus("idle");
      setOpen(false);
      setActiveIndex(-1);
      // A committed address is an end state: close the phone keyboard so the map
      // and newly selected neighborhood are visible immediately.
      inputRef.current?.blur();
      onPick(result);
    },
    [onPick]
  );

  const runSearch = useCallback(
    async (rawQuery: string, commitFirst = false) => {
      const trimmed = rawQuery.trim();
      if (!token || trimmed.length < MIN_CHARS) {
        return;
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      abortRef.current = controller;
      setStatus("loading");
      setOpen(true);

      try {
        const geocoded = await geocodeNyc(trimmed, token, controller.signal);
        const allowed = isResultAllowed ? geocoded.filter(isResultAllowed) : geocoded;
        const next = allowed.slice(0, MAX_VISIBLE_RESULTS);
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        if (commitFirst && next.length > 0) {
          pick(next[0]);
          return;
        }
        setResults(next);
        setResultsQuery(trimmed);
        setActiveIndex(next.length > 0 ? 0 : -1);
        setStatus(next.length > 0 ? "results" : "empty");
        setOpen(true);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (requestId !== requestIdRef.current) {
          return;
        }
        setResults([]);
        setResultsQuery(trimmed);
        setStatus("error");
        setOpen(true);
      }
    },
    [isResultAllowed, pick, token]
  );

  const onQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    const trimmed = nextQuery.trim();
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    abortRef.current?.abort();
    requestIdRef.current += 1;
    onSearchStart?.();
    setQuery(nextQuery);
    setResults([]);
    setResultsQuery("");
    setActiveIndex(-1);
    if (!token || trimmed.length < MIN_CHARS) {
      setStatus("idle");
      setOpen(false);
      return;
    }
    setStatus("loading");
    setOpen(true);
    timerRef.current = window.setTimeout(() => {
      void runSearch(trimmed);
    }, DEBOUNCE_MS);
  };

  // Abort both the debounce and any in-flight request on unmount.
  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
      }
      if (focusTimerRef.current !== null) {
        window.clearTimeout(focusTimerRef.current);
      }
      abortRef.current?.abort();
    },
    []
  );

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

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      const trimmed = query.trim();
      if (results.length > 0 && resultsQuery === trimmed) {
        event.preventDefault();
        const index = activeIndex >= 0 && activeIndex < results.length ? activeIndex : 0;
        pick(results[index]);
      } else if (token && trimmed.length >= MIN_CHARS) {
        event.preventDefault();
        void runSearch(trimmed, true);
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
          ref={(node) => {
            inputRef.current = node;
            if (typeof forwardedRef === "function") {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
          className={styles.searchInput}
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={onQueryChange}
          onKeyDown={onKeyDown}
          onPointerDown={() => {
            if (isPhone) {
              pointerFocusRef.current = true;
              if (blurTimerRef.current !== null) {
                window.clearTimeout(blurTimerRef.current);
                blurTimerRef.current = null;
              }
              pendingBlurRef.current = false;
              if (focusTimerRef.current !== null) {
                window.clearTimeout(focusTimerRef.current);
                focusTimerRef.current = null;
              }
              // Capture the old snap now, but do not render or move the sheet
              // until click. The native input must stay under the finger for the
              // complete iOS touch sequence so Safari opens the keyboard.
              onPhoneFocusIntent?.();
            }
          }}
          onPointerCancel={() => {
            pointerFocusRef.current = false;
          }}
          onFocus={() => {
            if (status !== "idle") {
              setOpen(true);
            }
            if (isPhone) {
              if (blurTimerRef.current !== null) {
                window.clearTimeout(blurTimerRef.current);
                blurTimerRef.current = null;
              }
              pendingBlurRef.current = false;
              // Pointer-driven focus waits for click below. Keyboard, switch
              // control, and other non-pointer focus paths have no click to wait
              // for, so queue their expansion independently.
              if (!pointerFocusRef.current) {
                onPhoneFocusIntent?.();
                queuePhoneExpansion();
              }
            }
          }}
          onClick={() => {
            if (isPhone) {
              pointerFocusRef.current = false;
              queuePhoneExpansion();
            }
          }}
          onBlur={() => {
            if (!isPhone) {
              return;
            }
            pointerFocusRef.current = false;
            if (focusTimerRef.current !== null) {
              window.clearTimeout(focusTimerRef.current);
              focusTimerRef.current = null;
            }
            if (blurTimerRef.current !== null) {
              window.clearTimeout(blurTimerRef.current);
            }
            pendingBlurRef.current = true;
            // Keyboard/programmatic blur has no pointer gesture to protect. A
            // pointer-driven blur is completed by the document click listener.
            if (!pointerSequenceRef.current) {
              schedulePhoneBlur();
            }
          }}
          placeholder="Address, ZIP, or neighborhood…"
          aria-label="Search by address, ZIP code, or neighborhood"
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
            <p className={styles.searchNote}>
              No NYC matches. Try an address, ZIP code, or neighborhood.
            </p>
          ) : (
            results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                role="option"
                onPointerDown={(event) => {
                  // Keep focus on the input until pick() runs, preventing a mobile
                  // pointer from dismissing the keyboard before the click lands.
                  event.preventDefault();
                }}
                aria-selected={index === activeIndex}
                className={`${styles.searchOption}${
                  index === activeIndex ? ` ${styles.searchOptionActive}` : ""
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(result)}
              >
                <span className={styles.searchOptionTop}>
                  <span className={styles.searchOptionLabel}>{result.label}</span>
                  <span className={styles.searchOptionKind}>
                    {RESULT_TYPE_LABELS[result.featureType]}
                  </span>
                </span>
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
  })
);
