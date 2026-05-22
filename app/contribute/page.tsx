"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect Page
 * Seamlessly forwards users accessing the old /contribute path to the new unified 
 * Engagement Hub (/partners?tab=student), ensuring deep link preservation.
 */
export default function ContributeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Perform rapid, client-side route forwarding
    router.replace("/partners?tab=student");
  }, [router]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50 font-sans text-slate-800">
      <div className="text-center space-y-4">
        {/* Loading Spinner */}
        <div className="relative w-12 h-12 mx-auto">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200 animate-spin border-t-indigo-600"></div>
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Redirecting to Engagement Hub...</h2>
          <p className="text-xs text-slate-400 mt-1">Connecting you with our unified student fellowship portal.</p>
        </div>
      </div>
    </div>
  );
}