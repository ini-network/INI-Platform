// Shared map-camera geometry for the borough/neighborhood signal maps: the
// initial borough centers, the form-factor aware fit padding, and the padding
// guard. Lifted verbatim from the map components so all three read one source.

import type { Map as MapboxMap } from "mapbox-gl";

import type { FormFactor } from "../use-form-factor";

// Approximate borough centers used as the initial map view before fitBounds.
export const BOROUGH_CENTERS: Record<string, [number, number]> = {
  Manhattan: [-73.97, 40.78],
  Brooklyn: [-73.94, 40.65],
  Queens: [-73.82, 40.71],
  Bronx: [-73.87, 40.84],
  "Staten Island": [-74.15, 40.58]
};

export type Padding = { top: number; bottom: number; left: number; right: number };

// Padding leaves room for the insights panel on the right (wide screens). This
// is now form-factor aware: the desktop/wide value below is UNCHANGED (signed
// off); tablet-portrait narrows the reserved right band to match the 320px side
// panel; phone reserves the bottom-sheet band instead of a right panel.
export function computeFitPadding(ff: FormFactor, sheetPx: number): Padding {
  if (ff.isPhone) {
    // Reserve the bottom band so a fit lands above it. sheetPx is the sheet's
    // settled snap height on the signals lens, or the non-sheet fallback (45% of
    // the visual viewport + a 68px tab-bar band) on the 311 lens.
    return { top: 40, bottom: sheetPx + 40, left: 24, right: 24 };
  }
  if (ff.isTabletPortrait) {
    return { top: 50, bottom: 50, left: 50, right: 340 };
  }
  return { top: 70, bottom: 70, left: 70, right: 440 };
}

// Clamp guard: Mapbox produces a NaN camera / throws if the reserved padding
// leaves under ~40px of camera space on either axis. Measured against the live
// container so it's correct at ANY viewport; falls back to symmetric safe
// padding. The bottom clears the sheet (capped at half the height) only when the
// incoming padding actually reserved a sheet band — i.e. on phones, where
// bottom>top — else a plain 24, so a 641-750 fine-pointer window doesn't reserve
// a phone-only sheet band it has no sheet for. Also falls back when the free
// horizontal band (cw - left - right) drops under 240px, so a 641-1024
// fine-pointer window can't keep the desktop right reserve and squeeze the map to
// a sliver.
export function guardPadding(map: MapboxMap, padding: Padding, sheetPx: number): Padding {
  const el = map.getContainer();
  const cw = el.clientWidth;
  const ch = el.clientHeight;
  if (
    padding.left + padding.right >= cw - 40 ||
    padding.top + padding.bottom >= ch - 40 ||
    cw - padding.left - padding.right < 240
  ) {
    return {
      top: 24,
      right: 24,
      bottom: padding.bottom > padding.top ? Math.min(sheetPx + 40, Math.floor(ch / 2)) : 24,
      left: 24
    };
  }
  return padding;
}
