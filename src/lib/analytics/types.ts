/**
 * Shared types for the analytics system.
 * Used by both the computation library and dashboard UI components.
 */

/* ─── Raw Data ─── */

/** Raw analytics event row from Supabase */
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  page_id: string | null;
  cookie_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer_domain: string | null;
  device_type: string | null;
  webhook_status: string | null;
  /** Scroll depth percentage (0–100) recorded when the visitor leaves */
  scroll_depth: number | null;
  /** Time spent on the page in seconds */
  time_on_page: number | null;
  created_at: string;
}

/** Page metadata from the pages table */
export interface PageInfo {
  id: string;
  title: string;
  slug: string;
}

/* ─── Sessions ─── */

/** A computed session — a sequence of events by one visitor within an inactivity window */
export interface Session {
  cookieId: string;
  events: AnalyticsEvent[];
  startedAt: string;
  endedAt: string;
  durationMs: number;
  pageCount: number;
  hasConversion: boolean;
  entryPageId: string | null;
  exitPageId: string | null;
}

/* ─── Attribution ─── */

/** Attribution model types */
export type AttributionModel = "first_touch" | "last_touch" | "linear" | "u_shaped";

/** Attribution result per source/campaign */
export interface AttributionResult {
  source: string;
  conversions: number;
  /** Weighted conversions (fractional for linear/U-shaped) */
  weightedConversions: number;
}

/* ─── Dashboard Metrics ─── */

/** Key metrics card data */
export interface KeyMetrics {
  totalPageViews: number;
  uniqueVisitors: number;
  totalSessions: number;
  formSubmissions: number;
  conversionRate: number;
  bounceRate: number;
  avgSessionDuration: number;
  avgPagesPerSession: number;
}

/** Daily timeline data point */
export interface DailyPoint {
  date: string;
  views: number;
  uniqueVisitors: number;
  submissions: number;
  sessions: number;
}

/** Per-page stats row */
export interface PageStats {
  pageId: string;
  title: string;
  slug: string;
  views: number;
  uniqueVisitors: number;
  submissions: number;
  conversionRate: number;
  bounceRate: number;
  avgSessionDuration: number;
}

/** UTM campaign breakdown row */
export interface UtmCampaignRow {
  name: string;
  views: number;
  submissions: number;
  conversion: number;
}

/** Device breakdown entry */
export interface DeviceEntry {
  type: string;
  count: number;
  submissions: number;
  conversion: number;
}

/** Referrer entry */
export interface ReferrerEntry {
  domain: string;
  count: number;
  submissions: number;
  conversion: number;
}

/** Hourly heatmap entry (hour of day → event count) */
export interface HourlyEntry {
  hour: number;
  count: number;
  submissions: number;
}

/** Full computed analytics data passed to the dashboard */
export interface AnalyticsData {
  /* Key metrics — current period */
  metrics: KeyMetrics;
  /* Key metrics — previous period (for comparison) */
  prevMetrics: KeyMetrics;
  /* Breakdowns */
  dailyTimeline: DailyPoint[];
  topPages: PageStats[];
  utmSources: { source: string; count: number; submissions: number; conversion: number }[];
  utmMediums: { medium: string; count: number; submissions: number; conversion: number }[];
  utmCampaigns: UtmCampaignRow[];
  deviceBreakdown: DeviceEntry[];
  referrerDomains: ReferrerEntry[];
  hourlyHeatmap: HourlyEntry[];
  webhookSent: number;
  webhookFailed: number;
  /* Attribution */
  attribution: AttributionResult[];
}

/* ─── View Mode ─── */

/** Toggle between session-based and user-based analytics view */
export type ViewMode = "sessions" | "users";

/* ─── Date Range ─── */

/** Preset period options */
export type PeriodPreset = "today" | "yesterday" | "7d" | "14d" | "30d" | "90d" | "custom";

/** Resolved date range with comparison */
export interface DateRange {
  startISO: string;
  endISO: string;
  prevStartISO: string;
  prevEndISO: string;
}
