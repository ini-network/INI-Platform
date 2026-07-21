// THE breakpoint tokens for the redesign surface (map / news / reports / tour).
//
// CSS custom properties cannot be used inside `@media`, so these numbers live
// here AND as a documented comment convention in app/redesign.css. 640 and 1024
// are the ONLY width lines allowed anywhere in the redesign surface — every new
// `@media` and every matchMedia must reference one of these values (never a raw
// magic number). The two axes are orthogonal: WIDTH decides layout, POINTER
// decides interaction, so most touch rules key off `MQ.coarse`, not a width.
//
//   phone           : <= 640px                    -> bottom-sheet map, single col
//   tablet-portrait : 641-1024px AND pointer:coarse -> narrowed side panel + touch
//   wide / desktop  : > 1024px (or any pointer:fine) -> approved desktop layout

export const PHONE_MAX = 640;
export const TABLET_MAX = 1024;

export const MQ = {
  phone: `(max-width: ${PHONE_MAX}px)`,
  tabletPortraitCoarse: `(min-width: ${PHONE_MAX + 1}px) and (max-width: ${TABLET_MAX}px) and (pointer: coarse)`,
  coarse: "(pointer: coarse)",
  hoverFine: "(hover: hover) and (pointer: fine)"
} as const;
