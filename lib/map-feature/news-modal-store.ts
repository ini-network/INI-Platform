"use client";

import { useSyncExternalStore } from "react";

// Client-state store for the in-app article reader overlay. We drive the modal
// from client state (not a Next intercepting/parallel route) because parallel
// slots freeze their subtree on soft navigation, which made the overlay
// impossible to dismiss reliably when opened over a different route (e.g. /map).
// The /news/[id] full page still exists for direct links and right-click "open".

export type ModalOriginRect = { top: number; left: number; width: number; height: number };
export type NewsModalState = { id: number; rect: ModalOriginRect | null; nonce: number };

let state: NewsModalState | null = null;
let nonce = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

// Open (or switch to) an article. `rect` is the clicked card's on-screen box so
// the overlay can grow out of it. `nonce` bumps every call so the host remounts
// the overlay (fresh animation) even when re-opening the same article.
export function openNewsModal(id: number, rect: DOMRect | ModalOriginRect | null): void {
  nonce += 1;
  state = {
    id,
    rect: rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null,
    nonce
  };
  emit();
}

export function clearNewsModal(): void {
  state = null;
  emit();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): NewsModalState | null {
  return state;
}

function getServerSnapshot(): NewsModalState | null {
  return null;
}

export function useNewsModalState(): NewsModalState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
