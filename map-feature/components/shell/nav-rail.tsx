"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useNewsUnreadCount } from "../../lib/news-read";
import { useRecentNewsIds } from "../../lib/use-recent-news-ids";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" {...stroke}>
      {children}
    </svg>
  );
}

// Exported so the phone tab bar (tab-bar.tsx) reuses the exact same nav data —
// the two navs can never drift.
export const ICONS: Record<string, ReactNode> = {
  map: <Icon><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" /><circle cx="12" cy="11" r="2.3" /></Icon>,
  news: <Icon><path d="M4 5h13v14H6a2 2 0 0 1-2-2z" /><path d="M17 8h3v9a2 2 0 0 1-2 2" /><path d="M7 8h7M7 12h7M7 16h4" /></Icon>,
  report: <Icon><path d="M6 3h9l4 4v14H6z" /><path d="M9 9h7M9 13h7M9 17h4" /></Icon>
};

export const ITEMS: NavItem[] = [
  { key: "map", label: "Map", href: "/map", icon: ICONS.map },
  { key: "news", label: "News", href: "/news", icon: ICONS.news },
  { key: "reports", label: "Stories", href: "/reports", icon: ICONS.report }
];

export function NavRail() {
  const pathname = usePathname() ?? "";
  const newsUnread = useNewsUnreadCount(useRecentNewsIds());
  return (
    <nav className="cs-rail" aria-label="Primary navigation" data-tour="rail">
      <div className="cs-rail-brand" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/vngle-icon.png" alt="" width={24} height={24} />
      </div>
      <ul className="cs-rail-items">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badge = item.key === "news" && newsUnread > 0 ? newsUnread : 0;
          return (
            <li key={item.key}>
              <Link
                className={`cs-rail-item${active ? " is-active" : ""}`}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={badge ? `${item.label} — ${badge} unread` : item.label}
              >
                {item.icon}
                {badge ? (
                  <span className="cs-rail-badge" aria-label={`${badge} unread`}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
                <small>{item.label}</small>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
