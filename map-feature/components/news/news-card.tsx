"use client";

import Link from "next/link";

import { formatNewsDate, type NewsListItem } from "../../lib/news";
import { openNewsModal } from "../../lib/news-modal-store";
import { markNewsRead, useIsNewsRead } from "../../lib/news-read";

// A clickable news card used in the /news grid and the reader's "related" list.
// Links to the in-app reader at /news/{id} (intercepted into a modal when
// navigated from within the app). Shows a blue dot until the article is opened.
export function NewsCard({ item, eager = false }: { item: NewsListItem; eager?: boolean }) {
  const when = formatNewsDate(item.published_at);
  const read = useIsNewsRead(item.id);
  return (
    <Link
      href={`/news/${item.id}`}
      className={`cs-newscard${read ? "" : " is-unread"}`}
      onClick={(event) => {
        // Let modified / non-left clicks fall through to a real navigation
        // (open in new tab, etc.); plain clicks open the in-app overlay.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        openNewsModal(item.id, event.currentTarget.getBoundingClientRect());
        // During the guided tour (?tour=1) the cards are staging fixtures; don't
        // write their ids into the persistent read-set.
        if (new URLSearchParams(window.location.search).get("tour") !== "1") {
          markNewsRead(item.id);
        }
      }}
    >
      {read ? null : <span className="cs-unread-dot" aria-label="Unread" />}
      <span className="cs-newscard-thumb" aria-hidden="true">
        {item.image_url ? (
          // Real image over the gradient placeholder — the wrapper keeps the exact
          // crop/radius; a rotted og:image URL hides the img (onError) and the
          // gradient shows through (redesign.css). The first row (eager) preserves
          // the old CSS-background's instant load / LCP; the rest lazy-load.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
      </span>
      <span className="cs-newscard-body">
        <span className="cs-newscard-meta">
          {item.category_label ? <span className="cs-newscard-cat">{item.category_label}</span> : null}
          {item.borough ? <span className="cs-newscard-boro">{item.borough}</span> : null}
        </span>
        <span className="cs-newscard-title">{item.title}</span>
        {when ? <span className="cs-newscard-date">{when}</span> : null}
      </span>
    </Link>
  );
}
