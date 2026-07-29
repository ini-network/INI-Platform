"use client";

import { useLayoutEffect, useState } from "react";

import { MQ } from "./breakpoints";

// Single source of truth for JS-side form-factor branches (fitBounds padding,
// easeTo bias, tour geometry, touch gesture handling). Replaces the inline matchMedia
// scattered across the maps + tour so they stay in lockstep with the CSS
// breakpoint tokens. WIDTH axis and POINTER axis are read separately: an iPad
// Pro landscape is `isCoarse` but not `isPhone`/`isTabletPortrait`.

export interface FormFactor {
  isPhone: boolean;
  isTabletPortrait: boolean;
  isCoarse: boolean;
}

// SSR + hydration default: assume desktop. The first browser render MUST use the
// same value as the server render; reading matchMedia in useState's initializer
// makes a phone hydrate different markup and triggers a hydration mismatch. A
// layout effect reconciles the real device class before paint.
const DESKTOP: FormFactor = { isPhone: false, isTabletPortrait: false, isCoarse: false };

function read(): FormFactor {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return DESKTOP;
  }
  return {
    isPhone: window.matchMedia(MQ.phone).matches,
    isTabletPortrait: window.matchMedia(MQ.tabletPortraitCoarse).matches,
    isCoarse: window.matchMedia(MQ.coarse).matches
  };
}

export function useFormFactor(): FormFactor {
  const [formFactor, setFormFactor] = useState<FormFactor>(DESKTOP);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const queries = [
      window.matchMedia(MQ.phone),
      window.matchMedia(MQ.tabletPortraitCoarse),
      window.matchMedia(MQ.coarse)
    ];
    const sync = () => setFormFactor(read());
    sync(); // reconcile in case the media state changed between render and effect
    queries.forEach((q) => q.addEventListener("change", sync));
    return () => queries.forEach((q) => q.removeEventListener("change", sync));
  }, []);

  return formFactor;
}
