"use client";

import type { CSSProperties } from "react";

import styles from "./map-signals.module.css";

// The signal filter chips: "All" + the seven signal chips (order + labels come
// from SIGNAL_CHIPS via the parent). Rendered INSIDE the reading panel behind
// the Filter button — never over the map. Each chip shows a live count for the
// current scope; the active chip is filled with its own design-token accent.
// Presentational — the parent owns the active state and drives both the map
// layer and the reading panel from it.

export type FilterChip = {
  // "all" | "emerging" | one of the six signal_type slugs
  key: string;
  label: string;
  count: number;
  // a design-system accent, e.g. "var(--teal)" — CSS vars are fine here (HTML).
  accent: string;
};

export function SignalFilterBar({
  chips,
  activeKey,
  onSelect
}: {
  chips: FilterChip[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      className={styles.chipwrap}
      data-tour="chips"
      role="group"
      aria-label="Filter neighborhood signals"
    >
      {chips.map((chip) => {
        const active = chip.key === activeKey;
        const zero = chip.count === 0 && !active;
        return (
          <button
            key={chip.key}
            type="button"
            className={`${styles.chip}${active ? ` ${styles.chipActive}` : ""}${
              zero ? ` ${styles.chipZero}` : ""
            }`}
            style={{ "--chip-accent": chip.accent } as CSSProperties}
            aria-pressed={active}
            onClick={() => onSelect(chip.key)}
          >
            <span className={styles.chipDot} aria-hidden="true" />
            <span className={styles.chipLabel}>{chip.label}</span>
            <span className={styles.chipCount}>{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}
