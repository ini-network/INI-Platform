"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  CivicApiError,
  getCivicDistrictProfile,
  getCouncilEvents
} from "@/lib/map-feature/civic-api";
import { civicPortraitProxyUrl } from "@/lib/map-feature/civic-profile";
import {
  cacheCivicProfile,
  getCachedCivicProfile
} from "@/lib/map-feature/civic-profile-cache";
import {
  formatPersonName,
  groupCivicOffices
} from "@/lib/map-feature/civic-display";
import {
  CIVIC_GEOGRAPHY_LABELS,
  type CivicDistrictProfile,
  type CivicLocationGeography,
  type CouncilEventSummary,
  type SelectableCivicGeographyType
} from "@/lib/map-feature/civic-types";
import { CouncilDistrictCard } from "./council-district-card";
import {
  ElectionContextCard,
  type ElectionDistrictKeys
} from "./election-context-card";
import styles from "./civic-district-profile-card.module.css";

type ProfileState =
  | { districtKey: string; status: "loading" }
  | { districtKey: string; status: "missing" }
  | { districtKey: string; status: "error"; responseStatus: number }
  | { districtKey: string; status: "ready"; profile: CivicDistrictProfile };

type HelpTopicId =
  | "city-service"
  | "city-agency"
  | "state-agency"
  | "federal-agency"
  | "policy"
  | "voting";

type DetailSection = "about" | "offices" | "activity" | "elections" | "sources";

type Props = {
  districtKey: string;
  districtName: string;
  geographyType: SelectableCivicGeographyType;
  councilDistrictId: number | null;
  boundarySourceName: string | null;
  resolvedGeographies: CivicLocationGeography[] | null;
  electionDistrictKeys: ElectionDistrictKeys | null;
  changeButtonRef: React.Ref<HTMLButtonElement>;
  onChangeDistrict: () => void;
  onRouteToGeography: (geographyType: SelectableCivicGeographyType) => void;
  onRequestAddressSearch: () => void;
  resourceNavigatorEnabled: boolean;
  onOpenResourceNavigator: () => void;
};

type LinkAction = {
  href: string;
  label: string;
};

const HELP_TOPICS: Array<{
  id: HelpTopicId;
  label: string;
  examples: string;
}> = [
  {
    id: "city-service",
    label: "Report a City service problem",
    examples: "Potholes, garbage, noise, heat, or streetlights"
  },
  {
    id: "city-agency",
    label: "Help with a City agency or benefit",
    examples: "NYCHA, SNAP, Housing Connect, or another City agency"
  },
  {
    id: "state-agency",
    label: "Help with a New York State agency",
    examples: "DMV, unemployment, Medicaid, taxes, or utilities"
  },
  {
    id: "federal-agency",
    label: "Help with a federal agency",
    examples: "Passports, immigration, IRS, Social Security, or veterans"
  },
  {
    id: "policy",
    label: "Laws, budgets, or policy",
    examples: "Find the level of government responsible for an issue"
  },
  {
    id: "voting",
    label: "Voting or elections",
    examples: "Ballot information, poll sites, and election details"
  }
];

function formatDate(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York"
  }).format(date);
}

function formatTermDate(value: string): string {
  const date = new Date(`${value}T12:00:00-04:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York"
  }).format(date);
}

function formatEventDate(value: string): string {
  const date = new Date(`${value}T12:00:00-04:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York"
  }).format(date);
}

function formatEventTime(event: CouncilEventSummary): string {
  if (event.time_tbd || !event.start_time) return "Time to be announced";
  const [hour = "0", minute = "00"] = event.start_time.split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function initials(name: string | null): string {
  if (!name) return "NYC";
  return (formatPersonName(name) ?? name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function externalLinkProps(href: string) {
  return href.startsWith("https:")
    ? ({ target: "_blank", rel: "noreferrer" } as const)
    : {};
}

function firstCurrentOfficial(profile: CivicDistrictProfile) {
  return (
    profile.officials.find((official) => official.status === "current") ??
    profile.officials.find((official) => official.status === "acting") ??
    profile.officials[0] ??
    null
  );
}

function officialPageAction(profile: CivicDistrictProfile): LinkAction | null {
  const official = firstCurrentOfficial(profile);
  const href =
    official?.contacts.official_url ??
    profile.actions.find((action) => action.kind === "official_page")?.href ??
    null;
  return href ? { href, label: "Official site" } : null;
}

function messageAction(profile: CivicDistrictProfile): LinkAction | null {
  const official = firstCurrentOfficial(profile);
  if (!official || official.status === "vacant") return null;
  if (official.contacts.contact_form_url) {
    return { href: official.contacts.contact_form_url, label: "Message" };
  }
  if (official.contacts.email) {
    return { href: `mailto:${official.contacts.email}`, label: "Message" };
  }
  return null;
}

function callAction(profile: CivicDistrictProfile): LinkAction | null {
  const official = firstCurrentOfficial(profile);
  if (!official || official.status === "vacant" || !official.contacts.phone) return null;
  return { href: `tel:${official.contacts.phone}`, label: "Call" };
}

function constituentHelpAction(profile: CivicDistrictProfile): LinkAction | null {
  const official = firstCurrentOfficial(profile);
  const serviceAction = profile.actions.find((action) => action.kind === "constituent_services");
  if (official && official.status !== "vacant") {
    if (official.contacts.contact_form_url) {
      return { href: official.contacts.contact_form_url, label: "Contact this office" };
    }
    if (serviceAction) {
      return { href: serviceAction.href, label: serviceAction.label };
    }
    if (official.contacts.email) {
      return { href: `mailto:${official.contacts.email}`, label: "Email this office" };
    }
    if (official.contacts.phone) {
      return { href: `tel:${official.contacts.phone}`, label: "Call this office" };
    }
  }
  return officialPageAction(profile);
}

function Portrait({
  portrait,
  name
}: {
  portrait: CivicDistrictProfile["officials"][number]["portrait"];
  name: string | null;
}) {
  const src = civicPortraitProxyUrl(portrait);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = src !== null && loadedSrc === src;
  const failed = src !== null && failedSrc === src;
  if (!src || failed) {
    return (
      <span className={styles.initials} data-testid="civic-profile-initials" aria-hidden="true">
        {initials(name)}
      </span>
    );
  }
  return (
    <span className={styles.portraitWrap}>
      <span
        className={`${styles.portraitFallback}${loaded ? ` ${styles.portraitFallbackHidden}` : ""}`}
        data-testid="civic-profile-initials"
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      <Image
        className={`${styles.portrait}${loaded ? ` ${styles.portraitLoaded}` : ""}`}
        data-testid="civic-profile-portrait"
        src={src}
        alt={name ? `Portrait of ${formatPersonName(name) ?? name}` : portrait?.alt ?? ""}
        width={72}
        height={72}
        unoptimized
        onLoad={() => setLoadedSrc(src)}
        onError={() => setFailedSrc(src)}
      />
      {loaded && portrait?.attribution ? (
        <span className={styles.portraitAttribution}>{portrait.attribution}</span>
      ) : null}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m6 8 4 4 4-4" />
    </svg>
  );
}

function DistrictHeader({
  districtName,
  geographyType,
  changeButtonRef,
  onChangeDistrict
}: {
  districtName: string;
  geographyType: SelectableCivicGeographyType;
  changeButtonRef: React.Ref<HTMLButtonElement>;
  onChangeDistrict: () => void;
}) {
  return (
    <header className={styles.districtHeader}>
      <div className={styles.districtIdentity}>
        <span className={styles.boundaryIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="m5 4 5 2 4-2 5 2v14l-5-2-4 2-5-2V4Z" />
            <path d="M10 6v14M14 4v14" />
          </svg>
        </span>
        <div>
          <p className={styles.eyebrow}>{CIVIC_GEOGRAPHY_LABELS[geographyType]}</p>
          <h2>{districtName}</h2>
        </div>
      </div>
      <button
        ref={changeButtonRef}
        type="button"
        className={styles.changeButton}
        onClick={onChangeDistrict}
      >
        Change district
      </button>
    </header>
  );
}

function Disclosure({
  title,
  description,
  open,
  onOpenChange,
  children,
  testId
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <details
      className={styles.disclosure}
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
      data-testid={testId}
    >
      <summary>
        <span>
          <strong>{title}</strong>
          {description ? <small>{description}</small> : null}
        </span>
        <span className={styles.disclosureChevron}>
          <ChevronIcon />
        </span>
      </summary>
      <div className={styles.disclosureBody}>{children}</div>
    </details>
  );
}

function TargetGovernmentAction({
  label,
  geographyType,
  currentGeographyType,
  profile,
  resolvedGeographies,
  onRouteToGeography,
  onRequestAddressSearch,
  purpose = "help"
}: {
  label: string;
  geographyType: SelectableCivicGeographyType;
  currentGeographyType: SelectableCivicGeographyType;
  profile: CivicDistrictProfile;
  resolvedGeographies: CivicLocationGeography[] | null;
  onRouteToGeography: (geographyType: SelectableCivicGeographyType) => void;
  onRequestAddressSearch: () => void;
  purpose?: "help" | "policy";
}) {
  if (geographyType === currentGeographyType) {
    const action = purpose === "help" ? constituentHelpAction(profile) : officialPageAction(profile);
    if (action) {
      return (
        <a className={styles.routeAction} href={action.href} {...externalLinkProps(action.href)}>
          {purpose === "help" ? action.label : `Open this ${label}`}
        </a>
      );
    }
  }

  const resolved = resolvedGeographies?.find(
    (geography) => geography.geography_type === geographyType
  );
  if (resolved) {
    return (
      <button
        type="button"
        className={styles.routeAction}
        onClick={() => onRouteToGeography(geographyType)}
      >
        Show my {label}
      </button>
    );
  }

  return (
    <button type="button" className={styles.routeAction} onClick={onRequestAddressSearch}>
      Search my address for {label}
    </button>
  );
}

function HelpResult({
  topic,
  profile,
  geographyType,
  resolvedGeographies,
  hasElectionContext,
  onRouteToGeography,
  onRequestAddressSearch,
  onShowElections
}: {
  topic: HelpTopicId;
  profile: CivicDistrictProfile;
  geographyType: SelectableCivicGeographyType;
  resolvedGeographies: CivicLocationGeography[] | null;
  hasElectionContext: boolean;
  onRouteToGeography: (geographyType: SelectableCivicGeographyType) => void;
  onRequestAddressSearch: () => void;
  onShowElections: () => void;
}) {
  if (topic === "city-service") {
    return (
      <div className={styles.helpResult} role="status">
        <strong>NYC311 is the right first stop.</strong>
        <p>File and track non-emergency City service requests with the agency responsible.</p>
        <a
          className={styles.routeAction}
          href="https://portal.311.nyc.gov/resources/"
          target="_blank"
          rel="noreferrer"
        >
          Browse NYC311 topics
        </a>
      </div>
    );
  }

  if (topic === "city-agency") {
    return (
      <div className={styles.helpResult} role="status">
        <strong>Your City Council office can help navigate City agencies.</strong>
        <p>Use it for City programs, benefits, NYCHA, or an unresolved City-agency problem.</p>
        <TargetGovernmentAction
          label="City Council district"
          geographyType="city_council"
          currentGeographyType={geographyType}
          profile={profile}
          resolvedGeographies={resolvedGeographies}
          onRouteToGeography={onRouteToGeography}
          onRequestAddressSearch={onRequestAddressSearch}
        />
      </div>
    );
  }

  if (topic === "state-agency") {
    return (
      <div className={styles.helpResult} role="status">
        <strong>Your state legislators can help with New York State agencies.</strong>
        <p>You may contact either your State Senator or Assembly Member for constituent help.</p>
        <div className={styles.routeActions}>
          <TargetGovernmentAction
            label="State Senate district"
            geographyType="state_senate"
            currentGeographyType={geographyType}
            profile={profile}
            resolvedGeographies={resolvedGeographies}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
          />
          <TargetGovernmentAction
            label="State Assembly district"
            geographyType="state_assembly"
            currentGeographyType={geographyType}
            profile={profile}
            resolvedGeographies={resolvedGeographies}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
          />
        </div>
      </div>
    );
  }

  if (topic === "federal-agency") {
    return (
      <div className={styles.helpResult} role="status">
        <strong>Your U.S. House office handles federal casework.</strong>
        <p>Casework can help you navigate federal agencies, but it cannot guarantee an outcome.</p>
        <TargetGovernmentAction
          label="U.S. House district"
          geographyType="us_congressional"
          currentGeographyType={geographyType}
          profile={profile}
          resolvedGeographies={resolvedGeographies}
          onRouteToGeography={onRouteToGeography}
          onRequestAddressSearch={onRequestAddressSearch}
        />
      </div>
    );
  }

  if (topic === "policy") {
    return (
      <div className={styles.helpResult} role="status">
        <strong>Choose the level that makes the decision.</strong>
        <p>City Council covers NYC laws and budgets; Albany covers state policy; Congress covers federal policy.</p>
        <div className={styles.routeActions}>
          <TargetGovernmentAction
            label="City Council district"
            geographyType="city_council"
            currentGeographyType={geographyType}
            profile={profile}
            resolvedGeographies={resolvedGeographies}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
            purpose="policy"
          />
          <TargetGovernmentAction
            label="State Senate district"
            geographyType="state_senate"
            currentGeographyType={geographyType}
            profile={profile}
            resolvedGeographies={resolvedGeographies}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
            purpose="policy"
          />
          <TargetGovernmentAction
            label="State Assembly district"
            geographyType="state_assembly"
            currentGeographyType={geographyType}
            profile={profile}
            resolvedGeographies={resolvedGeographies}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
            purpose="policy"
          />
          <TargetGovernmentAction
            label="U.S. House district"
            geographyType="us_congressional"
            currentGeographyType={geographyType}
            profile={profile}
            resolvedGeographies={resolvedGeographies}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
            purpose="policy"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.helpResult} role="status">
      <strong>Use your registered home address for voting information.</strong>
      <p>Poll sites and ballots can change by election and address.</p>
      {hasElectionContext ? (
        <button type="button" className={styles.routeAction} onClick={onShowElections}>
          View election details for this address
        </button>
      ) : (
        <a
          className={styles.routeAction}
          href="https://www.vote.nyc/page/find-your-poll-site"
          target="_blank"
          rel="noreferrer"
        >
          Find my poll site and ballot
        </a>
      )}
    </div>
  );
}

function HelpRouter({
  open,
  selectedTopic,
  profile,
  geographyType,
  resolvedGeographies,
  hasElectionContext,
  onToggle,
  onSelectTopic,
  onRouteToGeography,
  onRequestAddressSearch,
  onShowElections
}: {
  open: boolean;
  selectedTopic: HelpTopicId | null;
  profile: CivicDistrictProfile;
  geographyType: SelectableCivicGeographyType;
  resolvedGeographies: CivicLocationGeography[] | null;
  hasElectionContext: boolean;
  onToggle: () => void;
  onSelectTopic: (topic: HelpTopicId) => void;
  onRouteToGeography: (geographyType: SelectableCivicGeographyType) => void;
  onRequestAddressSearch: () => void;
  onShowElections: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className={styles.primaryHelpButton}
        aria-expanded={open}
        aria-controls="civic-help-router"
        onClick={onToggle}
      >
        Get help
      </button>
      {open ? (
        <section id="civic-help-router" className={styles.helpRouter} aria-label="Civic help options">
          <header>
            <p className={styles.eyebrow}>Start here</p>
            <h3>What do you need help with?</h3>
            <p>We’ll point you to the right level of government.</p>
          </header>
          <div className={styles.helpTopics}>
            {HELP_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className={`${styles.helpTopic}${selectedTopic === topic.id ? ` ${styles.helpTopicActive}` : ""}`}
                aria-pressed={selectedTopic === topic.id}
                onClick={() => onSelectTopic(topic.id)}
              >
                <strong>{topic.label}</strong>
                <span>{topic.examples}</span>
              </button>
            ))}
          </div>
          {selectedTopic ? (
            <HelpResult
              topic={selectedTopic}
              profile={profile}
              geographyType={geographyType}
              resolvedGeographies={resolvedGeographies}
              hasElectionContext={hasElectionContext}
              onRouteToGeography={onRouteToGeography}
              onRequestAddressSearch={onRequestAddressSearch}
              onShowElections={onShowElections}
            />
          ) : null}
          <p className={styles.emergencyNote}>
            Emergency or immediate danger? Call <a href="tel:911">911</a>.
          </p>
        </section>
      ) : null}
    </>
  );
}

function CouncilActivity() {
  const [events, setEvents] = useState<CouncilEventSummary[] | null | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    getCouncilEvents({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setEvents(result.events);
      })
      .catch(() => {
        if (!controller.signal.aborted) setEvents(null);
      });
    return () => controller.abort();
  }, []);

  const nextEvent = events?.[0] ?? null;
  return (
    <div className={styles.activityBody}>
      {events === undefined ? <p>Loading the citywide Council schedule…</p> : null}
      {nextEvent ? (
        <article className={styles.nextEvent}>
          <p className={styles.eyebrow}>Next citywide meeting</p>
          <strong>{nextEvent.title}</strong>
          <span>
            {formatEventDate(nextEvent.event_date)} · {formatEventTime(nextEvent)} · {nextEvent.body.name}
          </span>
          {nextEvent.details_url || nextEvent.agenda_url ? (
            <a
              href={nextEvent.details_url ?? nextEvent.agenda_url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              View meeting details
            </a>
          ) : null}
        </article>
      ) : events !== undefined ? (
        <p>No upcoming meeting is currently listed here. The official calendar remains available.</p>
      ) : null}
      <a
        className={styles.routeAction}
        href="https://legistar.council.nyc.gov/Calendar.aspx"
        target="_blank"
        rel="noreferrer"
      >
        View the official Council calendar
      </a>
    </div>
  );
}

function DataSources({
  profile,
  boundarySourceName
}: {
  profile: CivicDistrictProfile;
  boundarySourceName: string | null;
}) {
  return (
    <div className={styles.sourceBody}>
      <p>
        Profile verified {formatDate(profile.freshness.verified_at)}. Information is current as of {formatDate(profile.as_of)}.
      </p>
      {boundarySourceName ? <p>Boundary source: {boundarySourceName}</p> : null}
      {profile.sources.length > 0 ? (
        <ul>
          {profile.sources.map((source) => (
            <li key={`${source.name}-${source.url}`}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Source links are not currently listed.</p>
      )}
    </div>
  );
}

function LoadingProfile({
  districtName,
  geographyType,
  changeButtonRef,
  onChangeDistrict
}: {
  districtName: string;
  geographyType: SelectableCivicGeographyType;
  changeButtonRef: React.Ref<HTMLButtonElement>;
  onChangeDistrict: () => void;
}) {
  return (
    <section
      className={`${styles.card} ${styles.loadingCard}`}
      aria-label="Loading civic district profile"
      aria-busy="true"
    >
      <DistrictHeader
        districtName={districtName}
        geographyType={geographyType}
        changeButtonRef={changeButtonRef}
        onChangeDistrict={onChangeDistrict}
      />
      <div className={styles.skeletonPerson}>
        <span className={styles.skeletonAvatar} />
        <span className={styles.skeletonCopy} />
      </div>
      <span className={styles.skeletonAction} />
      <span className={styles.srOnly}>Loading district representative</span>
    </section>
  );
}

function ReadyProfile({
  profile,
  geographyType,
  boundarySourceName,
  resolvedGeographies,
  electionDistrictKeys,
  helpOpen,
  selectedHelpTopic,
  openSections,
  changeButtonRef,
  onChangeDistrict,
  onToggleHelp,
  onSelectHelpTopic,
  onSetSection,
  onRouteToGeography,
  onRequestAddressSearch,
  resourceNavigatorEnabled,
  onOpenResourceNavigator
}: {
  profile: CivicDistrictProfile;
  geographyType: SelectableCivicGeographyType;
  boundarySourceName: string | null;
  resolvedGeographies: CivicLocationGeography[] | null;
  electionDistrictKeys: ElectionDistrictKeys | null;
  helpOpen: boolean;
  selectedHelpTopic: HelpTopicId | null;
  openSections: Set<DetailSection>;
  changeButtonRef: React.Ref<HTMLButtonElement>;
  onChangeDistrict: () => void;
  onToggleHelp: () => void;
  onSelectHelpTopic: (topic: HelpTopicId) => void;
  onSetSection: (section: DetailSection, open: boolean) => void;
  onRouteToGeography: (geographyType: SelectableCivicGeographyType) => void;
  onRequestAddressSearch: () => void;
  resourceNavigatorEnabled: boolean;
  onOpenResourceNavigator: () => void;
}) {
  const isCommunityBoard = profile.profile_kind === "community_board";
  const isJointInterestArea = profile.profile_kind === "joint_interest_area";
  const directCall = callAction(profile);
  const directMessage = messageAction(profile);
  const directOfficialPage = officialPageAction(profile);
  const officeGroups = groupCivicOffices(profile);
  const officeLinks = profile.officials
    .flatMap((official) => official.links)
    .filter((link) => /\boffice(?:s| locations?)?\b/i.test(link.label))
    .filter((link, index, links) => links.findIndex((candidate) => candidate.url === link.url) === index);

  return (
    <section className={styles.card} aria-label={`Civic profile for ${profile.district.label}`}>
      <DistrictHeader
        districtName={profile.district.label}
        geographyType={geographyType}
        changeButtonRef={changeButtonRef}
        onChangeDistrict={onChangeDistrict}
      />

      {isJointInterestArea ? (
        <div className={styles.advisory} role="note">
          <strong>Shared community interest area</strong>
          <p>{profile.organization.authority_summary}</p>
          {profile.organization.limitation_note ? <p>{profile.organization.limitation_note}</p> : null}
        </div>
      ) : profile.officials.length > 0 ? (
        <div className={styles.officials}>
          {profile.officials.map((official, index) => (
            <article className={styles.official} key={`${official.role}-${official.name ?? index}`}>
              <div className={styles.personRow}>
                <Portrait portrait={official.portrait} name={official.name} />
                <div className={styles.personCopy}>
                  <strong>
                    {formatPersonName(official.name) ?? (official.status === "vacant" ? "Seat vacant" : "Name not listed")}
                  </strong>
                  <span>{official.role}</span>
                  <div className={styles.neutralMeta}>
                    {official.party ? <span>{official.party}</span> : null}
                    {official.status !== "current" ? (
                      <span>{official.status === "acting" ? "Acting" : "Vacant"}</span>
                    ) : null}
                    {official.term?.ends_on ? <span>Term ends {formatTermDate(official.term.ends_on)}</span> : null}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.emptyOfficial}>No current official is listed in the verified directory profile.</p>
      )}

      <div className={styles.primaryActions} aria-label="Primary civic actions">
        {resourceNavigatorEnabled ? (
          <button
            type="button"
            className={styles.primaryHelpButton}
            onClick={onOpenResourceNavigator}
          >
            Get help
          </button>
        ) : (
          <HelpRouter
            open={helpOpen}
            selectedTopic={selectedHelpTopic}
            profile={profile}
            geographyType={geographyType}
            resolvedGeographies={resolvedGeographies}
            hasElectionContext={electionDistrictKeys !== null}
            onToggle={onToggleHelp}
            onSelectTopic={onSelectHelpTopic}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
            onShowElections={() => onSetSection("elections", true)}
          />
        )}
        {directCall ? <a href={directCall.href}>{directCall.label}</a> : null}
        {directMessage ? (
          <a href={directMessage.href} {...externalLinkProps(directMessage.href)}>
            {directMessage.label}
          </a>
        ) : null}
        {directOfficialPage ? (
          <a
            className={styles.officialSiteLink}
            href={directOfficialPage.href}
            {...externalLinkProps(directOfficialPage.href)}
          >
            {directOfficialPage.label}
          </a>
        ) : null}
      </div>

      {!isJointInterestArea ? (
        <p className={styles.profileIntro}>{profile.organization.authority_summary}</p>
      ) : null}

      <div className={styles.detailStack}>
        <Disclosure
          title={isJointInterestArea ? "About this area" : "What this office does"}
          description={profile.organization.name}
          open={openSections.has("about")}
          onOpenChange={(open) => onSetSection("about", open)}
        >
          {profile.organization.responsibilities.length > 0 ? (
            <ul>
              {profile.organization.responsibilities.map((responsibility) => (
                <li key={responsibility}>{responsibility}</li>
              ))}
            </ul>
          ) : null}
          {profile.organization.limitation_note ? (
            <p className={styles.limitNote}>{profile.organization.limitation_note}</p>
          ) : null}
          {isCommunityBoard && profile.community_board?.meeting_pattern ? (
            <p>{profile.community_board.meeting_pattern}</p>
          ) : null}
          {isCommunityBoard && profile.community_board?.calendar_url ? (
            <nav className={styles.secondaryLinks} aria-label="Community Board calendar">
              <a
                href={profile.community_board.calendar_url}
                target="_blank"
                rel="noreferrer"
              >
                Open the official board calendar
              </a>
            </nav>
          ) : null}
        </Disclosure>

        {officeGroups.length > 0 || officeLinks.length > 0 ? (
          <Disclosure
            title="Visit or contact an office"
            description={officeGroups.length > 0 ? `${officeGroups.length} ${officeGroups.length === 1 ? "location" : "locations"}` : "Official locations"}
            open={openSections.has("offices")}
            onOpenChange={(open) => onSetSection("offices", open)}
            testId="civic-office-disclosure"
          >
            {officeGroups.length > 0 ? <div className={styles.officeList}>
              {officeGroups.map((office) => (
                <address key={office.addressLines.join("|") || office.entries.map((entry) => entry.label).join("|")}>
                  {office.entries.map((entry) => (
                    <div key={`${entry.role}-${entry.label}-${entry.phone ?? ""}`}>
                      <strong>{entry.label}</strong>
                      {profile.officials.length > 1 ? <small>{entry.role}</small> : null}
                      {entry.phone ? <a href={`tel:${entry.phone}`}>{entry.phone}</a> : null}
                    </div>
                  ))}
                  {office.addressLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </address>
              ))}
            </div> : null}
            {officeLinks.length > 0 ? (
              <nav className={styles.secondaryLinks} aria-label="Official office-location pages">
                {officeLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                ))}
              </nav>
            ) : null}
          </Disclosure>
        ) : null}

        {geographyType === "city_council" ? (
          <Disclosure
            title="Upcoming meetings"
            description="NYC Council public schedule"
            open={openSections.has("activity")}
            onOpenChange={(open) => onSetSection("activity", open)}
          >
            <CouncilActivity />
          </Disclosure>
        ) : null}

        {electionDistrictKeys ? (
          <Disclosure
            title="Voting and elections"
            description="Verified information for the searched address"
            open={openSections.has("elections")}
            onOpenChange={(open) => onSetSection("elections", open)}
            testId="civic-election-disclosure"
          >
            <ElectionContextCard districtKeys={electionDistrictKeys} embedded />
          </Disclosure>
        ) : null}

        <Disclosure
          title="Data and sources"
          description={`Last checked ${formatDate(profile.freshness.verified_at)}`}
          open={openSections.has("sources")}
          onOpenChange={(open) => onSetSection("sources", open)}
        >
          {profile.freshness.status === "stale" ? (
            <p className={styles.staleNotice}>This profile is awaiting its next verification.</p>
          ) : null}
          <DataSources profile={profile} boundarySourceName={boundarySourceName} />
        </Disclosure>
      </div>
    </section>
  );
}

function ExpiredProfile({
  profile,
  geographyType,
  boundarySourceName,
  resolvedGeographies,
  electionDistrictKeys,
  helpOpen,
  selectedHelpTopic,
  openSections,
  changeButtonRef,
  onChangeDistrict,
  onToggleHelp,
  onSelectHelpTopic,
  onSetSection,
  onRouteToGeography,
  onRequestAddressSearch,
  resourceNavigatorEnabled,
  onOpenResourceNavigator
}: Parameters<typeof ReadyProfile>[0]) {
  const isJointInterestArea = profile.profile_kind === "joint_interest_area";
  const lookupAction = officialPageAction(profile);
  return (
    <section className={styles.card} aria-label={`Expired civic profile for ${profile.district.label}`}>
      <DistrictHeader
        districtName={profile.district.label}
        geographyType={geographyType}
        changeButtonRef={changeButtonRef}
        onChangeDistrict={onChangeDistrict}
      />
      <div className={styles.expiredNotice} role="status">
        <strong>
          {isJointInterestArea
            ? "District details need verification"
            : "Representation details need verification"}
        </strong>
        <p>
          {isJointInterestArea
            ? "This geography explanation is awaiting renewed verification."
            : "We are not showing names or contact details from this profile."}
        </p>
        <p>Its verification window ended {formatDate(profile.freshness.hard_expires_at)}.</p>
      </div>
      <div className={styles.primaryActions} aria-label="Primary civic actions">
        {resourceNavigatorEnabled ? (
          <button
            type="button"
            className={styles.primaryHelpButton}
            onClick={onOpenResourceNavigator}
          >
            Get help
          </button>
        ) : (
          <HelpRouter
            open={helpOpen}
            selectedTopic={selectedHelpTopic}
            profile={profile}
            geographyType={geographyType}
            resolvedGeographies={resolvedGeographies}
            hasElectionContext={electionDistrictKeys !== null}
            onToggle={onToggleHelp}
            onSelectTopic={onSelectHelpTopic}
            onRouteToGeography={onRouteToGeography}
            onRequestAddressSearch={onRequestAddressSearch}
            onShowElections={() => onSetSection("elections", true)}
          />
        )}
        {lookupAction ? (
          <a href={lookupAction.href} {...externalLinkProps(lookupAction.href)}>
            Check the official source
          </a>
        ) : null}
      </div>
      <div className={styles.detailStack}>
        <Disclosure
          title={isJointInterestArea ? "About this area" : "What this office does"}
          description={profile.organization.name}
          open={openSections.has("about")}
          onOpenChange={(open) => onSetSection("about", open)}
        >
          <p>{profile.organization.authority_summary}</p>
        </Disclosure>
        <Disclosure
          title="Data and sources"
          description={`Expired ${formatDate(profile.freshness.hard_expires_at)}`}
          open={openSections.has("sources")}
          onOpenChange={(open) => onSetSection("sources", open)}
        >
          <DataSources profile={profile} boundarySourceName={boundarySourceName} />
        </Disclosure>
      </div>
    </section>
  );
}

export function CivicDistrictProfileCard({
  districtKey,
  districtName,
  geographyType,
  councilDistrictId,
  boundarySourceName,
  resolvedGeographies,
  electionDistrictKeys,
  changeButtonRef,
  onChangeDistrict,
  onRouteToGeography,
  onRequestAddressSearch,
  resourceNavigatorEnabled,
  onOpenResourceNavigator
}: Props) {
  const cachedProfile = getCachedCivicProfile(districtKey);
  const [retryToken, setRetryToken] = useState(0);
  const [state, setState] = useState<ProfileState>(() =>
    cachedProfile
      ? { districtKey, status: "ready", profile: cachedProfile }
      : { districtKey, status: "loading" }
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedHelpTopic, setSelectedHelpTopic] = useState<HelpTopicId | null>(null);
  const [openSections, setOpenSections] = useState<Set<DetailSection>>(() => new Set());
  const requestSequence = useRef(0);

  const setSection = useCallback((section: DetailSection, open: boolean) => {
    setOpenSections((current) => {
      if (open) return new Set([section]);
      return current.has(section) ? new Set() : current;
    });
  }, []);

  useEffect(() => {
    const cached = getCachedCivicProfile(districtKey);
    if (cached && retryToken === 0) {
      return;
    }

    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    getCivicDistrictProfile(districtKey, controller.signal)
      .then((profile) => {
        if (
          controller.signal.aborted ||
          sequence !== requestSequence.current ||
          profile.district.geography_type !== geographyType
        ) {
          return;
        }
        cacheCivicProfile(profile);
        setState({ districtKey, status: "ready", profile });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        if (error instanceof CivicApiError && error.status === 404) {
          setState({ districtKey, status: "missing" });
          return;
        }
        setState({
          districtKey,
          status: "error",
          responseStatus: error instanceof CivicApiError ? error.status : 0
        });
      });
    return () => controller.abort();
  }, [districtKey, geographyType, retryToken]);

  const profile = useMemo(() => {
    if (state.districtKey === districtKey && state.status === "ready") return state.profile;
    return getCachedCivicProfile(districtKey);
  }, [districtKey, state]);

  if (!profile && (state.districtKey !== districtKey || state.status === "loading")) {
    return (
      <LoadingProfile
        districtName={districtName}
        geographyType={geographyType}
        changeButtonRef={changeButtonRef}
        onChangeDistrict={onChangeDistrict}
      />
    );
  }
  if (!profile && state.status === "missing") {
    if (geographyType === "city_council" && councilDistrictId !== null) {
      return (
        <div className={styles.legacyFallback}>
          <section className={styles.fallbackHeader}>
            <DistrictHeader
              districtName={districtName}
              geographyType={geographyType}
              changeButtonRef={changeButtonRef}
              onChangeDistrict={onChangeDistrict}
            />
          </section>
          <CouncilDistrictCard districtId={councilDistrictId} districtName={districtName} />
        </div>
      );
    }
    return (
      <section className={styles.unavailable} role="status">
        <DistrictHeader
          districtName={districtName}
          geographyType={geographyType}
          changeButtonRef={changeButtonRef}
          onChangeDistrict={onChangeDistrict}
        />
        <strong>District profile not available yet</strong>
        <p>The official boundary remains available while this directory profile is disabled or unknown.</p>
      </section>
    );
  }
  if (!profile && state.status === "error") {
    return (
      <section className={styles.unavailable} role="status">
        <DistrictHeader
          districtName={districtName}
          geographyType={geographyType}
          changeButtonRef={changeButtonRef}
          onChangeDistrict={onChangeDistrict}
        />
        <strong>
          {state.responseStatus === 503
            ? "District profile temporarily unavailable"
            : "We could not load this district profile"}
        </strong>
        <p>The boundary and district controls still work. Try the profile again.</p>
        <button
          type="button"
          onClick={() => {
            setState({ districtKey, status: "loading" });
            setRetryToken((token) => token + 1);
          }}
        >
          Retry profile
        </button>
      </section>
    );
  }
  if (!profile) {
    return (
      <LoadingProfile
        districtName={districtName}
        geographyType={geographyType}
        changeButtonRef={changeButtonRef}
        onChangeDistrict={onChangeDistrict}
      />
    );
  }

  const sharedProps = {
    profile,
    geographyType,
    boundarySourceName,
    resolvedGeographies,
    electionDistrictKeys,
    helpOpen,
    selectedHelpTopic,
    openSections,
    changeButtonRef,
    onChangeDistrict,
    onToggleHelp: () => setHelpOpen((open) => !open),
    onSelectHelpTopic: (topic: HelpTopicId) => setSelectedHelpTopic(topic),
    onSetSection: setSection,
    onRouteToGeography,
    onRequestAddressSearch,
    resourceNavigatorEnabled,
    onOpenResourceNavigator
  };

  return profile.freshness.status === "expired" ? (
    <ExpiredProfile {...sharedProps} />
  ) : (
    <ReadyProfile {...sharedProps} />
  );
}
