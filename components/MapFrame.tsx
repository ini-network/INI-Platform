"use client";

import { useEffect, useState } from "react";

interface MapFrameProps {
  path: string;
  title: string;
}

export default function MapFrame({ path, title }: MapFrameProps) {
  const [src, setSrc] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");

  useEffect(() => {
    const serviceUrl = process.env.NEXT_PUBLIC_MAP_SERVICE_URL || "http://localhost:3001";
    const targetUrl = `${serviceUrl}${path}`;
    setSrc(targetUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

    // Perform health check ping
    fetch(serviceUrl, { method: "HEAD", mode: "no-cors", signal: controller.signal })
      .then(() => {
        clearTimeout(timeoutId);
        setStatus("online");
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setStatus("offline");
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [path]);

  if (status === "loading") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold">Connecting to {title}...</p>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
          🗺️
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{title} Currently Unavailable</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          The map service deployment is unreachable or currently offline. Please try again later or check your environment configuration.
        </p>
        <button
          onClick={() => {
            setStatus("loading");
            const serviceUrl = process.env.NEXT_PUBLIC_MAP_SERVICE_URL || "http://localhost:3001";
            fetch(serviceUrl, { method: "HEAD", mode: "no-cors" })
              .then(() => setStatus("online"))
              .catch(() => setStatus("offline"));
          }}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden">
      <iframe src={src} className="w-full h-full border-0" title={title} />
    </div>
  );
}
