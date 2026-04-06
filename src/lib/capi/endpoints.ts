/**
 * Hardcoded CAPI endpoint base URLs.
 * Never accept these from user input — all outbound CAPI calls must use these constants.
 */

export const CAPI_ENDPOINTS = {
  meta:     "https://graph.facebook.com/v19.0",
  google:   "https://googleads.googleapis.com/v16",
  tiktok:   "https://business-api.tiktok.com/open_api/v1.3",
  linkedin: "https://api.linkedin.com/rest",
  ga4:      "https://www.google-analytics.com/mp/collect",
  outbrain: "https://tr.outbrain.com/unifiedPixel",
  taboola:  "https://trc.taboola.com/s2s-v2/universal/v1/track",
  twitter:  "https://ads-api.twitter.com/12/measurement/conversions",
} as const;

export type CapiPlatform = keyof typeof CAPI_ENDPOINTS;

export const CAPI_PLATFORMS: CapiPlatform[] = [
  "meta", "google", "tiktok", "linkedin", "ga4", "outbrain", "taboola", "twitter",
];
