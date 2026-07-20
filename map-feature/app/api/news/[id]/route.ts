import { NextResponse } from "next/server";

import { getNewsArticle } from "../../../../lib/api";

// Same-origin endpoint the client article overlay uses to load one article.
// Runs server-side so CIVIC_SIGNAL_API_BASE_URL never reaches the browser.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const article = await getNewsArticle(id);
    return NextResponse.json(article);
  } catch {
    return NextResponse.json({ detail: "Article unavailable" }, { status: 502 });
  }
}
