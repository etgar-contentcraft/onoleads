"use client";

/**
 * Dashboard error boundary — catches unhandled client-side exceptions
 * and shows a recovery UI instead of a blank white screen.
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div dir="rtl" className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-[#2a2628]">שגיאה בטעינת הדף</h2>
        <p className="text-sm text-[#716C70]">
          אירעה שגיאה בלתי צפויה. נסו לרענן את הדף.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#B8D900] text-[#2a2628] rounded-xl font-semibold hover:bg-[#a8c400] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          נסה שוב
        </button>
      </div>
    </div>
  );
}
