"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export interface ForceGraphMethods {
  d3Force: (forceName: string) => { strength?: (val: number) => void; distance?: (val: number) => void } | undefined;
  d3ReheatSimulation: () => void;
  zoom: (val: number, ms: number) => void;
  zoomToFit: (ms: number, padding: number) => void;
}

interface NetworkMapProps {
  graphData: { nodes: unknown[]; links: unknown[] };
  repulsion?: number;
  distance?: number;
  [key: string]: unknown;
}

const NetworkMap = forwardRef<ForceGraphMethods, NetworkMapProps>(({ graphData, repulsion = -400, distance = 120, ...rest }, forwardedRef) => {
  const fallbackRef = useRef<ForceGraphMethods>(null);
  const targetRef = (forwardedRef as React.RefObject<ForceGraphMethods>) || fallbackRef;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const applyPhysics = () => {
      // Check if the graph has finished lazy-loading and exposes d3Force
      if (targetRef && targetRef.current && targetRef.current.d3Force) {
        // Use optional chaining (?.) and cast as number to satisfy strict TS
        targetRef.current.d3Force('charge')?.strength?.(repulsion as number);
        targetRef.current.d3Force('link')?.distance?.(distance as number);
        targetRef.current.d3ReheatSimulation();
        return true; // Success!
      }
      return false; // Not ready yet
    };

    // If it fails on the first try, check every 50ms until it succeeds
    if (!applyPhysics()) {
      interval = setInterval(() => {
        if (applyPhysics()) clearInterval(interval);
      }, 50);
    }

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