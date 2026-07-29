"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  findAreaContaining,
  findBoroughContaining,
  type GeocodeResult,
  type PipGeometry
} from "@/lib/map-feature/geocode";
import { useFormFactor } from "@/lib/map-feature/use-form-factor";
import { useSheetState, type SheetSnap } from "@/lib/map-feature/use-sheet-state";
import {
  SIGNAL_CHIPS,
  isEmerging,
  type NeighborhoodSignal,
  type NeighborhoodSignalsResponse
} from "@/lib/map-feature/signal-types";
import { BoroughOverviewMap, type BoroughStyles } from "./borough-overview-map";
import {
  CoverageRequestDialog,
  type CoverageRequestArea
} from "./coverage-request-dialog";
import { MapSearchBox } from "./map-search-box";
import {
  NeighborhoodPicker,
  type NeighborhoodPickerOption
} from "./neighborhood-picker";
import { NeighborhoodSignalsMap, type AreaTint } from "./neighborhood-signals-map";
import { PanelDigest } from "./panel-digest";
import { SignalFilterBar, type FilterChip } from "./signal-filter-bar";
import { MapTourGuide } from "./tour/map-tour-guide";
import type { TourEnact } from "./tour/tour-stops";
import styles from "./map-signals.module.css";

const BOROUGHS = ["Bronx", "Brooklyn", "Manhattan", "Queens", "Staten Island"];

// Concrete map-layer colors that mirror the design-token accents in SIGNAL_CHIPS
// (Mapbox paint needs literal colors, not var(--*)). Keep in step with the chip
// accents in lib/signal-types.ts.
const MAP_ACCENTS: Record<string, string> = {
  emerging: "#7c3aed", // var(--primary)
  community_concerns: "#a86d1d", // var(--warn)
  neighborhood_changes: "#315f92", // var(--blue)
  public_services: "#197b85", // var(--teal)
  safety_wellbeing: "#b1432c", // var(--danger)
  community_activity: "#14664f", // var(--success)
  local_opportunities: "#5b21b6" // var(--primary-strong)
};

type MapView = "city" | "borough";
type PointSource = "search" | "geolocation";
type LocationStatus = "idle" | "locating";

type NtaFeature = { properties?: Record<string, unknown> | null; geometry?: PipGeometry };

function LocateIcon() {
  return (
    <svg className={styles.locateIcon} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

function locationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access is off. Allow it in your browser settings, or search by address.";
  }
  if (error.code === error.TIMEOUT) {
    return "Your location took too long to load. Try again, or search by address.";
  }
  return "We couldn't get your location. Check your connection, or search by address.";
}

type Props = {
  initialSignals: NeighborhoodSignalsResponse | null;
  boroughGeoJson: unknown;
  labelsGeoJson: unknown;
  // Citywide NTA polygons (GET /map/areas.geojson, area_type=nta). Null when the
  // fetch failed — the lens then degrades to the borough-only view (no drill-in).
  neighborhoodGeoJson: unknown;
  activeBorough: string;
  onSelectBorough: (borough: string) => void;
  initialAreaId: number | null;
  onAreaChange: (areaId: number | null) => void;
  // Guided-tour wiring (host = this component; overlay rendered here in a later
  // step). `tourOpen` opens/replays the tour; `onTourClose` persists the seen-key
  // and closes it; `tourBlockedTick` increments when the parent soft-blocks a
  // switch to 311 Reports while the tour runs, so the tour can speak to it.
  tourOpen: boolean;
  onTourClose: () => void;
  // Bridge from the map segment into the /news page segment (News-rail stop).
  onTourBridge: () => void;
  tourBlockedTick: number;
};

// Map a signal score to a fill opacity (heavier = louder). Concrete numbers,
// clamped so the faintest signal is still legible and the loudest never washes
// out the basemap.
function scoreToOpacity(score: number): number {
  const t = Math.max(0, Math.min(1, score / 120));
  return Math.round((0.16 + t * 0.26) * 100) / 100; // 0.16 .. 0.42
}

function matchesChip(signal: NeighborhoodSignal, chipKey: string): boolean {
  if (chipKey === "all") return true;
  if (chipKey === "emerging") return isEmerging(signal.trend);
  return signal.signal_type === chipKey;
}

function topByScore(list: NeighborhoodSignal[]): NeighborhoodSignal {
  return list.reduce((best, current) => (current.score > best.score ? current : best));
}

/**
 * Signals lens for the map (the DEFAULT view). Two levels:
 *   • CITY — the five boroughs, each tinted by its top signal. Clicking a borough
 *     selects it (highlight + panel re-scope), exactly like 311 Reports mode —
 *     it never zooms. The neighborhood view opens only via the panel's
 *     "Browse … neighborhoods" button, or via an address/ZIP search (an explicit
 *     request to see a specific block).
 *   • BOROUGH — that borough's neighborhood (NTA) polygons, each tinted by its
 *     top matching signal. Clicking a neighborhood scopes the reading panel to
 *     it; "← All boroughs" and the breadcrumb step back out.
 * Signals join polygons on area_id (the exact key the deep-dive uses). The chip
 * bar filters the tints, the panel and the counts at every level. Everything is
 * client-side over the one signal set fetched server-side.
 */
export function SignalsMapExperience({
  initialSignals,
  boroughGeoJson,
  labelsGeoJson,
  neighborhoodGeoJson,
  activeBorough,
  onSelectBorough,
  initialAreaId,
  onAreaChange,
  tourOpen,
  onTourClose,
  onTourBridge,
  tourBlockedTick
}: Props) {
  const [activeChip, setActiveChip] = useState<string>("all");
  const [view, setView] = useState<MapView>(initialAreaId === null ? "city" : "borough");
  // Camera framing for the borough overview map, independent of `view`: 'city'
  // fits all five boroughs (first load + back-to-city), 'borough' the selected
  // one. A borough click flips it to 'borough' but never changes `view` (which
  // stays "city"), so this is the sole re-framing signal for the overview map.
  const [cameraScope, setCameraScope] = useState<"city" | "borough">(
    initialAreaId === null ? "city" : "borough"
  );
  const [selectedAreaId, setSelectedAreaIdState] = useState<number | null>(initialAreaId);
  const [focusPoint, setFocusPoint] = useState<[number, number] | null>(null);
  const [userLocationPoint, setUserLocationPoint] = useState<[number, number] | null>(null);
  const [searchedLocationPoint, setSearchedLocationPoint] = useState<[number, number] | null>(
    null
  );
  const [searchedLocationLabel, setSearchedLocationLabel] = useState<string | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const locationRequestIdRef = useRef(0);
  const autoLocateAttemptedRef = useRef(false);
  const suppressAutoLocateRef = useRef(false);
  const restoredAreaOnMountRef = useRef(initialAreaId !== null);
  const tourOpenRef = useRef(tourOpen);
  useEffect(() => {
    tourOpenRef.current = tourOpen;
  }, [tourOpen]);
  const updateSelectedAreaId = useCallback(
    (next: number | null) => {
      setSelectedAreaIdState(next);
      onAreaChange(next);
    },
    [onAreaChange]
  );
  // Bumped on every borough click (via BoroughOverviewMap.onDrillIn, which fires
  // even when the already-selected borough is re-clicked). The tour reads this
  // tick to detect a real borough click for its "click a colored borough" stop.
  const [boroughClickTick, setBoroughClickTick] = useState(0);
  // Bumped on every filter-chip pick (see SignalFilterBar onSelect). The tour's
  // filter-pick stop advances on each pick — even re-picking the active chip — so
  // a Back-then-repick can't wedge on a no-op value change.
  const [chipPickTick, setChipPickTick] = useState(0);
  // The chips live behind this one Filter button in the panel (never over the
  // map). Picking a chip applies it AND tucks the row away; the button then
  // names the active filter so a hidden filter can't silently confuse anyone.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterRegionId = useId();
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const [neighborhoodPickerOpen, setNeighborhoodPickerOpen] = useState(false);
  const neighborhoodRegionId = useId();
  const neighborhoodBtnRef = useRef<HTMLButtonElement | null>(null);
  const coverageBtnRef = useRef<HTMLButtonElement | null>(null);
  const [coverageArea, setCoverageArea] = useState<CoverageRequestArea | null>(null);

  // Phone bottom-sheet snap state (peek/half/full). useSheetState internally
  // mounts useVisualViewport, so --app-vh stays live (the sheet's max-height +
  // the snap heights track the visual viewport that shrinks above the soft
  // keyboard). Inert off phone — every consumer below is gated by ff.isPhone.
  const {
    snap,
    setSnap,
    viewportHeight,
    viewportBottomInset,
    isDragging,
    height: sheetHeight,
    settledHeight,
    handleProps,
    consumeDragMoved
  } = useSheetState();
  // Phone-only label shrink: "Browse neighborhoods" + Filter can't share the
  // narrow sheet row; the short label keeps the strip to two rows. The tour's
  // browse anchor/behavior are unchanged (B4 aligns the tour copy per form
  // factor).
  const { isPhone } = useFormFactor();

  // T8: transient data-settling flag on the aside so the backdrop blur is dropped
  // for the sheet's height-transition window (phone only) — see the effect below.
  const insightsRef = useRef<HTMLElement | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const prevSnapRef = useRef(snap);
  const prevDraggingRef = useRef(isDragging);
  const searchSnapBeforeFocusRef = useRef<SheetSnap>("half");
  const searchHasFocusRef = useRef(false);
  const searchViewportHeightBeforeFocusRef = useRef(0);
  const searchSawKeyboardRef = useRef(false);
  const latestSnapRef = useRef(snap);

  // Blur restoration runs in a later task so the user's target click can finish.
  // Keep a commit-synchronous snapshot to tell whether that click deliberately
  // changed the sheet before the restore task runs.
  useLayoutEffect(() => {
    latestSnapRef.current = snap;
  }, [snap]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const unavailable = initialSignals === null;
  const signals = useMemo(() => initialSignals?.signals ?? [], [initialSignals]);

  const ntaFeatures = useMemo<NtaFeature[]>(() => {
    const features = (neighborhoodGeoJson as { features?: NtaFeature[] } | null)?.features;
    return Array.isArray(features) ? features : [];
  }, [neighborhoodGeoJson]);
  const boroughFeaturesAll = useMemo<NtaFeature[]>(() => {
    const features = (boroughGeoJson as { features?: NtaFeature[] } | null)?.features;
    return Array.isArray(features) ? features : [];
  }, [boroughGeoJson]);
  const isSearchResultInNyc = useCallback(
    (result: GeocodeResult) => findBoroughContaining(result.center, boroughFeaturesAll) !== null,
    [boroughFeaturesAll]
  );

  // All signals grouped by borough (both borough- and neighborhood-grain rows).
  const byBorough = useMemo(() => {
    const map = new Map<string, NeighborhoodSignal[]>();
    for (const signal of signals) {
      if (!signal.borough) continue;
      const bucket = map.get(signal.borough);
      if (bucket) {
        bucket.push(signal);
      } else {
        map.set(signal.borough, [signal]);
      }
    }
    return map;
  }, [signals]);

  // Signals grouped by area_id — only neighborhood-grain rows carry an NTA
  // area_id, so this keys neighborhood tints and the selected-neighborhood scope.
  const byAreaId = useMemo(() => {
    const map = new Map<number, NeighborhoodSignal[]>();
    for (const signal of signals) {
      const bucket = map.get(signal.area_id);
      if (bucket) {
        bucket.push(signal);
      } else {
        map.set(signal.area_id, [signal]);
      }
    }
    return map;
  }, [signals]);

  // area_id → { name, borough } for every NTA polygon (for the selected
  // neighborhood's name/borough even when it has no signals).
  const areaMetaById = useMemo(() => {
    const map = new Map<number, { name: string; borough: string | null }>();
    for (const feature of ntaFeatures) {
      const props = feature.properties ?? {};
      const id = props.id;
      if (typeof id !== "number") continue;
      map.set(id, {
        name: typeof props.name === "string" ? props.name : "",
        borough: typeof props.borough === "string" ? props.borough : null
      });
    }
    return map;
  }, [ntaFeatures]);

  // This borough's NTA polygons (fed to the neighborhood map).
  const boroughFeatures = useMemo(
    () => ntaFeatures.filter((feature) => (feature.properties ?? {}).borough === activeBorough),
    [ntaFeatures, activeBorough]
  );
  // Tour v6 wedge fix: canDrill is derived from the ACTIVE borough's polygons, not
  // the citywide NTA set — a borough with no polygons can't be drilled, so its
  // enact (select-area via pickTopTourAreaId) would no-op and wedge the tour. Gating
  // on boroughFeatures.length drops the drill stops exactly when the enact can't run,
  // and also hides the browse button / search box / deep-dive map that have nothing
  // to show for such a borough.
  const canDrill = !unavailable && boroughFeatures.length > 0;
  // The address/ZIP search is CITYWIDE — handleSearchPick resolves a pick against the
  // full NTA set (ntaFeatures) and the borough outlines (boroughFeaturesAll), never
  // just the active borough. So it must NOT hide behind per-borough canDrill: a
  // polygon-less active borough (canDrill=false) would otherwise strand a search box
  // that still works everywhere else. Gate it on the citywide data instead.
  const canSearch = !unavailable && (ntaFeatures.length > 0 || boroughFeaturesAll.length > 0);
  // Mapbox requires a real FeatureCollection object — handing it the bare
  // feature array yields a silently EMPTY source (no shapes, no clicks, no
  // hover; the map looks like just the blue borough outline).
  const boroughCollection = useMemo(
    () => ({ type: "FeatureCollection" as const, features: boroughFeatures }),
    [boroughFeatures]
  );

  // Per-neighborhood tint for the active borough + filter: color from the top
  // matching signal, opacity from its score. Neighborhoods with no match are
  // absent here → the map renders them neutral.
  const tintByArea = useMemo(() => {
    const result: Record<number, AreaTint> = {};
    for (const feature of boroughFeatures) {
      const id = (feature.properties ?? {}).id;
      if (typeof id !== "number") continue;
      const list = (byAreaId.get(id) ?? []).filter((signal) => matchesChip(signal, activeChip));
      if (list.length === 0) continue;
      const top = topByScore(list);
      const color =
        activeChip === "all"
          ? MAP_ACCENTS[top.signal_type] ?? MAP_ACCENTS.emerging
          : MAP_ACCENTS[activeChip] ?? MAP_ACCENTS.emerging;
      result[id] = { color, opacity: scoreToOpacity(top.score) };
    }
    return result;
  }, [boroughFeatures, byAreaId, activeChip]);

  // area_id → { name, total signal count } for the neighborhood map's tooltip.
  const metaByArea = useMemo(() => {
    const result: Record<number, { name: string; signals: number }> = {};
    for (const feature of boroughFeatures) {
      const props = feature.properties ?? {};
      const id = props.id;
      if (typeof id !== "number") continue;
      result[id] = {
        name: typeof props.name === "string" ? props.name : "Neighborhood",
        signals: (byAreaId.get(id) ?? []).length
      };
    }
    return result;
  }, [boroughFeatures, byAreaId]);

  // One location-picker option per NTA polygon. Counts follow the active signal
  // filter, but zero-match neighborhoods remain visible so residents can still
  // request coverage where the current map has no signal.
  const neighborhoodOptions = useMemo<NeighborhoodPickerOption[]>(() => {
    const options: NeighborhoodPickerOption[] = [];
    for (const feature of ntaFeatures) {
      const props = feature.properties ?? {};
      const id = props.id;
      const name = props.name;
      const borough = props.borough;
      if (typeof id !== "number" || typeof name !== "string" || typeof borough !== "string") {
        continue;
      }
      const signalCount = (byAreaId.get(id) ?? []).filter((signal) =>
        matchesChip(signal, activeChip)
      ).length;
      options.push({ id, name, borough, signalCount });
    }
    return options;
  }, [ntaFeatures, byAreaId, activeChip]);

  // --- current reading scope (borough-wide, or one neighborhood) --------------
  const isNeighborhoodScope = view === "borough" && selectedAreaId !== null;
  const boroughSignals = useMemo(
    () => byBorough.get(activeBorough) ?? [],
    [byBorough, activeBorough]
  );
  const selectedSignals = useMemo(
    () => (selectedAreaId !== null ? byAreaId.get(selectedAreaId) ?? [] : []),
    [byAreaId, selectedAreaId]
  );
  const activeBoroughFilteredCount = useMemo(
    () => boroughSignals.filter((signal) => matchesChip(signal, activeChip)).length,
    [boroughSignals, activeChip]
  );
  const selectedMeta = selectedAreaId !== null ? areaMetaById.get(selectedAreaId) : undefined;
  const selectedName =
    selectedMeta?.name || selectedSignals[0]?.area || "This neighborhood";

  const scopeName = isNeighborhoodScope ? selectedName : activeBorough;
  const scopeSignals = isNeighborhoodScope ? selectedSignals : boroughSignals;

  // Live chip counts for the current scope: "All" + the seven chips.
  const chips: FilterChip[] = useMemo(() => {
    const list: FilterChip[] = [
      { key: "all", label: "All", count: scopeSignals.length, accent: "var(--ink)" }
    ];
    for (const chip of SIGNAL_CHIPS) {
      const count = scopeSignals.filter((signal) => matchesChip(signal, chip.key)).length;
      list.push({ key: chip.key, label: chip.label, count, accent: chip.accent });
    }
    return list;
  }, [scopeSignals]);

  const filtered = useMemo(
    () => scopeSignals.filter((signal) => matchesChip(signal, activeChip)),
    [scopeSignals, activeChip]
  );
  // THE BRIEF's community-post total: a plain sum of the stored per-signal
  // community_posts over the SAME filtered signals that tint the map/panel.
  const briefCommunityPosts = useMemo(
    () => filtered.reduce((sum, signal) => sum + signal.community_posts, 0),
    [filtered]
  );

  // Per-borough tint for the CITY map (only used at the city level).
  const boroughStyles: BoroughStyles = useMemo(() => {
    const result: BoroughStyles = {};
    for (const borough of BOROUGHS) {
      const list = (byBorough.get(borough) ?? []).filter((signal) =>
        matchesChip(signal, activeChip)
      );
      if (list.length === 0) continue;
      const top = topByScore(list);
      const color =
        activeChip === "all"
          ? MAP_ACCENTS[top.signal_type] ?? MAP_ACCENTS.emerging
          : MAP_ACCENTS[activeChip] ?? MAP_ACCENTS.emerging;
      result[borough] = { color, opacity: scoreToOpacity(top.score) };
    }
    return result;
  }, [byBorough, activeChip]);

  const scopeHasSignals = scopeSignals.length > 0;
  const windowDays = scopeSignals[0]?.window_days ?? 7;
  const activeChipMeta = chips.find((chip) => chip.key === activeChip);
  const chipLabel = activeChipMeta?.label ?? "matching";
  const activeAccent = activeChipMeta?.accent ?? "var(--primary)";
  const neighborhoodButtonText =
    view === "city"
      ? isPhone
        ? "Neighborhood"
        : "Browse neighborhoods"
      : selectedAreaId !== null
        ? selectedName
        : isPhone
          ? "Neighborhood"
          : "Choose neighborhood";
  const neighborhoodButtonLabel =
    view === "city"
      ? "Browse neighborhoods"
      : selectedAreaId !== null
        ? `Change neighborhood, currently ${selectedName}`
        : `Choose a neighborhood in ${activeBorough}`;

  // --- navigation handlers ----------------------------------------------------
  const clearFocusedPoint = useCallback(() => {
    locationRequestIdRef.current += 1;
    setLocationStatus("idle");
    setFocusPoint(null);
    setSearchedLocationPoint(null);
    setSearchedLocationLabel(null);
  }, []);

  // Opens the zoomed neighborhood view for the active borough. Only the panel's
  // "Browse … neighborhoods" button calls this — borough map clicks never zoom.
  const openNeighborhoods = useCallback(() => {
    setNeighborhoodPickerOpen(false);
    setView("borough");
    updateSelectedAreaId(null);
    clearFocusedPoint();
    setSearchNote(null);
    // Drilling in makes the map the hero — drop the sheet to peek (phone only;
    // setSnap is inert off phone). Gated while touring: the tour owns the sheet.
    if (!tourOpen) setSnap("peek");
  }, [tourOpen, setSnap, updateSelectedAreaId, clearFocusedPoint]);

  const handleSelectArea = useCallback(
    (areaId: number) => {
      setNeighborhoodPickerOpen(false);
      updateSelectedAreaId(areaId);
      clearFocusedPoint();
      setSearchNote(null);
      if (!tourOpen) setSnap("half");
    },
    [tourOpen, setSnap, updateSelectedAreaId, clearFocusedPoint]
  );

  const backToCity = useCallback(() => {
    setNeighborhoodPickerOpen(false);
    setView("city");
    updateSelectedAreaId(null);
    clearFocusedPoint();
    setSearchNote(null);
    setCameraScope("city");
  }, [updateSelectedAreaId, clearFocusedPoint]);

  const backToBorough = useCallback(() => {
    setNeighborhoodPickerOpen(false);
    updateSelectedAreaId(null);
    clearFocusedPoint();
    setSearchNote(null);
  }, [updateSelectedAreaId, clearFocusedPoint]);

  const closeNeighborhoodPicker = useCallback(() => {
    setNeighborhoodPickerOpen(false);
    if (!tourOpen) setSnap("half");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => neighborhoodBtnRef.current?.focus());
    }
  }, [tourOpen, setSnap]);

  const openNeighborhoodPicker = useCallback(() => {
    if (tourOpen) {
      openNeighborhoods();
      return;
    }
    setFiltersOpen(false);
    if (view === "city") {
      setView("borough");
      updateSelectedAreaId(null);
      clearFocusedPoint();
      setSearchNote(null);
    }
    setNeighborhoodPickerOpen(true);
    setSnap("full");
  }, [tourOpen, openNeighborhoods, view, updateSelectedAreaId, clearFocusedPoint, setSnap]);

  const handlePickerBoroughChange = useCallback(
    (borough: string) => {
      onSelectBorough(borough);
      setView("borough");
      updateSelectedAreaId(null);
      clearFocusedPoint();
      setSearchNote(null);
      setCameraScope("borough");
      if (!tourOpen) setSnap("full");
    },
    [onSelectBorough, updateSelectedAreaId, clearFocusedPoint, tourOpen, setSnap]
  );

  const handlePickerSelectArea = useCallback(
    (areaId: number) => {
      if (areaId !== selectedAreaId) {
        handleSelectArea(areaId);
      } else if (!tourOpen) {
        setSnap("half");
      }
      setNeighborhoodPickerOpen(false);
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => neighborhoodBtnRef.current?.focus());
      }
    },
    [selectedAreaId, handleSelectArea, tourOpen, setSnap]
  );

  const handlePickerSelectAll = useCallback(() => {
    if (selectedAreaId !== null) {
      backToBorough();
    }
    setNeighborhoodPickerOpen(false);
    if (!tourOpen) setSnap("half");
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => neighborhoodBtnRef.current?.focus());
    }
  }, [selectedAreaId, backToBorough, tourOpen, setSnap]);

  const resolvePoint = useCallback(
    (
      center: [number, number],
      label: string,
      source: PointSource,
      accuracyMeters?: number
    ) => {
      // Both typed searches and device location go through the same NYC polygon
      // resolution, so they cannot disagree about a borough or neighborhood.
      setNeighborhoodPickerOpen(false);
      if (!tourOpenRef.current) setSnap("half");
      setFocusPoint(null);
      if (source === "search") {
        setSearchedLocationPoint(null);
        setSearchedLocationLabel(null);
      } else {
        setUserLocationPoint(null);
      }
      const area = findAreaContaining(center, ntaFeatures);
      const approximateLocation =
        source === "geolocation" &&
        typeof accuracyMeters === "number" &&
        accuracyMeters > 250;
      const accuracyNote = approximateLocation
        ? " Your phone shared an approximate location, so the neighborhood may be off near a boundary."
        : "";
      if (area) {
        onSelectBorough(
          area.borough ?? findBoroughContaining(center, boroughFeaturesAll) ?? activeBorough
        );
        setView("borough");
        updateSelectedAreaId(area.areaId);
        setFocusPoint([center[0], center[1]]);
        if (source === "search") {
          setSearchedLocationPoint([center[0], center[1]]);
          setSearchedLocationLabel(label);
        } else {
          setUserLocationPoint([center[0], center[1]]);
        }
        setSearchNote(
          source === "geolocation"
            ? `You're in ${area.name}.${accuracyNote} Your location is used only for this map and isn't saved.`
            : null
        );
        return;
      }
      const borough = findBoroughContaining(center, boroughFeaturesAll);
      if (borough) {
        onSelectBorough(borough);
        setView("borough");
        updateSelectedAreaId(null);
        setFocusPoint([center[0], center[1]]);
        if (source === "search") {
          setSearchedLocationPoint([center[0], center[1]]);
          setSearchedLocationLabel(label);
        } else {
          setUserLocationPoint([center[0], center[1]]);
        }
        setSearchNote(
          source === "geolocation"
            ? `You're in ${borough}.${accuracyNote} We couldn't match a neighborhood boundary. Your location isn't saved.`
            : `We couldn't match “${label}” to a neighborhood, but here's the surrounding area.`
        );
        return;
      }
      updateSelectedAreaId(null);
      setSearchNote(
        source === "geolocation"
          ? "Your current location is outside the Civic Map's New York City coverage."
          : `“${label}” looks to be outside New York City's neighborhoods.`
      );
    },
    [
      ntaFeatures,
      boroughFeaturesAll,
      activeBorough,
      onSelectBorough,
      setSnap,
      updateSelectedAreaId
    ]
  );

  const handleSearchPick = useCallback(
    (center: [number, number], label: string) => {
      suppressAutoLocateRef.current = true;
      locationRequestIdRef.current += 1;
      setLocationStatus("idle");
      resolvePoint(center, label, "search");
    },
    [resolvePoint]
  );

  const handleSearchStart = useCallback(() => {
    suppressAutoLocateRef.current = true;
    locationRequestIdRef.current += 1;
    setLocationStatus("idle");
    setSearchNote(null);
    setNeighborhoodPickerOpen(false);
    setFiltersOpen(false);
  }, []);

  const requestCurrentLocation = useCallback(() => {
    autoLocateAttemptedRef.current = true;
    setNeighborhoodPickerOpen(false);
    setFiltersOpen(false);
    if (tourOpenRef.current) {
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setSearchNote(
        "Near me needs a secure HTTPS connection on iPhone. Open the map over HTTPS, or search by address instead."
      );
      setSnap("half");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setSearchNote("This browser doesn't support location access. Search by address instead.");
      setSnap("half");
      return;
    }

    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;
    setUserLocationPoint(null);
    setLocationStatus("locating");
    setSearchNote("Finding your location…");
    setSnap("half");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequestIdRef.current) {
          return;
        }
        setLocationStatus("idle");
        resolvePoint(
          [position.coords.longitude, position.coords.latitude],
          "Your current location",
          "geolocation",
          position.coords.accuracy
        );
      },
      (error) => {
        if (requestId !== locationRequestIdRef.current) {
          return;
        }
        setLocationStatus("idle");
        setSearchNote(locationErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [resolvePoint, setSnap]);

  // Never surprise a first-time visitor with a permission prompt. If they have
  // already granted geolocation, reuse that choice once and open their local
  // neighborhood automatically; otherwise the visible "Near me" button prompts.
  useEffect(() => {
    if (
      !canSearch ||
      tourOpen ||
      restoredAreaOnMountRef.current ||
      autoLocateAttemptedRef.current ||
      typeof window === "undefined" ||
      !window.isSecureContext ||
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      !navigator.permissions
    ) {
      return;
    }
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (
          cancelled ||
          tourOpenRef.current ||
          autoLocateAttemptedRef.current ||
          suppressAutoLocateRef.current ||
          permission.state !== "granted"
        ) {
          return;
        }
        autoLocateAttemptedRef.current = true;
        requestCurrentLocation();
      })
      .catch(() => {
        // Permissions API support is optional. The button still uses the widely
        // supported Geolocation API and will let the browser prompt on demand.
      });
    return () => {
      cancelled = true;
    };
  }, [canSearch, tourOpen, requestCurrentLocation]);

  useEffect(
    () => () => {
      // getCurrentPosition cannot be cancelled. Invalidate any late callback so
      // leaving Civic Signals cannot change map or URL state after unmount.
      locationRequestIdRef.current += 1;
    },
    []
  );

  // Fires on every borough click (including a re-click of the current borough).
  const notifyBoroughClick = useCallback(() => {
    setBoroughClickTick((tick) => tick + 1);
    // First load frames all five boroughs; the first borough click frames that
    // borough from here on (the overview map re-fits on this scope flip).
    setCameraScope("borough");
    // Selecting a borough re-scopes the panel — surface it at half (phone only;
    // gated while touring so the tour's own choreography is the sole writer).
    if (!tourOpen) setSnap("half");
  }, [tourOpen, setSnap]);

  // Pointer-down records the pre-focus state but deliberately does not resize the
  // sheet. iOS Safari must finish the native input tap before anything moves, or
  // the link that slides under the finger can receive the completed click.
  const handleSearchFocusIntentPhone = useCallback(() => {
    if (tourOpen) {
      return;
    }
    if (!searchHasFocusRef.current) {
      searchHasFocusRef.current = true;
      searchSnapBeforeFocusRef.current = snap === "peek" ? "half" : snap;
      searchViewportHeightBeforeFocusRef.current = viewportHeight;
      searchSawKeyboardRef.current = false;
    }
  }, [tourOpen, snap, viewportHeight]);

  // Called after the input's click (or a non-pointer focus) has completed. The
  // original snap is already captured, so expanding now cannot retarget the tap.
  const handleSearchFocusPhone = useCallback(() => {
    if (tourOpen) {
      return;
    }
    handleSearchFocusIntentPhone();
    setNeighborhoodPickerOpen(false);
    setFiltersOpen(false);
    setSnap("full");
  }, [handleSearchFocusIntentPhone, tourOpen, setSnap]);

  const handleSearchBlurPhone = useCallback(() => {
    if (!searchHasFocusRef.current) {
      return;
    }
    searchHasFocusRef.current = false;
    searchSawKeyboardRef.current = false;
    // Restore only while search still owns the full snap. A result, Near me, or
    // Neighborhoods click may have intentionally selected half/peek before this
    // delayed blur callback; its newer navigation state must win.
    if (!tourOpen && latestSnapRef.current === "full") {
      setSnap(searchSnapBeforeFocusRef.current);
    }
  }, [tourOpen, setSnap]);

  // The keyboard's toolbar can dismiss iOS Safari's keyboard without blurring
  // the input. Detect the visual viewport closing and restore the pre-focus snap
  // so the sheet does not stay full as in the user's third screenshot.
  useEffect(() => {
    if (!isPhone || !searchHasFocusRef.current) {
      return;
    }
    const baseline = searchViewportHeightBeforeFocusRef.current;
    const reduction = Math.max(0, baseline - viewportHeight);
    const keyboardVisible = reduction > 120 || viewportBottomInset > 120;
    if (keyboardVisible) {
      searchSawKeyboardRef.current = true;
      return;
    }
    if (
      searchSawKeyboardRef.current &&
      reduction < 80 &&
      viewportBottomInset < 80
    ) {
      handleSearchBlurPhone();
    }
  }, [
    isPhone,
    viewportHeight,
    viewportBottomInset,
    handleSearchBlurPhone
  ]);

  // A tap on the peek grab handle / brief row is user intent to see more — rise
  // to half. Guarded to peek so a click that lands after a real drag (which has
  // already settled the snap) can't force the sheet back down; gated off-tour for
  // consistency with the rest of the sheet choreography (the tour owns the sheet).
  const expandFromPeek = useCallback(() => {
    // A mouse drag that settles at peek fires a synthetic click on the handle
    // afterward; consume the drag flag and ignore that click so the sheet the
    // user just dragged down doesn't spring back up. A true tap moved past no
    // slop, so it reports false and still expands.
    if (consumeDragMoved()) return;
    if (!tourOpen && snap === "peek") setSnap("half");
  }, [tourOpen, snap, setSnap, consumeDragMoved]);

  // Tour v6 teardown bookkeeping. finishingRef marks a FINISH close so the falling-
  // edge effect below skips its reset (finish already ran it); prevTourOpenRef lets
  // that effect fire only on a real open→closed transition (not on mount).
  const finishingRef = useRef(false);
  const prevTourOpenRef = useRef(tourOpen);

  // Rising edge of `tourOpen`: reset the map to the 5-borough city view with no
  // filter and the drawer closed, so the tour always starts from a known state
  // (a replay from a drilled-in neighborhood can never satisfy a map stop with
  // an unearned success). Runs in one commit before the tour's own ready-gate.
  useEffect(() => {
    if (!tourOpen) {
      return;
    }
    backToCity();
    setActiveChip("all");
    setFiltersOpen(false);
  }, [tourOpen, backToCity]);

  // Falling edge of `tourOpen` for a NON-finish close (Skip / Esc / a rail nav that
  // ends the tour). In v6 the tour DROVE the host — it drilled a borough, opened a
  // neighborhood and maybe the filter drawer — so bailing mid-tour would otherwise
  // strand that tour-picked state as the skipper's first impression of the map.
  // Reset it to the clean city view, mirroring the rising-edge reset above. A FINISH
  // close already ran this reset (finishingRef guards the double-run); the bridge-news
  // finish navigates to /news with tourOpen still true, so it never reaches this edge.
  useEffect(() => {
    const wasOpen = prevTourOpenRef.current;
    prevTourOpenRef.current = tourOpen;
    if (!wasOpen || tourOpen) {
      return;
    }
    if (finishingRef.current) {
      finishingRef.current = false;
      return;
    }
    backToCity();
    setActiveChip("all");
    setFiltersOpen(false);
  }, [tourOpen, backToCity]);

  // Finishing the tour returns to the city view before the parent persists the
  // seen-key and closes. finishingRef tells the falling-edge effect above not to
  // double-reset. (Staged for the tour overlay — see integration point.)
  const handleTourFinish = useCallback(() => {
    finishingRef.current = true;
    backToCity();
    setActiveChip("all");
    onTourClose();
  }, [backToCity, onTourClose]);

  // Step-back rewind for the tour: bring the host to the destination stop's nav
  // depth so its context is true. Closes the filter drawer UNLESS the destination
  // is filter-pick (keepDrawer) — that stop spotlights the chips, so it needs the
  // drawer open; backing into the `filter` stop instead wants it shut so that stop
  // lands pending rather than instantly re-satisfied.
  //   0 → city (backToCity)   1 → borough view, no selection   2 → keep selection
  const rewindHostTo = useCallback(
    (depth: 0 | 1 | 2, keepDrawer = false) => {
      // keepDrawer must REOPEN, not merely not-close: picking a chip auto-closes
      // the drawer, so backing into filter-pick always arrives with it shut.
      setFiltersOpen(keepDrawer);
      if (depth === 0) {
        backToCity();
      } else if (depth === 1) {
        updateSelectedAreaId(null);
      }
      // depth === 2: selection stays — no nav change.
    },
    [backToCity, updateSelectedAreaId]
  );

  // Tour v6: the loudest REAL neighborhood in the active borough — a genuine NTA
  // polygon so the guide's enacted "open a neighborhood" always highlights a real
  // shape on the map (the demo cards in the panel stay clearly labelled example
  // content). Falls back to the first polygon if none carry a signal yet.
  const pickTopTourAreaId = useCallback((): number | null => {
    let bestId: number | null = null;
    let bestScore = -Infinity;
    let firstId: number | null = null;
    for (const feature of boroughFeatures) {
      const id = (feature.properties ?? {}).id;
      if (typeof id !== "number") continue;
      if (firstId === null) firstId = id;
      for (const signal of byAreaId.get(id) ?? []) {
        if (matchesChip(signal, activeChip) && signal.score > bestScore) {
          bestScore = signal.score;
          bestId = id;
        }
      }
    }
    return bestId ?? firstId;
  }, [boroughFeatures, byAreaId, activeChip]);

  // Tour v6 enactment: the guide asks the host to PERFORM the walkthrough step it
  // is narrating. Each branch drives the SAME host handlers a real click uses (no
  // duplicated logic) and is safe/idempotent if the state is already there, so a
  // Back-then-forward re-entry re-enacts cleanly. The sheet choreography stays with
  // the guide (these handlers no-op their setSnap while tourOpen).
  const enactTourAction = useCallback(
    (action: TourEnact) => {
      switch (action) {
        case "select-borough":
          // onSelectBorough no-ops when the borough is already active; the tick +
          // camera flip come from notifyBoroughClick either way.
          onSelectBorough(activeBorough);
          notifyBoroughClick();
          break;
        case "browse":
          openNeighborhoods();
          break;
        case "select-area": {
          const areaId = pickTopTourAreaId();
          if (areaId !== null) {
            // Self-heal: if a host regression left us out of the borough view (e.g. a
            // keyboard Enter on the breadcrumb under the dim → backToCity), restore
            // view='borough' first so navDepth can reach 2 (a selection). Without this
            // the re-enact only re-selects an area while view stays 'city', navDepth
            // never hits 2, and the neighborhood stop's confirm (navDepth>=2) — hence
            // Next — never fires. openNeighborhoods() clears the selection, so the
            // handleSelectArea below is what lands the area in the same commit.
            if (view !== "borough") openNeighborhoods();
            handleSelectArea(areaId);
          }
          break;
        }
        case "open-filter":
          setFiltersOpen(true);
          break;
      }
    },
    [onSelectBorough, activeBorough, notifyBoroughClick, openNeighborhoods, handleSelectArea, pickTopTourAreaId, view]
  );

  // T8: while the sheet animates height to a settled snap (220ms, phone only), drop
  // the backdrop blur — the same jank suppression as data-dragging, extended to the
  // settle window via a transient data-settling attribute cleared on the height
  // transitionend with a timeout backstop. Triggered by a snap change OR the falling
  // edge of a drag (a release near the starting snap keeps the same snap yet still
  // animates back to the settled height). useLayoutEffect so the attribute lands
  // before the first transition frame paints. Skips the first run (no transition on
  // mount) and off-phone (desktop never animates the panel height).
  useLayoutEffect(() => {
    const prevSnap = prevSnapRef.current;
    const prevDragging = prevDraggingRef.current;
    prevSnapRef.current = snap;
    prevDraggingRef.current = isDragging;
    if (!isPhone) {
      return;
    }
    const dragReleased = prevDragging && !isDragging;
    if (prevSnap === snap && !dragReleased) {
      return;
    }
    const el = insightsRef.current;
    if (!el) {
      return;
    }
    el.setAttribute("data-settling", "");
    const controller = new AbortController();
    const clear = () => {
      controller.abort();
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      el.removeAttribute("data-settling");
    };
    el.addEventListener(
      "transitionend",
      (event) => {
        if (event.target === el && event.propertyName === "height") {
          clear();
        }
      },
      { signal: controller.signal }
    );
    settleTimerRef.current = window.setTimeout(clear, 280);
    return clear;
  }, [snap, isDragging, isPhone]);

  // Panel content defined ONCE (no duplication): phone wraps it in the scrolling
  // .cs-sheet-body (below), desktop/tablet render it directly in the aside.
  const panelBody = unavailable ? (
    <div className={styles.unavailable}>
      <p className={styles.unavailableTitle}>Signals unavailable</p>
      <p className={styles.unavailableText}>
        We couldn&apos;t load neighborhood signals right now. Switch to Reports for live 311
        and news, or try again in a moment.
      </p>
    </div>
  ) : (
    <>
      {view === "borough" ? (
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <button type="button" className={styles.crumbLink} onClick={backToCity}>
            New York City
          </button>
          <span className={styles.crumbSep} aria-hidden="true">
            ›
          </span>
          {isNeighborhoodScope ? (
            <>
              <button type="button" className={styles.crumbLink} onClick={backToBorough}>
                {activeBorough}
              </button>
              <span className={styles.crumbSep} aria-hidden="true">
                ›
              </span>
              <span className={styles.crumbCurrent} aria-current="page">
                {scopeName}
              </span>
            </>
          ) : (
            <span className={styles.crumbCurrent} aria-current="page">
              {activeBorough}
            </span>
          )}
        </nav>
      ) : null}

      <header className={styles.panelHead}>
        <div className={styles.titleRow}>
          <h1 className={styles.panelTitle}>{scopeName}</h1>
          {scopeHasSignals ? (
            <span className="cs-badge">
              {scopeSignals.length} {scopeSignals.length === 1 ? "signal" : "signals"}
            </span>
          ) : null}
        </div>
        <p className={styles.panelSub}>
          Signals are local topics from resident posts, city 311 complaints and local news ·
          last {windowDays} days
        </p>
      </header>

      <div className={styles.controlStrip}>
        {canSearch ? (
          <MapSearchBox
            token={mapboxToken}
            onPick={handleSearchPick}
            isResultAllowed={isSearchResultInNyc}
            note={searchNote}
            onSearchStart={handleSearchStart}
            onPhoneFocusIntent={handleSearchFocusIntentPhone}
            onPhoneFocus={handleSearchFocusPhone}
            onPhoneBlur={handleSearchBlurPhone}
          />
        ) : null}
        {canSearch ? (
          <button
            type="button"
            className={styles.locateBtn}
            onClick={requestCurrentLocation}
            disabled={locationStatus === "locating" || tourOpen}
            aria-label="Use my current location"
            aria-busy={locationStatus === "locating"}
          >
            <LocateIcon />
            {locationStatus === "locating"
              ? "Locating…"
              : isPhone
                ? "Near me"
                : "Use my location"}
          </button>
        ) : null}
        {canDrill ? (
          <button
            type="button"
            ref={neighborhoodBtnRef}
            className={`${styles.browseBtn}${neighborhoodPickerOpen ? ` ${styles.browseBtnActive}` : ""
              }`}
            data-tour={view === "city" ? "browse" : undefined}
            aria-label={neighborhoodButtonLabel}
            aria-expanded={neighborhoodPickerOpen}
            aria-controls={neighborhoodRegionId}
            onClick={
              neighborhoodPickerOpen ? closeNeighborhoodPicker : openNeighborhoodPicker
            }
          >
            <span className={styles.browseBtnText}>{neighborhoodButtonText}</span>
            <svg
              className={`${styles.filterCaret}${neighborhoodPickerOpen ? ` ${styles.filterCaretOpen}` : ""
                }`}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        ) : null}
        <div className={styles.filterRow}>
          <button
            type="button"
            ref={filterBtnRef}
            data-tour="filter"
            className={`${styles.filterBtn}${activeChip !== "all" ? ` ${styles.filterBtnActive}` : ""
              }`}
            style={
              activeChip !== "all"
                ? ({ "--chip-accent": activeAccent } as CSSProperties)
                : undefined
            }
            aria-expanded={filtersOpen}
            aria-controls={filterRegionId}
            onClick={() => {
              const nextOpen = !filtersOpen;
              setFiltersOpen(nextOpen);
              if (nextOpen && neighborhoodPickerOpen) {
                setNeighborhoodPickerOpen(false);
                if (!tourOpen) setSnap("half");
              }
            }}
          >
            {activeChip !== "all" ? (
              <span className={styles.filterDot} aria-hidden="true" />
            ) : (
              <svg className={styles.filterIcon} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            )}
            {activeChip === "all" ? "Filter" : `Filter · ${chipLabel}`}
            <svg
              className={`${styles.filterCaret}${filtersOpen ? ` ${styles.filterCaretOpen}` : ""
                }`}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {activeChip !== "all" ? (
            <button
              type="button"
              className={styles.filterClear}
              aria-label={`Clear filter: ${chipLabel}`}
              onClick={() => setActiveChip("all")}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
      {filtersOpen ? (
        <div
          id={filterRegionId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setFiltersOpen(false);
              filterBtnRef.current?.focus();
            }
          }}
        >
          <SignalFilterBar
            chips={chips}
            activeKey={activeChip}
            onSelect={(key) => {
              setActiveChip(key);
              setChipPickTick((tick) => tick + 1);
              setFiltersOpen(false);
              filterBtnRef.current?.focus();
            }}
          />
        </div>
      ) : null}

      {neighborhoodPickerOpen && canDrill ? (
        <div id={neighborhoodRegionId}>
          <NeighborhoodPicker
            activeBorough={activeBorough}
            boroughs={BOROUGHS}
            boroughSignalCount={activeBoroughFilteredCount}
            options={neighborhoodOptions}
            selectedAreaId={selectedAreaId}
            onBoroughChange={handlePickerBoroughChange}
            onSelectArea={handlePickerSelectArea}
            onSelectAll={handlePickerSelectAll}
            onClose={closeNeighborhoodPicker}
          />
        </div>
      ) : null}

      {/*{isNeighborhoodScope &&
      selectedAreaId !== null &&
      !tourOpen &&
      !neighborhoodPickerOpen &&
      !filtersOpen ? (
        <section
          className={styles.coverageCallout}
          aria-label={`Real-time Insights request for ${selectedName}`}
        >
          <p className={styles.coveragePrompt}>
            Have something we should look into in {selectedName}?
          </p>
          <button
            ref={coverageBtnRef}
            type="button"
            className={styles.coverageBtn}
            onClick={() =>
              setCoverageArea({
                id: selectedAreaId,
                name: selectedName,
                borough: selectedMeta?.borough ?? activeBorough
              })
            }
          >
            Request Real-time Insights
          </button>
        </section>
      ) : null} 
      */}

      <PanelDigest
        briefCount={filtered.length}
        briefPosts={briefCommunityPosts}
        activeBorough={activeBorough}
        areaName={selectedName}
        level={view === "city" ? 1 : isNeighborhoodScope ? 3 : 2}
        signals={filtered}
        tourOpen={tourOpen}
      />
    </>
  );

  return (
    <>
      {view === "borough" && canDrill ? (
        <NeighborhoodSignalsMap
          borough={activeBorough}
          boroughGeoJson={boroughGeoJson}
          features={boroughCollection}
          tintByArea={tintByArea}
          metaByArea={metaByArea}
          selectedAreaId={selectedAreaId}
          focusPoint={focusPoint}
          userLocationPoint={userLocationPoint}
          searchedLocationPoint={searchedLocationPoint}
          searchedLocationLabel={searchedLocationLabel}
          onSelectArea={handleSelectArea}
          sheetPx={settledHeight}
          sheetSnap={snap}
        />
      ) : (
        <BoroughOverviewMap
          boroughGeoJson={boroughGeoJson}
          labelsGeoJson={labelsGeoJson}
          selectedBorough={activeBorough}
          onSelectBorough={onSelectBorough}
          onDrillIn={notifyBoroughClick}
          boroughStyles={boroughStyles}
          cameraScope={cameraScope}
          sheetPx={settledHeight}
          sheetSnap={snap}
        />
      )}

      {/* Hidden while the tour runs: on the map-region neighborhood stop this pill
          floats INSIDE the spotlight hole (it can't be dimmed), so a click would
          escape the guided lesson and regress the tour. The tour's own Back handles
          stepping out; users leave via Skip. */}
      {!unavailable && view === "borough" && !tourOpen ? (
        <button type="button" className="cs-map-back cs-map-back--signals" onClick={backToCity}>
          ← All boroughs
        </button>
      ) : null}

      <aside
        ref={insightsRef}
        className="cs-insights"
        aria-label={`${scopeName} neighborhood briefing`}
        data-tour="panel"
        data-snap={isPhone ? snap : undefined}
        data-dragging={isPhone && isDragging ? "" : undefined}
        style={isPhone ? { height: sheetHeight } : undefined}
      >
        {/* Phone-only grab handle: the SOLE drag surface for the bottom sheet
            (handle-only drag keeps map pan/zoom gestures conflict-free). It stays
            the first child so it pins to the sheet top; the aside remains the same
            .cs-insights node the tour measures live, so its rect stays meaningful. */}
        {isPhone ? (
          <button
            type="button"
            className="cs-sheet-handle"
            aria-label="Expand panel"
            {...handleProps}
            onClick={expandFromPeek}
          >
            <span className="cs-sheet-handle-pill" />
          </button>
        ) : null}
        {/* Peek brief (phone only): the one line the sheet shows at peek — the
            scope name + the SAME filtered counts the digest reads (briefCount =
            filtered.length, briefPosts = briefCommunityPosts). Hidden at half/full
            (CSS) since the header + digest brief then carry the same numbers.
            Tapping it rises the sheet to half. */}
        {isPhone && !unavailable ? (
          <div className="cs-sheet-peek">
            <button
              type="button"
              className="cs-sheet-brief"
              aria-label="Open search and neighborhood controls"
              onClick={expandFromPeek}
            >
              <strong>{scopeName}</strong> — {filtered.length}{" "}
              {filtered.length === 1 ? "issue" : "issues"} · {briefCommunityPosts}{" "}
              {briefCommunityPosts === 1 ? "post" : "posts"}
            </button>
            {canSearch ? (
              <button
                type="button"
                className={`${styles.locateBtn} ${styles.locateBtnPeek}`}
                onClick={requestCurrentLocation}
                disabled={locationStatus === "locating" || tourOpen}
                aria-label="Use my current location"
                aria-busy={locationStatus === "locating"}
              >
                <LocateIcon />
                {locationStatus === "locating" ? "Locating…" : "Near me"}
              </button>
            ) : null}
          </div>
        ) : null}
        {/* Phone: the content scrolls inside .cs-sheet-body so the handle + brief
            stay OUTSIDE the scroller (owner complaints 1 & 3). Desktop/tablet render
            the same panelBody directly in the scrolling aside — DOM byte-identical. */}
        {isPhone ? <div className="cs-sheet-body">{panelBody}</div> : panelBody}
      </aside>

      {coverageArea ? (
        <CoverageRequestDialog
          area={coverageArea}
          onClose={() => setCoverageArea(null)}
          returnFocusRef={coverageBtnRef}
        />
      ) : null}

      {/* Guided tour overlay — mounted only while open (fresh state each open),
          reading live host state as props. The rising-edge reset effect above
          resets the map on open; handleTourFinish resets + closes;
          notifyBoroughClick feeds boroughClickTick; tourBlockedTick surfaces
          soft-blocked 311 switches. */}
      {tourOpen ? (
        <MapTourGuide
          onClose={onTourClose}
          onFinish={handleTourFinish}
          onBridge={onTourBridge}
          rewindHostTo={rewindHostTo}
          setSheetForTour={setSnap}
          enactTourAction={enactTourAction}
          activeBorough={activeBorough}
          view={view}
          selectedAreaId={selectedAreaId}
          filtersOpen={filtersOpen}
          chipPickTick={chipPickTick}
          canDrill={canDrill}
          boroughClickTick={boroughClickTick}
          blockedTick={tourBlockedTick}
        />
      ) : null}
    </>
  );
}
