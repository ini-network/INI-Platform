// Static config for the guided map tour. The component (map-tour-guide.tsx)
// owns all behavior; this file is only the ordered stop list + the copy. Copy is
// plain-language and says what each control is FOR (Travis's decision, 2026-07-15).
//
// v6 (auto-enactment): the guide now PERFORMS the map walkthrough itself and
// narrates it — the "auto" stops enact their action (select a borough, browse in,
// open a neighborhood, open the filters) and then wait for the host to CONFIRM
// the enacted state before showing a Next button. Only two stops stay hands-on:
// filter-pick (the user picks a topic chip) and bridge-news (the user taps News).
//
// Nav-linked stops (browse / neighborhood) carry a depth model the guide reads to
// CONFIRM its own enactment (the same live-state machinery that used to detect a
// USER action now confirms an ENACTED one):
//   navDepth = view==="borough" ? (selectedAreaId ? 2 : 1) : 0
//   doneAtDepth   — the host depth an auto stop's enactment must reach to confirm.
//   requiresDepth — retained for parity with the depth model (unused by v6's
//                   confirm path; the guide drives every host change itself).

export type StopId =
  | "welcome"
  | "borough"
  | "digest"
  | "browse"
  | "neighborhood"
  | "area-detail"
  | "filter"
  | "filter-pick"
  | "bridge-news";

// The host action an "auto" stop asks the guide to perform on its behalf. The
// guide calls the host's enactTourAction(enact) once per stop entry (re-triggered
// on Back re-entry); the host reuses its real click handlers, never duplicates.
export type TourEnact = "select-borough" | "browse" | "select-area" | "open-filter";

export type TourStop = {
  id: StopId;
  // "auto"   = the guide enacts the action, waits for the host to confirm, then
  //            shows the ring + bubble + a Next button (info-paced from there).
  // "info"   = a look-at bubble; advance on the Next button.
  // "action" = hands-on; the user does it (filter-pick chip / bridge News tap).
  kind: "auto" | "info" | "action";
  // The action an "auto" stop enacts. Undefined on info/action stops.
  enact?: TourEnact;
  // "center" = dimmed backdrop + centered card (map inert); "anchored" = ring +
  // bubble glued to a DOM anchor.
  placement: "center" | "anchored";
  anchor: string | null;
  // Phone anchor override. The News target relocates from the left rail to the
  // bottom tab bar on phone; liveStops swaps this in ONLY when ff.isPhone. Same
  // href="/news" semantics — this is a selector swap, not a stop-logic change.
  anchorPhone?: string;
  // Where the bubble sits relative to the ring on desktop (mobile always pins the
  // bubble to the top band). Ignored for centered cards.
  bubbleSide: "left" | "right" | "over" | "center";
  // Phone bottom-sheet snap the stop requires at activation (M4). map-tour-guide
  // calls setSheetForTour(sheetOnActivate) at the TOP of the [index] reset effect
  // (before the anchor is scrolled/measured) ONLY when ff.isPhone, so the sheet is
  // at the right height before the ring draws: panel-anchored stops need "half"
  // (their control must be visible in the sheet); map-region + bridge-news need
  // "peek" (the map / tab bar is the lesson, so the sheet gets out of the way).
  // Consulted only on phone — desktop + tablet ignore it. Undefined on the center
  // cards (welcome), which leave the sheet as-is.
  sheetOnActivate?: "peek" | "half" | "full";
  // Map-region ring (Mapbox canvas): clamped above the bottom sheet on mobile.
  mapRegion: boolean;
  navLinked: boolean;
  doneAtDepth: number;
  requiresDepth: number;
  // When the user steps Back INTO this stop, the host is rewound to this nav depth
  // so the destination stop's context is true; an auto destination then RE-ENACTS
  // from that clean base: 0 → city (backToCity), 1 → borough view, no selection,
  // 2 → keep selection (no-op). Every back destination sets this so rewindHostTo
  // also closes the filter drawer on the way back. Undefined only for stops never
  // reached via Back (bridge-news, the final stop).
  backRewindDepth?: 0 | 1 | 2;
  // Dropped from the live list when the borough has no NTA polygons (canDrill=false).
  needsDrill: boolean;
  // Dropped only if the rail is hidden on mobile. Agent B verified the rail STAYS
  // visible <760px (only its text labels hide), so this never drops in practice —
  // the mechanism is kept for parity with the canDrill drop rule.
  needsRail: boolean;
  title: string;
  body: string;
  cta?: string; // info + auto stops advance on this button
  missHint?: string; // action stops: gentle line on a wrong click
  successText: string; // quiet "✓" line on an action completion (action stops only)
  // Form-factor copy variants (B4). Desktop copy stays in body/missHint and is
  // byte-identical; liveStops swaps in these ONLY on the matching form factor.
  // No id / order / advancement change — these are text-only overrides. bodyCoarse
  // wins over bodyPhone (a coarse pointer includes tablet-portrait, not just phone).
  bodyPhone?: string; // isPhone body (rail labels hidden, "Browse" short label)
  bodyCoarse?: string; // isCoarse body (touch verbs such as "tap")
  missHintPhone?: string; // isPhone wrong-click line ("tap" verbs, short labels)
  missHintCoarse?: string; // isCoarse wrong-click line (touch wording)
};

// Copy uses {borough} where the ACTIVE borough name belongs; the guide replaces
// it with the borough it actually opened (map-tour-guide.resolveCopy), so the
// narration names the real borough on screen — never a hard-coded one.
export const STOPS: TourStop[] = [
  {
    id: "welcome",
    kind: "info",
    placement: "center",
    anchor: null,
    bubbleSide: "center",
    mapRegion: false,
    navLinked: false,
    doneAtDepth: 0,
    requiresDepth: 0,
    needsDrill: false,
    needsRail: false,
    backRewindDepth: 0,
    title: "Welcome to the map",
    body:
      "This map shows what New Yorkers are talking about, block by block — pulled from resident posts, 311 complaints, and neighborhood news. We'll walk you through it: we do each step, you read along and press Next.",
    cta: "Show me around",
    successText: ""
  },
  {
    id: "borough",
    kind: "auto",
    enact: "select-borough",
    placement: "anchored",
    anchor: ".cs-overview-map",
    bubbleSide: "over",
    sheetOnActivate: "peek",
    mapRegion: true,
    navLinked: true,
    doneAtDepth: 1,
    requiresDepth: 0,
    needsDrill: false,
    needsRail: false,
    backRewindDepth: 0,
    title: "Boroughs, by their loudest signal",
    body:
      "Each borough is shaded by its most active signal type — darker means more activity. We opened {borough} for you, so its summary is now in the panel. After the tour, click any shaded borough to do this yourself.",
    bodyCoarse:
      "Each borough is shaded by its most active signal type — darker means more activity. We opened {borough} for you, so its summary is now in the panel. After the tour, tap any shaded borough to do this yourself.",
    cta: "Next",
    successText: ""
  },
  {
    id: "digest",
    kind: "info",
    placement: "anchored",
    anchor: '[data-tour="digest"]',
    bubbleSide: "left",
    sheetOnActivate: "half",
    mapRegion: false,
    navLinked: true,
    doneAtDepth: 1,
    requiresDepth: 0,
    needsDrill: false,
    needsRail: false,
    backRewindDepth: 0,
    title: "The panel's summary",
    body:
      "Here's this borough at a glance: how many issues are active this week, how many residents are posting about them, and today's local news headlines. The blue “Read the full posts on Stories” link opens the residents' full posts.",
    cta: "Next",
    successText: ""
  },
  {
    id: "browse",
    kind: "auto",
    enact: "browse",
    placement: "anchored",
    anchor: ".cs-deepdive-map",
    bubbleSide: "over",
    sheetOnActivate: "peek",
    mapRegion: true,
    navLinked: true,
    doneAtDepth: 1,
    requiresDepth: 0,
    needsDrill: true,
    needsRail: false,
    backRewindDepth: 1,
    title: "Go deeper: your neighborhoods",
    body:
      "Boroughs are big. We zoomed into {borough} so each neighborhood shows on its own — every shaded block has its own signals. (From a borough, the “Browse neighborhoods” button does this.)",
    bodyPhone:
      "Boroughs are big. We zoomed into {borough} so each neighborhood shows on its own — every shaded block has its own signals. (From a borough, the “Browse” button does this.)",
    cta: "Next",
    successText: ""
  },
  {
    id: "neighborhood",
    kind: "auto",
    enact: "select-area",
    placement: "anchored",
    anchor: ".cs-deepdive-map",
    bubbleSide: "over",
    sheetOnActivate: "peek",
    mapRegion: true,
    navLinked: true,
    doneAtDepth: 2,
    requiresDepth: 1,
    needsDrill: true,
    needsRail: false,
    backRewindDepth: 1,
    title: "Read a single neighborhood",
    body:
      "We opened one neighborhood for you — the panel now shows exactly what's happening there this week. Click any shaded block to read a different one; grey ones are quiet this week.",
    bodyCoarse:
      "We opened one neighborhood for you — the panel now shows exactly what's happening there this week. To read another, tap any shaded block once; grey ones are quiet this week.",
    cta: "Next",
    successText: ""
  },
  {
    id: "area-detail",
    kind: "info",
    placement: "anchored",
    anchor: '[data-tour="digest"]',
    bubbleSide: "left",
    sheetOnActivate: "half",
    mapRegion: false,
    navLinked: true,
    doneAtDepth: 99,
    requiresDepth: 2,
    needsDrill: true,
    needsRail: false,
    backRewindDepth: 2,
    title: "The panel goes local",
    body:
      "Now the panel is all about this neighborhood — real resident posts, city complaints, and what neighbors are saying on these blocks.",
    cta: "Next",
    successText: ""
  },
  {
    id: "filter",
    kind: "auto",
    enact: "open-filter",
    placement: "anchored",
    anchor: '[data-tour="filter"]',
    bubbleSide: "left",
    sheetOnActivate: "half",
    mapRegion: false,
    navLinked: false,
    doneAtDepth: 0,
    requiresDepth: 0,
    needsDrill: false,
    needsRail: false,
    backRewindDepth: 2,
    title: "Filter to one topic",
    body:
      "Want just one topic? We opened the topic filters for you — the Filter button up here is how you'll open them later.",
    bodyCoarse:
      "Want just one topic? We opened the topic filters for you — the Filter button is how you'll open them later.",
    cta: "Next",
    successText: ""
  },
  {
    id: "filter-pick",
    kind: "action",
    placement: "anchored",
    anchor: '[data-tour="chips"]',
    bubbleSide: "left",
    sheetOnActivate: "half",
    mapRegion: false,
    navLinked: false,
    doneAtDepth: 0,
    requiresDepth: 0,
    needsDrill: false,
    needsRail: false,
    backRewindDepth: 2,
    title: "Pick a topic",
    body:
      "Your turn: pick a topic — Safety, Public services, any of them — and watch the map and the numbers narrow to just that.",
    missHint: "Tap one of the topic chips right here.",
    successText: "That's filtering — the map and panel follow whatever topic you pick."
  },
  {
    // The old hands-on version anchored to the sidebar's News link; this design
    // has no sidebar (navigation lives in the host site's header menu), so the
    // guide now carries the user to /news itself — the CTA triggers the bridge
    // (see advanceInfo in map-tour-guide.tsx).
    id: "bridge-news",
    kind: "info",
    placement: "center",
    anchor: null,
    bubbleSide: "center",
    sheetOnActivate: "peek",
    mapRegion: false,
    navLinked: false,
    doneAtDepth: 0,
    requiresDepth: 0,
    needsDrill: false,
    needsRail: false,
    title: "Next stop — News",
    body:
      "That's the map! There's more: a News page with the day's local headlines across the boroughs. The guide will take you there and point out the good parts.",
    bodyPhone:
      "That's the map! There's more: a News page with the day's local headlines. The guide will take you there next.",
    cta: "Take me to News →",
    successText: ""
  }
];

// On phone the rail is hidden, but the News target RELOCATES to the bottom tab bar
// (see bridge-news anchorPhone) rather than disappearing — so bridge-news must
// NEVER drop. The constant stays false; the drop mechanism is kept for parity with
// the canDrill drop rule and is easy to flip if that ever changes.
const RAIL_HIDDEN_ON_MOBILE = false;

// The live step list: drop drill stops when the borough has no polygons, and the
// rail stop only if the rail is actually hidden on mobile (it isn't). Copy is then
// resolved per form factor (B4) — desktop keeps the original object reference so
// the desktop stop list stays byte-identical.
export function liveStops(
  canDrill: boolean,
  ff: { isPhone: boolean; isCoarse: boolean }
): TourStop[] {
  return STOPS.filter((stop) => {
    if (stop.needsDrill && !canDrill) return false;
    if (stop.needsRail && ff.isPhone && RAIL_HIDDEN_ON_MOBILE) return false;
    return true;
  }).map((stop) => {
    const anchor = ff.isPhone && stop.anchorPhone ? stop.anchorPhone : stop.anchor;
    // Coarse wins over phone for BOTH body and missHint: touch wording applies on
    // every touch pointer (phone + tablet-portrait), not just
    // <=640; bodyPhone/missHintPhone carry the phone-only label shrink.
    const body =
      ff.isCoarse && stop.bodyCoarse
        ? stop.bodyCoarse
        : ff.isPhone && stop.bodyPhone
          ? stop.bodyPhone
          : stop.body;
    const missHint =
      ff.isCoarse && stop.missHintCoarse
        ? stop.missHintCoarse
        : ff.isPhone && stop.missHintPhone
          ? stop.missHintPhone
          : stop.missHint;
    if (anchor === stop.anchor && body === stop.body && missHint === stop.missHint) return stop;
    return { ...stop, anchor, body, missHint };
  });
}
