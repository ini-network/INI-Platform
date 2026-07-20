"use client";

import { useEffect, useState } from "react";

import { MQ } from "./breakpoints";

// Single source of truth for JS-side form-factor branches (fitBounds padding,
// easeTo bias, tour geometry, tap-to-peek). Replaces the inline matchMedia
// scattered across the maps + tour so they stay in lockstep with the CSS
// breakpoint tokens. WIDTH axis and POINTER axis are read separately: an iPad
// Pro landscape is `isCoarse` but not `isPhone`/`isTabletPortrait`.

export interface FormFactor {
  isPhone: boolean;
  isTabletPortrait: boolean;
  isCoarse: boolean;
}

// SSR + first-paint default: assume desktop. matchMedia can't run on the server,
// and defaulting to desktop keeps the approved fine-pointer layout flash-free on
// the desktop path; touch clients correct on mount (before paint where React lets
// us, via the lazy initializer below).
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
  const [formFactor, setFormFactor] = useState<FormFactor>(read);

  useEffect(() => {
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
