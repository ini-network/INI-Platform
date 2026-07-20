"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="app-error-boundary" role="alert">
          <h1>Something went wrong</h1>
          <p>The app hit an unexpected error. Please try reloading.</p>
          <button className="app-error-retry" type="button" onClick={() => reset()}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
