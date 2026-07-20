"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NewsArticle } from "../../lib/news";
import {
  clearNewsModal,
  useNewsModalState,
  type ModalOriginRect
} from "../../lib/news-modal-store";
import { useFocusTrap } from "../../lib/use-focus-trap";
import { ArticleReader } from "./article-reader";
import { ArticleReaderSkeleton } from "./article-reader-skeleton";

const OPEN_MS = 440;
const CLOSE_MS = 300;
// iOS-like ease-out (decelerate) for open; ease-in (accelerate) for close.
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN = "cubic-bezier(0.4, 0, 1, 1)";

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function canAnimate(el: HTMLElement | null): el is HTMLElement {
  return !!el && typeof el.animate === "function" && !reducedMotion();
}

// Transform mapping the centered modal back onto the card it opened from:
// translate its center to the card's center and scale it to the card's width.
// Animating this → identity grows the modal out of the card; reversing shrinks
// it back in. Falls back to a gentle center pop when the origin is unknown.
function originTransform(modal: HTMLElement, rect: ModalOriginRect | null): string {
  const box = modal.getBoundingClientRect();
  if (!rect || box.width < 1 || box.height < 1) {
    return "scale(0.92)";
  }
  const scale = Math.min(1, Math.max(0.1, rect.width / box.width));
  const dx = rect.left + rect.width / 2 - (box.left + box.width / 2);
  const dy = rect.top + rect.height / 2 - (box.top + box.height / 2);
  return `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(${scale.toFixed(4)})`;
}

// Mounted once in the root layout. Renders the article reader as a client
// overlay when an article is open. Keyed by `nonce` so each open is a fresh
// mount with its own grow animation.
export function NewsModalHost() {
  const state = useNewsModalState();
  if (!state) return null;
  return <NewsModalOverlay key={state.nonce} id={state.id} rect={state.rect} />;
}

function NewsModalOverlay({ id, rect }: { id: number; rect: ModalOriginRect | null }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const openAnimsRef = useRef<Animation[]>([]);
  const initRef = useRef(false);
  const closingRef = useRef(false);
  const poppingRef = useRef(false);
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [failed, setFailed] = useState(false);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const modal = modalRef.current;
    const backdrop = backdropRef.current;
    // This node stays mounted for CLOSE_MS while the shrink animation plays. Mark it
    // closing so a consumer can distinguish a mid-close linger from a live-open modal
    // (the guided tour keys its reader auto-open/advance off `:not([data-closing])`).
    // Non-visual attribute — no CSS targets it, so nothing renders differently.
    if (modal) modal.setAttribute("data-closing", "");

    const finish = () => {
      // Pop the history entry we pushed (so the URL/back-stack stays clean),
      // unless this close was itself triggered by the back button.
      if (
        !poppingRef.current &&
        typeof window !== "undefined" &&
        window.history.state?.__newsModal
      ) {
        window.history.back();
      }
      clearNewsModal();
    };

    if (!canAnimate(modal) || !backdrop) {
      finish();
      return;
    }
    const style = getComputedStyle(modal);
    const fromTransform = style.transform === "none" ? "none" : style.transform;
    const fromOpacity = Number(style.opacity) || 1;
    // Release the held open animations so the close keyframes win.
    for (const anim of openAnimsRef.current) anim.cancel();
    openAnimsRef.current = [];
    const to = originTransform(modal, rect);
    modal.animate(
      [
        { transform: fromTransform, opacity: fromOpacity },
        { transform: to, opacity: 0 }
      ],
      { duration: CLOSE_MS, easing: EASE_IN, fill: "forwards" }
    );
    backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: CLOSE_MS,
      easing: "ease-in",
      fill: "forwards"
    });
    // Drive dismissal off a timer, not the animation's .finished promise (which
    // can hang when an open animation with fill:both is still attached).
    window.setTimeout(finish, CLOSE_MS);
  }, [rect]);

  // Push a history entry (so the back button closes the modal), lock scroll,
  // wire Esc + popstate, and play the grow-from-card animation. Runs once.
  useEffect(() => {
    function onPop() {
      poppingRef.current = true;
      close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Remember what was focused (usually the clicked card) so we can return
    // focus there on close — keyboard users keep their place (WCAG 2.4.3).
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // One-time: push the history entry and play the open animation. Guarded so
    // React StrictMode's double effect-invoke (dev) doesn't push twice or stack
    // two competing animations (which leaves the modal stuck at its end state).
    if (!initRef.current) {
      initRef.current = true;
      if (typeof window !== "undefined") {
        // The whole modal session owns exactly one history entry. Hopping to a
        // related article remounts this overlay without popping, so push only on
        // the first open; when our sentinel is already the current entry (a hop),
        // replace it — else every hop strands a dead entry the user Backs through.
        const patched = { ...window.history.state, __newsModal: true };
        if (window.history.state?.__newsModal) {
          window.history.replaceState(patched, "", window.location.href);
        } else {
          window.history.pushState(patched, "", window.location.href);
        }
      }
      const modal = modalRef.current;
      const backdrop = backdropRef.current;
      if (canAnimate(modal) && backdrop) {
        const from = originTransform(modal, rect);
        const modalAnim = modal.animate(
          [
            { transform: from, opacity: 0, offset: 0 },
            { opacity: 1, offset: 0.5 },
            { transform: "none", opacity: 1, offset: 1 }
          ],
          { duration: OPEN_MS, easing: EASE_OUT, fill: "both" }
        );
        const backdropAnim = backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: OPEN_MS,
          easing: "ease-out",
          fill: "both"
        });
        openAnimsRef.current = [modalAnim, backdropAnim];
      } else if (modal && backdrop) {
        modal.style.opacity = "1";
        backdrop.style.opacity = "1";
      }
    }

    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      // Restore focus to the trigger if it's still in the document (it won't be
      // when switching to a related article, which is fine).
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the article (skeleton shows until it resolves).
  useEffect(() => {
    let active = true;
    fetch(`/api/news/${id}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: NewsArticle) => {
        if (active) setArticle(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Keep Tab focus inside the dialog (shared with PostModal).
  useFocusTrap(modalRef);

  return (
    <div className="cs-modal-backdrop" ref={backdropRef} onClick={close}>
      <div
        className="cs-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        data-tour="news-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="cs-modal-close"
          aria-label="Close"
          data-tour="modal-close"
          onClick={close}
        >
          ×
        </button>
        {article ? (
          <ArticleReader article={article} />
        ) : failed ? (
          <p className="cs-reader-empty">This article is unavailable.</p>
        ) : (
          <ArticleReaderSkeleton />
        )}
      </div>
    </div>
  );
}
