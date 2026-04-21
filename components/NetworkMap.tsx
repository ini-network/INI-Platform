"use client";

import React, { forwardRef, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NetworkMap = forwardRef(({ graphData, repulsion = -400, distance = 120, ...rest }: any, forwardedRef: any) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallbackRef = useRef<any>();
  const targetRef = forwardedRef || fallbackRef;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const applyPhysics = () => {
      // Check if the graph has finished lazy-loading and exposes d3Force
      if (targetRef && targetRef.current && targetRef.current.d3Force) {
        targetRef.current.d3Force('charge').strength(repulsion);
        targetRef.current.d3Force('link').distance(distance);
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
      ref={targetRef}
      graphData={graphData}
      {...rest}
    />
  );
});

NetworkMap.displayName = "NetworkMap";
export default NetworkMap;