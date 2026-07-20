import { NextResponse } from "next/server";

import { getNews } from "../../../../lib/api";

// Same-origin endpoint the nav badge uses to learn the recent-news ID universe.
// Runs server-side so CIVIC_SIGNAL_API_BASE_URL never reaches the browser and no
// CORS config is needed. The unread count = these IDs minus the client's
// localStorage read-set.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 60) || 60;
  const lookbackDays = Number(searchParams.get("lookback_days") ?? 30) || 30;
  try {
    const response = await getNews({ limit, lookback_days: lookbackDays });
    return NextResponse.json({ ids: response.items.map((item) => item.id) });
  } catch {
    return NextResponse.json({ ids: [] });
  }
}
