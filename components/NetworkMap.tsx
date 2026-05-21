"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

/**
 * LAZY-LOADING CLIENT-SIDE FORCE GRAPH LIBRARY
 * 
 * Next.js statically renders pages on the server by default (SSR). However, interactive 
 * Canvas-based visualizations like 'react-force-graph-2d' rely directly on browser-only 
 * objects (e.g., HTMLCanvasElement, window, document). 
 * To prevent hydration mismatch or server-side compile errors, we dynamically import 
 * the module with { ssr: false } so it only loads inside the user's browser runtime.
 */
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/**
 * TypeScript API signatures mapping to underlying D3 Force Layout instances.
 * This represents the imperative API exposed by the third-party canvas visualizer.
 */
export interface ForceGraphMethods {
  d3Force: (forceName: string) => { strength?: (val: number) => void; distance?: (val: number) => void } | undefined;
  d3ReheatSimulation: () => void;
  zoom: (val: number, ms: number) => void;
  zoomToFit: (ms: number, padding: number) => void;
}

interface NetworkMapProps {
  graphData: { nodes: unknown[]; links: unknown[] };
  repulsion?: number; // D3 many-body force charge strength (typically negative for repulsion)
  distance?: number;  // D3 link distance separating interconnected nodes
  [key: string]: unknown;
}

/**
 * NetworkMap Component
 * Renders an interactive D3 2D force-directed canvas. Uses React's forwardRef API to expose
 * D3 simulation controls (zooming, fitting, force updates) to parent controllers.
 */
const NetworkMap = forwardRef<ForceGraphMethods, NetworkMapProps>(({ graphData, repulsion = -400, distance = 120, ...rest }, forwardedRef) => {
  // Safe fallback reference to satisfy React ref standards if a parent does not pass a ref.
  const fallbackRef = useRef<ForceGraphMethods>(null);
  const targetRef = (forwardedRef as React.RefObject<ForceGraphMethods>) || fallbackRef;

  /**
   * FORCE LAYOUT PHYSIC ENGINE LIFECYCLE SYNC
   * 
   * Since ForceGraph2D is loaded dynamically/asynchronously, its underlying D3 engine 
   * and canvas elements may not be initialized immediately on the initial React mount.
   * 
   * To safely sync our physics props (repulsion/distance) with D3, we use a recursive-polling
   * retry loop. This attempts to load the force configurations, and if they are not yet bound,
   * schedules retries every 50ms until the D3 canvas context is fully interactive.
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const applyPhysics = () => {
      // Check if the graph component has fully lazy-loaded and bound its imperative methods
      if (targetRef && targetRef.current && targetRef.current.d3Force) {
        // Inject D3 force-directed charge configuration (negative strength acts as repulsion)
        targetRef.current.d3Force('charge')?.strength?.(repulsion as number);
        // Inject D3 link length constraints for node linkages
        targetRef.current.d3Force('link')?.distance?.(distance as number);
        // Re-ignite/re-warm the physics simulation to visually transition into new constraints
        targetRef.current.d3ReheatSimulation();
        return true; // Success! Stop the retry polling loop.
      }
      return false; // D3 force mappings not initialized yet. Keep polling.
    };

    // Attempt immediately. If unsuccessful, fall back to checking on a 50ms interval.
    if (!applyPhysics()) {
      interval = setInterval(() => {
        if (applyPhysics()) clearInterval(interval);
      }, 50);
    }

    // Cleanup phase: Teardown the periodic interval to prevent memory leaks during component unmounting.
    return () => clearInterval(interval);
  }, [graphData, repulsion, distance, targetRef]);

  return (
    <ForceGraph2D
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={targetRef as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      graphData={graphData as any}
      {...rest}
    />
  );
});

NetworkMap.displayName = "NetworkMap";
export default NetworkMap;