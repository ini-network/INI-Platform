import { NextResponse } from "next/server";

import { getApiBaseUrl, missingApiBaseUrlMessage } from "@/lib/map-feature/api-base-url";

export async function POST(request: Request) {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    return NextResponse.json({ detail: missingApiBaseUrlMessage() }, { status: 500 });
  }

  const response = await fetch(`${apiBaseUrl}/map/signals/news-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
    cache: "no-store"
  });

  const responseText = await response.text();
  const responseContentType = response.headers.get("content-type") ?? "application/json";

  return new NextResponse(responseText, {
    status: response.status,
    headers: { "Content-Type": responseContentType }
  });
}
