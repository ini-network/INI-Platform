"use client";

import { useEffect, useState } from "react";

export default function MapPage() {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const serviceUrl = process.env.NEXT_PUBLIC_MAP_SERVICE_URL || "http://localhost:3001";
    setSrc(`${serviceUrl}/map`);
  }, []);

  if (!src) return null;

  return (
    <div className="w-full h-full overflow-hidden">
      <iframe
        src={src}
        className="w-full h-full border-0"
        title="Civic Map"
      />
    </div>
  );
}
