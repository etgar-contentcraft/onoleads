/**
 * Analytics computation library.
 * Derives sessions, attribution, and aggregated metrics from raw analytics events.
 * All computation happens client-side on the fetched event data.
 */

import type {
  AnalyticsEvent,
  Session,
  AttributionModel,
  AttributionResult,
  KeyMetrics,
  DailyPoint,
  PageStats,
  UtmCampaignRow,
  HourlyEntry,
  PageInfo,
  AnalyticsData,
} from "./types";

/* ─── Constants ─── */

/** Inactivity gap (ms) that defines a new session — 30 minutes (same as GA4) */
const SESSION_GAP_MS = 30 * 60 * 1000;

/** Maximum number of items in breakdown tables */
const TOP_N = 10;

/* ============================================================================ */
/*  Session Computation                                                         */
/* ============================================================================ */

/**
 * Groups raw events into sessions per visitor (cookie_id).
 * A new session starts when the gap between consecutive events exceeds SESSION_GAP_MS.
 * @param events - Raw analytics events sorted by created_at ascending
 * @returns Array of computed sessions
 */
export function computeSessions(events: AnalyticsEvent[]): Session[] {
  /* Group events by cookie_id */
  const byCookie = new Map<string, AnalyticsEvent[]>();
  for (const e of events) {
    if (!e.cookie_id) continue;
    const list = byCookie.get(e.cookie_id) || [];
    list.push(e);
    byCookie.set(e.cookie_id, list);
  }

  const sessions: Session[] = [];

  for (const [cookieId, cookieEvents] of Array.from(byCookie.entries())) {
    /* Sort by time (events should already be sorted, but ensure correctness) */
    cookieEvents.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let sessionEvents: AnalyticsEvent[] = [cookieEvents[0]];

    for (let i = 1; i < cookieEvents.length; i++) {
      const gap =
        new Date(cookieEvents[i].created_at).getTime() -
        new Date(cookieEvents[i - 1].created_at).getTime();

      if (gap > SESSION_GAP_MS) {
        /* Flush current session */
        sessions.push(buildSession(cookieId, sessionEvents));
        sessionEvents = [];
      }
      sessionEvents.push(cookieEvents[i]);
    }

    /* Flush last session */
    if (sessionEvents.length > 0) {
      sessions.push(buildSession(cookieId, sessionEvents));
    }
  }

  return sessions;
}

/**
 * Builds a Session object from a list of events belonging to one session.
 */
function buildSession(cookieId: string, events: AnalyticsEvent[]): Session {
  const startTime = new Date(events[0].created_at).getTime();
  const endTime = new Date(events[events.length - 1].created_at).getTime();
  const pageViewEvents = events.filter((e) => e.event_type === "page_view");
  const uniquePages = new Set(pageViewEvents.map((e) => e.page_id).filter(Boolean));

  return {
    cookieId,
    events,
    startedAt: events[0].created_at,
    endedAt: events[events.length - 1].created_at,
    durationMs: endTime - startTime,
    pageCount: uniquePages.size || 1,
    hasConversion: events.some((e) => e.event_type === "form_submit"),
    entryPageId: pageViewEvents[0]?.page_id || null,
    exitPageId: pageViewEvents.length > 0 ? pageViewEvents[pageViewEvents.length - 1].page_id : null,
  };
}

/* ============================================================================ */
/*  Attribution Models                                                          */
/* ============================================================================ */

/**
 * Computes multi-touch attribution for conversions.
 * Traces all touchpoints (page_views with UTM data) per converting visitor
 * and distributes credit based on the selected model.
 * @param events - All events in the period
 * @param model - Attribution model to use
 * @returns Sorted array of attribution results by weighted conversions
 */
export function computeAttribution(
  events: AnalyticsEvent[],
  model: AttributionModel
): AttributionResult[] {
  /* Group events by cookie_id */
  const byCookie = new Map<string, AnalyticsEvent[]>();
  for (const e of events) {
    if (!e.cookie_id) continue;
    const list = byCookie.get(e.cookie_id) || [];
    list.push(e);
    byCookie.set(e.cookie_id, list);
  }

  const sourceCredits = new Map<string, number>();
  const sourceConversions = new Map<string, number>();

  for (const [, cookieEvents] of Array.from(byCookie.entries())) {
    /* Only process visitors that converted */
    const hasConversion = cookieEvents.some((e) => e.event_type === "form_submit");
    if (!hasConversion) continue;

    /* Collect unique touchpoints (UTM sources before conversion) */
    const touchpoints: string[] = [];
    for (const e of cookieEvents) {
      if (e.event_type === "form_submit") break;
      const source = e.utm_source || e.referrer_domain || null;
      if (source && (touchpoints.length === 0 || touchpoints[touchpoints.length - 1] !== source)) {
        touchpoints.push(source);
      }
    }

    /* If no touchpoints found, attribute to "(direct)" */
    if (touchpoints.length === 0) {
      touchpoints.push("(ישיר)");
    }

    /* Distribute credit based on model */
    const weights = getWeights(touchpoints.length, model);
    for (let i = 0; i < touchpoints.length; i++) {
      const src = touchpoints[i];
      sourceCredits.set(src, (sourceCredits.get(src) || 0) + weights[i]);
      sourceConversions.set(src, (sourceConversions.get(src) || 0) + 1);
    }
  }

  /* Build results */
  const results: AttributionResult[] = [];
  for (const [source, weighted] of Array.from(sourceCredits.entries())) {
    results.push({
      source,
      conversions: sourceConversions.get(source) || 0,
      weightedConversions: Math.round(weighted * 100) / 100,
    });
  }

  return results.sort((a, b) => b.weightedConversions - a.weightedConversions).slice(0, TOP_N);
}

/**
 * Returns weight array for touchpoints based on the selected attribution model.
 * @param count - Number of touchpoints
 * @param model - Attribution model
 * @returns Array of weights that sum to 1.0
 */
function getWeights(count: number, model: AttributionModel): number[] {
  if (count === 0) return [];
  if (count === 1) return [1];

  switch (model) {
    case "first_touch":
      return [1, ...new Array(count - 1).fill(0)];

    case "last_touch":
      return [...new Array(count - 1).fill(0), 1];

    case "linear": {
      const w = 1 / count;
      return new Array(count).fill(w);
    }

    case "u_shaped": {
      if (count === 2) return [0.5, 0.5];
      const middleWeight = 0.2 / (count - 2);
      return [0.4, ...new Array(count - 2).fill(middleWeight), 0.4];
    }

    default:
      return new Array(count).fill(1 / count);
  }
}

/* ============================================================================ */
/*  Metrics Computation                                                         */
/* ============================================================================ */

/**
 * Computes key metrics from events and sessions.
 */
export function computeKeyMetrics(events: AnalyticsEvent[], sessions: Session[]): KeyMetrics {
  const pageViews = events.filter((e) => e.event_type === "page_view");
  const submissions = events.filter((e) => e.event_type === "form_submit");
  const uniqueVisitors = new Set(pageViews.map((e) => e.cookie_id).filter(Boolean)).size;

  /* Bounce rate: sessions with only 1 page view and no conversion */
  const bouncedSessions = sessions.filter((s) => s.pageCount <= 1 && !s.hasConversion);
  const bounceRate = sessions.length > 0
    ? Math.round((bouncedSessions.length / sessions.length) * 1000) / 10
    : 0;

  /* Average session duration (exclude single-event sessions which have 0 duration) */
  const sessionsWithDuration = sessions.filter((s) => s.durationMs > 0);
  const avgSessionDuration = sessionsWithDuration.length > 0
    ? sessionsWithDuration.reduce((sum, s) => sum + s.durationMs, 0) / sessionsWithDuration.length
    : 0;

  /* Average pages per session */
  const avgPagesPerSession = sessions.length > 0
    ? Math.round((sessions.reduce((sum, s) => sum + s.pageCount, 0) / sessions.length) * 10) / 10
    : 0;

  /* Conversion rate based on unique visitors */
  const conversionRate = uniqueVisitors > 0
    ? Math.round((submissions.length / uniqueVisitors) * 1000) / 10
    : 0;

  return {
    totalPageViews: pageViews.length,
    uniqueVisitors,
    totalSessions: sessions.length,
    formSubmissions: submissions.length,
    conversionRate,
    bounceRate,
    avgSessionDuration,
    avgPagesPerSession,
  };
}

/**
 * Computes daily timeline aggregations.
 */
export function computeDailyTimeline(events: AnalyticsEvent[], sessions: Session[]): DailyPoint[] {
  const dailyMap = new Map<string, { views: number; visitors: Set<string>; submissions: number; sessions: Set<string> }>();

  for (const e of events) {
    if (e.event_type !== "page_view" && e.event_type !== "form_submit") continue;
    const day = e.created_at.split("T")[0];
    const entry = dailyMap.get(day) || { views: 0, visitors: new Set(), submissions: 0, sessions: new Set() };
    if (e.event_type === "page_view") {
      entry.views++;
      if (e.cookie_id) entry.visitors.add(e.cookie_id);
    }
    if (e.event_type === "form_submit") entry.submissions++;
    dailyMap.set(day, entry);
  }

  /* Count sessions per day (by session start date) */
  for (const s of sessions) {
    const day = s.startedAt.split("T")[0];
    const entry = dailyMap.get(day);
    if (entry) entry.sessions.add(s.cookieId + s.startedAt);
  }

  return Array.from(dailyMap.entries())
    .map(([date, d]) => ({
      date,
      views: d.views,
      uniqueVisitors: d.visitors.size,
      submissions: d.submissions,
      sessions: d.sessions.size,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Computes per-page stats.
 */
export function computePageStats(
  events: AnalyticsEvent[],
  sessions: Session[],
  pageInfoMap: Map<string, PageInfo>
): PageStats[] {
  const pageIds = new Set<string>();
  const pageViewMap = new Map<string, number>();
  const pageVisitorMap = new Map<string, Set<string>>();
  const pageSubmissionMap = new Map<string, number>();

  for (const e of events) {
    if (!e.page_id) continue;
    pageIds.add(e.page_id);

    if (e.event_type === "page_view") {
      pageViewMap.set(e.page_id, (pageViewMap.get(e.page_id) || 0) + 1);
      if (!pageVisitorMap.has(e.page_id)) pageVisitorMap.set(e.page_id, new Set());
      if (e.cookie_id) pageVisitorMap.get(e.page_id)!.add(e.cookie_id);
    }
    if (e.event_type === "form_submit") {
      pageSubmissionMap.set(e.page_id, (pageSubmissionMap.get(e.page_id) || 0) + 1);
    }
  }

  /* Compute bounce rate per page from sessions */
  const pageBounceMap = new Map<string, { total: number; bounced: number }>();
  for (const s of sessions) {
    if (!s.entryPageId) continue;
    const entry = pageBounceMap.get(s.entryPageId) || { total: 0, bounced: 0 };
    entry.total++;
    if (s.pageCount <= 1 && !s.hasConversion) entry.bounced++;
    pageBounceMap.set(s.entryPageId, entry);
  }

  /* Compute avg session duration per page */
  const pageDurationMap = new Map<string, { total: number; count: number }>();
  for (const s of sessions) {
    if (!s.entryPageId || s.durationMs === 0) continue;
    const entry = pageDurationMap.get(s.entryPageId) || { total: 0, count: 0 };
    entry.total += s.durationMs;
    entry.count++;
    pageDurationMap.set(s.entryPageId, entry);
  }

  return Array.from(pageIds)
    .map((pid) => {
      const info = pageInfoMap.get(pid);
      const views = pageViewMap.get(pid) || 0;
      const visitors = pageVisitorMap.get(pid)?.size || 0;
      const subs = pageSubmissionMap.get(pid) || 0;
      const bounce = pageBounceMap.get(pid);
      const duration = pageDurationMap.get(pid);

      return {
        pageId: pid,
        title: info?.title || "ללא שם",
        slug: info?.slug || "",
        views,
        uniqueVisitors: visitors,
        submissions: subs,
        conversionRate: visitors > 0 ? Math.round((subs / visitors) * 1000) / 10 : 0,
        bounceRate: bounce && bounce.total > 0
          ? Math.round((bounce.bounced / bounce.total) * 1000) / 10
          : 0,
        avgSessionDuration: duration && duration.count > 0
          ? duration.total / duration.count
          : 0,
      };
    })
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, TOP_N);
}

/**
 * Computes UTM source breakdown.
 */
export function computeUtmSources(events: AnalyticsEvent[]): { source: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.utm_source) continue;
    map.set(e.utm_source, (map.get(e.utm_source) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

/**
 * Computes UTM medium breakdown.
 */
export function computeUtmMediums(events: AnalyticsEvent[]): { medium: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.utm_medium) continue;
    map.set(e.utm_medium, (map.get(e.utm_medium) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([medium, count]) => ({ medium, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

/**
 * Computes UTM campaign breakdown with views, submissions, and conversion rate.
 */
export function computeUtmCampaigns(events: AnalyticsEvent[]): UtmCampaignRow[] {
  const viewMap = new Map<string, number>();
  const subMap = new Map<string, number>();

  for (const e of events) {
    if (!e.utm_campaign) continue;
    if (e.event_type === "page_view") {
      viewMap.set(e.utm_campaign, (viewMap.get(e.utm_campaign) || 0) + 1);
    }
    if (e.event_type === "form_submit") {
      subMap.set(e.utm_campaign, (subMap.get(e.utm_campaign) || 0) + 1);
    }
  }

  const all = new Set([...Array.from(viewMap.keys()), ...Array.from(subMap.keys())]);
  return Array.from(all)
    .map((name) => {
      const views = viewMap.get(name) || 0;
      const submissions = subMap.get(name) || 0;
      const conversion = views > 0 ? Math.round((submissions / views) * 1000) / 10 : 0;
      return { name, views, submissions, conversion };
    })
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, TOP_N);
}

/**
 * Computes device breakdown.
 */
export function computeDeviceBreakdown(events: AnalyticsEvent[]): { type: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.device_type) continue;
    map.set(e.device_type, (map.get(e.device_type) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Computes referrer domain breakdown.
 */
export function computeReferrerDomains(events: AnalyticsEvent[]): { domain: string; count: number }[] {
  const map = new Map<string, number>();
  for (const e of events) {
    if (!e.referrer_domain) continue;
    map.set(e.referrer_domain, (map.get(e.referrer_domain) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

/**
 * Computes hourly heatmap (aggregated hour-of-day distribution).
 */
export function computeHourlyHeatmap(events: AnalyticsEvent[]): HourlyEntry[] {
  const hours = new Array(24).fill(0);
  for (const e of events) {
    if (e.event_type !== "page_view") continue;
    const hour = new Date(e.created_at).getHours();
    hours[hour]++;
  }
  return hours.map((count, hour) => ({ hour, count }));
}

/**
 * Computes webhook status breakdown from form_submit events.
 */
export function computeWebhookStats(events: AnalyticsEvent[]): { sent: number; failed: number } {
  const submissions = events.filter((e) => e.event_type === "form_submit");
  return {
    sent: submissions.filter((e) => e.webhook_status === "sent").length,
    failed: submissions.filter((e) => e.webhook_status === "failed").length,
  };
}

/* ============================================================================ */
/*  Full Analytics Computation                                                  */
/* ============================================================================ */

/**
 * Computes all analytics data from raw events.
 * This is the main entry point called by the dashboard.
 * @param currentEvents - Events in the current period
 * @param prevEvents - Events in the comparison period
 * @param pageInfoMap - Map of page ID → page info (title, slug)
 * @param attributionModel - Selected attribution model
 * @returns Full AnalyticsData object
 */
export function computeAllAnalytics(
  currentEvents: AnalyticsEvent[],
  prevEvents: AnalyticsEvent[],
  pageInfoMap: Map<string, PageInfo>,
  attributionModel: AttributionModel
): AnalyticsData {
  const currentSessions = computeSessions(currentEvents);
  const prevSessions = computeSessions(prevEvents);

  const metrics = computeKeyMetrics(currentEvents, currentSessions);
  const prevMetrics = computeKeyMetrics(prevEvents, prevSessions);

  const dailyTimeline = computeDailyTimeline(currentEvents, currentSessions);
  const topPages = computePageStats(currentEvents, currentSessions, pageInfoMap);
  const utmSources = computeUtmSources(currentEvents);
  const utmMediums = computeUtmMediums(currentEvents);
  const utmCampaigns = computeUtmCampaigns(currentEvents);
  const deviceBreakdown = computeDeviceBreakdown(currentEvents);
  const referrerDomains = computeReferrerDomains(currentEvents);
  const hourlyHeatmap = computeHourlyHeatmap(currentEvents);
  const webhookStats = computeWebhookStats(currentEvents);
  const attribution = computeAttribution(currentEvents, attributionModel);

  return {
    metrics,
    prevMetrics,
    dailyTimeline,
    topPages,
    utmSources,
    utmMediums,
    utmCampaigns,
    deviceBreakdown,
    referrerDomains,
    hourlyHeatmap,
    webhookSent: webhookStats.sent,
    webhookFailed: webhookStats.failed,
    attribution,
  };
}

/* ============================================================================ */
/*  Date Range Helpers                                                          */
/* ============================================================================ */

/** Map of preset periods to their day count */
const PERIOD_DAYS: Record<string, number> = {
  today: 0,
  yesterday: 1,
  "7d": 7,
  "14d": 14,
  "30d": 30,
  "90d": 90,
};

/**
 * Computes start/end date ISO strings for a period preset or custom range,
 * plus the equivalent previous period for comparison.
 */
export function getDateRange(
  preset: string,
  customFrom?: string,
  customTo?: string
): { startISO: string; endISO: string; prevStartISO: string; prevEndISO: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (preset === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = now;
  } else if (preset === "yesterday") {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start = new Date(end);
    start.setDate(start.getDate() - 1);
  } else if (preset === "custom" && customFrom) {
    start = new Date(customFrom);
    end = customTo ? new Date(customTo + "T23:59:59") : now;
  } else {
    const days = PERIOD_DAYS[preset] || 30;
    start = new Date(now);
    start.setDate(start.getDate() - days);
    end = now;
  }

  /* Previous period: same duration, ending right before current start */
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    prevStartISO: prevStart.toISOString(),
    prevEndISO: prevEnd.toISOString(),
  };
}

/**
 * Formats milliseconds into a human-readable duration string in Hebrew.
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "2 דקות 30 שניות"
 */
export function formatDuration(ms: number): string {
  if (ms === 0) return "0 שניות";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} שניות`;
  if (seconds === 0) return `${minutes} דקות`;
  return `${minutes} דקות ${seconds} שניות`;
}

/**
 * Computes percentage change between two numbers.
 * Returns 0 when previous value is 0 to avoid division by zero.
 */
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
