"use client";

import Link from "next/link";

import type { OverviewNewsItem } from "@/lib/map-feature/borough-overview";
import { openNewsModal } from "@/lib/map-feature/news-modal-store";
import { markNewsRead, useReadNews } from "@/lib/map-feature/news-read";

// Deterministic date label (no Date.now()) so server and client render the same
// thing — avoids hydration drift. A client "x ago" enhancement can come later.
function dateLabel(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.valueOf())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function TopNewsList({ items }: { items: OverviewNewsItem[] }) {
  const read = useReadNews();
  if (items.length === 0) {
    return <p className="cs-empty">No recent news for this borough yet.</p>;
  }
  return (
    <ul className="cs-news-list">
      {items.map((item, index) => {
        const when = dateLabel(item.published_at);
        const id = typeof item.id === "number" ? item.id : null;
        const unread = id !== null && !read.has(id);
        return (
          <li
            key={`${item.source_url ?? item.title}-${index}`}
            className={`cs-news-item${unread ? " is-unread" : ""}`}
          >
            <span
              className="cs-news-thumb"
              aria-hidden="true"
              style={
                item.image_url
                  ? { backgroundImage: `url(${item.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : undefined
              }
            />
            <div className="cs-news-body">
              {id !== null ? (
                <Link
                  href={`/news/${id}`}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                    event.preventDefault();
                    const row = event.currentTarget.closest(".cs-news-item");
                    openNewsModal(id, (row ?? event.currentTarget).getBoundingClientRect());
                    markNewsRead(id);
                  }}
                >
                  {unread ? <span className="cs-unread-dot" aria-label="Unread" /> : null}
                  {item.title}
                </Link>
              ) : item.source_url ? (
                <a href={item.source_url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              ) : (
                <span>{item.title}</span>
              )}
              {when ? <small>{when}</small> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
