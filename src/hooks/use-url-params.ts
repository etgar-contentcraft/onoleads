/**
 * SSR-safe hook for reading URL search parameters on the client.
 * Returns a stable URLSearchParams instance, empty during SSR.
 */
"use client";

import { useEffect, useState } from "react";

const EMPTY_PARAMS = new URLSearchParams();

/**
 * Returns the current page's URLSearchParams.
 * Safe to call during SSR — returns empty params until hydration.
 */
export function useUrlParams(): URLSearchParams {
  const [params, setParams] = useState<URLSearchParams>(EMPTY_PARAMS);

  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);

  return params;
}
