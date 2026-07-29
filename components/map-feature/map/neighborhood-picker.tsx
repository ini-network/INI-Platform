"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import styles from "./neighborhood-picker.module.css";

export type NeighborhoodPickerOption = {
  id: number;
  name: string;
  borough: string;
  signalCount: number;
};

type NeighborhoodPickerProps = {
  activeBorough: string;
  boroughs: readonly string[];
  boroughSignalCount: number;
  options: readonly NeighborhoodPickerOption[];
  selectedAreaId: number | null;
  onBoroughChange: (borough: string) => void;
  onSelectArea: (areaId: number) => void;
  onSelectAll: () => void;
  onClose: () => void;
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function signalLabel(count: number): string {
  if (count === 0) return "No current signals";
  return `${count} ${count === 1 ? "signal" : "signals"}`;
}

function CheckIcon() {
  return (
    <svg className={styles.checkIcon} viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 10.5 3.1 3.1L15.5 6.5" />
    </svg>
  );
}

function NeighborhoodList({
  activeBorough,
  boroughLabel,
  boroughSignalCount,
  options,
  selectedAreaId,
  onSelectArea,
  onSelectAll
}: {
  activeBorough: string;
  boroughLabel: string;
  boroughSignalCount: number;
  options: readonly NeighborhoodPickerOption[];
  selectedAreaId: number | null;
  onSelectArea: (areaId: number) => void;
  onSelectAll: () => void;
}) {
  const [query, setQuery] = useState("");
  const searchLabelId = useId();
  const activeBoroughKey = normalize(activeBorough);

  const boroughOptions = useMemo(
    () =>
      options
        .filter((option) => normalize(option.borough) === activeBoroughKey)
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
    [activeBoroughKey, options]
  );

  const normalizedQuery = normalize(query);
  const visibleOptions = useMemo(
    () =>
      normalizedQuery
        ? boroughOptions.filter((option) => normalize(option.name).includes(normalizedQuery))
        : boroughOptions,
    [boroughOptions, normalizedQuery]
  );

  return (
    <>
      <div className={styles.searchField}>
        <label className={styles.srOnly} id={searchLabelId} htmlFor={`${searchLabelId}-input`}>
          Find a neighborhood
        </label>
        <svg className={styles.searchIcon} viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m12.7 12.7 3.8 3.8" />
        </svg>
        <input
          id={`${searchLabelId}-input`}
          className={styles.searchInput}
          type="search"
          value={query}
          placeholder="Find a neighborhood"
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button
            className={styles.clearButton}
            type="button"
            aria-label="Clear neighborhood search"
            onClick={() => setQuery("")}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m6 6 8 8M14 6l-8 8" />
            </svg>
          </button>
        ) : null}
      </div>

      <p className={styles.srOnly} role="status">
        {visibleOptions.length} matching {visibleOptions.length === 1 ? "neighborhood" : "neighborhoods"}
      </p>

      <div className={styles.results}>
        {!normalizedQuery ? (
          <button
            className={`${styles.areaRow} ${styles.allRow}`}
            type="button"
            aria-pressed={selectedAreaId === null}
            onClick={onSelectAll}
          >
            <span className={styles.areaCopy}>
              <span className={styles.areaName}>All {boroughLabel}</span>
              <span className={styles.areaMeta}>
                {boroughSignalCount === 0
                  ? "See the full borough"
                  : `${signalLabel(boroughSignalCount)} across the borough`}
              </span>
            </span>
            {selectedAreaId === null ? <CheckIcon /> : <span className={styles.rowArrow}>→</span>}
          </button>
        ) : null}

        {visibleOptions.length > 0 ? (
          <ul className={styles.areaList}>
            {visibleOptions.map((option) => {
              const selected = option.id === selectedAreaId;
              return (
                <li key={option.id}>
                  <button
                    className={`${styles.areaRow}${selected ? ` ${styles.areaRowSelected}` : ""}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelectArea(option.id)}
                  >
                    <span className={styles.areaCopy}>
                      <span className={styles.areaName}>{option.name}</span>
                      <span
                        className={`${styles.areaMeta}${option.signalCount === 0 ? ` ${styles.areaMetaEmpty}` : ""}`}
                      >
                        {signalLabel(option.signalCount)}
                      </span>
                    </span>
                    {selected ? <CheckIcon /> : <span className={styles.rowArrow}>→</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>
              {normalizedQuery ? "No matching neighborhoods" : "No neighborhoods available"}
            </p>
            <p className={styles.emptyText}>
              {normalizedQuery
                ? `Try a different name in ${boroughLabel}.`
                : `Neighborhoods for ${boroughLabel} are not available right now.`}
            </p>
            {normalizedQuery ? (
              <button className={styles.emptyAction} type="button" onClick={() => setQuery("")}>
                Clear search
              </button>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}

export function NeighborhoodPicker({
  activeBorough,
  boroughs,
  boroughSignalCount,
  options,
  selectedAreaId,
  onBoroughChange,
  onSelectArea,
  onSelectAll,
  onClose
}: NeighborhoodPickerProps) {
  const titleId = useId();
  const activeBoroughKey = normalize(activeBorough);
  const boroughScrollerRef = useRef<HTMLDivElement | null>(null);
  const activeBoroughButtonRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    const scroller = boroughScrollerRef.current;
    const activeButton = activeBoroughButtonRef.current;
    if (!scroller || !activeButton) return;

    const centeredLeft =
      activeButton.offsetLeft - (scroller.clientWidth - activeButton.offsetWidth) / 2;
    scroller.scrollLeft = Math.max(0, centeredLeft);
  }, [activeBoroughKey]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const boroughLabel = activeBorough || boroughs[0] || "this borough";

  return (
    <section className={styles.picker} role="region" aria-labelledby={titleId}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title} id={titleId}>
            Choose a neighborhood
          </h2>
          <p className={styles.subtitle}>Move the map to the area you want to explore.</p>
        </div>
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Close neighborhood picker"
          onClick={onClose}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>

      <div
        ref={boroughScrollerRef}
        className={styles.boroughScroller}
        aria-label="Choose a borough"
        role="group"
      >
        {boroughs.map((borough) => {
          const active = normalize(borough) === activeBoroughKey;
          return (
            <button
              key={borough}
              ref={active ? activeBoroughButtonRef : undefined}
              className={`${styles.boroughButton}${active ? ` ${styles.boroughButtonActive}` : ""}`}
              type="button"
              aria-pressed={active}
              onClick={() => onBoroughChange(borough)}
            >
              {borough}
            </button>
          );
        })}
      </div>

      <NeighborhoodList
        key={activeBoroughKey}
        activeBorough={activeBorough}
        boroughLabel={boroughLabel}
        boroughSignalCount={boroughSignalCount}
        options={options}
        selectedAreaId={selectedAreaId}
        onSelectArea={onSelectArea}
        onSelectAll={onSelectAll}
      />
    </section>
  );
}
