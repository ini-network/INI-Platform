"use client";

import { useSyncExternalStore } from "react";

// Client-only "have I read this article" state, persisted in localStorage and
// shared across the nav badge, news cards, the overview list and the reader.
// No auth yet (that's Phase 3), so the browser is the source of truth; it syncs
// across tabs via the `storage` event. Exposed through useSyncExternalStore so
// React stays consistent through SSR/hydration (server sees an empty set → all
// unread, then the client swaps in the real set with no hydration mismatch).

const STORAGE_KEY = "vngle:read-news";
const EMPTY: ReadonlySet<number> = new Set();

let readSet: Set<number> | null = null;
const listeners = new Set<() => void>();
let storageBound = false;

function load(): Set<number> {
  if (readSet) return readSet;
  if (typeof window === "undefined") {
    return (readSet = new Set());
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const ids = Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === "number") : [];
    readSet = new Set(ids);
  } catch {
    readSet = new Set();
  }
  return readSet;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (!storageBound && typeof window !== "undefined") {
    storageBound = true;
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) {
        readSet = null; // reload from the other tab's write
        load();
        emit();
      }
    });
  }
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): ReadonlySet<number> {
  return load();
}

function getServerSnapshot(): ReadonlySet<number> {
  return EMPTY;
}

// Mark an article read (idempotent). Replaces the set identity so subscribers
// re-render, and persists to localStorage.
export function markNewsRead(id: number): void {
  const current = load();
  if (current.has(id)) return;
  const next = new Set(current);
  next.add(id);
  readSet = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* storage full / unavailable — keep the in-memory set */
    }
  }
  emit();
}

export function useReadNews(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsNewsRead(id: number): boolean {
  return useReadNews().has(id);
}

export function useNewsUnreadCount(ids: readonly number[]): number {
  const read = useReadNews();
  let count = 0;
  for (const id of ids) {
    if (!read.has(id)) count += 1;
  }
  return count;
}
