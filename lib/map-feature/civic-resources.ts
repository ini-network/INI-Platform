import {
  CIVIC_GEOGRAPHY_TYPES,
  type CivicLocationGeography,
  type SelectableCivicGeographyType
} from "./civic-types";

export const CIVIC_RESOURCE_CONTEXT_STORAGE_KEY = "ini-civic-resource-context-v1";

export type CivicResourceContext = {
  version: 1;
  addressLabel: string;
  point: [number, number];
  geographies: CivicLocationGeography[];
  resolvedAt: string;
};

export type CivicSelectedDistrictContext = {
  geographyKey: string;
  geographyType: SelectableCivicGeographyType;
  label: string;
};

export type CivicZipAreaContext = {
  label: string;
  point: [number, number];
  zipCode: string;
};

export type CivicNavigatorScope =
  | { kind: "selected_district"; district: CivicSelectedDistrictContext }
  | { kind: "confirmed_address" }
  | { kind: "zip_area"; zip: CivicZipAreaContext };

export type CivicTeamMember = {
  geographyType: SelectableCivicGeographyType;
  geography: CivicLocationGeography;
};

export type CivicResourceTopicId =
  | "city-service"
  | "city-agency"
  | "unresolved-311"
  | "state-agency"
  | "federal-agency"
  | "policy"
  | "voting";

export type CivicResourceAction = {
  label: string;
  href: string;
};

export type CivicResourceTopic = {
  id: CivicResourceTopicId;
  label: string;
  examples: string;
  title: string;
  explanation: string;
  targetTypes: SelectableCivicGeographyType[];
  officialActions: CivicResourceAction[];
  sourceLabel: string;
  sourceUrl: string;
  verifiedOn: string;
};

export type CivicResourceRecommendation = CivicResourceTopic;

export type NavigatorView =
  | { kind: "home" }
  | { kind: "team"; geographyType: SelectableCivicGeographyType }
  | { kind: "topic"; topicId: CivicResourceTopicId }
  | { kind: "meetings" }
  | { kind: "meeting-detail"; eventId: number };

export const CIVIC_TEAM_ORDER: SelectableCivicGeographyType[] = [
  "community_district",
  "city_council",
  "state_assembly",
  "state_senate",
  "us_congressional"
];

const VERIFIED_ON = "2026-08-06";

export const CIVIC_RESOURCE_TOPICS: CivicResourceTopic[] = [
  {
    id: "city-service",
    label: "City service problem",
    examples: "Potholes, garbage, noise, heat, streetlights",
    title: "Start with the official NYC service channel",
    explanation:
      "NYC311 connects non-emergency service requests to the City agency responsible. Browse the official service list, then use the district information here when you need the right public office.",
    targetTypes: ["city_council"],
    officialActions: [
      { label: "Browse NYC311 topics", href: "https://portal.311.nyc.gov/resources/" }
    ],
    sourceLabel: "NYC311 services",
    sourceUrl: "https://portal.311.nyc.gov/resources/",
    verifiedOn: VERIFIED_ON
  },
  {
    id: "city-agency",
    label: "City agency or benefit",
    examples: "NYCHA, SNAP, Housing Connect, City programs",
    title: "Your City Council office can help you navigate City government",
    explanation:
      "For a City benefit, program, or agency problem, review the official service information first. Your Council office can also explain constituent-service options.",
    targetTypes: ["city_council"],
    officialActions: [
      { label: "Browse official NYC services", href: "https://portal.311.nyc.gov/resources/" }
    ],
    sourceLabel: "NYC311 services",
    sourceUrl: "https://portal.311.nyc.gov/resources/",
    verifiedOn: VERIFIED_ON
  },
  {
    id: "unresolved-311",
    label: "311 report did not work",
    examples: "No response, overdue, or closed but unresolved",
    title: "Check the official status, then use the right follow-up route",
    explanation:
      "Keep your 311 service-request number and relevant dates ready. NYC advises residents to refile when a request was closed but the problem remains; your Council office can explain constituent-service options for an unresolved City issue.",
    targetTypes: ["city_council"],
    officialActions: [
      { label: "Check a 311 request status", href: "https://portal.311.nyc.gov/check-status/" },
      {
        label: "City agency or worker feedback",
        href: "https://portal.311.nyc.gov/article/?kanumber=KA-01662"
      }
    ],
    sourceLabel: "NYC311 service-request guidance",
    sourceUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-03116",
    verifiedOn: VERIFIED_ON
  },
  {
    id: "state-agency",
    label: "New York State agency",
    examples: "DMV, unemployment, Medicaid, taxes, utilities",
    title: "Your state legislators can point you toward State resources",
    explanation:
      "State Senator and Assembly offices both provide constituent assistance with New York State agencies. You can compare both offices below.",
    targetTypes: ["state_senate", "state_assembly"],
    officialActions: [{ label: "Browse New York State services", href: "https://www.ny.gov/services" }],
    sourceLabel: "New York State services",
    sourceUrl: "https://www.ny.gov/services",
    verifiedOn: VERIFIED_ON
  },
  {
    id: "federal-agency",
    label: "Federal agency",
    examples: "Passports, immigration, IRS, Social Security, veterans",
    title: "Your U.S. House office handles federal constituent casework",
    explanation:
      "A House office can help residents navigate a federal agency, although it cannot guarantee a particular outcome.",
    targetTypes: ["us_congressional"],
    officialActions: [{ label: "Browse federal services", href: "https://www.usa.gov/" }],
    sourceLabel: "USA.gov services",
    sourceUrl: "https://www.usa.gov/",
    verifiedOn: VERIFIED_ON
  },
  {
    id: "policy",
    label: "Laws, budgets, or policy",
    examples: "Find which level of government makes the decision",
    title: "Compare the offices responsible at each level",
    explanation:
      "City Council handles NYC laws and budgets, Albany handles State policy, and Congress handles federal policy. Select an office below to see its role and contact routes.",
    targetTypes: ["city_council", "state_assembly", "state_senate", "us_congressional"],
    officialActions: [
      { label: "Explore NYC Council legislation", href: "https://legistar.council.nyc.gov/Legislation.aspx" }
    ],
    sourceLabel: "NYC Council legislation",
    sourceUrl: "https://legistar.council.nyc.gov/Legislation.aspx",
    verifiedOn: VERIFIED_ON
  },
  {
    id: "voting",
    label: "Voting and elections",
    examples: "Poll site, ballot, and election information",
    title: "Use your registered residence for election information",
    explanation:
      "Poll sites and ballots can vary by election and exact registered address. INI can show verified election context when it is available for this address.",
    targetTypes: [],
    officialActions: [
      { label: "Official poll-site and ballot lookup", href: "https://findmypollsite.vote.nyc/" }
    ],
    sourceLabel: "NYC Board of Elections",
    sourceUrl: "https://www.vote.nyc/",
    verifiedOn: VERIFIED_ON
  }
];

export function civicResourceTopic(topicId: CivicResourceTopicId): CivicResourceTopic | null {
  return CIVIC_RESOURCE_TOPICS.find((topic) => topic.id === topicId) ?? null;
}

export function buildCivicTeam(geographies: CivicLocationGeography[]): CivicTeamMember[] {
  return CIVIC_TEAM_ORDER.flatMap((geographyType) => {
    const geography = geographies.find((item) => item.geography_type === geographyType);
    return geography ? [{ geographyType, geography }] : [];
  });
}

function isGeography(value: unknown): value is CivicLocationGeography {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.geography_type === "string" &&
    (CIVIC_GEOGRAPHY_TYPES as readonly string[]).includes(item.geography_type) &&
    typeof item.geography_key === "string" &&
    item.geography_key.length > 0 &&
    typeof item.external_id === "string" &&
    typeof item.display_name === "string" &&
    item.display_name.length > 0
  );
}

export function readCivicResourceContext(): CivicResourceContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CIVIC_RESOURCE_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const point = value.point;
    const geographies = value.geographies;
    if (
      value.version !== 1 ||
      typeof value.addressLabel !== "string" ||
      value.addressLabel.length === 0 ||
      value.addressLabel.length > 300 ||
      !Array.isArray(point) ||
      point.length !== 2 ||
      !point.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)) ||
      !Array.isArray(geographies) ||
      !geographies.every(isGeography) ||
      typeof value.resolvedAt !== "string"
    ) {
      return null;
    }
    return value as CivicResourceContext;
  } catch {
    return null;
  }
}

export function writeCivicResourceContext(context: CivicResourceContext | null): void {
  if (typeof window === "undefined") return;
  try {
    if (context) {
      window.sessionStorage.setItem(CIVIC_RESOURCE_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    } else {
      window.sessionStorage.removeItem(CIVIC_RESOURCE_CONTEXT_STORAGE_KEY);
    }
  } catch {
    // The navigator still works in memory when storage is blocked.
  }
}
