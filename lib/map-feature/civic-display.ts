import type {
  CivicDistrictProfile,
  ElectionCandidacySummary
} from "./civic-types";

const PERSON_SUFFIXES = new Set(["jr", "jr.", "sr", "sr.", "ii", "iii", "iv", "v"]);

/**
 * Convert provider-style `Family, Given Middle[, Suffix]` names to the familiar
 * `Given Middle Family Suffix` presentation. This intentionally runs only at
 * render time: provider identity, reconciliation, filtering, and sort keys stay
 * untouched.
 */
export function formatPersonName(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized.includes(",")) return normalized;

  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) return normalized;

  const [familyName, givenNames, possibleSuffix] = parts;
  if (!familyName || !givenNames || /[\d/@]/.test(`${familyName}${givenNames}`)) {
    return normalized;
  }
  if (possibleSuffix && !PERSON_SUFFIXES.has(possibleSuffix.toLocaleLowerCase("en-US"))) {
    return normalized;
  }
  return [givenNames, familyName, possibleSuffix].filter(Boolean).join(" ");
}

export function formatCandidateName(candidacy: ElectionCandidacySummary): string {
  if (candidacy.people.length > 0) {
    return candidacy.people
      .slice()
      .sort((left, right) => left.ticket_order - right.ticket_order)
      .map((person) => formatPersonName(person.full_name) ?? person.full_name)
      .join(" & ");
  }
  return formatPersonName(candidacy.display_name) ?? candidacy.display_name;
}

export type CivicOfficeEntry = {
  label: string;
  role: string;
  phone: string | null;
};

export type CivicOfficeGroup = {
  addressLines: string[];
  entries: CivicOfficeEntry[];
};

function normalizedOfficeAddress(lines: string[]): string {
  return lines
    .map((line) => line.trim().replace(/\s+/g, " ").replace(/[.,]+$/g, ""))
    .filter(Boolean)
    .join("|")
    .toLocaleLowerCase("en-US");
}

function cleanOfficeAddressLines(lines: string[]): string[] {
  return lines
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .filter((line) => !/^(?:please\b|our office\b|social media:?$|facebook:|twitter:|instagram:|for (?:scheduling|budget|media)\b)/i.test(line));
}

/** Keep every role, but render a shared physical address once. */
export function groupCivicOffices(profile: CivicDistrictProfile): CivicOfficeGroup[] {
  const groups = new Map<string, CivicOfficeGroup>();
  for (const official of profile.officials) {
    for (const office of official.offices) {
      const addressLines = cleanOfficeAddressLines(office.address_lines);
      if (
        addressLines.length === 0 ||
        addressLines.every((line) => /^(?:tba|tbd|not available)$/i.test(line)) ||
        (addressLines.length === 1 && /\b(?:tba|tbd)\b/i.test(addressLines[0]))
      ) {
        continue;
      }
      const addressKey = normalizedOfficeAddress(addressLines);
      // Address-less provider records are kept distinct so an office label or
      // telephone number is never accidentally discarded.
      const key = addressKey || `${official.role}|${office.label}|${office.phone ?? ""}`.toLocaleLowerCase("en-US");
      const group = groups.get(key) ?? { addressLines, entries: [] };
      const entry = { label: office.label, role: official.role, phone: office.phone };
      const duplicate = group.entries.some(
        (current) =>
          current.label === entry.label &&
          current.role === entry.role &&
          current.phone === entry.phone
      );
      if (!duplicate) group.entries.push(entry);
      groups.set(key, group);
    }
  }
  const officePriority = (group: CivicOfficeGroup): number => {
    const text = `${group.entries.map((entry) => entry.label).join(" ")} ${group.addressLines.join(" ")}`.toLocaleLowerCase("en-US");
    if (/\b(?:district|borough|manhattan|brooklyn|queens|bronx|staten island|new york,? ny)\b/.test(text)) return 0;
    if (/\b(?:albany|washington)\b/.test(text)) return 2;
    return 1;
  };
  return [...groups.values()].sort((left, right) => officePriority(left) - officePriority(right));
}

export function canonicalActionHref(href: string): string {
  const trimmed = href.trim();
  if (/^tel:/i.test(trimmed)) return `tel:${trimmed.slice(4).replace(/\D/g, "")}`;
  if (/^mailto:/i.test(trimmed)) return trimmed.toLocaleLowerCase("en-US");
  try {
    const url = new URL(trimmed);
    url.hash = "";
    url.hostname = url.hostname.toLocaleLowerCase("en-US");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return trimmed;
  }
}
