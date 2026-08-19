"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

import { MQ } from "@/lib/map-feature/breakpoints";

const DEFAULT_STYLE = "mapbox://styles/mapbox/light-v11";

export type MapboxCanvasProps = {
  /** [lng, lat] */
  center: [number, number];
  zoom: number;
  styleUrl?: string;
  className?: string;
  /** Called once the map's style has loaded; add sources/layers here. */
  onReady?: (map: MapboxMap) => void;
};

/**
 * Thin lifecycle wrapper around mapbox-gl. Lazy-imports the library inside an
 * effect (so it never runs during SSR), reads the publishable browser token from
 * NEXT_PUBLIC_MAPBOX_TOKEN, and renders a graceful "Map unavailable" panel when
 * the token is missing or invalid.
 */
export function MapboxCanvas({ center, zoom, styleUrl, className, onReady }: MapboxCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [error, setError] = useState<string | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token) {
      setError("Map needs a Mapbox token. Set NEXT_PUBLIC_MAPBOX_TOKEN in map/.env.local.");
      return;
    }
    if (!containerRef.current || mapRef.current) {
      return;
    }
    const container = containerRef.current;
    let disposed = false;
    let map: MapboxMap | null = null;

    // Keep pinch/trackpad gestures that begin over the map inside Mapbox. The
    // listeners are deliberately scoped to the canvas host; browser zoom and
    // accessibility gestures continue to work everywhere else on the page.
    const preventPagePinch = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const preventTouchPagePinch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    const preventSafariGesture = (event: Event) => event.preventDefault();
    container.addEventListener("wheel", preventPagePinch, { passive: false });
    container.addEventListener("touchmove", preventTouchPagePinch, { passive: false });
    container.addEventListener("gesturestart", preventSafariGesture, { passive: false });
    container.addEventListener("gesturechange", preventSafariGesture, { passive: false });

    void (async () => {
      try {
        const mod = await import("mapbox-gl");
        const mapboxgl = mod.default;
        if (disposed || !containerRef.current) {
          return;
        }
        mapboxgl.accessToken = token;
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: styleUrl || process.env.NEXT_PUBLIC_MAP_STYLE_URL || DEFAULT_STYLE,
          center,
          zoom,
          attributionControl: true
        });
        mapRef.current = map;
        // Touch: kill two-finger twist-rotate and drag-pitch. There's no compass
        // control to undo a rotated/pitched basemap, so a stray gesture would
        // strand the map askew. Coarse pointer only — mouse/trackpad keep every
        // gesture.
        if (window.matchMedia(MQ.coarse).matches) {
          map.touchZoomRotate.disableRotation();
          map.touchPitch.disable();
        }
        map.on("load", () => {
          if (!disposed && map) {
            onReadyRef.current?.(map);
          }
        });
        map.on("error", (event) => {
          const message = event.error?.message ?? "";
          if (/access token|unauthorized|401|forbidden|403/i.test(message)) {
            setError("Map unavailable — the Mapbox token was rejected. Check NEXT_PUBLIC_MAPBOX_TOKEN.");
          }
        });
      } catch (err) {
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Map failed to load.");
        }
      }
    })();

    return () => {
      disposed = true;
      container.removeEventListener("wheel", preventPagePinch);
      container.removeEventListener("touchmove", preventTouchPagePinch);
      container.removeEventListener("gesturestart", preventSafariGesture);
      container.removeEventListener("gesturechange", preventSafariGesture);
      map?.remove();
      mapRef.current = null;
    };
    // Re-mounting on every center/zoom change is unnecessary; navigation reloads
    // the server component, which remounts this with fresh props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <div className={`cs-map-fallback ${className ?? ""}`} role="alert">
        <strong>Map unavailable</strong>
        <span>{error}</span>
      </div>
    );
  }

  return <div ref={containerRef} className={`cs-map-canvas ${className ?? ""}`} />;
}
