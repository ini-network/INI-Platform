import { NextResponse } from "next/server";

import { ApiFetchError, getSignalDetail } from "../../../../../lib/api";

// Same-origin proxy for one signal's detail + resolved evidence. A 404 from the
// API (the signal id churned away between runs) is passed through as 404 so the
// client can quietly collapse the row instead of erroring.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ detail: "Signal not found" }, { status: 404 });
  }

  try {
    const detail = await getSignalDetail(numericId);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof ApiFetchError && error.status === 404) {
      return NextResponse.json({ detail: "Signal not found" }, { status: 404 });
    }
    return NextResponse.json({ detail: "Signal detail unavailable" }, { status: 502 });
  }
}
