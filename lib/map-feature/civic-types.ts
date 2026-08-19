export const CIVIC_GEOGRAPHY_TYPES = [
  "city_council",
  "community_district",
  "state_senate",
  "state_assembly",
  "us_congressional",
  "election_district",
  "borough"
] as const;

export type CivicGeographyType = (typeof CIVIC_GEOGRAPHY_TYPES)[number];

// Election districts are intentionally an advanced/non-public map layer and a
// borough outline would duplicate the Civic Map's existing borough lens. This
// is the single allowlist for URL restoration, fetching, and visible controls.
export const SELECTABLE_CIVIC_GEOGRAPHY_TYPES = [
  "city_council",
  "community_district",
  "state_senate",
  "state_assembly",
  "us_congressional"
] as const satisfies readonly CivicGeographyType[];

export type SelectableCivicGeographyType =
  (typeof SELECTABLE_CIVIC_GEOGRAPHY_TYPES)[number];

export type CivicGeographyRelease = {
  release_key: string;
  plan_key: string;
  source_name: string;
  source_published_at: string | null;
  effective_from: string | null;
  effective_to: string | null;
  attribution: string | null;
  source_variant: string | null;
};

export type CivicGeographyLayer = {
  geography_type: CivicGeographyType;
  feature_count: number;
  release: CivicGeographyRelease;
};

export type CivicGeographyLayerList = {
  layers: CivicGeographyLayer[];
};

export type CivicGeographyFeature = {
  type: "Feature";
  id: string;
  geometry: {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
  properties: {
    geography_key: string;
    geography_type: CivicGeographyType;
    plan_key: string;
    external_id: string;
    display_name: string;
    [key: string]: unknown;
  };
};

export type CivicGeographyFeatureCollection = {
  type: "FeatureCollection";
  geometry_variant: "simplified" | "full";
  release: CivicGeographyRelease;
  features: CivicGeographyFeature[];
};

export type CivicDistrictDetail = {
  geography_key: string;
  geography_type: CivicGeographyType;
  plan_key: string;
  external_id: string;
  display_name: string;
  properties: Record<string, unknown>;
  release: CivicGeographyRelease;
};

export type CivicDistrictProfileKind =
  | "elected_district"
  | "community_board"
  | "joint_interest_area";

export type CivicDistrictGovernmentLevel =
  | "city_council"
  | "community_board"
  | "state_senate"
  | "state_assembly"
  | "us_house";

export type CivicDistrictProfile = {
  schema_version: "1.0";
  district: {
    district_key: string;
    geography_type: SelectableCivicGeographyType;
    label: string;
    district_number: string | null;
  };
  profile_kind: CivicDistrictProfileKind;
  organization: {
    name: string;
    government_level: CivicDistrictGovernmentLevel;
    authority_summary: string;
    responsibilities: string[];
    limitation_note: string | null;
  };
  officials: Array<{
    role: string;
    name: string | null;
    party: string | null;
    status: "current" | "acting" | "vacant";
    term: {
      starts_on: string | null;
      ends_on: string | null;
    } | null;
    portrait: {
      media_id: string;
      url: string;
      alt: string;
      attribution: string | null;
    } | null;
    contacts: {
      phone: string | null;
      email: string | null;
      contact_form_url: string | null;
      official_url: string | null;
    };
    offices: Array<{
      label: string;
      address_lines: string[];
      phone: string | null;
    }>;
    links: Array<{
      label: string;
      url: string;
    }>;
  }>;
  community_board: {
    meeting_pattern: string | null;
    calendar_url: string | null;
  } | null;
  actions: Array<{
    kind:
      | "official_page"
      | "constituent_services"
      | "email"
      | "call"
      | "board_calendar";
    label: string;
    href: string;
  }>;
  sources: Array<{
    name: string;
    url: string;
    verified_at: string;
  }>;
  freshness: {
    status: "current" | "stale" | "expired";
    verified_at: string;
    hard_expires_at: string;
  };
  as_of: string;
};

export type CivicLocationGeography = {
  geography_type: CivicGeographyType;
  geography_key: string;
  external_id: string;
  display_name: string;
};

export type CivicBorough = "Manhattan" | "Bronx" | "Brooklyn" | "Queens" | "Staten Island";

export type CivicLocationRequest =
  | {
      mode: "address";
      borough: CivicBorough;
      address_number: string;
      street_name: string;
      zip_code?: string;
      unit?: string;
    }
  | {
      mode: "gps";
      latitude: number;
      longitude: number;
    };

export type CivicLocationResponse =
  | {
      status: "resolved";
      purpose: "searched_address" | "current_physical_location";
      geographies: CivicLocationGeography[];
    }
  | {
      status: "ambiguous";
      purpose: "searched_address" | "current_physical_location";
      reason: "multiple_boundary_match" | "incomplete_boundary_match" | "source_disagreement";
      geographies: [];
    };

export type CouncilBodySummary = {
  body_id: number;
  name: string;
  body_type: string | null;
};

export type CouncilDistrictRepresentative = {
  district_id: number;
  as_of: string;
  occupant_status: "occupied" | "vacant";
  office_title: string | null;
  term_start: string;
  term_end: string | null;
  body: CouncilBodySummary;
  representative: {
    person_id: number;
    full_name: string;
    public_email: string | null;
    public_phone: string | null;
    official_url: string | null;
  } | null;
};

export type CouncilEventSummary = {
  event_id: number;
  body: CouncilBodySummary;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  raw_event_time: string | null;
  raw_event_end_time: string | null;
  time_tbd: boolean;
  status: "scheduled" | "tbd" | "deferred" | "cancelled" | "completed" | "unknown";
  status_evidence: string;
  provider_status: string | null;
  location_name: string | null;
  location_address: string | null;
  agenda_url: string | null;
  minutes_url: string | null;
  video_url: string | null;
  details_url: string | null;
  public_comment_url: string | null;
  agenda_status: string | null;
  minutes_status: string | null;
  video_status: string | null;
};

export type CouncilEventList = {
  window_start: string;
  window_end: string;
  limit: number;
  has_more: boolean;
  events: CouncilEventSummary[];
};

export type CouncilDocumentSummary = {
  document_id: number;
  file_name: string | null;
  name: string;
  description: string | null;
  document_type: string | null;
  official_url: string | null;
  matter_version: string | null;
  sort_order: number | null;
  show_on_internet: boolean | null;
  print_with_reports: boolean | null;
};

export type CouncilMatterSummary = {
  matter_id: number;
  file_number: string | null;
  name: string | null;
  title: string;
  matter_type: string | null;
  matter_status: string | null;
  introduction_date: string | null;
  agenda_date: string | null;
  passed_date: string | null;
  enactment_date: string | null;
  enactment_number: string | null;
  requester: string | null;
  notes: string | null;
  matter_version: string | null;
  documents: CouncilDocumentSummary[];
};

export type CouncilEventItemSummary = {
  event_item_id: number;
  agenda_sequence: number | null;
  minutes_sequence: number | null;
  agenda_number: string | null;
  title: string | null;
  action_name: string | null;
  action_text: string | null;
  agenda_note: string | null;
  minutes_note: string | null;
  passed_flag: boolean | null;
  roll_call_flag: boolean | null;
  tally: string | null;
  matter: CouncilMatterSummary | null;
};

export type CouncilEventDetail = CouncilEventSummary & {
  public_comment: string | null;
  items: CouncilEventItemSummary[];
};

export type PublisherNewsCard = {
  story_key: string;
  publisher: string | null;
  headline: string | null;
  canonical_url: string | null;
  published_at: string | null;
  byline: string | null;
  excerpt: string | null;
  image_url: string | null;
  geographic_label: string | null;
  sponsored_status: string;
  observed_at: string;
};

export type PublisherNewsPage = {
  items: PublisherNewsCard[];
  next_cursor: string | null;
};

export type ElectionDistrictScope = "us_house" | "nys_senate" | "nys_assembly";

export type ElectionDistrictContext = {
  scope: ElectionDistrictScope;
  geography_key: string;
  geography_type: "us_congressional" | "state_senate" | "state_assembly";
  plan_key: string;
  external_id: string;
};

export type ElectionCandidatePersonSummary = {
  full_name: string;
  given_name: string | null;
  family_name: string | null;
  role: "candidate" | "governor" | "lieutenant_governor";
  ticket_order: number;
};

export type ElectionBallotLineSummary = {
  party_key: string;
  party_name: string;
  line_number: number;
};

export type ElectionCandidacySummary = {
  candidacy_key: string;
  display_name: string;
  status: "on_ballot" | "withdrawn" | "disqualified";
  people: ElectionCandidatePersonSummary[];
  ballot_lines: ElectionBallotLineSummary[];
};

export type ElectionContestSummary = {
  contest_key: string;
  scope: "statewide" | ElectionDistrictScope;
  office_code:
    | "governor_lieutenant_governor"
    | "state_comptroller"
    | "state_attorney_general"
    | "us_representative"
    | "state_senator"
    | "state_assembly_member";
  title: string;
  district: ElectionDistrictContext | null;
  seats: number;
  vote_for: number;
  candidacies: ElectionCandidacySummary[];
};

export type Election2026Response = {
  election_key: "ny-general-2026-11-03";
  election_date: "2026-11-03";
  election_type: "general";
  display_name: string;
  coverage: "supported_scopes_only";
  complete_ballot: false;
  coverage_notice: string;
  voting_residence_notice: string;
  requested_districts: ElectionDistrictContext[];
  certification: {
    release_key: string;
    revision_number: number;
    activated_at: string;
    release_review: { decision: "approved"; reviewed_at: string };
    evidence: Array<{
      authority: "nys_sboe" | "nyc_cboe";
      source_url: string;
      source_sha256: string;
      content_length: number;
      certified_on: string;
      review_decision: "verified";
      reviewed_at: string;
    }>;
  };
  official_voter_tools: {
    provider: "NYC Board of Elections";
    poll_site_and_sample_ballot_url: "https://findmypollsite.vote.nyc/";
    usage_notice: string;
  };
  contests: ElectionContestSummary[];
};

export const CIVIC_GEOGRAPHY_LABELS: Record<CivicGeographyType, string> = {
  city_council: "City Council",
  community_district: "Community district",
  state_senate: "State Senate",
  state_assembly: "State Assembly",
  us_congressional: "U.S. House",
  election_district: "Election district",
  borough: "Borough"
};

export function isCivicGeographyType(value: string | null): value is CivicGeographyType {
  return value !== null && (CIVIC_GEOGRAPHY_TYPES as readonly string[]).includes(value);
}

export function isSelectableCivicGeographyType(
  value: string | null
): value is SelectableCivicGeographyType {
  return (
    value !== null &&
    (SELECTABLE_CIVIC_GEOGRAPHY_TYPES as readonly string[]).includes(value)
  );
}

const CIVIC_DISTRICT_KEY = /^[a-z][a-z0-9_]{1,47}:[A-Za-z0-9][A-Za-z0-9._-]{0,79}:[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

export function isCivicDistrictKey(
  value: string | null,
  geographyType?: CivicGeographyType | null
): value is string {
  return (
    value !== null &&
    value.length <= 210 &&
    CIVIC_DISTRICT_KEY.test(value) &&
    (!geographyType || value.startsWith(`${geographyType}:`))
  );
}
