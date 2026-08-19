"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CivicApiError,
  getCivicDistrictProfile,
  getCouncilEvent,
  getCouncilEvents
} from "@/lib/map-feature/civic-api";
import { civicPortraitProxyUrl } from "@/lib/map-feature/civic-profile";
import {
  cacheCivicProfile,
  getCachedCivicProfile
} from "@/lib/map-feature/civic-profile-cache";
import {
  buildCivicTeam,
  civicResourceTopic,
  CIVIC_RESOURCE_TOPICS,
  type CivicNavigatorScope,
  type CivicResourceContext,
  type NavigatorView
} from "@/lib/map-feature/civic-resources";
import {
  canonicalActionHref,
  formatPersonName,
  groupCivicOffices
} from "@/lib/map-feature/civic-display";
import type {
  CivicDistrictProfile,
  CouncilEventDetail,
  CouncilEventSummary,
  SelectableCivicGeographyType
} from "@/lib/map-feature/civic-types";
import {
  ElectionContextCard,
  type ElectionDistrictKeys
} from "./election-context-card";
import styles from "./civic-resource-navigator.module.css";

type ProfileLoadState =
  | { status: "loading" }
  | { status: "ready"; profile: CivicDistrictProfile }
  | { status: "missing" }
  | { status: "error" };

type ProfileStateMap = Partial<Record<SelectableCivicGeographyType, ProfileLoadState>>;

type Props = {
  scope: CivicNavigatorScope | null;
  context: CivicResourceContext | null;
  electionDistrictKeys: ElectionDistrictKeys | null;
  onClose: () => void;
  onChangeAddress: () => void;
  onForgetAddress: () => void;
  onReturnToSavedAddress: () => void;
  onSelectMember: (geographyType: SelectableCivicGeographyType) => void;
  onRequestAddressSearch: () => void;
};

const TEAM_LABELS: Record<SelectableCivicGeographyType, string> = {
  community_district: "Community Board",
  city_council: "City Council",
  state_assembly: "State Assembly",
  state_senate: "State Senate",
  us_congressional: "U.S. House"
};

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 18-6-6 6-6M9 12h10" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

function initials(name: string | null): string {
  if (!name) return "NYC";
  return (formatPersonName(name) ?? name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ProfilePortrait({ profile }: { profile: CivicDistrictProfile }) {
  const official = profile.freshness.status === "expired" ? null : profile.officials[0] ?? null;
  const [loaded, setLoaded] = useState(false);
  const src = official?.portrait ? civicPortraitProxyUrl(official.portrait) : null;
  return (
    <span className={styles.portrait} aria-hidden="true">
      <span className={loaded ? styles.portraitInitialsHidden : styles.portraitInitials}>
        {initials(official?.name ?? null)}
      </span>
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="56px"
          unoptimized
          className={loaded ? styles.portraitImageLoaded : styles.portraitImage}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      ) : null}
    </span>
  );
}

function externalProps(href: string) {
  return href.startsWith("http") ? { target: "_blank" as const, rel: "noreferrer" } : {};
}

function profileActions(profile: CivicDistrictProfile) {
  if (profile.freshness.status === "expired") return [];
  const official = profile.officials[0];
  if (!official) return [];
  const actions: Array<{ label: string; href: string }> = [];
  if (official.contacts.phone) actions.push({ label: "Call", href: `tel:${official.contacts.phone}` });
  if (official.contacts.contact_form_url) {
    actions.push({ label: "Message", href: official.contacts.contact_form_url });
  } else if (official.contacts.email) {
    actions.push({ label: "Message", href: `mailto:${official.contacts.email}` });
  }
  if (official.contacts.official_url) actions.push({ label: "Official page", href: official.contacts.official_url });
  for (const action of profile.actions) {
    if (action.kind === "official_page" && official.contacts.official_url) continue;
    if (!actions.some((existing) => canonicalActionHref(existing.href) === canonicalActionHref(action.href))) {
      actions.push({ label: action.label, href: action.href });
    }
  }
  return actions.slice(0, 4);
}

function officialNames(profile: CivicDistrictProfile): string {
  if (profile.freshness.status === "expired") return "Profile awaiting verification";
  const names = profile.officials
    .map((official) => formatPersonName(official.name))
    .filter((name): name is string => Boolean(name));
  if (names.length > 0) return names.slice(0, 2).join(" and ");
  return profile.officials.some((official) => official.status === "vacant")
    ? "Office currently vacant"
    : "Official not listed";
}

function TeamMemberDetail({ profile }: { profile: CivicDistrictProfile }) {
  const officials = profile.freshness.status === "expired" ? [] : profile.officials;
  const actions = profileActions(profile);
  const officeGroups = groupCivicOffices(profile);
  const officeLinks = officials
    .flatMap((official) => official.links)
    .filter((link) => /\boffice(?:s| locations?)?\b/i.test(link.label))
    .filter((link, index, links) =>
      links.findIndex((candidate) => canonicalActionHref(candidate.url) === canonicalActionHref(link.url)) === index
    );
  return (
    <article className={styles.memberDetail} aria-label={`${profile.district.label} details`}>
      <div className={styles.memberDetailHead}>
        <ProfilePortrait profile={profile} />
        <div>
          <p className={styles.eyebrow}>{profile.district.label}</p>
          <h3>{officialNames(profile)}</h3>
          <p>
            {officials.map((official) => official.role).filter(Boolean).slice(0, 2).join(" · ") ||
              profile.organization.name}
          </p>
        </div>
      </div>
      <p>{profile.organization.authority_summary}</p>
      {actions.length > 0 ? (
        <nav className={styles.actionRow} aria-label="Verified contact actions">
          {actions.map((action) => (
            <a key={`${action.label}-${action.href}`} href={action.href} {...externalProps(action.href)}>
              {action.label}
            </a>
          ))}
        </nav>
      ) : (
        <p className={styles.neutralNotice}>Contact details are awaiting verification.</p>
      )}
      {officeGroups.length > 0 || officeLinks.length > 0 ? (
        <details className={styles.officeDisclosure}>
          <summary>{officeGroups.length > 0 ? `View office locations (${officeGroups.length})` : "View official office locations"}</summary>
          {officeGroups.length > 0 ? <div className={styles.officeList}>
            {officeGroups.map((office) => (
              <address key={office.addressLines.join("-") || office.entries.map((entry) => entry.label).join("-")}>
                {office.entries.map((entry) => (
                  <div key={`${entry.role}-${entry.label}-${entry.phone ?? ""}`}>
                    <strong>{entry.label}</strong>
                    {profile.officials.length > 1 ? <small>{entry.role}</small> : null}
                    {entry.phone ? <a href={`tel:${entry.phone}`}>{entry.phone}</a> : null}
                  </div>
                ))}
                {office.addressLines.map((line) => <span key={line}>{line}</span>)}
              </address>
            ))}
          </div> : null}
          {officeLinks.length > 0 ? (
            <nav className={styles.officialResources} aria-label="Official office-location pages">
              {officeLinks.map((link) => (
                <a key={link.url} href={link.url} {...externalProps(link.url)}>{link.label}</a>
              ))}
            </nav>
          ) : null}
        </details>
      ) : null}
    </article>
  );
}

function formatEventDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York"
  }).format(new Date(`${value}T12:00:00-04:00`));
}

function formatEventTime(event: CouncilEventSummary): string {
  if (event.time_tbd || !event.start_time) return "Time to be determined";
  const [hours, minutes] = event.start_time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York"
  }).format(new Date(2026, 0, 1, hours, minutes));
}

function MeetingRow({ event, onOpen }: { event: CouncilEventSummary; onOpen: () => void }) {
  return (
    <button type="button" className={styles.meetingRow} onClick={onOpen}>
      <span className={styles.meetingDate}>{formatEventDate(event.event_date)}</span>
      <strong>{event.title}</strong>
      <span>{formatEventTime(event)} · {event.body.name}</span>
      {event.status === "cancelled" || event.status === "deferred" ? (
        <em>{event.status === "cancelled" ? "Cancelled" : "Deferred"}</em>
      ) : null}
      <ChevronIcon />
    </button>
  );
}

function MeetingDetailView({
  event,
  loading,
  onRetry
}: {
  event: CouncilEventDetail | null;
  loading: boolean;
  onRetry: () => void;
}) {
  if (loading) return <div className={styles.detailSkeleton} aria-label="Loading meeting details" aria-busy="true" />;
  if (!event) {
    return (
      <div className={styles.emptyState} role="status">
        <strong>Meeting details are temporarily unavailable.</strong>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  return (
    <div className={styles.meetingDetail}>
      <div className={styles.meetingHero}>
        <p className={styles.eyebrow}>NYC Council meeting</p>
        <h2>{event.title}</h2>
        <p>{formatEventDate(event.event_date)} · {formatEventTime(event)}</p>
        <p>{event.body.name}</p>
        {event.location_name || event.location_address ? (
          <p>{[event.location_name, event.location_address].filter(Boolean).join(" · ")}</p>
        ) : null}
        {event.status === "cancelled" || event.status === "deferred" ? (
          <div className={styles.statusNotice} role="status">
            This meeting is listed as {event.status}. Check the official detail link before attending.
          </div>
        ) : null}
      </div>
      <nav className={styles.actionRow} aria-label="Meeting actions">
        <a href="/api/civic/council/calendar.ics">Add to calendar</a>
        {event.video_url ? <a href={event.video_url} target="_blank" rel="noreferrer">Watch video</a> : null}
        {event.minutes_url ? <a href={event.minutes_url} target="_blank" rel="noreferrer">View minutes</a> : null}
        {event.public_comment_url ? <a href={event.public_comment_url} target="_blank" rel="noreferrer">Public comment</a> : null}
      </nav>
      {event.public_comment ? (
        <section className={styles.detailSection}>
          <h3>Public comment</h3>
          <p>{event.public_comment}</p>
        </section>
      ) : null}
      <section className={styles.detailSection}>
        <h3>Agenda</h3>
        {event.items.length > 0 ? (
          <div className={styles.agendaList}>
            {event.items.map((item) => (
              <article key={item.event_item_id}>
                <p className={styles.eyebrow}>
                  {item.agenda_number ? `Item ${item.agenda_number}` : "Agenda item"}
                </p>
                <h4>{item.matter?.title ?? item.title ?? "Item details"}</h4>
                {item.matter?.file_number ? <p>{item.matter.file_number}</p> : null}
                {item.agenda_note ? <p>{item.agenda_note}</p> : null}
                {item.action_text ? <p>{item.action_text}</p> : null}
                {item.matter?.documents.length ? (
                  <nav aria-label="Agenda documents">
                    {item.matter.documents.filter((document) => document.official_url).map((document) => (
                      <a key={document.document_id} href={document.official_url ?? undefined} target="_blank" rel="noreferrer">
                        {document.name}
                      </a>
                    ))}
                  </nav>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p>No structured agenda items are available yet.</p>
        )}
        {event.agenda_url ? <a href={event.agenda_url} target="_blank" rel="noreferrer">Open the official agenda</a> : null}
      </section>
    </div>
  );
}

export function CivicResourceNavigator({
  scope,
  context,
  electionDistrictKeys,
  onClose,
  onChangeAddress,
  onForgetAddress,
  onReturnToSavedAddress,
  onSelectMember,
  onRequestAddressSearch
}: Props) {
  const [view, setView] = useState<NavigatorView>({ kind: "home" });
  const [profileStates, setProfileStates] = useState<ProfileStateMap>({});
  const [events, setEvents] = useState<CouncilEventSummary[] | null | undefined>(undefined);
  const [eventDetail, setEventDetail] = useState<CouncilEventDetail | null | undefined>(undefined);
  const [eventRetry, setEventRetry] = useState(0);
  const [meetingReturnView, setMeetingReturnView] = useState<"home" | "meetings">("home");
  const [reported311, setReported311] = useState<boolean | null>(null);
  const loadSequence = useRef(0);
  const addressContext = scope?.kind === "confirmed_address" ? context : null;
  const team = useMemo(
    () => buildCivicTeam(addressContext?.geographies ?? []),
    [addressContext]
  );
  const profilesToLoad = useMemo(() => {
    if (scope?.kind === "selected_district") {
      return [
        {
          geographyType: scope.district.geographyType,
          geographyKey: scope.district.geographyKey
        }
      ];
    }
    return team.map((member) => ({
      geographyType: member.geographyType,
      geographyKey: member.geography.geography_key
    }));
  }, [scope, team]);
  const scopeIdentity =
    scope?.kind === "selected_district"
      ? `district:${scope.district.geographyKey}`
      : scope?.kind === "zip_area"
        ? `zip:${scope.zip.zipCode}`
        : scope?.kind === "confirmed_address"
          ? `address:${context?.resolvedAt ?? "unknown"}`
          : "none";

  useEffect(() => {
    setView({ kind: "home" });
    setReported311(null);
  }, [scopeIdentity]);

  useEffect(() => {
    if (profilesToLoad.length === 0) {
      setProfileStates({});
      return;
    }
    const sequence = ++loadSequence.current;
    const controller = new AbortController();
    const initial: ProfileStateMap = {};
    for (const member of profilesToLoad) {
      const cached = getCachedCivicProfile(member.geographyKey);
      initial[member.geographyType] = cached
        ? { status: "ready", profile: cached }
        : { status: "loading" };
    }
    setProfileStates(initial);
    const tasks = profilesToLoad.map(async (member) => {
      const cached = getCachedCivicProfile(member.geographyKey);
      if (cached) return;
      try {
        const profile = await getCivicDistrictProfile(member.geographyKey, controller.signal);
        if (controller.signal.aborted || sequence !== loadSequence.current) return;
        cacheCivicProfile(profile);
        setProfileStates((current) => ({
          ...current,
          [member.geographyType]: { status: "ready", profile }
        }));
      } catch (error) {
        if (controller.signal.aborted || sequence !== loadSequence.current) return;
        setProfileStates((current) => ({
          ...current,
          [member.geographyType]: {
            status: error instanceof CivicApiError && error.status === 404 ? "missing" : "error"
          }
        }));
      }
    });
    void Promise.allSettled(tasks);
    return () => controller.abort();
  }, [profilesToLoad]);

  useEffect(() => {
    if (!scope) {
      setEvents(undefined);
      return;
    }
    const controller = new AbortController();
    setEvents(undefined);
    getCouncilEvents({ limit: 10, signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setEvents(result.events);
      })
      .catch(() => {
        if (!controller.signal.aborted) setEvents(null);
    });
    return () => controller.abort();
  }, [scope]);

  useEffect(() => {
    if (view.kind !== "meeting-detail") {
      setEventDetail(undefined);
      return;
    }
    const controller = new AbortController();
    setEventDetail(undefined);
    getCouncilEvent(view.eventId, controller.signal)
      .then((event) => {
        if (!controller.signal.aborted) setEventDetail(event);
      })
      .catch(() => {
        if (!controller.signal.aborted) setEventDetail(null);
      });
    return () => controller.abort();
  }, [view, eventRetry]);

  const openMeeting = (eventId: number, returnView: "home" | "meetings") => {
    setMeetingReturnView(returnView);
    setView({ kind: "meeting-detail", eventId });
  };

  const goBack = () => {
    if (view.kind === "meeting-detail") setView({ kind: meetingReturnView });
    else setView({ kind: "home" });
  };

  const selectedProfileState =
    scope?.kind === "selected_district"
      ? profileStates[scope.district.geographyType]
      : null;
  const selectedProfile =
    selectedProfileState?.status === "ready" ? selectedProfileState.profile : null;
  const communityProfileState = profileStates.community_district;
  const communityProfile = communityProfileState?.status === "ready" ? communityProfileState.profile : null;
  const localMeetingProfile =
    scope?.kind === "confirmed_address"
      ? communityProfile
      : selectedProfile?.profile_kind === "community_board"
        ? selectedProfile
        : null;
  const topic = view.kind === "topic" ? civicResourceTopic(view.topicId) : null;
  const topicTargetTypes = topic
    ? scope?.kind === "selected_district"
      ? topic.targetTypes.filter((type) => type === scope.district.geographyType)
      : topic.targetTypes
    : [];
  const topicNeedsAddress = Boolean(
    topic &&
      scope?.kind === "selected_district" &&
      (topic.id === "voting" || topicTargetTypes.length !== topic.targetTypes.length)
  );
  const scopeTitle =
    scope?.kind === "selected_district"
      ? `Help for ${scope.district.label}`
      : scope?.kind === "zip_area"
        ? `Explore ZIP ${scope.zip.zipCode}`
        : "Find the right place to start";

  return (
    <section className={styles.navigator} aria-label="Civic Resource Navigator">
      <header className={styles.navigatorHeader}>
        <div className={styles.headerActions}>
          {view.kind !== "home" ? (
            <button type="button" className={styles.iconTextButton} onClick={goBack}>
              <BackIcon /> Back
            </button>
          ) : <span />}
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close resource navigator">
            <CloseIcon />
          </button>
        </div>
        <p className={styles.eyebrow}>Civic Resource Navigator</p>
        <h2>{view.kind === "home" ? scopeTitle : view.kind === "meetings" ? "NYC Council meetings" : view.kind === "meeting-detail" ? "Meeting details" : view.kind === "team" ? TEAM_LABELS[view.geographyType] : topic?.label}</h2>
        <p>Find official resources and public offices for the area you&apos;re exploring.</p>
      </header>

      {!scope ? (
        <div className={styles.addressGate}>
          <span className={styles.gateIcon}><PinIcon /></span>
          <div>
            <p className={styles.eyebrow}>Choose an area</p>
            <h3>Select a district or use your address</h3>
            <p>Tap a district on the map to explore it immediately, or use a complete street address for exact matches across government levels.</p>
          </div>
          <div className={styles.gateActions}>
            <button type="button" className={styles.primaryButton} onClick={onRequestAddressSearch}>Use my address for exact matches</button>
            {context ? (
              <button type="button" className={styles.secondaryButton} onClick={onReturnToSavedAddress}>Return to saved address</button>
            ) : null}
          </div>
        </div>
      ) : scope.kind === "zip_area" ? (
        <div className={styles.addressGate}>
          <span className={styles.gateIcon}><PinIcon /></span>
          <div>
            <p className={styles.eyebrow}>Exploring this ZIP code</p>
            <h3>ZIP {scope.zip.zipCode} includes multiple civic districts</h3>
            <p>Tap a district on the map, or enter a street address to find your exact civic representatives.</p>
          </div>
          <div className={styles.gateActions}>
            <button type="button" className={styles.primaryButton} onClick={onRequestAddressSearch}>Use my address for exact matches</button>
            {context ? (
              <button type="button" className={styles.secondaryButton} onClick={onReturnToSavedAddress}>Return to saved address</button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <section
            className={styles.addressCard}
            aria-label={scope.kind === "confirmed_address" ? "Confirmed residence" : "Selected civic area"}
          >
            <span><PinIcon /></span>
            <div>
              <p className={styles.eyebrow}>{scope.kind === "confirmed_address" ? "Using this address" : "Using selected area"}</p>
              <strong>{scope.kind === "confirmed_address" ? context?.addressLabel : scope.district.label}</strong>
              <small>{scope.kind === "confirmed_address" ? "Kept only in this browser tab" : "Selected on the map"}</small>
            </div>
            <div className={styles.addressActions}>
              <button type="button" onClick={onChangeAddress}>
                {scope.kind === "confirmed_address" ? "Change address" : "Use my address for exact matches"}
              </button>
              {scope.kind === "confirmed_address" ? (
                <button type="button" onClick={onForgetAddress}>Forget</button>
              ) : context ? (
                <button type="button" onClick={onReturnToSavedAddress}>Return to saved address</button>
              ) : null}
            </div>
          </section>

          {view.kind === "home" ? (
            <div className={styles.navigatorBody}>
              {scope.kind === "confirmed_address" ? (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <div><p className={styles.eyebrow}>Your address</p><h3>Civic Representatives</h3></div>
                  <span>{team.length} matched areas</span>
                </div>
                <div className={styles.teamList}>
                  {team.map((member) => {
                    const state = profileStates[member.geographyType] ?? { status: "loading" as const };
                    return (
                      <button
                        type="button"
                        className={styles.teamRow}
                        key={member.geography.geography_key}
                        onClick={() => {
                          onSelectMember(member.geographyType);
                          setView({ kind: "team", geographyType: member.geographyType });
                        }}
                      >
                        {state.status === "ready" ? <ProfilePortrait profile={state.profile} /> : <span className={styles.portraitSkeleton} />}
                        <span className={styles.teamCopy}>
                          <span>{TEAM_LABELS[member.geographyType]}</span>
                          <strong>{member.geography.display_name}</strong>
                          <small>{state.status === "ready" ? officialNames(state.profile) : state.status === "loading" ? "Loading verified profile…" : "Profile unavailable — boundary still available"}</small>
                        </span>
                        <ChevronIcon />
                      </button>
                    );
                  })}
                </div>
              </section>
              ) : (
                <section className={styles.section} aria-label="Selected district representative">
                  {selectedProfileState?.status === "ready" ? (
                    <TeamMemberDetail profile={selectedProfileState.profile} />
                  ) : !selectedProfileState || selectedProfileState.status === "loading" ? (
                    <div className={styles.detailSkeleton} aria-label="Loading selected district profile" />
                  ) : (
                    <div className={styles.emptyState}>
                      <strong>This verified profile is not available right now.</strong>
                      <p>The district boundary remains selected on the map.</p>
                    </div>
                  )}
                </section>
              )}

              <section className={styles.section}>
                <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Start with your need</p><h3>Find the right resource</h3></div></div>
                <div className={styles.topicGrid}>
                  {CIVIC_RESOURCE_TOPICS.map((item) => (
                    <button key={item.id} type="button" onClick={() => { setReported311(null); setView({ kind: "topic", topicId: item.id }); }}>
                      <strong>{item.label}</strong><span>{item.examples}</span><ChevronIcon />
                    </button>
                  ))}
                </div>
                <p className={styles.emergency}>Emergency or immediate danger? Call <a href="tel:911">911</a>.</p>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <div><p className={styles.eyebrow}>Public schedule</p><h3>Upcoming NYC Council meetings</h3></div>
                  <button type="button" onClick={() => setView({ kind: "meetings" })}>View all</button>
                </div>
                <div className={styles.meetingList}>
                  {events === undefined ? <div className={styles.listSkeleton} aria-label="Loading meetings" /> : events && events.length > 0 ? events.slice(0, 3).map((event) => <MeetingRow key={event.event_id} event={event} onOpen={() => openMeeting(event.event_id, "home")} />) : <p className={styles.neutralNotice}>No upcoming Council meetings are listed right now.</p>}
                </div>
              </section>

              {localMeetingProfile?.community_board?.meeting_pattern ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Local public meeting</p><h3>Your Community Board</h3></div></div>
                  <div className={styles.communityMeeting}>
                    <strong>{localMeetingProfile.district.label}</strong>
                    <p>{localMeetingProfile.community_board.meeting_pattern}</p>
                    {localMeetingProfile.community_board.calendar_url ? <a href={localMeetingProfile.community_board.calendar_url} target="_blank" rel="noreferrer">Open the official board calendar</a> : null}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}

          {view.kind === "team" ? (
            <div className={styles.navigatorBody}>
              {profileStates[view.geographyType]?.status === "ready" ? (
                <TeamMemberDetail profile={(profileStates[view.geographyType] as { status: "ready"; profile: CivicDistrictProfile }).profile} />
              ) : profileStates[view.geographyType]?.status === "loading" ? (
                <div className={styles.detailSkeleton} aria-label="Loading civic representative" />
              ) : (
                <div className={styles.emptyState}><strong>This verified profile is not available right now.</strong><p>The official district boundary remains selected on the map.</p></div>
              )}
            </div>
          ) : null}

          {view.kind === "topic" && topic ? (
            <div className={styles.navigatorBody}>
              <section className={styles.recommendation}>
                <p className={styles.eyebrow}>Recommended starting point</p>
                <h3>{topic.title}</h3>
                <p>{topic.explanation}</p>
                {topic.id === "unresolved-311" ? (
                  <div className={styles.reportedQuestion}>
                    <strong>Have you already reported this problem to 311?</strong>
                    <div>
                      <button type="button" aria-pressed={reported311 === true} onClick={() => setReported311(true)}>Yes, I reported it</button>
                      <button type="button" aria-pressed={reported311 === false} onClick={() => setReported311(false)}>Not yet</button>
                    </div>
                    {reported311 === true ? <p>Have the service-request number and relevant dates ready. Check the official status first; if it was closed while the condition remains, NYC guidance may direct you to file a new request.</p> : reported311 === false ? <p>Start with the official NYC311 service list so the responsible City agency receives the issue.</p> : null}
                  </div>
                ) : null}
                {topic.officialActions.length > 0 && (topic.id !== "unresolved-311" || reported311 !== null) ? (
                  <nav className={styles.officialResources} aria-label="Official government resources">
                    {topic.officialActions.map((action) => <a key={action.href} href={action.href} target="_blank" rel="noreferrer">{action.label}</a>)}
                  </nav>
                ) : null}
                {topicTargetTypes.length > 0 ? (
                  <div className={styles.representativeResources}>
                    <h4>{topic.id === "unresolved-311" ? "City Council office for this area" : scope.kind === "confirmed_address" ? "Offices serving this address" : "Office for this selected area"}</h4>
                    {topicTargetTypes.map((type) => {
                      const state = profileStates[type];
                      return state?.status === "ready" ? <TeamMemberDetail key={type} profile={state.profile} /> : <div key={type} className={styles.neutralNotice}>{TEAM_LABELS[type]} profile is unavailable.</div>;
                    })}
                  </div>
                ) : null}
                {topicNeedsAddress ? (
                  <div className={styles.topicAddressPrompt}>
                    <strong>A complete street address is needed for an exact match.</strong>
                    <p>This topic can involve another government level or election district. Your selected area will stay in place while you search.</p>
                    <button type="button" className={styles.primaryButton} onClick={onRequestAddressSearch}>Use my address for exact matches</button>
                  </div>
                ) : null}
                {topic.id === "voting" && scope.kind === "confirmed_address" ? electionDistrictKeys ? <ElectionContextCard districtKeys={electionDistrictKeys} embedded /> : <p className={styles.neutralNotice}>Verified election details are not available for this address yet. Use the official poll-site lookup below.</p> : null}
                <footer>
                  Source:{" "}
                  {topic.officialActions.some((action) => canonicalActionHref(action.href) === canonicalActionHref(topic.sourceUrl)) ? (
                    topic.sourceLabel
                  ) : (
                    <a href={topic.sourceUrl} target="_blank" rel="noreferrer">{topic.sourceLabel}</a>
                  )}{" "}· Verified {topic.verifiedOn}
                </footer>
              </section>
            </div>
          ) : null}

          {view.kind === "meetings" ? (
            <div className={styles.navigatorBody}>
              <section className={styles.section}>
                <div className={styles.sectionHead}><div><p className={styles.eyebrow}>Citywide schedule</p><h3>Upcoming NYC Council meetings</h3></div></div>
                <p className={styles.sectionIntro}>These are official NYC Council meetings, not meetings owned by a single district.</p>
                <div className={styles.meetingList}>{events === undefined ? <div className={styles.listSkeleton} /> : events && events.length > 0 ? events.map((event) => <MeetingRow key={event.event_id} event={event} onOpen={() => openMeeting(event.event_id, "meetings")} />) : <p className={styles.neutralNotice}>No upcoming meetings are currently listed.</p>}</div>
              </section>
            </div>
          ) : null}

          {view.kind === "meeting-detail" ? (
            <div className={styles.navigatorBody}>
              <MeetingDetailView event={eventDetail ?? null} loading={eventDetail === undefined} onRetry={() => setEventRetry((retry) => retry + 1)} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
