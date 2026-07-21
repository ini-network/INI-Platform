"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ITEMS } from "./nav-rail";
import { useNewsUnreadCount } from "@/lib/map-feature/news-read";
import { useRecentNewsIds } from "@/lib/map-feature/use-recent-news-ids";

// Phone-only bottom tab bar. Mirrors NavRail exactly (same ITEMS/ICONS, same
// active logic, same unread badge) so the two navs can never drift — only the
// layout differs. CSS owns visibility: hidden by default, shown <=640 while the
// rail is hidden (redesign.css). Mounted unconditionally alongside NavRail, so
// the unread count is subscribed twice (rail + tab bar); this double subscription
// is accepted (amendment 9) — both read the same localStorage-backed hook.
export function TabBar() {
  const pathname = usePathname() ?? "";
  const newsUnread = useNewsUnreadCount(useRecentNewsIds());
  return (
    <nav className="cs-tabbar" aria-label="Primary navigation" data-tour="tabbar">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge = item.key === "news" && newsUnread > 0 ? newsUnread : 0;
        return (
          <Link
            key={item.key}
            className={`cs-tab${active ? " is-active" : ""}`}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-tour={item.key === "news" ? "tabbar-news" : undefined}
          >
            {item.icon}
            {badge ? (
              <span className="cs-tabbar-badge" aria-label={`${badge} unread`}>
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
            <small>{item.label}</small>
          </Link>
        );
      })}
    </nav>
  );
}
