"use client";

import { useRef, useState } from "react";

import type { ReportItem, ReportPost } from "@/lib/map-feature/report-types";
import { PlatformIcon, platformLabel } from "../signals/platform-icon";
import { PostModal } from "./post-modal";
import styles from "./report-card.module.css";

// One vetted community story: the card's headline + summary, then each resident
// post behind it (their words, quoted) with the top comments visible and a
// client-side "see all" expand — the full comment list already arrives in the
// page payload, so expanding never refetches.

const VISIBLE_COMMENTS = 2;

// Fixed locale + time zone so the server render and the client hydration
// produce identical strings regardless of the machine's own settings.
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

function prettyCategory(category: string | null): string | null {
  if (!category) return null;
  const cleaned = category.replace(/[_-]+/g, " ").trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : null;
}

// For a single-post story the card summary is often the post's own words — the
// quote block below would then repeat the paragraph verbatim. Hide the summary
// when a post quote already opens with it (the quote is the better carrier:
// it reads as the resident speaking, with the platform link attached).
//
// The summary arrives VERBATIM while post.excerpt was server-cleaned (whitespace
// collapsed, markdown unescaped, leading title-echo stripped), so the summary
// must go through the same normalization — and be tried with the post's title
// prefix removed — or a real echo slips past the comparison and renders twice.
function normalizeForEcho(value: string): string {
  return value
    .replace(/\\([\\`*_{}[\]()#+.!~<>-])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function summaryEchoesAPost(item: ReportItem): boolean {
  const summary = normalizeForEcho(item.summary).replace(/[.…\s]+$/, "");
  if (summary.length < 20) return false;
  return item.posts.some((post) => {
    const candidates = [summary];
    if (post.title && summary.startsWith(post.title)) {
      candidates.push(summary.slice(post.title.length).replace(/^[\s\-–—:.·]+/, ""));
    }
    return candidates.some((candidate) => {
      const key = candidate.slice(0, 100).trim();
      return key.length >= 20 && post.excerpt.startsWith(key);
    });
  });
}

export function ReportCard({ item }: { item: ReportItem }) {
  const category = prettyCategory(item.category);
  const date = shortDate(item.last_seen);
  const showArea = item.area && item.area !== item.borough;
  const showSummary = item.summary.trim().length > 0 && !summaryEchoesAPost(item);
  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        {item.borough ? <span className={styles.boro}>{item.borough}</span> : null}
        {showArea ? <span className={styles.area}>{item.area}</span> : null}
        {category ? <span className={styles.cat}>{category}</span> : null}
        {date ? <span className={styles.date}>{date}</span> : null}
      </div>
      <h2 className={styles.title}>{item.title}</h2>
      {showSummary ? <p className={styles.summary}>{item.summary}</p> : null}
      <div className={styles.posts}>
        {item.posts.map((post, index) => (
          <PostBlock key={index} post={post} />
        ))}
      </div>
    </article>
  );
}

function PostBlock({ post }: { post: ReportPost }) {
  const [readerOpen, setReaderOpen] = useState(false);
  const readMoreRef = useRef<HTMLButtonElement>(null);
  const visible = post.comments.slice(0, VISIBLE_COMMENTS);
  const hiddenCount = post.comments.length - VISIBLE_COMMENTS;
  const label = platformLabel(post.platform);
  const date = shortDate(post.published_at);
  const quote = post.excerpt || post.title;
  const commentCount = post.comments.length;

  return (
    <div className={styles.post}>
      <blockquote
        className={`${styles.postText} ${styles.clickableQuote}`}
        onClick={() => setReaderOpen(true)}
      >
        {quote}
      </blockquote>
      <button
        ref={readMoreRef}
        type="button"
        className={styles.readMore}
        data-tour="report-readmore"
        onClick={() => setReaderOpen(true)}
      >
        Read full post
        {commentCount > 0
          ? ` · ${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
          : ""}
      </button>
      <div className={styles.postMeta}>
        <span className={styles.postLink}>
          <PlatformIcon platform={post.platform} className={styles.postIcon} />
          {label}
        </span>
        {date ? <span className={styles.postDate}>{date}</span> : null}
      </div>

      {post.comments.length > 0 ? (
        <div className={styles.comments}>
          <p className={styles.commentsLabel}>What people are saying</p>
          <ul className={styles.commentList}>
            {visible.map((comment, index) => (
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
          {hiddenCount > 0 ? (
            <button
              type="button"
              className={styles.commentsToggle}
              onClick={() => setReaderOpen(true)}
            >
              {`See all ${post.comments.length} comments`}
            </button>
          ) : null}
        </div>
      ) : null}

      {readerOpen ? (
        <PostModal
          post={post}
          onClose={() => setReaderOpen(false)}
          returnFocusRef={readMoreRef}
        />
      ) : null}
    </div>
  );
}
