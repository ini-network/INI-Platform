"use client";

import { useEffect, useId, useMemo, useState } from "react";

import {
  CIVIC_GEOGRAPHY_LABELS,
  type CivicGeographyFeatureCollection,
  type CivicGeographyType
} from "@/lib/map-feature/civic-types";
import styles from "./civic-district-picker.module.css";

type Props = {
  activeType: CivicGeographyType | null;
  collection: CivicGeographyFeatureCollection | null;
  selectedDistrictKey: string | null;
  catalogLoading: boolean;
  catalogUnavailable: boolean;
  loading: boolean;
  error: string | null;
  onSelectDistrict: (districtKey: string) => void;
  onClose: () => void;
};

function numericDistrict(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function CheckIcon() {
  return (
    <svg className={styles.checkIcon} viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 10.5 3.1 3.1L15.5 6.5" />
    </svg>
  );
}

function districtSearchLabel(type: CivicGeographyType): string {
  const label = CIVIC_GEOGRAPHY_LABELS[type];
  return type === "community_district"
    ? "Find a Community district"
    : `Find a ${label} district`;
}

export function CivicDistrictPicker({
  activeType,
  collection,
  selectedDistrictKey,
  catalogLoading,
  catalogUnavailable,
  loading,
  error,
  onSelectDistrict,
  onClose
}: Props) {
  const titleId = useId();
  const searchId = useId();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (selectedDistrictKey === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, selectedDistrictKey]);

  const districts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("en-US");
    return [...(collection?.features ?? [])]
      .filter((feature) => {
        if (
          activeType === "community_district" &&
          feature.properties.administrative_kind !== "community_district"
        ) {
          return false;
        }
        if (!normalized) return true;
        const text = `${feature.properties.display_name} ${feature.properties.external_id}`
          .toLocaleLowerCase("en-US");
        return text.includes(normalized);
      })
      .sort((a, b) => {
        if (a.id === selectedDistrictKey) return -1;
        if (b.id === selectedDistrictKey) return 1;
        return (
          numericDistrict(a.properties.external_id) - numericDistrict(b.properties.external_id) ||
          a.properties.display_name.localeCompare(b.properties.display_name)
        );
      });
  }, [activeType, collection, query, selectedDistrictKey]);

  const activeLabel = activeType ? CIVIC_GEOGRAPHY_LABELS[activeType] : "civic";
  const searchLabel = activeType ? districtSearchLabel(activeType) : "Find a civic district";
  const resultLabel = `${districts.length} ${districts.length === 1 ? "district" : "districts"}`;

  return (
    <section className={styles.picker} role="region" aria-label="Civic districts">
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <span className={styles.headerIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20h16M6 17V9m4 8V9m4 8V9m4 8V9M4 7h16L12 3 4 7Z" />
            </svg>
          </span>
          <div>
            <p className={styles.eyebrow}>Official NYC boundaries</p>
          <h2 className={styles.title} id={titleId}>
              Explore civic districts
          </h2>
          <p className={styles.subtitle}>
              Search or select a district within the active filter above.
          </p>
          </div>
        </div>
        {selectedDistrictKey ? (
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Back to selected district details"
            onClick={onClose}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m12.5 4-6 6 6 6" />
            </svg>
          </button>
        ) : null}
      </header>

      {catalogLoading ? (
        <div className={styles.loadingState} role="status" aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <strong>Loading official district tools</strong>
            <p>You can still search an address while the boundaries load.</p>
          </div>
        </div>
      ) : catalogUnavailable ? (
        <div className={styles.errorState} role="status">
          <strong>District tools are temporarily unavailable</strong>
          <span>Address search and Community Signals are still available.</span>
        </div>
      ) : activeType ? (
        <>
          <div className={styles.resultsHead}>
            <div>
              <h3>Choose a district</h3>
              <p>Search by number or browse the official list.</p>
            </div>
            {!loading && !error ? (
              <span data-testid="civic-district-result-count">{resultLabel}</span>
            ) : null}
          </div>
          <div className={styles.searchField}>
            <svg className={styles.searchIcon} viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="m12.7 12.7 3.8 3.8" />
            </svg>
            <label className={styles.srOnly} htmlFor={searchId}>
              {searchLabel}
            </label>
            <input
              id={searchId}
              className={styles.searchInput}
              type="search"
              value={query}
              placeholder={searchLabel}
              aria-label={searchLabel}
              autoComplete="off"
              enterKeyHint="search"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button
                className={styles.clearButton}
                type="button"
                aria-label="Clear district search"
                onClick={() => setQuery("")}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="m6 6 8 8M14 6l-8 8" />
                </svg>
              </button>
            ) : null}
          </div>

          <div className={styles.boundarySource}>
            <span className={styles.boundarySwatch} aria-hidden="true" />
            <span>
              Official {collection?.release.source_name ?? "NYC Planning"} boundary
            </span>
          </div>

          <p className={styles.srOnly} aria-live="polite">
            {loading ? `Loading ${activeLabel} districts` : error ? error : resultLabel}
          </p>
          <div className={styles.results}>
            {loading ? (
              <p className={styles.status}>Loading official {activeLabel} boundaries…</p>
            ) : error ? (
              <div className={styles.errorState} role="status">
                <strong>Boundaries unavailable</strong>
                <span>{error}</span>
              </div>
            ) : districts.length > 0 ? (
              <ul className={styles.districtList}>
                {districts.map((feature) => {
                  const selected = feature.id === selectedDistrictKey;
                  return (
                    <li key={feature.id}>
                      <button
                        className={`${styles.districtRow}${selected ? ` ${styles.districtRowSelected}` : ""}`}
                        type="button"
                        aria-label={feature.properties.display_name}
                        aria-pressed={selected}
                        onClick={() => onSelectDistrict(feature.id)}
                      >
                        <span>
                          <strong>{feature.properties.display_name}</strong>
                          <small>
                            {selected ? "Currently selected" : "View boundary and civic details"}
                          </small>
                        </span>
                        {selected ? <CheckIcon /> : <span className={styles.rowArrow}>→</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.status}>No matching districts. Try the district number.</p>
            )}
          </div>
        </>
      ) : (
        <p className={styles.status}>Choose a boundary type to view its official districts.</p>
      )}
    </section>
  );
}
