import type { CivicDistrictProfile } from "./civic-types";

const profileCache = new Map<string, CivicDistrictProfile>();

export function getCachedCivicProfile(districtKey: string): CivicDistrictProfile | null {
  return profileCache.get(districtKey) ?? null;
}

export function cacheCivicProfile(profile: CivicDistrictProfile): void {
  profileCache.set(profile.district.district_key, profile);
}
