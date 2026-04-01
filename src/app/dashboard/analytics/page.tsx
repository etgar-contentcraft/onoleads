/**
 * Analytics Dashboard - Event-based analytics with page views, submissions,
 * UTM breakdowns, device stats, and referrer tracking.
 * All charts are CSS-only (no external chart libraries).
 * Queries the analytics_events table for all metrics.
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Eye,
  Users,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Send,
  AlertTriangle,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

/** Time period options for the date range picker */
const TIME_PERIODS = [
  { value: "7d", label: "7 \u05D9\u05DE\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD" },
  { value: "30d", label: "30 \u05D9\u05DE\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD" },
  { value: "90d", label: "90 \u05D9\u05DE\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD" },
  { value: "custom", label: "\u05EA\u05D0\u05E8\u05D9\u05DB\u05D9\u05DD \u05DE\u05D5\u05EA\u05D0\u05DE\u05D9\u05DD" },
];

/** Map of days per period for computing previous-period comparison */
const PERIOD_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Maximum number of rows fetched from Supabase per query */
const MAX_ROWS = 50000;

/** Top-N limits for tables */
const TOP_PAGES_LIMIT = 10;
const TOP_REFERRERS_LIMIT = 10;
const TOP_UTM_LIMIT = 10;

/** Device type labels in Hebrew */
const DEVICE_LABELS: Record<string, string> = {
  mobile: "\u05E0\u05D9\u05D9\u05D3",
  desktop: "\u05DE\u05D7\u05E9\u05D1",
  tablet: "\u05D8\u05D0\u05D1\u05DC\u05D8",
};

/** Device type colors for the donut chart */
const DEVICE_COLORS: Record<string, string> = {
  mobile: "#B8D900",
  desktop: "#3B82F6",
  tablet: "#F59E0B",
};

/** Bar chart color palette for UTM sources */
const BAR_COLORS = ["#B8D900", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4"];

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PageInfo {
  id: string;
  title: string;
  slug: string;
}

interface PageStats {
  pageId: string;
  title: string;
  slug: string;
  views: number;
  uniqueVisitors: number;
  submissions: number;
  conversionRate: number;
}

interface UtmCampaignRow {
  name: string;
  views: number;
  submissions: number;
  conversion: number;
}

interface DailyPoint {
  date: string;
  views: number;
  submissions: number;
}

interface AnalyticsData {
  /* Key metrics */
  totalPageViews: number;
  uniqueVisitors: number;
  formSubmissions: number;
  conversionRate: number;
  /* Previous period for comparison */
  prevPageViews: number;
  prevUniqueVisitors: number;
  prevFormSubmissions: number;
  prevConversionRate: number;
  /* Breakdowns */
  dailyTimeline: DailyPoint[];
  topPages: PageStats[];
  utmSources: { source: string; count: number }[];
  utmCampaigns: UtmCampaignRow[];
  deviceBreakdown: { type: string; count: number }[];
  referrerDomains: { domain: string; count: number }[];
  webhookSent: number;
  webhookFailed: number;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Computes percentage change between two numbers.
 * Returns 0 when previous value is 0 to avoid division by zero.
 */
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Renders a percentage-change badge with arrow icon and color.
 */
function ChangeBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[#9A969A]">
        <Minus size={12} />
        0%
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value)}%
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mounted, setMounted] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Computes the start/end date ISO strings for the selected period,
   * plus the equivalent previous period for comparison.
   */
  const getDateRanges = useCallback(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === "custom" && dateFrom) {
      start = new Date(dateFrom);
      end = dateTo ? new Date(dateTo + "T23:59:59") : now;
    } else {
      const days = PERIOD_DAYS[period] || 30;
      start = new Date(now);
      start.setDate(start.getDate() - days);
      end = now;
    }

    /* Previous period has the same duration, ending right before current start */
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      prevStartISO: prevStart.toISOString(),
      prevEndISO: prevEnd.toISOString(),
    };
  }, [period, dateFrom, dateTo]);

  /**
   * Fetches all analytics data from Supabase analytics_events table.
   * Runs multiple queries in parallel for performance.
   */
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const { startISO, endISO, prevStartISO, prevEndISO } = getDateRanges();

    /* ------ Current period events ------ */
    const [currentEventsRes, prevPageViewsRes, prevSubmissionsRes, prevVisitorsRes] =
      await Promise.all([
        /* All events in current period */
        supabase
          .from("analytics_events")
          .select("id, event_type, page_id, cookie_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer_domain, device_type, webhook_status, created_at")
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .limit(MAX_ROWS),
        /* Previous period page_view count */
        supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "page_view")
          .gte("created_at", prevStartISO)
          .lte("created_at", prevEndISO),
        /* Previous period form_submit count */
        supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "form_submit")
          .gte("created_at", prevStartISO)
          .lte("created_at", prevEndISO),
        /* Previous period unique visitors (cookie_ids from page_view) */
        supabase
          .from("analytics_events")
          .select("cookie_id")
          .eq("event_type", "page_view")
          .gte("created_at", prevStartISO)
          .lte("created_at", prevEndISO)
          .limit(MAX_ROWS),
      ]);

    const events = currentEventsRes.data ?? [];

    /* ------ Key metrics (current period) ------ */
    const pageViews = events.filter((e) => e.event_type === "page_view");
    const submissions = events.filter((e) => e.event_type === "form_submit");

    const totalPageViews = pageViews.length;
    const uniqueVisitorSet = new Set(pageViews.map((e) => e.cookie_id));
    const uniqueVisitors = uniqueVisitorSet.size;
    const formSubmissions = submissions.length;
    const conversionRate = uniqueVisitors > 0 ? Math.round((formSubmissions / uniqueVisitors) * 1000) / 10 : 0;

    /* ------ Previous period metrics ------ */
    const prevPageViews = prevPageViewsRes.count ?? 0;
    const prevFormSubmissions = prevSubmissionsRes.count ?? 0;
    const prevVisitorCookies = prevVisitorsRes.data ?? [];
    const prevUniqueVisitors = new Set(prevVisitorCookies.map((e) => e.cookie_id)).size;
    const prevConversionRate = prevUniqueVisitors > 0
      ? Math.round((prevFormSubmissions / prevUniqueVisitors) * 1000) / 10
      : 0;

    /* ------ Daily timeline ------ */
    const dailyMap = new Map<string, { views: number; submissions: number }>();
    for (const e of events) {
      if (e.event_type !== "page_view" && e.event_type !== "form_submit") continue;
      const day = e.created_at.split("T")[0];
      const entry = dailyMap.get(day) || { views: 0, submissions: 0 };
      if (e.event_type === "page_view") entry.views++;
      if (e.event_type === "form_submit") entry.submissions++;
      dailyMap.set(day, entry);
    }
    const dailyTimeline = Array.from(dailyMap.entries())
      .map(([date, d]) => ({ date, views: d.views, submissions: d.submissions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    /* ------ Top landing pages ------ */
    const pageIdSet = new Set<string>();
    const pageViewMap = new Map<string, Set<string>>();
    const pageSubmissionMap = new Map<string, number>();
    const pageVisitorMap = new Map<string, Set<string>>();

    for (const e of events) {
      if (!e.page_id) continue;
      pageIdSet.add(e.page_id);

      if (e.event_type === "page_view") {
        if (!pageViewMap.has(e.page_id)) pageViewMap.set(e.page_id, new Set());
        pageViewMap.get(e.page_id)!.add(e.id);
        if (!pageVisitorMap.has(e.page_id)) pageVisitorMap.set(e.page_id, new Set());
        if (e.cookie_id) pageVisitorMap.get(e.page_id)!.add(e.cookie_id);
      }
      if (e.event_type === "form_submit") {
        pageSubmissionMap.set(e.page_id, (pageSubmissionMap.get(e.page_id) || 0) + 1);
      }
    }

    /* Fetch page titles from pages table */
    let pagesLookup: PageInfo[] = [];
    const pageIds = Array.from(pageIdSet);
    if (pageIds.length > 0) {
      const { data: pagesData } = await supabase
        .from("pages")
        .select("id, title, slug")
        .in("id", pageIds);
      pagesLookup = (pagesData ?? []) as PageInfo[];
    }
    const pageInfoMap = new Map<string, PageInfo>();
    for (const p of pagesLookup) {
      pageInfoMap.set(p.id, p);
    }

    const topPages: PageStats[] = pageIds
      .map((pid) => {
        const info = pageInfoMap.get(pid);
        const views = pageViewMap.get(pid)?.size ?? 0;
        const visitors = pageVisitorMap.get(pid)?.size ?? 0;
        const subs = pageSubmissionMap.get(pid) ?? 0;
        const rate = visitors > 0 ? Math.round((subs / visitors) * 1000) / 10 : 0;
        return {
          pageId: pid,
          title: info?.title || "\u05DC\u05DC\u05D0 \u05E9\u05DD",
          slug: info?.slug || "",
          views,
          uniqueVisitors: visitors,
          submissions: subs,
          conversionRate: rate,
        };
      })
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, TOP_PAGES_LIMIT);

    /* ------ UTM Source breakdown ------ */
    const utmSourceMap = new Map<string, number>();
    for (const e of events) {
      if (!e.utm_source) continue;
      utmSourceMap.set(e.utm_source, (utmSourceMap.get(e.utm_source) || 0) + 1);
    }
    const utmSources = Array.from(utmSourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_UTM_LIMIT);

    /* ------ UTM Campaign breakdown ------ */
    const campaignViewMap = new Map<string, number>();
    const campaignSubMap = new Map<string, number>();
    for (const e of events) {
      if (!e.utm_campaign) continue;
      if (e.event_type === "page_view") {
        campaignViewMap.set(e.utm_campaign, (campaignViewMap.get(e.utm_campaign) || 0) + 1);
      }
      if (e.event_type === "form_submit") {
        campaignSubMap.set(e.utm_campaign, (campaignSubMap.get(e.utm_campaign) || 0) + 1);
      }
    }
    const allCampaigns = new Set([...Array.from(campaignViewMap.keys()), ...Array.from(campaignSubMap.keys())]);
    const utmCampaigns: UtmCampaignRow[] = Array.from(allCampaigns)
      .map((name) => {
        const views = campaignViewMap.get(name) || 0;
        const subs = campaignSubMap.get(name) || 0;
        const conversion = views > 0 ? Math.round((subs / views) * 1000) / 10 : 0;
        return { name, views, submissions: subs, conversion };
      })
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, TOP_UTM_LIMIT);

    /* ------ Device breakdown ------ */
    const deviceMap = new Map<string, number>();
    for (const e of events) {
      if (!e.device_type) continue;
      deviceMap.set(e.device_type, (deviceMap.get(e.device_type) || 0) + 1);
    }
    const deviceBreakdown = Array.from(deviceMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    /* ------ Referrer domains ------ */
    const referrerMap = new Map<string, number>();
    for (const e of events) {
      if (!e.referrer_domain) continue;
      referrerMap.set(e.referrer_domain, (referrerMap.get(e.referrer_domain) || 0) + 1);
    }
    const referrerDomains = Array.from(referrerMap.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_REFERRERS_LIMIT);

    /* ------ Webhook funnel ------ */
    const webhookSent = submissions.filter((e) => e.webhook_status === "sent").length;
    const webhookFailed = submissions.filter((e) => e.webhook_status === "failed").length;

    setData({
      totalPageViews,
      uniqueVisitors,
      formSubmissions,
      conversionRate,
      prevPageViews,
      prevUniqueVisitors,
      prevFormSubmissions,
      prevConversionRate,
      dailyTimeline,
      topPages,
      utmSources,
      utmCampaigns,
      deviceBreakdown,
      referrerDomains,
      webhookSent,
      webhookFailed,
    });

    setLoading(false);
  }, [getDateRanges]);

  /* Fetch on mount and when period changes */
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /* Realtime subscription on analytics_events INSERT to auto-refresh */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-analytics-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        () => {
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnalytics]);

  /* ---------- Loading state ---------- */
  if (loading || !data) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">{"\u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05E1"}</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">{"\u05E0\u05D9\u05EA\u05D5\u05D7 \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD \u05D5\u05D1\u05D9\u05E6\u05D5\u05E2\u05D9\u05DD"}</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
      </div>
    );
  }

  /* ---------- Derived values for charts ---------- */
  const maxDailyViews = Math.max(...data.dailyTimeline.map((d) => d.views), 1);
  const maxDailySubs = Math.max(...data.dailyTimeline.map((d) => d.submissions), 1);
  const maxDailyValue = Math.max(maxDailyViews, maxDailySubs, 1);
  const totalDevices = data.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
  const maxUtm = Math.max(...data.utmSources.map((s) => s.count), 1);
  const totalWebhooks = data.webhookSent + data.webhookFailed;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ------------------------------------------------------------------ */}
      {/* Header with date picker                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">{"\u05D0\u05E0\u05DC\u05D9\u05D8\u05D9\u05E7\u05E1"}</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">{"\u05E0\u05D9\u05EA\u05D5\u05D7 \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD \u05D5\u05D1\u05D9\u05E6\u05D5\u05E2\u05D9\u05DD"}</p>
        </div>
        <div className="flex items-center gap-2">
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
              <span className="text-[#9A969A] text-sm">{"\u05E2\u05D3"}</span>
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

      {/* ------------------------------------------------------------------ */}
      {/* Key metric cards                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "\u05E6\u05E4\u05D9\u05D5\u05EA \u05D3\u05E3",
            value: data.totalPageViews,
            change: pctChange(data.totalPageViews, data.prevPageViews),
            icon: <Eye size={18} />,
            color: "bg-[#B8D900]/10 text-[#8BA300]",
          },
          {
            label: "\u05DE\u05D1\u05E7\u05E8\u05D9\u05DD \u05D9\u05D9\u05D7\u05D5\u05D3\u05D9\u05D9\u05DD",
            value: data.uniqueVisitors,
            change: pctChange(data.uniqueVisitors, data.prevUniqueVisitors),
            icon: <Users size={18} />,
            color: "bg-blue-500/10 text-blue-600",
          },
          {
            label: "\u05E9\u05DC\u05D9\u05D7\u05D5\u05EA \u05D8\u05D5\u05E4\u05E1",
            value: data.formSubmissions,
            change: pctChange(data.formSubmissions, data.prevFormSubmissions),
            icon: <FileText size={18} />,
            color: "bg-violet-500/10 text-violet-600",
          },
          {
            label: "\u05D0\u05D7\u05D5\u05D6 \u05D4\u05DE\u05E8\u05D4",
            value: `${data.conversionRate}%`,
            change: pctChange(data.conversionRate, data.prevConversionRate),
            icon: <TrendingUp size={18} />,
            color: "bg-emerald-500/10 text-emerald-600",
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm rounded-2xl">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#9A969A] font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-[#2a2628] tabular-nums">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString("he-IL")
                      : stat.value}
                  </p>
                  <ChangeBadge value={stat.change} />
                </div>
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center ${stat.color}`}
                >
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Daily timeline chart + Device breakdown                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily timeline - dual bars */}
        <Card className="lg:col-span-2 border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">
              {"\u05E6\u05E4\u05D9\u05D5\u05EA + \u05E9\u05DC\u05D9\u05D7\u05D5\u05EA \u05DC\u05E4\u05D9 \u05D9\u05D5\u05DD"}
            </CardTitle>
            <CardDescription className="text-xs">
              {"\u05D4\u05EA\u05E4\u05DC\u05D2\u05D5\u05EA \u05D9\u05D5\u05DE\u05D9\u05EA \u05D1\u05EA\u05E7\u05D5\u05E4\u05D4 \u05D4\u05E0\u05D1\u05D7\u05E8\u05EA"}
            </CardDescription>
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#B8D900]" />
                <span className="text-xs text-[#716C70]">{"\u05E6\u05E4\u05D9\u05D5\u05EA"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                <span className="text-xs text-[#716C70]">{"\u05E9\u05DC\u05D9\u05D7\u05D5\u05EA"}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.dailyTimeline.length === 0 ? (
              <p className="text-center text-[#9A969A] py-8">
                {"\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DC\u05EA\u05E7\u05D5\u05E4\u05D4 \u05D6\u05D5"}
              </p>
            ) : (
              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-6">
                {data.dailyTimeline.map((day, idx) => {
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
                      <span className="text-[10px] font-medium text-[#2a2628] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.views}/{day.submissions}
                      </span>
                      <div className="w-full flex gap-[2px] items-end h-36">
                        {/* Page views bar */}
                        <div className="flex-1 relative h-full">
                          <div
                            className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#B8D900] to-[#d4f040] transition-all duration-500 ease-out hover:from-[#a8c400]"
                            style={{
                              height: mounted ? `${Math.max(viewHeight, 2)}%` : "0%",
                              transitionDelay: `${idx * 30}ms`,
                            }}
                          />
                        </div>
                        {/* Submissions bar */}
                        <div className="flex-1 relative h-full">
                          <div
                            className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#3B82F6] to-[#60A5FA] transition-all duration-500 ease-out hover:from-[#2563EB]"
                            style={{
                              height: mounted ? `${Math.max(subHeight, 2)}%` : "0%",
                              transitionDelay: `${idx * 30 + 15}ms`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] text-[#9A969A] -rotate-45 origin-center whitespace-nowrap">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device breakdown - donut chart */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">
              {"\u05E4\u05D9\u05DC\u05D5\u05D7 \u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DD"}
            </CardTitle>
            <CardDescription className="text-xs">
              {"\u05E0\u05D9\u05D9\u05D3, \u05DE\u05D7\u05E9\u05D1 \u05D5\u05D8\u05D0\u05D1\u05DC\u05D8"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.deviceBreakdown.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">
                {"\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD"}
              </p>
            ) : (
              <div className="space-y-4">
                {/* CSS donut chart */}
                <div className="relative w-32 h-32 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {(() => {
                      let offset = 0;
                      return data.deviceBreakdown.map((device) => {
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
                            r="15.91549431"
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

                {/* Legend */}
                <div className="space-y-2">
                  {data.deviceBreakdown.map((device) => {
                    const pct =
                      totalDevices > 0
                        ? Math.round((device.count / totalDevices) * 100)
                        : 0;
                    return (
                      <div key={device.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: DEVICE_COLORS[device.type] || "#9CA3AF",
                            }}
                          />
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
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Top landing pages table                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#2a2628]">
            {"\u05D3\u05E4\u05D9 \u05E0\u05D7\u05D9\u05EA\u05D4 \u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD"}
          </CardTitle>
          <CardDescription className="text-xs">
            {"\u05D3\u05E4\u05D9\u05DD \u05E2\u05DD \u05D4\u05DB\u05D9 \u05D4\u05E8\u05D1\u05D4 \u05E9\u05DC\u05D9\u05D7\u05D5\u05EA \u05D8\u05D5\u05E4\u05E1"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topPages.length === 0 ? (
            <p className="text-center text-[#9A969A] py-4 text-sm">
              {"\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-right py-2 px-2 text-[#9A969A] font-medium">#</th>
                    <th className="text-right py-2 px-2 text-[#9A969A] font-medium">
                      {"\u05E9\u05DD \u05D4\u05D3\u05E3"}
                    </th>
                    <th className="text-right py-2 px-2 text-[#9A969A] font-medium">
                      {"\u05E6\u05E4\u05D9\u05D5\u05EA"}
                    </th>
                    <th className="text-right py-2 px-2 text-[#9A969A] font-medium">
                      {"\u05DE\u05D1\u05E7\u05E8\u05D9\u05DD"}
                    </th>
                    <th className="text-right py-2 px-2 text-[#9A969A] font-medium">
                      {"\u05E9\u05DC\u05D9\u05D7\u05D5\u05EA"}
                    </th>
                    <th className="text-right py-2 px-2 text-[#9A969A] font-medium">
                      {"\u05D4\u05DE\u05E8\u05D4"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.map((page, idx) => (
                    <tr
                      key={page.pageId}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-2.5 px-2 text-[#9A969A] font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-2">
                        <Link
                          href={`/dashboard/pages/${page.pageId}/analytics`}
                          className="text-[#2a2628] hover:text-[#B8D900] transition-colors font-medium"
                        >
                          {page.title}
                        </Link>
                      </td>
                      <td className="py-2.5 px-2 text-[#2a2628] tabular-nums">
                        {page.views.toLocaleString("he-IL")}
                      </td>
                      <td className="py-2.5 px-2 text-[#2a2628] tabular-nums">
                        {page.uniqueVisitors.toLocaleString("he-IL")}
                      </td>
                      <td className="py-2.5 px-2 text-[#2a2628] font-bold tabular-nums">
                        {page.submissions.toLocaleString("he-IL")}
                      </td>
                      <td className="py-2.5 px-2 text-[#2a2628] tabular-nums">
                        {page.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* UTM Sources + UTM Campaigns + Referrers                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UTM Sources bar chart */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">
              {"\u05DE\u05E7\u05D5\u05E8\u05D5\u05EA \u05EA\u05E0\u05D5\u05E2\u05D4"}
            </CardTitle>
            <CardDescription className="text-xs">
              {"\u05E4\u05D9\u05DC\u05D5\u05D7 \u05DC\u05E4\u05D9 UTM source"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.utmSources.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">
                {"\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD"}
              </p>
            ) : (
              <div className="space-y-3">
                {data.utmSources.map((source, idx) => {
                  const pct = Math.round((source.count / maxUtm) * 100);
                  return (
                    <div key={source.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#716C70]">{source.source}</span>
                        <span className="font-bold text-[#2a2628] tabular-nums">
                          {source.count}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                            transitionDelay: `${idx * 100}ms`,
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

        {/* UTM Campaigns table */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">
              {"\u05E7\u05DE\u05E4\u05D9\u05D9\u05E0\u05D9\u05DD"}
            </CardTitle>
            <CardDescription className="text-xs">
              {"\u05E4\u05D9\u05DC\u05D5\u05D7 \u05DC\u05E4\u05D9 UTM campaign"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.utmCampaigns.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">
                {"\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD"}
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.utmCampaigns.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[#2a2628] truncate font-medium">{c.name}</p>
                      <p className="text-[10px] text-[#9A969A]">
                        {c.views} {"\u05E6\u05E4\u05D9\u05D5\u05EA"} &middot; {c.submissions}{" "}
                        {"\u05E9\u05DC\u05D9\u05D7\u05D5\u05EA"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-[#2a2628] tabular-nums mr-2">
                      {c.conversion}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrer domains table */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">
              {"\u05DE\u05E4\u05E0\u05D9\u05DD"}
            </CardTitle>
            <CardDescription className="text-xs">
              {"\u05D3\u05D5\u05DE\u05D9\u05D9\u05E0\u05D9\u05DD \u05DE\u05E4\u05E0\u05D9\u05DD \u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.referrerDomains.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">
                {"\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD"}
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.referrerDomains.map((ref, idx) => (
                  <div key={ref.domain} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#9A969A] w-5 text-center">
                      {idx + 1}
                    </span>
                    <Globe size={14} className="text-[#9A969A] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2a2628] truncate">{ref.domain}</p>
                    </div>
                    <span className="text-sm font-bold text-[#2a2628] tabular-nums">
                      {ref.count.toLocaleString("he-IL")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Webhook funnel                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-[#2a2628]">
            {"\u05DE\u05E9\u05E4\u05DA Webhook"}
          </CardTitle>
          <CardDescription className="text-xs">
            {"\u05E1\u05D8\u05D8\u05D5\u05E1 \u05E9\u05DC\u05D9\u05D7\u05EA Webhook \u05E2\u05D1\u05D5\u05E8 \u05E9\u05DC\u05D9\u05D7\u05D5\u05EA \u05D8\u05D5\u05E4\u05E1"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total form submits */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <FileText size={18} className="text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-[#9A969A]">{"\u05E1\u05D4\u05F4\u05DB \u05E9\u05DC\u05D9\u05D7\u05D5\u05EA"}</p>
                <p className="text-xl font-bold text-[#2a2628] tabular-nums">
                  {data.formSubmissions.toLocaleString("he-IL")}
                </p>
              </div>
            </div>
            {/* Sent */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Send size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-[#9A969A]">{"\u05E0\u05E9\u05DC\u05D7 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4"}</p>
                <p className="text-xl font-bold text-[#2a2628] tabular-nums">
                  {data.webhookSent.toLocaleString("he-IL")}
                </p>
              </div>
            </div>
            {/* Failed */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-[#9A969A]">{"\u05E0\u05DB\u05E9\u05DC"}</p>
                <p className="text-xl font-bold text-[#2a2628] tabular-nums">
                  {data.webhookFailed.toLocaleString("he-IL")}
                </p>
              </div>
            </div>
          </div>
          {/* Visual funnel bar */}
          {totalWebhooks > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#716C70]">
                <span>{"\u05E0\u05E9\u05DC\u05D7"}</span>
                <span className="flex-1 h-3 bg-[#f3f4f6] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-r-full transition-all duration-700"
                    style={{
                      width: mounted
                        ? `${Math.round((data.webhookSent / totalWebhooks) * 100)}%`
                        : "0%",
                    }}
                  />
                  <div
                    className="h-full bg-red-400 rounded-l-full transition-all duration-700"
                    style={{
                      width: mounted
                        ? `${Math.round((data.webhookFailed / totalWebhooks) * 100)}%`
                        : "0%",
                    }}
                  />
                </span>
                <span>{"\u05E0\u05DB\u05E9\u05DC"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
