import type {
  CivicDistrictDetail,
  CivicDistrictProfile,
  CivicGeographyFeatureCollection,
  CivicGeographyLayerList,
  CivicGeographyType,
  CivicLocationRequest,
  CivicLocationResponse,
  CouncilEventDetail,
  CouncilDistrictRepresentative,
  CouncilEventList,
  Election2026Response,
  PublisherNewsPage
} from "./civic-types";
import { parseCivicDistrictProfile } from "./civic-profile";
import { parseCouncilEventDetail } from "./council-event";

export class CivicApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CivicApiError";
    this.status = status;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new CivicApiError(`Civic API request failed: ${response.status}`, response.status);
  }
  return (await response.json()) as T;
}

export async function getCivicGeographyLayers(
  signal?: AbortSignal
): Promise<CivicGeographyLayerList> {
  const response = await fetch("/api/civic/geography-layers", {
    cache: "no-cache",
    signal
  });
  return readJson<CivicGeographyLayerList>(response);
}

export async function getCivicGeography(
  geographyType: CivicGeographyType,
  signal?: AbortSignal
): Promise<CivicGeographyFeatureCollection> {
  const query = new URLSearchParams({ geography_type: geographyType });
  const response = await fetch(`/api/civic/geographies?${query.toString()}`, {
    cache: "no-cache",
    signal
  });
  return readJson<CivicGeographyFeatureCollection>(response);
}

export async function getCivicDistrict(
  districtKey: string,
  signal?: AbortSignal
): Promise<CivicDistrictDetail> {
  const response = await fetch(`/api/civic/districts/${encodeURIComponent(districtKey)}`, {
    cache: "no-cache",
    signal
  });
  return readJson<CivicDistrictDetail>(response);
}

export async function getCivicDistrictProfile(
  districtKey: string,
  signal?: AbortSignal
): Promise<CivicDistrictProfile> {
  const response = await fetch(
    `/api/civic/districts/${encodeURIComponent(districtKey)}/profile`,
    { cache: "no-cache", signal }
  );
  if (!response.ok) {
    throw new CivicApiError(
      `Civic district profile request failed: ${response.status}`,
      response.status
    );
  }
  const profile = parseCivicDistrictProfile(await response.json());
  if (!profile || profile.district.district_key !== districtKey) {
    throw new CivicApiError("Civic district profile response is invalid", 502);
  }
  return profile;
}

export async function resolveCivicLocation(
  request: CivicLocationRequest,
  signal?: AbortSignal
): Promise<CivicLocationResponse> {
  const response = await fetch("/api/civic/location-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    cache: "no-store",
    signal
  });
  return readJson<CivicLocationResponse>(response);
}

export async function getCouncilRepresentative(
  districtId: number,
  signal?: AbortSignal
): Promise<CouncilDistrictRepresentative> {
  const response = await fetch(
    `/api/civic/council/districts/${encodeURIComponent(String(districtId))}/representative`,
    { cache: "no-cache", signal }
  );
  return readJson<CouncilDistrictRepresentative>(response);
}

export async function getCouncilEvents(
  options: { start?: string; end?: string; limit?: number; signal?: AbortSignal } = {}
): Promise<CouncilEventList> {
  const query = new URLSearchParams({ limit: String(options.limit ?? 3) });
  if (options.start) query.set("start", options.start);
  if (options.end) query.set("end", options.end);
  const response = await fetch(`/api/civic/council/events?${query.toString()}`, {
    cache: "no-cache",
    signal: options.signal
  });
  return readJson<CouncilEventList>(response);
}

export async function getCouncilEvent(
  eventId: number,
  signal?: AbortSignal
): Promise<CouncilEventDetail> {
  const response = await fetch(`/api/civic/council/events/${encodeURIComponent(String(eventId))}`, {
    cache: "no-cache",
    signal
  });
  if (!response.ok) {
    throw new CivicApiError(`Civic Council event request failed: ${response.status}`, response.status);
  }
  const event = parseCouncilEventDetail(await response.json());
  if (!event || event.event_id !== eventId) {
    throw new CivicApiError("Civic Council event response is invalid", 502);
  }
  return event;
}

export async function getPublisherNews(
  options: { limit?: number; cursor?: string; signal?: AbortSignal } = {}
): Promise<PublisherNewsPage> {
  const query = new URLSearchParams({ limit: String(options.limit ?? 20) });
  if (options.cursor) query.set("cursor", options.cursor);
  const response = await fetch(`/api/civic/news?${query.toString()}`, {
    cache: "no-cache",
    signal: options.signal
  });
  return readJson<PublisherNewsPage>(response);
}

export async function getElection2026Contests(
  districtKeys: {
    us_house: string;
    nys_senate: string;
    nys_assembly: string;
  },
  signal?: AbortSignal
): Promise<Election2026Response> {
  const query = new URLSearchParams(districtKeys);
  const response = await fetch(
    `/api/civic/elections/ny-general-2026-11-03/contests?${query.toString()}`,
    { cache: "no-cache", signal }
  );
  return readJson<Election2026Response>(response);
}
