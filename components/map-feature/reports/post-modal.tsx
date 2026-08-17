"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

import type { ReportPost } from "@/lib/map-feature/report-types";
import { useFocusTrap } from "@/lib/map-feature/use-focus-trap";
import { PlatformIcon, platformLabel } from "../signals/platform-icon";
import styles from "./report-card.module.css";

// Module-level scroll lock: a reference count plus the value to restore. Stays
// correct even if two modals ever coexist (the naive per-instance save/restore
// captures "hidden" as the value to restore for a second modal and can leave
// the page permanently locked).
let scrollLockCount = 0;
let scrollLockPrev = "";

// Monotonic id stamped into each open's sentinel history state so a deferred close
// pop only fires for ITS OWN entry. A newer modal that replaceState()s a fresh
// nonce turns any still-pending stale timer from a prior modal into a no-op.
let postModalNonce = 0;

function acquireScrollLock() {
  if (scrollLockCount === 0) {
    scrollLockPrev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function releaseScrollLock() {
  scrollLockCount -= 1;
  if (scrollLockCount <= 0) {
    scrollLockCount = 0;
    document.body.style.overflow = scrollLockPrev;
  }
}

// In-site reader for one resident post: the full cleaned body plus every comment,
// so viewers never have to leave for the source. Rendered only after the user
// opens it (no SSR concerns). Deliberately does NOT reuse the global .cs-modal
// classes — those ship opacity:0 and rely on the news reader's animation script.

// Fixed locale + time zone: shared with the card so strings stay identical.
function shortDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York"
  });
}

export function PostModal({
  post,
  onClose,
  returnFocusRef
}: {
  post: ReportPost;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pressedOnOverlay = useRef(false);
  const closingRef = useRef(false);
  const poppingRef = useRef(false);
  const initRef = useRef(false);
  const nonceRef = useRef(0);
  const label = platformLabel(post.platform);
  const heading = post.title.trim() || "Resident post";
  const body = post.body || post.excerpt;
  const date = shortDate(post.published_at);

  // Close once, from any trigger. Mirrors the news reader: a user-driven close
  // (X / Esc / backdrop) pops the sentinel history entry we pushed on open; when
  // the Back button itself drove it (poppingRef) that entry is already gone.
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    // Defer the sentinel pop instead of calling history.back() synchronously: the
    // tour's skip path clicks close and then immediately router.replace()s the
    // URL, and if that replaceState commits first it overwrites our sentinel
    // entry — a synchronous back() would then land the user on the fixture page.
    // Firing on a timer and re-checking the sentinel lets us skip the pop once
    // it's gone. Safe to run after unmount; it only touches history. Back-driven
    // closes (poppingRef) already consumed the entry, so they schedule nothing.
    if (!poppingRef.current) {
      // Pin the pop to THIS open's nonce: a modal opened after us replaceState()s
      // its own nonce over the current entry, so this stale timer finds a mismatch
      // and no-ops instead of popping the newer modal's sentinel.
      const nonce = nonceRef.current;
      window.setTimeout(() => {
        if (typeof window !== "undefined" && window.history.state?.__postModalNonce === nonce) {
          window.history.back();
        }
      }, 300);
    }
    onClose();
  }, [onClose]);

  // Hardware/browser Back closes the modal instead of leaving the page: push one
  // sentinel entry on open and route popstate through close(). Guarded so
  // StrictMode's double effect-invoke doesn't push a second, stranded entry.
  useEffect(() => {
    function onPop() {
      poppingRef.current = true;
      close();
    }
    window.addEventListener("popstate", onPop);
    if (!initRef.current) {
      initRef.current = true;
      if (typeof window !== "undefined") {
        // Normally push the sentinel; but if one is already the current entry (a
        // stale entry that survived a reload with the modal open), replace it in
        // place so we don't strand a dead entry the user Backs through. Either way
        // stamp a fresh nonce so this open owns the entry and any pending stale
        // timer from a previous modal becomes a no-op (see close()).
        const nonce = ++postModalNonce;
        nonceRef.current = nonce;
        const patched = { ...window.history.state, __postModal: true, __postModalNonce: nonce };
        if (window.history.state?.__postModal) {
          window.history.replaceState(patched, "", window.location.href);
        } else {
          window.history.pushState(patched, "", window.location.href);
        }
      }
    }
    return () => window.removeEventListener("popstate", onPop);
  }, [close]);

  // Escape closes; Tab focus is trapped by useFocusTrap (shared with the reader).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);
  useFocusTrap(panelRef);

  // Lock body scroll while open via the module-level reference count.
  useEffect(() => {
    acquireScrollLock();
    return () => releaseScrollLock();
  }, []);

  // Focus the close button on mount; on unmount return focus to the trigger
  // site (returnFocusRef) when given, else the element focused before opening.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const returnFocusTarget = returnFocusRef?.current;
    closeRef.current?.focus();
    return () => {
      const target = returnFocusTarget ?? opener;
      target?.focus?.();
    };
  }, [returnFocusRef]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        // Remember whether the press STARTED on the backdrop. The browser fires
        // click on the common ancestor of mousedown/mouseup, so a text-selection
        // drag that begins in the panel and releases over the backdrop would
        // otherwise close the modal mid-read.
        pressedOnOverlay.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const startedOnOverlay = pressedOnOverlay.current;
        pressedOnOverlay.current = false;
        if (startedOnOverlay && event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        data-tour="post-modal"
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.panelClose}
          aria-label="Close"
          data-tour="modal-close"
          onClick={close}
        >
          ×
        </button>

        <div className={styles.panelHead}>
          <span className={styles.panelSource}>
            <PlatformIcon platform={post.platform} className={styles.postIcon} />
            {label}
          </span>
          {date ? <span className={styles.postDate}>{date}</span> : null}
        </div>
        <h2 className={styles.panelTitle}>{heading}</h2>

        <p className={styles.panelProse}>{body}</p>

        {post.comments.length > 0 ? (
          <div className={styles.comments}>
            <p className={styles.commentsLabel}>
              What people are saying ({post.comments.length})
            </p>
            <ul className={styles.commentList}>
              {post.comments.map((comment, index) => (
                <li key={index} className={styles.comment}>
                  <p className={styles.commentText}>{comment.text}</p>
                  <span className={styles.commentMeta}>
                    {comment.score != null && comment.score > 0 ? (
                      <span className={styles.commentScore}>▲ {comment.score}</span>
                    ) : null}
                    {shortDate(comment.published_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {post.url ? (
          <div className={styles.panelFoot}>
            <a
              className={styles.panelSourceLink}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View the original post on {label} ↗
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
