import { NextResponse } from "next/server";

import { getNews } from "@/lib/map-feature/api";

// Same-origin endpoint the client map digest uses to load a borough's recent
// news. Runs server-side so CIVIC_SIGNAL_API_BASE_URL never reaches the browser.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const borough = searchParams.get("borough") ?? undefined;
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw !== null ? Number(limitRaw) : undefined;
  try {
    const news = await getNews({
      borough,
      limit: limit !== undefined && Number.isFinite(limit) ? limit : undefined,
      // The digest shows the area's most recent coverage; a wider window than
      // the /news page's 7 days keeps it useful when ingestion runs slow, and
      // every rendered item carries its own date so nothing reads as fresher
      // than it is.
      lookback_days: 30
    });
    // News refreshes at most hourly; a short shared CDN cache with SWR is honest
    // and lets the borough digest reuse a warm response instead of hitting the
    // origin on every mount. Success only — a 502 must not be cached.
    return NextResponse.json(news, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
    });
  } catch {
    return NextResponse.json({ detail: "News unavailable" }, { status: 502 });
  }
}
