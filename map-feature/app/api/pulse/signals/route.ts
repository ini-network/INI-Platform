import { NextResponse } from "next/server";

import { getNeighborhoodSignals } from "../../../../lib/api";

// Same-origin proxy for the per-neighborhood signal list. Runs server-side so
// CIVIC_SIGNAL_API_BASE_URL never reaches the browser (mirrors the map proxies).
export const dynamic = "force-dynamic";

function intParam(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const emergingRaw = searchParams.get("emerging");
  const emerging =
    emergingRaw === null ? undefined : emergingRaw === "true" || emergingRaw === "1";

  try {
    const data = await getNeighborhoodSignals({
      signal_type: searchParams.get("signal_type") ?? undefined,
      borough: searchParams.get("borough") ?? undefined,
      area_id: intParam(searchParams.get("area_id")),
      emerging,
      limit: intParam(searchParams.get("limit"))
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ detail: "Signals unavailable" }, { status: 502 });
  }
}
