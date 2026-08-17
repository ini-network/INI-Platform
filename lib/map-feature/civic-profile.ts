import type {
  CivicDistrictGovernmentLevel,
  CivicDistrictProfile,
  CivicDistrictProfileKind,
  SelectableCivicGeographyType
} from "./civic-types";
import { isCivicDistrictKey, isSelectableCivicGeographyType } from "./civic-types";

type JsonRecord = Record<string, unknown>;
type CivicOfficial = CivicDistrictProfile["officials"][number];

const MAX_COLLECTION = 24;
const MEDIA_ID_PATTERN = /^sha256:[0-9a-f]{64}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const AWARE_DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T.+(?:Z|[+-]\d{2}:\d{2})$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+[.][^\s@]+$/;
const PHONE_PATTERN = /^[0-9+(). xX-]{7,64}$/;
const TEL_PATTERN = /^tel:[+]?[0-9-]{7,24}$/;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?[.])+[a-z]{2,63}$/;
const DISTRICT_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,31}$/;
const SENSITIVE_ASSIGNMENT = /(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|authorization|credential|secret|token)\s*[:=]/i;
const BEARER_CREDENTIAL = /\bbearer\s+[a-z0-9._~-]{8,}/i;
const SENSITIVE_QUERY_KEYS = new Set([
  "api_key",
  "apikey",
  "access_token",
  "auth_token",
  "authorization",
  "client_secret",
  "credential",
  "key",
  "password",
  "secret",
  "signature",
  "sig",
  "token"
]);
const ACTION_KINDS = new Set([
  "official_page",
  "constituent_services",
  "email",
  "call",
  "board_calendar"
]);
const PROFILE_KINDS = new Set<CivicDistrictProfileKind>([
  "elected_district",
  "community_board",
  "joint_interest_area"
]);
const GOVERNMENT_LEVELS = new Set<CivicDistrictGovernmentLevel>([
  "city_council",
  "community_board",
  "state_senate",
  "state_assembly",
  "us_house"
]);
const OFFICIAL_STATUSES = new Set(["current", "acting", "vacant"]);
const FRESHNESS_STATUSES = new Set(["current", "stale", "expired"]);
const PUBLIC_PARTIES = new Set([
  "Democratic",
  "Republican",
  "Independent",
  "Conservative",
  "Working Families",
  "Green",
  "Libertarian",
  "Nonpartisan",
  "Unaffiliated"
]);

const LEVEL_BY_GEOGRAPHY: Record<
  SelectableCivicGeographyType,
  CivicDistrictGovernmentLevel
> = {
  city_council: "city_council",
  community_district: "community_board",
  state_senate: "state_senate",
  state_assembly: "state_assembly",
  us_congressional: "us_house"
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isBoundedArray(value: unknown, minimum = 0, maximum = MAX_COLLECTION): value is unknown[] {
  return Array.isArray(value) && value.length >= minimum && value.length <= maximum;
}

function isText(value: unknown, maxLength = 500): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    !SENSITIVE_ASSIGNMENT.test(value) &&
    !BEARER_CREDENTIAL.test(value)
  );
}

function isNullableText(value: unknown, maxLength = 500): value is string | null {
  return value === null || isText(value, maxLength);
}

function isRealDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE_PATTERN.exec(value);
  return Boolean(
    match && isRealDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
  );
}

function isIsoDateOrNull(value: unknown): value is string | null {
  return value === null || isIsoDate(value);
}

function isAwareDateTime(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  const match = AWARE_DATETIME_PATTERN.exec(value);
  if (!match || !isRealDateParts(Number(match[1]), Number(match[2]), Number(match[3]))) {
    return false;
  }
  const offset = /([+-])(\d{2}):(\d{2})$/.exec(value);
  if (offset && (Number(offset[2]) > 23 || Number(offset[3]) > 59)) return false;
  return Number.isFinite(Date.parse(value));
}

function isPrivateOrLocalIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [first, second, third] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && (third === 0 || third === 2)) ||
    (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
    (first === 203 && second === 0 && third === 113)
  );
}

function isPrivateOrLocalIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized.includes(":")) return false;
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

function safeHttpsUrl(value: unknown, options: { forbidQuery?: boolean } = {}): string | null {
  if (!isText(value, 2048)) return null;
  const scheme = /^https:\/\//i.exec(value);
  if (!scheme) return null;
  const authority = value.slice(scheme[0].length).split(/[/?#]/, 1)[0];
  if (!authority || authority.includes("@")) return null;
  const explicitPort = authority.startsWith("[")
    ? authority.slice(authority.indexOf("]") + 1).length > 0
    : authority.includes(":");
  if (explicitPort) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.hash ||
      url.port ||
      (options.forbidQuery && url.search)
    ) {
      return null;
    }
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    if (
      !hostname ||
      hostname === "localhost" ||
      /\.(?:localhost|local|internal|home|lan)$/.test(hostname) ||
      isPrivateOrLocalIpv4(hostname) ||
      isPrivateOrLocalIpv6(hostname)
    ) {
      return null;
    }
    const isIpv4 = /^\d+(?:\.\d+){3}$/.test(hostname);
    const isIpv6 = hostname.includes(":");
    if (!isIpv4 && !isIpv6 && !HOST_PATTERN.test(hostname)) return null;
    for (const key of url.searchParams.keys()) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase().replaceAll("-", "_"))) return null;
    }
    return value;
  } catch {
    return null;
  }
}

function safeActionHref(kind: string, value: unknown): string | null {
  if (!isText(value, 2048)) return null;
  if (kind === "email") {
    if (!value.toLowerCase().startsWith("mailto:") || value.includes("?") || value.includes("#")) {
      return null;
    }
    const address = value.slice(value.indexOf(":") + 1);
    return address.length <= 320 && EMAIL_PATTERN.test(address) ? value : null;
  }
  if (kind === "call") return TEL_PATTERN.test(value) ? value : null;
  return safeHttpsUrl(value);
}

function parsePortrait(value: unknown): CivicOfficial["portrait"] {
  if (!isRecord(value) || !hasExactKeys(value, ["media_id", "url", "alt", "attribution"])) {
    return null;
  }
  const { media_id: mediaId, url, alt, attribution } = value;
  if (
    typeof mediaId !== "string" ||
    !MEDIA_ID_PATTERN.test(mediaId) ||
    url !== `/v1/civic/media/${mediaId}` ||
    !isText(alt, 500) ||
    !isNullableText(attribution, 500)
  ) {
    return null;
  }
  return { media_id: mediaId, url, alt, attribution };
}

function parseOfficial(value: unknown): CivicOfficial | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "role",
      "name",
      "party",
      "status",
      "term",
      "portrait",
      "contacts",
      "offices",
      "links"
    ]) ||
    !isText(value.role, 200) ||
    typeof value.status !== "string" ||
    !OFFICIAL_STATUSES.has(value.status) ||
    !isNullableText(value.name, 300) ||
    !isNullableText(value.party, 100) ||
    (value.party !== null && !PUBLIC_PARTIES.has(value.party)) ||
    !isRecord(value.contacts) ||
    !hasExactKeys(value.contacts, ["phone", "email", "contact_form_url", "official_url"]) ||
    !isBoundedArray(value.offices) ||
    !isBoundedArray(value.links)
  ) {
    return null;
  }

  if (
    !isNullableText(value.contacts.phone, 64) ||
    !isNullableText(value.contacts.email, 320) ||
    !isNullableText(value.contacts.contact_form_url, 2048) ||
    !isNullableText(value.contacts.official_url, 2048)
  ) {
    return null;
  }
  const phone = value.contacts.phone;
  const email = value.contacts.email;
  const contactFormUrl =
    value.contacts.contact_form_url === null
      ? null
      : safeHttpsUrl(value.contacts.contact_form_url);
  const officialUrl =
    value.contacts.official_url === null ? null : safeHttpsUrl(value.contacts.official_url);
  if (
    (phone !== null && !PHONE_PATTERN.test(phone)) ||
    (email !== null && !EMAIL_PATTERN.test(email)) ||
    (value.contacts.contact_form_url !== null && !contactFormUrl) ||
    (value.contacts.official_url !== null && !officialUrl)
  ) {
    return null;
  }

  const offices: CivicOfficial["offices"] = [];
  for (const office of value.offices) {
    if (
      !isRecord(office) ||
      !hasExactKeys(office, ["label", "address_lines", "phone"]) ||
      !isText(office.label, 200) ||
      !isBoundedArray(office.address_lines, 1, 6) ||
      !office.address_lines.every((line) => isText(line, 1_000)) ||
      !isNullableText(office.phone, 64) ||
      (office.phone !== null && !PHONE_PATTERN.test(office.phone))
    ) {
      return null;
    }
    offices.push({
      label: office.label,
      address_lines: office.address_lines as string[],
      phone: office.phone
    });
  }

  const links: CivicOfficial["links"] = [];
  for (const link of value.links) {
    if (!isRecord(link) || !hasExactKeys(link, ["label", "url"]) || !isText(link.label, 200)) {
      return null;
    }
    const url = safeHttpsUrl(link.url);
    if (!url) return null;
    links.push({ label: link.label, url });
  }

  let term: CivicOfficial["term"] = null;
  if (isRecord(value.term)) {
    if (
      !hasExactKeys(value.term, ["starts_on", "ends_on"]) ||
      !isIsoDateOrNull(value.term.starts_on) ||
      !isIsoDateOrNull(value.term.ends_on) ||
      (value.term.starts_on !== null &&
        value.term.ends_on !== null &&
        value.term.ends_on < value.term.starts_on)
    ) {
      return null;
    }
    term = { starts_on: value.term.starts_on, ends_on: value.term.ends_on };
  } else if (value.term !== null) {
    return null;
  }

  const portrait = parsePortrait(value.portrait);
  if (
    (value.status === "vacant" &&
      (value.name !== null || value.party !== null || value.term !== null || portrait !== null)) ||
    (value.status !== "vacant" && value.name === null)
  ) {
    return null;
  }

  return {
    role: value.role,
    name: value.name,
    party: value.party,
    status: value.status as CivicOfficial["status"],
    term,
    portrait,
    contacts: {
      phone,
      email,
      contact_form_url: contactFormUrl,
      official_url: officialUrl
    },
    offices,
    links
  };
}

export function civicPortraitProxyUrl(portrait: CivicOfficial["portrait"]): string | null {
  if (
    !portrait ||
    !MEDIA_ID_PATTERN.test(portrait.media_id) ||
    portrait.url !== `/v1/civic/media/${portrait.media_id}`
  ) {
    return null;
  }
  return `/api/civic/media/${encodeURIComponent(portrait.media_id)}`;
}

export function parseCivicDistrictProfile(value: unknown): CivicDistrictProfile | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schema_version",
      "district",
      "profile_kind",
      "organization",
      "officials",
      "community_board",
      "actions",
      "sources",
      "freshness",
      "as_of"
    ]) ||
    value.schema_version !== "1.0" ||
    !isRecord(value.district) ||
    !hasExactKeys(value.district, ["district_key", "geography_type", "label", "district_number"]) ||
    !isRecord(value.organization) ||
    !hasExactKeys(value.organization, [
      "name",
      "government_level",
      "authority_summary",
      "responsibilities",
      "limitation_note"
    ]) ||
    !isBoundedArray(value.officials) ||
    !isBoundedArray(value.actions, 1) ||
    !isBoundedArray(value.sources, 1) ||
    !isRecord(value.freshness) ||
    !hasExactKeys(value.freshness, ["status", "verified_at", "hard_expires_at"])
  ) {
    return null;
  }

  const geographyType = value.district.geography_type;
  const profileKind = value.profile_kind;
  const governmentLevel = value.organization.government_level;
  if (
    typeof geographyType !== "string" ||
    !isSelectableCivicGeographyType(geographyType) ||
    typeof profileKind !== "string" ||
    !PROFILE_KINDS.has(profileKind as CivicDistrictProfileKind) ||
    typeof governmentLevel !== "string" ||
    !GOVERNMENT_LEVELS.has(governmentLevel as CivicDistrictGovernmentLevel) ||
    LEVEL_BY_GEOGRAPHY[geographyType] !== governmentLevel
  ) {
    return null;
  }
  if (
    geographyType === "community_district"
      ? !["community_board", "joint_interest_area"].includes(profileKind)
      : profileKind !== "elected_district"
  ) {
    return null;
  }

  if (
    !isText(value.district.district_key, 210) ||
    !isCivicDistrictKey(value.district.district_key, geographyType) ||
    !isText(value.district.label, 300) ||
    !isNullableText(value.district.district_number, 32) ||
    (value.district.district_number !== null &&
      !DISTRICT_NUMBER_PATTERN.test(value.district.district_number)) ||
    !isText(value.organization.name, 300) ||
    !isText(value.organization.authority_summary, 4_000) ||
    !isBoundedArray(value.organization.responsibilities, 3, 4) ||
    !value.organization.responsibilities.every((item) => isText(item, 4_000)) ||
    !isNullableText(value.organization.limitation_note, 4_000) ||
    !isAwareDateTime(value.as_of) ||
    !isAwareDateTime(value.freshness.verified_at) ||
    !isAwareDateTime(value.freshness.hard_expires_at) ||
    typeof value.freshness.status !== "string" ||
    !FRESHNESS_STATUSES.has(value.freshness.status)
  ) {
    return null;
  }

  const officials = value.officials.map(parseOfficial);
  if (officials.some((official) => official === null)) return null;
  const typedOfficials = officials as CivicDistrictProfile["officials"];

  let communityBoard: CivicDistrictProfile["community_board"] = null;
  if (isRecord(value.community_board)) {
    if (
      !hasExactKeys(value.community_board, ["meeting_pattern", "calendar_url"]) ||
      !isNullableText(value.community_board.meeting_pattern, 4_000) ||
      !isNullableText(value.community_board.calendar_url, 2048)
    ) {
      return null;
    }
    const calendarUrl =
      value.community_board.calendar_url === null
        ? null
        : safeHttpsUrl(value.community_board.calendar_url);
    if (value.community_board.calendar_url !== null && !calendarUrl) return null;
    communityBoard = {
      meeting_pattern: value.community_board.meeting_pattern,
      calendar_url: calendarUrl
    };
  } else if (value.community_board !== null) {
    return null;
  }

  const actions: CivicDistrictProfile["actions"] = [];
  for (const action of value.actions) {
    if (
      !isRecord(action) ||
      !hasExactKeys(action, ["kind", "label", "href"]) ||
      typeof action.kind !== "string" ||
      !ACTION_KINDS.has(action.kind) ||
      !isText(action.label, 200)
    ) {
      return null;
    }
    const href = safeActionHref(action.kind, action.href);
    if (!href) return null;
    actions.push({
      kind: action.kind as CivicDistrictProfile["actions"][number]["kind"],
      label: action.label,
      href
    });
  }
  if (!actions.some((action) => action.kind === "official_page")) return null;

  const sources: CivicDistrictProfile["sources"] = [];
  for (const source of value.sources) {
    if (
      !isRecord(source) ||
      !hasExactKeys(source, ["name", "url", "verified_at"]) ||
      !isText(source.name, 200) ||
      !isAwareDateTime(source.verified_at)
    ) {
      return null;
    }
    const url = safeHttpsUrl(source.url, { forbidQuery: true });
    if (!url) return null;
    sources.push({ name: source.name, url, verified_at: source.verified_at });
  }

  const expired = value.freshness.status === "expired";
  const limitationNote = value.organization.limitation_note;
  if (
    (profileKind === "elected_district" &&
      (typedOfficials.length !== (expired ? 0 : 1) || communityBoard !== null)) ||
    (profileKind === "community_board" &&
      (communityBoard === null || (expired ? typedOfficials.length !== 0 : typedOfficials.length < 1))) ||
    (profileKind === "joint_interest_area" &&
      (typedOfficials.length !== 0 || communityBoard !== null || limitationNote === null)) ||
    (expired && actions.some((action) => action.kind !== "official_page"))
  ) {
    return null;
  }

  const asOf = Date.parse(value.as_of);
  const verifiedAt = Date.parse(value.freshness.verified_at);
  const hardExpiresAt = Date.parse(value.freshness.hard_expires_at);
  if (!(asOf <= verifiedAt && verifiedAt < hardExpiresAt)) return null;

  return {
    schema_version: "1.0",
    district: {
      district_key: value.district.district_key,
      geography_type: geographyType,
      label: value.district.label,
      district_number: value.district.district_number
    },
    profile_kind: profileKind as CivicDistrictProfileKind,
    organization: {
      name: value.organization.name,
      government_level: governmentLevel as CivicDistrictGovernmentLevel,
      authority_summary: value.organization.authority_summary,
      responsibilities: value.organization.responsibilities as string[],
      limitation_note: limitationNote
    },
    officials: typedOfficials,
    community_board: communityBoard,
    actions,
    sources,
    freshness: {
      status: value.freshness.status as CivicDistrictProfile["freshness"]["status"],
      verified_at: value.freshness.verified_at,
      hard_expires_at: value.freshness.hard_expires_at
    },
    as_of: value.as_of
  };
}
