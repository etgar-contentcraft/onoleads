/**
 * Hardcoded CAPI endpoint base URLs.
 * Never accept these from user input — all outbound CAPI calls must use these constants.
 */

export const CAPI_ENDPOINTS = {
  meta:     "https://graph.facebook.com/v19.0",
  google:   "https://googleads.googleapis.com/v16",
  tiktok:   "https://business-api.tiktok.com/open_api/v1.3",
  linkedin: "https://api.linkedin.com/v2",
} as const;

export type CapiPlatform = keyof typeof CAPI_ENDPOINTS;

export const CAPI_PLATFORMS: CapiPlatform[] = ["meta", "google", "tiktok", "linkedin"];
