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
} from "lucide-react";

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
  created_at: string;
}

/** Aggregated metrics for a single period */
interface PeriodMetrics {
  pageViews: number;
  uniqueVisitors: number;
  formSubmissions: number;
  ctaClicks: number;
  conversionRate: number;
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
      if (page) setPageName(page.title_he || page.slug);
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

    return { pageViews, uniqueVisitors, formSubmissions, ctaClicks, conversionRate };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => {
          const change = card.isPercentage
            ? Math.round(card.value - card.prev)
            : percentChange(card.value, card.prev);
          const Icon = card.icon;
          const ChangeIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
          const changeColor =
            change > 0 ? "text-emerald-600" : change < 0 ? "text-red-500" : "text-[#9A969A]";

          return (
            <Card key={card.label} className="border-0 shadow-sm rounded-2xl">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-[#9A969A] font-medium">{card.label}</p>
                    <p className="text-3xl font-bold text-[#2a2628] tabular-nums">
                      {card.isPercentage
                        ? `${card.value.toFixed(1)}%`
                        : formatNum(card.value)}
                    </p>
                    <div className={`flex items-center gap-1 text-xs ${changeColor}`}>
                      <ChangeIcon className="w-3 h-3" />
                      <span>
                        {card.isPercentage
                          ? `${change > 0 ? "+" : ""}${change} נק׳`
                          : formatPct(change)}
                      </span>
                      <span className="text-[#9A969A]">לעומת תקופה קודמת</span>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.color}`}
                  >
                    <Icon className="w-5 h-5" />
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
