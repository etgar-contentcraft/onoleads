/**
 * Per-landing-page analytics dashboard.
 * Queries the analytics_events table for page views, form submissions,
 * CTA clicks, device breakdown, UTM attribution, and referrer domains.
 * Includes period comparison (current vs previous) and realtime updates.
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Eye,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Send,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  MousePointerClick,
  BarChart3,
} from "lucide-react";
import { ClickHeatmap } from "@/components/admin/click-heatmap";

/* ─── Constants ─── */

/** Time period options for the date range picker */
const TIME_PERIODS = [
  { value: "7d", label: "7 ימים אחרונים", days: 7 },
  { value: "30d", label: "30 ימים אחרונים", days: 30 },
  { value: "90d", label: "90 ימים אחרונים", days: 90 },
  { value: "custom", label: "תאריכים מותאמים", days: 0 },
];

/** Device type labels in Hebrew */
const DEVICE_LABELS: Record<string, string> = {
  mobile: "נייד",
  desktop: "מחשב",
  tablet: "טאבלט",
};

/** Device type colors for the donut chart */
const DEVICE_COLORS: Record<string, string> = {
  mobile: "#B8D900",
  desktop: "#3B82F6",
  tablet: "#F59E0B",
};

/** Colors for UTM bar charts */
const UTM_COLORS = [
  "#B8D900",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
  "#10B981",
];

/** Maximum number of UTM campaign rows to show before collapse */
const CAMPAIGN_COLLAPSE_THRESHOLD = 5;

/** Donut chart SVG radius (matches existing analytics page) */
const DONUT_RADIUS = 15.91549431;

/* ─── Types ─── */

/** Raw analytics event row from Supabase */
interface AnalyticsEvent {
  id: string;
  event_type: string;
  page_id: string;
  cookie_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer_domain: string | null;
  device_type: string | null;
  webhook_status: string | null;
  scroll_depth: number | null;
  time_on_page: number | null;
  created_at: string;
}

/** Scroll depth band for the scroll depth chart */
interface ScrollDepthBand {
  depth: number;
  label: string;
  visitors: number;
  pct: number;
}

/** Aggregated metrics for a single period */
interface PeriodMetrics {
  pageViews: number;
  uniqueVisitors: number;
  formSubmissions: number;
  ctaClicks: number;
  conversionRate: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

/** Daily breakdown entry for the timeline chart */
interface DailyEntry {
  date: string;
  views: number;
  submissions: number;
}

/** UTM breakdown row */
interface UtmRow {
  value: string;
  views: number;
  submissions: number;
  conversionRate: number;
}

/** Device breakdown row */
interface DeviceRow {
  type: string;
  count: number;
}

/** Referrer domain row */
interface ReferrerRow {
  domain: string;
  count: number;
}

/** Webhook status counts (form_submit events only) */
interface WebhookStats {
  sent: number;
  failed: number;
  pending: number;
}

/** A single aggregated visitor session (grouped by cookie_id) */
interface VisitorSession {
  /** Session start time (first event) */
  start: string;
  /** Device type for this session */
  device: string;
  /** UTM source (first recorded) */
  utmSource: string | null;
  /** Referring domain (first recorded) */
  referrer: string | null;
  /** Maximum scroll depth reached (0–100) */
  maxScroll: number;
  /** Maximum time on page in seconds */
  maxTimeOnPage: number;
  /** Whether the visitor submitted the lead form in this session */
  converted: boolean;
  /** How many distinct event types occurred */
  eventCount: number;
}

/** Full analytics state for the page */
interface PageAnalytics {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  daily: DailyEntry[];
  utmSources: UtmRow[];
  utmMediums: UtmRow[];
  utmCampaigns: UtmRow[];
  devices: DeviceRow[];
  referrers: ReferrerRow[];
  webhook: WebhookStats;
  scrollDepthBands: ScrollDepthBand[];
  recentEvents: AnalyticsEvent[];
  recentSessions: VisitorSession[];
}

/* ─── Helpers ─── */

/**
 * Returns a date string (YYYY-MM-DD) offset by a number of days from now
 * @param daysAgo - Number of days to subtract from today
 * @returns ISO date string
 */
function daysAgoISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/**
 * Calculates the percentage change between two numbers
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Percentage change (positive = growth, negative = decline)
 */
function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Formats a number with Hebrew locale separators
 * @param n - Number to format
 * @returns Formatted string
 */
function formatNum(n: number): string {
  return n.toLocaleString("he-IL");
}

/**
 * Formats a percentage with a sign prefix
 * @param pct - Percentage value
 * @returns Formatted string like "+12%" or "-5%"
 */
function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}%`;
}

/**
 * Counts distinct values in an array of strings/nulls
 * @param values - Array of string values (nulls filtered out)
 * @returns Count of unique non-null values
 */
function countDistinct(values: (string | null)[]): number {
  const set = new Set<string>();
  for (const v of values) {
    if (v) set.add(v);
  }
  return set.size;
}

/* ─── Main Component ─── */

export default function PageAnalyticsPage() {
  const params = useParams();
  const pageId = params.id as string;

  const [data, setData] = useState<PageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mounted, setMounted] = useState(false);
  const [pageName, setPageName] = useState<string>("");
  const [pageSlug, setPageSlug] = useState<string>("");
  const [campaignsExpanded, setCampaignsExpanded] = useState(false);

  const supabase = createClient();

  /** Set mounted flag for CSS transitions */
  useEffect(() => {
    setMounted(true);
  }, []);

  /** Fetch the page name for the header */
  useEffect(() => {
    async function fetchPageName() {
      const { data: page } = await supabase
        .from("pages")
        .select("title_he, slug")
        .eq("id", pageId)
        .single();
      if (page) {
        setPageName(page.title_he || page.slug);
        setPageSlug(page.slug);
      }
    }
    fetchPageName();
  }, [pageId]);

  /**
   * Returns the number of days in the selected period.
   * For custom ranges, computes the difference between dateFrom and dateTo.
   */
  const periodDays = useMemo((): number => {
    if (period === "custom") {
      if (!dateFrom || !dateTo) return 30;
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      const diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(diff, 1);
    }
    const found = TIME_PERIODS.find((tp) => tp.value === period);
    return found?.days || 30;
  }, [period, dateFrom, dateTo]);

  /**
   * Computes start/end ISO strings for the current and previous periods.
   * Previous period has the same length and ends where current period begins.
   */
  const getPeriodBounds = useCallback(() => {
    let currentStart: string;
    let currentEnd: string;

    if (period === "custom" && dateFrom) {
      currentStart = new Date(dateFrom).toISOString();
      currentEnd = dateTo ? new Date(dateTo + "T23:59:59").toISOString() : new Date().toISOString();
    } else {
      currentStart = daysAgoISO(periodDays);
      currentEnd = new Date().toISOString();
    }

    /* Previous period: same length, immediately before current */
    const currentStartDate = new Date(currentStart);
    const prevEnd = new Date(currentStartDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);

    return {
      currentStart,
      currentEnd,
      prevStart: prevStart.toISOString(),
      prevEnd: prevEnd.toISOString(),
    };
  }, [period, dateFrom, dateTo, periodDays]);

  /**
   * Fetches all analytics_events for a given page within a date range.
   * Paginates in chunks of 1000 to handle large datasets.
   * @param start - ISO start date
   * @param end - ISO end date
   * @returns Array of analytics events
   */
  const fetchEvents = useCallback(
    async (start: string, end: string): Promise<AnalyticsEvent[]> => {
      const PAGE_SIZE = 1000;
      let allEvents: AnalyticsEvent[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("analytics_events")
          .select("*")
          .eq("page_id", pageId)
          .gte("created_at", start)
          .lte("created_at", end)
          .order("created_at", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error || !batch) break;
        allEvents = allEvents.concat(batch as AnalyticsEvent[]);
        hasMore = batch.length === PAGE_SIZE;
        offset += PAGE_SIZE;
      }

      return allEvents;
    },
    [pageId]
  );

  /**
   * Computes PeriodMetrics from a raw events array.
   * @param events - Analytics events for the period
   * @returns Aggregated metrics
   */
  const computeMetrics = useCallback((events: AnalyticsEvent[]): PeriodMetrics => {
    const pageViewEvents = events.filter((e) => e.event_type === "page_view");
    const formSubmitEvents = events.filter((e) => e.event_type === "form_submit");
    const ctaClickEvents = events.filter((e) => e.event_type === "cta_click");

    const pageViews = pageViewEvents.length;
    const uniqueVisitors = countDistinct(pageViewEvents.map((e) => e.cookie_id));
    const formSubmissions = formSubmitEvents.length;
    const ctaClicks = ctaClickEvents.length;
    const conversionRate = uniqueVisitors > 0 ? (formSubmissions / uniqueVisitors) * 100 : 0;

    /* Average time on page (from events with time_on_page set) */
    const timeEvents = events.filter((e) => e.time_on_page != null && e.time_on_page > 0);
    const avgTimeOnPage = timeEvents.length > 0
      ? Math.round(timeEvents.reduce((s, e) => s + (e.time_on_page || 0), 0) / timeEvents.length)
      : 0;

    /* Bounce rate: visitors with exactly one event total */
    const visitorEventCounts = new Map<string, number>();
    for (const e of events) {
      if (!e.cookie_id) continue;
      visitorEventCounts.set(e.cookie_id, (visitorEventCounts.get(e.cookie_id) || 0) + 1);
    }
    let bounces = 0;
    Array.from(visitorEventCounts.values()).forEach(count => { if (count === 1) bounces++; });
    const bounceRate = uniqueVisitors > 0 ? (bounces / uniqueVisitors) * 100 : 0;

    return { pageViews, uniqueVisitors, formSubmissions, ctaClicks, conversionRate, avgTimeOnPage, bounceRate };
  }, []);

  /**
   * Main data fetch: retrieves current + previous period events,
   * computes all breakdowns, and sets state.
   */
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const bounds = getPeriodBounds();

    /* Fetch current and previous period events in parallel */
    const [currentEvents, prevEvents] = await Promise.all([
      fetchEvents(bounds.currentStart, bounds.currentEnd),
      fetchEvents(bounds.prevStart, bounds.prevEnd),
    ]);

    const current = computeMetrics(currentEvents);
    const previous = computeMetrics(prevEvents);

    /* --- Daily timeline --- */
    const dailyMap = new Map<string, { views: number; submissions: number }>();
    for (const evt of currentEvents) {
      const day = evt.created_at.split("T")[0];
      const entry = dailyMap.get(day) || { views: 0, submissions: 0 };
      if (evt.event_type === "page_view") entry.views++;
      if (evt.event_type === "form_submit") entry.submissions++;
      dailyMap.set(day, entry);
    }
    const daily: DailyEntry[] = Array.from(dailyMap.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    /* --- UTM breakdowns --- */
    const utmSources = buildUtmBreakdown(currentEvents, "utm_source");
    const utmMediums = buildUtmBreakdown(currentEvents, "utm_medium");
    const utmCampaigns = buildUtmBreakdown(currentEvents, "utm_campaign");

    /* --- Device breakdown --- */
    const deviceMap = new Map<string, number>();
    for (const evt of currentEvents) {
      if (evt.event_type === "page_view" && evt.device_type) {
        deviceMap.set(evt.device_type, (deviceMap.get(evt.device_type) || 0) + 1);
      }
    }
    const devices: DeviceRow[] = Array.from(deviceMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    /* --- Referrer domains --- */
    const refMap = new Map<string, number>();
    for (const evt of currentEvents) {
      if (evt.event_type === "page_view" && evt.referrer_domain) {
        refMap.set(evt.referrer_domain, (refMap.get(evt.referrer_domain) || 0) + 1);
      }
    }
    const referrers: ReferrerRow[] = Array.from(refMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    /* --- Webhook status (form_submit events only) --- */
    const formEvents = currentEvents.filter((e) => e.event_type === "form_submit");
    const webhook: WebhookStats = {
      sent: formEvents.filter((e) => e.webhook_status === "sent").length,
      failed: formEvents.filter((e) => e.webhook_status === "failed").length,
      pending: formEvents.filter(
        (e) => !e.webhook_status || (e.webhook_status !== "sent" && e.webhook_status !== "failed")
      ).length,
    };

    /* --- Scroll depth bands --- */
    const SCROLL_MILESTONES = [25, 50, 75, 90];
    const scrollDepthBands: ScrollDepthBand[] = SCROLL_MILESTONES.map(depth => {
      const visitors = new Set(
        currentEvents
          .filter(e => e.event_type === "scroll_depth" && (e.scroll_depth ?? 0) >= depth && e.cookie_id)
          .map(e => e.cookie_id)
      ).size;
      return {
        depth,
        label: `${depth}%`,
        visitors,
        pct: current.uniqueVisitors > 0 ? Math.round((visitors / current.uniqueVisitors) * 100) : 0,
      };
    });

    /* --- Recent events (raw, kept for compatibility) --- */
    const recentEvents = [...currentEvents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    /* --- Visitor sessions (grouped by cookie_id) ---
     * Groups all events by cookie_id to create session-level visitor intelligence.
     * Each session shows: device, UTM source, scroll depth, time on page, conversion status. */
    const sessionMap = new Map<string, {
      start: string;
      device: string;
      utmSource: string | null;
      referrer: string | null;
      maxScroll: number;
      maxTimeOnPage: number;
      converted: boolean;
      eventCount: number;
    }>();

    for (const e of currentEvents) {
      const key = e.cookie_id || `anon_${e.id}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          start: e.created_at,
          device: e.device_type || "desktop",
          utmSource: e.utm_source,
          referrer: e.referrer_domain,
          maxScroll: 0,
          maxTimeOnPage: 0,
          converted: false,
          eventCount: 0,
        });
      }
      const s = sessionMap.get(key)!;
      s.eventCount++;
      /* Track earliest event as session start */
      if (e.created_at < s.start) s.start = e.created_at;
      /* Track conversions */
      if (e.event_type === "form_submit") s.converted = true;
      /* Track deepest scroll */
      if (e.scroll_depth && e.scroll_depth > s.maxScroll) s.maxScroll = e.scroll_depth;
      /* Track longest session */
      if (e.time_on_page && e.time_on_page > s.maxTimeOnPage) s.maxTimeOnPage = e.time_on_page;
      /* Prefer non-null UTM source */
      if (!s.utmSource && e.utm_source) s.utmSource = e.utm_source;
      if (!s.referrer && e.referrer_domain) s.referrer = e.referrer_domain;
    }

    const recentSessions: VisitorSession[] = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, 20);

    setData({
      current,
      previous,
      daily,
      utmSources,
      utmMediums,
      utmCampaigns,
      devices,
      referrers,
      webhook,
      scrollDepthBands,
      recentEvents,
      recentSessions,
    });
    setLoading(false);
  }, [getPeriodBounds, fetchEvents, computeMetrics]);

  /**
   * Builds a UTM breakdown table for a given UTM field.
   * Groups page_view and form_submit events by the UTM value,
   * then computes conversion rate per group.
   * @param events - All current period events
   * @param field - The UTM field key to group by
   * @returns Sorted array of UTM rows
   */
  function buildUtmBreakdown(
    events: AnalyticsEvent[],
    field: "utm_source" | "utm_medium" | "utm_campaign"
  ): UtmRow[] {
    const map = new Map<string, { views: number; submissions: number; visitors: Set<string> }>();

    for (const evt of events) {
      const val = evt[field];
      if (!val) continue;
      const entry = map.get(val) || { views: 0, submissions: 0, visitors: new Set<string>() };
      if (evt.event_type === "page_view") {
        entry.views++;
        if (evt.cookie_id) entry.visitors.add(evt.cookie_id);
      }
      if (evt.event_type === "form_submit") entry.submissions++;
      map.set(val, entry);
    }

    return Array.from(map.entries())
      .map(([value, stats]) => ({
        value,
        views: stats.views,
        submissions: stats.submissions,
        conversionRate:
          stats.visitors.size > 0 ? (stats.submissions / stats.visitors.size) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views);
  }

  /** Trigger data fetch on period change */
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /** Realtime subscription: auto-refresh on new analytics_events for this page */
  useEffect(() => {
    const channel = supabase
      .channel(`analytics-page-${pageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analytics_events",
          filter: `page_id=eq.${pageId}`,
        },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, fetchAnalytics]);

  /* ─── Loading State ─── */
  if (loading || !data) {
    return (
      <div dir="rtl" className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/pages/${pageId}/builder`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowRight className="w-4 h-4" />
              חזרה לבילדר
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">אנליטיקס — {pageName || "דף נחיתה"}</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">טוען נתונים...</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
      </div>
    );
  }

  /* ─── Computed values for rendering ─── */
  const maxDailyValue = Math.max(
    ...data.daily.map((d) => Math.max(d.views, d.submissions)),
    1
  );
  const totalDevices = data.devices.reduce((sum, d) => sum + d.count, 0);
  const totalWebhook = data.webhook.sent + data.webhook.failed + data.webhook.pending;

  /** Metric cards configuration */
  const metricCards = [
    {
      label: "צפיות בדף",
      value: data.current.pageViews,
      prev: data.previous.pageViews,
      icon: Eye,
      color: "bg-[#B8D900]/10 text-[#8BA300]",
    },
    {
      label: "מבקרים ייחודיים",
      value: data.current.uniqueVisitors,
      prev: data.previous.uniqueVisitors,
      icon: Users,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "שליחות טופס",
      value: data.current.formSubmissions,
      prev: data.previous.formSubmissions,
      icon: FileText,
      color: "bg-violet-500/10 text-violet-600",
    },
    {
      label: "אחוז המרה",
      value: data.current.conversionRate,
      prev: data.previous.conversionRate,
      icon: TrendingUp,
      color: "bg-emerald-500/10 text-emerald-600",
      isPercentage: true,
    },
    {
      label: "זמן ממוצע בדף",
      value: data.current.avgTimeOnPage,
      prev: data.previous.avgTimeOnPage,
      icon: Clock,
      color: "bg-purple-500/10 text-purple-600",
      formatFn: (v: number) => v > 0 ? (v < 60 ? `${v}ש׳` : `${Math.floor(v/60)}:${String(v%60).padStart(2,"0")} דק׳`) : "—",
    },
  ];

  /** Campaigns to display (collapsed or expanded) */
  const visibleCampaigns = campaignsExpanded
    ? data.utmCampaigns
    : data.utmCampaigns.slice(0, CAMPAIGN_COLLAPSE_THRESHOLD);

  return (
    <div dir="rtl" className="space-y-6">
      {/* ── Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <Link href={`/dashboard/pages/${pageId}/builder`}>
            <Button variant="ghost" size="sm" className="gap-1 -mr-2">
              <ArrowRight className="w-4 h-4" />
              חזרה לבילדר
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#2a2628]">
              אנליטיקס — {pageName || "דף נחיתה"}
            </h1>
            <p className="text-sm text-[#9A969A] mt-0.5">
              ניתוח ביצועי הדף, תנועה והמרות
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics()}
            className="gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            רענון
          </Button>
          <Select
            value={period}
            onValueChange={(val: string | null) => {
              if (val) setPeriod(val);
            }}
          >
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((tp) => (
                <SelectItem key={tp.value} value={tp.value}>
                  {tp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {period === "custom" && (
            <>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 w-[140px]"
              />
              <span className="text-[#9A969A] text-sm">עד</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 w-[140px]"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Key Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map((card) => {
          const change = card.isPercentage
            ? Math.round(card.value - card.prev)
            : percentChange(card.value, card.prev);
          const Icon = card.icon;
          const ChangeIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
          const changeColor =
            change > 0 ? "text-emerald-600" : change < 0 ? "text-red-500" : "text-[#9A969A]";
          const displayValue = "formatFn" in card && card.formatFn
            ? card.formatFn(card.value)
            : card.isPercentage
              ? `${card.value.toFixed(1)}%`
              : formatNum(card.value);

          return (
            <Card key={card.label} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs text-[#9A969A] font-medium truncate">{card.label}</p>
                    <p className="text-2xl font-bold text-[#2a2628] tabular-nums">{displayValue}</p>
                    <div className={`flex items-center gap-1 text-[10px] ${changeColor}`}>
                      <ChangeIcon className="w-2.5 h-2.5" />
                      <span>
                        {card.isPercentage
                          ? `${change > 0 ? "+" : ""}${change} נק׳`
                          : formatPct(change)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${card.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Daily Timeline Chart ── */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#2a2628]">
            צפיות ושליחות לפי יום
          </CardTitle>
          <CardDescription className="text-xs">
            ירוק = צפיות בדף, כחול = שליחות טופס
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.daily.length === 0 ? (
            <p className="text-center text-[#9A969A] py-8">אין נתונים לתקופה זו</p>
          ) : (
            <>
              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#B8D900]" />
                  <span className="text-[#716C70]">צפיות</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                  <span className="text-[#716C70]">שליחות טופס</span>
                </div>
              </div>

              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-6">
                {data.daily.map((day, idx) => {
                  const viewHeight = (day.views / maxDailyValue) * 100;
                  const subHeight = (day.submissions / maxDailyValue) * 100;
                  const dateObj = new Date(day.date);
                  const label = dateObj.toLocaleDateString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                  return (
                    <div
                      key={day.date}
                      className="flex-1 min-w-[28px] flex flex-col items-center gap-1 group"
                    >
                      {/* Hover tooltip */}
                      <div className="text-[10px] font-medium text-[#2a2628] opacity-0 group-hover:opacity-100 transition-opacity text-center leading-tight">
                        <span className="text-[#8BA300]">{day.views}</span>
                        {day.submissions > 0 && (
                          <>
                            {" / "}
                            <span className="text-blue-600">{day.submissions}</span>
                          </>
                        )}
                      </div>
                      {/* Stacked bars */}
                      <div className="w-full relative h-36 flex items-end gap-[1px]">
                        {/* Views bar */}
                        <div
                          className="flex-1 rounded-t-md bg-gradient-to-t from-[#B8D900] to-[#d4f040] transition-all duration-500 ease-out"
                          style={{
                            height: mounted ? `${Math.max(viewHeight, 2)}%` : "0%",
                            transitionDelay: `${idx * 20}ms`,
                          }}
                        />
                        {/* Submissions bar */}
                        <div
                          className="flex-1 rounded-t-md bg-gradient-to-t from-[#3B82F6] to-[#60A5FA] transition-all duration-500 ease-out"
                          style={{
                            height: mounted ? `${Math.max(subHeight, 0)}%` : "0%",
                            transitionDelay: `${idx * 20 + 50}ms`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-[#9A969A] -rotate-45 origin-center whitespace-nowrap">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Conversion Funnel + Scroll Depth ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Conversion Funnel */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#9A969A]" />
              משפך המרה
            </CardTitle>
            <CardDescription className="text-xs">צפיות → לחיצות → הגשות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[
              { label: "צפיות בדף", count: data.current.pageViews, color: "#3B82F6", icon: <Eye className="w-3.5 h-3.5" /> },
              { label: "לחיצות CTA", count: data.current.ctaClicks, color: "#F59E0B", icon: <MousePointerClick className="w-3.5 h-3.5" /> },
              { label: "הגשות טופס", count: data.current.formSubmissions, color: "#B8D900", icon: <Send className="w-3.5 h-3.5" /> },
            ].map((step, i, arr) => {
              const funnelMax = Math.max(data.current.pageViews, 1);
              const width = Math.round((step.count / funnelMax) * 100);
              const prevCount = i > 0 ? arr[i - 1].count : null;
              const dropPct = prevCount && prevCount > 0 ? 100 - Math.round((step.count / prevCount) * 100) : null;
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-[#716C70]">
                      <span style={{ color: step.color }}>{step.icon}</span>
                      {step.label}
                    </div>
                    <div className="flex items-center gap-2">
                      {dropPct !== null && dropPct > 0 && (
                        <span className="text-red-400 text-[10px]">▼ {dropPct}% נטשו</span>
                      )}
                      <span className="font-bold text-[#2a2628]">{step.count.toLocaleString("he-IL")}</span>
                    </div>
                  </div>
                  <div className="h-7 bg-gray-50 rounded-xl overflow-hidden relative">
                    <div
                      className="h-full rounded-xl transition-all duration-700 flex items-center justify-end pr-2"
                      style={{
                        width: mounted ? `${Math.max(width, 2)}%` : "0%",
                        backgroundColor: step.color + "33",
                        borderRight: `3px solid ${step.color}`,
                      }}
                    >
                      <span className="text-[10px] font-bold" style={{ color: step.color }}>{width}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Scroll Depth */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#9A969A]" />
              עומק גלילה
            </CardTitle>
            <CardDescription className="text-xs">% מבקרים שהגיעו לכל נקודת גלילה</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.scrollDepthBands.every(b => b.visitors === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <Activity className="w-8 h-8 text-[#E5E5E5]" />
                <p className="text-xs text-[#9A969A]">נתוני גלילה יופיעו לאחר שמבקרים יגלשו בדף</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.scrollDepthBands.map((band, i) => (
                  <div key={band.depth} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#716C70]">גלילה עד {band.label}</span>
                      <span className="font-bold text-[#2a2628]">{band.pct}%
                        <span className="font-normal text-[#9A969A] mr-1">({band.visitors} מבקרים)</span>
                      </span>
                    </div>
                    <div className="h-4 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: mounted ? `${Math.max(band.pct, 1)}%` : "0%",
                          background: `linear-gradient(to left, #B8D900, #3B82F6)`,
                          opacity: 0.4 + (i / data.scrollDepthBands.length) * 0.4,
                          transitionDelay: `${i * 100}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Click Heatmap ── */}
      {pageSlug && (
        <ClickHeatmap
          pageId={pageId}
          pageSlug={pageSlug}
          startDate={getPeriodBounds().currentStart}
          endDate={getPeriodBounds().currentEnd}
        />
      )}

      {/* ── UTM Breakdown Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UTM Source */}
        <UtmBreakdownCard
          title="מקורות תנועה (Source)"
          description="פילוח לפי UTM Source"
          rows={data.utmSources}
          mounted={mounted}
        />

        {/* UTM Medium */}
        <UtmBreakdownCard
          title="סוג תנועה (Medium)"
          description="פילוח לפי UTM Medium"
          rows={data.utmMediums}
          mounted={mounted}
        />

        {/* UTM Campaign */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">
              קמפיינים (Campaign)
            </CardTitle>
            <CardDescription className="text-xs">פילוח לפי UTM Campaign</CardDescription>
          </CardHeader>
          <CardContent>
            {data.utmCampaigns.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-3">
                {visibleCampaigns.map((row, idx) => {
                  const maxViews = Math.max(...data.utmCampaigns.map((r) => r.views), 1);
                  const pct = Math.round((row.views / maxViews) * 100);
                  return (
                    <div key={row.value} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#716C70] truncate max-w-[60%]">{row.value}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-[#2a2628] tabular-nums">
                            {row.views}
                          </span>
                          <span className="text-[#9A969A]">|</span>
                          <span className="text-emerald-600 tabular-nums">
                            {row.conversionRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            backgroundColor: UTM_COLORS[idx % UTM_COLORS.length],
                            transitionDelay: `${idx * 80}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {data.utmCampaigns.length > CAMPAIGN_COLLAPSE_THRESHOLD && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-[#9A969A] gap-1"
                    onClick={() => setCampaignsExpanded(!campaignsExpanded)}
                  >
                    {campaignsExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        הצג פחות
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        הצג עוד {data.utmCampaigns.length - CAMPAIGN_COLLAPSE_THRESHOLD} קמפיינים
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row: Devices, Referrers, Webhooks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown — Donut Chart */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">פילוח מכשירים</CardTitle>
            <CardDescription className="text-xs">נייד, מחשב וטאבלט</CardDescription>
          </CardHeader>
          <CardContent>
            {data.devices.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-4">
                {/* SVG donut chart */}
                <div className="relative w-32 h-32 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {(() => {
                      let offset = 0;
                      return data.devices.map((device) => {
                        const pct =
                          totalDevices > 0 ? (device.count / totalDevices) * 100 : 0;
                        const color = DEVICE_COLORS[device.type] || "#9CA3AF";
                        const dashArray = `${pct} ${100 - pct}`;
                        const currentOffset = offset;
                        offset += pct;
                        return (
                          <circle
                            key={device.type}
                            cx="18"
                            cy="18"
                            r={DONUT_RADIUS}
                            fill="transparent"
                            stroke={color}
                            strokeWidth="3"
                            strokeDasharray={dashArray}
                            strokeDashoffset={-currentOffset}
                            className="transition-all duration-700"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-[#2a2628]">{totalDevices}</span>
                  </div>
                </div>

                {/* Legend with icons */}
                <div className="space-y-2">
                  {data.devices.map((device) => {
                    const pct =
                      totalDevices > 0 ? Math.round((device.count / totalDevices) * 100) : 0;
                    const DeviceIcon =
                      device.type === "mobile"
                        ? Smartphone
                        : device.type === "tablet"
                          ? Tablet
                          : Monitor;
                    return (
                      <div key={device.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: DEVICE_COLORS[device.type] || "#9CA3AF",
                            }}
                          />
                          <DeviceIcon className="w-3.5 h-3.5 text-[#716C70]" />
                          <span className="text-sm text-[#716C70]">
                            {DEVICE_LABELS[device.type] || device.type}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[#2a2628] tabular-nums">
                          {device.count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrer Domains */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">
              דומיינים מפנים
            </CardTitle>
            <CardDescription className="text-xs">מאיפה הגיעו המבקרים</CardDescription>
          </CardHeader>
          <CardContent>
            {data.referrers.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-2.5">
                {data.referrers.map((ref, idx) => {
                  const maxRef = Math.max(...data.referrers.map((r) => r.count), 1);
                  const pct = Math.round((ref.count / maxRef) * 100);
                  return (
                    <div key={ref.domain} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-[#9A969A] flex-shrink-0" />
                          <span className="text-[#716C70] truncate">{ref.domain}</span>
                        </div>
                        <span className="font-bold text-[#2a2628] tabular-nums mr-2">
                          {formatNum(ref.count)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-[#B8D900]"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            transitionDelay: `${idx * 80}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Status */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">סטטוס Webhook</CardTitle>
            <CardDescription className="text-xs">
              רק אירועי שליחת טופס (form_submit)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalWebhook === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין שליחות טופס בתקופה</p>
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "נשלח בהצלחה",
                    value: data.webhook.sent,
                    color: "#10B981",
                    icon: Send,
                  },
                  {
                    label: "נכשל",
                    value: data.webhook.failed,
                    color: "#EF4444",
                    icon: AlertTriangle,
                  },
                  {
                    label: "ממתין / ללא סטטוס",
                    value: data.webhook.pending,
                    color: "#F59E0B",
                    icon: Clock,
                  },
                ].map((item) => {
                  const pct =
                    totalWebhook > 0 ? Math.round((item.value / totalWebhook) * 100) : 0;
                  const StatusIcon = item.icon;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className="w-3.5 h-3.5"
                            style={{ color: item.color }}
                          />
                          <span className="text-[#716C70]">{item.label}</span>
                        </div>
                        <span className="font-bold text-[#2a2628] tabular-nums">
                          {formatNum(item.value)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-[#9A969A] text-left" dir="ltr">
                        {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Visitor Sessions Feed ── */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            סשנים אחרונים
            <span className="text-xs font-normal text-[#9A969A] mr-auto">
              {data.recentSessions.length} מבקרים אחרונים
            </span>
          </CardTitle>
          <p className="text-xs text-[#9A969A]">
            כל שורה = מבקר ייחודי — מקור, מכשיר, עומק גלילה, זמן ואם הגיש טופס
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recentSessions.length === 0 ? (
            <p className="text-center text-[#9A969A] py-6 text-sm">אין מבקרים בתקופה זו</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {/* Column headers */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 pb-1.5 text-[10px] font-semibold text-[#9A969A] uppercase tracking-wide">
                <span>מכשיר</span>
                <span>מקור / הפניה</span>
                <span>גלילה</span>
                <span>זמן</span>
                <span>שעה</span>
                <span>ליד?</span>
              </div>
              {data.recentSessions.map((s, i) => {
                const time = new Date(s.start).toLocaleString("he-IL", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                });
                const timeOnPage = s.maxTimeOnPage > 0
                  ? s.maxTimeOnPage >= 60
                    ? `${Math.floor(s.maxTimeOnPage / 60)}ד׳`
                    : `${s.maxTimeOnPage}ש׳`
                  : "—";
                const source = s.utmSource || s.referrer || "ישיר";
                const deviceIcon = s.device === "mobile" ? "📱" : s.device === "tablet" ? "📟" : "💻";
                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 items-center py-2 text-xs ${
                      s.converted ? "bg-green-50/30" : ""
                    }`}
                  >
                    {/* Device */}
                    <span title={s.device}>{deviceIcon}</span>

                    {/* Source */}
                    <span className="text-[#716C70] truncate">{source}</span>

                    {/* Scroll depth */}
                    <span className="tabular-nums text-[#9A969A] shrink-0">
                      {s.maxScroll > 0 ? (
                        <span
                          className={`font-medium ${
                            s.maxScroll >= 75 ? "text-green-600" :
                            s.maxScroll >= 50 ? "text-amber-600" : "text-[#9A969A]"
                          }`}
                        >
                          {s.maxScroll}%
                        </span>
                      ) : "—"}
                    </span>

                    {/* Time on page */}
                    <span className="tabular-nums text-[#9A969A] shrink-0">{timeOnPage}</span>

                    {/* Session time */}
                    <span className="text-[10px] text-[#C0BBC0] shrink-0 tabular-nums">{time}</span>

                    {/* Conversion badge */}
                    <span className="shrink-0">
                      {s.converted ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                          ✓ ליד
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#E0DDE0]">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Sub-components ─── */

/**
 * Reusable UTM breakdown card with bar chart and conversion rates.
 * @param title - Card title in Hebrew
 * @param description - Card description
 * @param rows - UTM breakdown rows
 * @param mounted - Whether the component is mounted (for animations)
 */
function UtmBreakdownCard({
  title,
  description,
  rows,
  mounted,
}: {
  title: string;
  description: string;
  rows: UtmRow[];
  mounted: boolean;
}) {
  const maxViews = Math.max(...rows.map((r) => r.views), 1);

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base font-bold text-[#2a2628]">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
        ) : (
          <div className="space-y-3">
            {/* Column headers */}
            <div className="flex items-center justify-between text-[10px] text-[#9A969A] font-medium border-b border-[#f3f4f6] pb-1">
              <span>ערך</span>
              <div className="flex items-center gap-3">
                <span>צפיות</span>
                <span>שליחות</span>
                <span>המרה</span>
              </div>
            </div>
            {rows.map((row, idx) => {
              const pct = Math.round((row.views / maxViews) * 100);
              return (
                <div key={row.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#716C70] truncate max-w-[40%]">{row.value}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-[#2a2628] tabular-nums w-8 text-center">
                        {row.views}
                      </span>
                      <span className="font-bold text-blue-600 tabular-nums w-8 text-center">
                        {row.submissions}
                      </span>
                      <span className="text-emerald-600 tabular-nums w-12 text-center">
                        {row.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: mounted ? `${pct}%` : "0%",
                        backgroundColor: UTM_COLORS[idx % UTM_COLORS.length],
                        transitionDelay: `${idx * 80}ms`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
