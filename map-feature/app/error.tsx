"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for operators/logs rather than hiding it.
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="app-error-boundary" role="alert">
      <h1>Something went wrong</h1>
      <p>
        This page couldn&apos;t load right now. The service it depends on may be briefly
        unavailable.
      </p>
      <button className="app-error-retry" type="button" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
