/**
 * Analytics Dashboard - Lead conversion funnel, charts, and breakdowns.
 * All charts are CSS-only (no external chart libraries).
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Time period options for the date range picker */
const TIME_PERIODS = [
  { value: "7d", label: "7 ימים אחרונים" },
  { value: "30d", label: "30 ימים אחרונים" },
  { value: "90d", label: "90 ימים אחרונים" },
  { value: "custom", label: "תאריכים מותאמים" },
];

/** Lead stats fetched from the database */
interface AnalyticsData {
  totalLeads: number;
  todayLeads: number;
  weekLeads: number;
  monthLeads: number;
  webhookSent: number;
  webhookFailed: number;
  webhookPending: number;
  topPages: { title: string; slug: string; count: number }[];
  utmSources: { source: string; count: number }[];
  deviceBreakdown: { type: string; count: number }[];
  dailyLeads: { date: string; count: number }[];
}

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

  /** Computes the start date based on selected period */
  const getStartDate = useCallback((): string => {
    if (period === "custom" && dateFrom) return dateFrom;
    const now = new Date();
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[period] || 30;
    now.setDate(now.getDate() - days);
    return now.toISOString().split("T")[0];
  }, [period, dateFrom]);

  /** Fetches all analytics data from Supabase */
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const startDate = getStartDate();
    const endDate = period === "custom" && dateTo ? dateTo + "T23:59:59" : new Date().toISOString();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    /* Parallel queries for all analytics data */
    const [
      totalRes,
      todayRes,
      weekRes,
      monthRes,
      sentRes,
      failedRes,
      pendingRes,
      leadsWithPages,
      leadsWithUtm,
      leadsWithDevice,
      dailyRes,
    ] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startDate),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("webhook_status", "sent").gte("created_at", startDate),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("webhook_status", "failed").gte("created_at", startDate),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("webhook_status", "pending").gte("created_at", startDate),
      supabase.from("leads").select("page_id, program_interest").gte("created_at", startDate),
      supabase.from("leads").select("utm_source").gte("created_at", startDate).not("utm_source", "is", null),
      supabase.from("leads").select("device_type").gte("created_at", startDate).not("device_type", "is", null),
      supabase.from("leads").select("created_at").gte("created_at", startDate).order("created_at", { ascending: true }),
    ]);

    /* Process page data - count leads per page/program */
    const pageCountMap = new Map<string, number>();
    if (leadsWithPages.data) {
      for (const lead of leadsWithPages.data) {
        const key = lead.program_interest || "לא ידוע";
        pageCountMap.set(key, (pageCountMap.get(key) || 0) + 1);
      }
    }
    const topPages = Array.from(pageCountMap.entries())
      .map(([title, count]) => ({ title, slug: "", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    /* Process UTM sources */
    const utmMap = new Map<string, number>();
    if (leadsWithUtm.data) {
      for (const lead of leadsWithUtm.data) {
        const source = lead.utm_source || "ישיר";
        utmMap.set(source, (utmMap.get(source) || 0) + 1);
      }
    }
    const utmSources = Array.from(utmMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    /* Process device breakdown */
    const deviceMap = new Map<string, number>();
    if (leadsWithDevice.data) {
      for (const lead of leadsWithDevice.data) {
        const type = lead.device_type || "לא ידוע";
        deviceMap.set(type, (deviceMap.get(type) || 0) + 1);
      }
    }
    const deviceBreakdown = Array.from(deviceMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    /* Process daily leads */
    const dailyMap = new Map<string, number>();
    if (dailyRes.data) {
      for (const lead of dailyRes.data) {
        const day = lead.created_at.split("T")[0];
        dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
      }
    }
    const dailyLeads = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setData({
      totalLeads: totalRes.count ?? 0,
      todayLeads: todayRes.count ?? 0,
      weekLeads: weekRes.count ?? 0,
      monthLeads: monthRes.count ?? 0,
      webhookSent: sentRes.count ?? 0,
      webhookFailed: failedRes.count ?? 0,
      webhookPending: pendingRes.count ?? 0,
      topPages,
      utmSources,
      deviceBreakdown,
      dailyLeads,
    });

    setLoading(false);
  }, [getStartDate, period, dateTo]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /* Realtime lead counter - subscribes to inserts */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-leads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        () => {
          /* Re-fetch stats on new lead */
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnalytics]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">אנליטיקס</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">ניתוח נתוני לידים וביצועים</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
      </div>
    );
  }

  const maxDaily = Math.max(...data.dailyLeads.map((d) => d.count), 1);
  const totalDevices = data.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);
  const maxUtm = Math.max(...data.utmSources.map((s) => s.count), 1);
  const funnelTotal = data.totalLeads || 1;

  /** Device type labels in Hebrew */
  const deviceLabels: Record<string, string> = {
    mobile: "נייד",
    desktop: "מחשב",
    tablet: "טאבלט",
  };

  /** Device type colors */
  const deviceColors: Record<string, string> = {
    mobile: "#B8D900",
    desktop: "#3B82F6",
    tablet: "#F59E0B",
  };

  return (
    <div className="space-y-6">
      {/* Header with date picker */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">אנליטיקס</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">ניתוח נתוני לידים וביצועים</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val: string | null) => { if (val) setPeriod(val); }}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((tp) => (
                <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>
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

      {/* Real-time counter + Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "לידים בזמן אמת (היום)",
            value: data.todayLeads,
            icon: "zap",
            color: "bg-[#B8D900]/10 text-[#8BA300]",
            pulse: true,
          },
          {
            label: "לידים השבוע",
            value: data.weekLeads,
            icon: "calendar",
            color: "bg-blue-500/10 text-blue-600",
            pulse: false,
          },
          {
            label: "לידים החודש",
            value: data.monthLeads,
            icon: "trending",
            color: "bg-violet-500/10 text-violet-600",
            pulse: false,
          },
          {
            label: "סה״כ בתקופה",
            value: data.totalLeads,
            icon: "users",
            color: "bg-emerald-500/10 text-emerald-600",
            pulse: false,
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#9A969A] font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-[#2a2628] tabular-nums">
                    {stat.value.toLocaleString("he-IL")}
                  </p>
                </div>
                <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center ${stat.color}`}>
                  {stat.pulse && (
                    <div className="absolute inset-0 rounded-2xl bg-[#B8D900]/20 animate-ping" />
                  )}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Leads Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">לידים לפי יום</CardTitle>
            <CardDescription className="text-xs">התפלגות לידים יומית בתקופה הנבחרת</CardDescription>
          </CardHeader>
          <CardContent>
            {data.dailyLeads.length === 0 ? (
              <p className="text-center text-[#9A969A] py-8">אין נתונים לתקופה זו</p>
            ) : (
              <div className="flex items-end gap-1 h-48 overflow-x-auto pb-6">
                {data.dailyLeads.map((day, idx) => {
                  const height = (day.count / maxDaily) * 100;
                  const dateObj = new Date(day.date);
                  const label = dateObj.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
                  return (
                    <div key={day.date} className="flex-1 min-w-[24px] flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-medium text-[#2a2628] opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.count}
                      </span>
                      <div className="w-full relative h-36">
                        <div
                          className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#B8D900] to-[#d4f040] transition-all duration-500 ease-out hover:from-[#a8c400]"
                          style={{
                            height: mounted ? `${Math.max(height, 3)}%` : "0%",
                            transitionDelay: `${idx * 30}ms`,
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
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">משפך המרה</CardTitle>
            <CardDescription className="text-xs">סטטוס לידים לפי שלב</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "סה״כ לידים", value: data.totalLeads, color: "#B8D900", pct: 100 },
              { label: "Webhook נשלח", value: data.webhookSent, color: "#10B981", pct: Math.round((data.webhookSent / funnelTotal) * 100) },
              { label: "ממתין", value: data.webhookPending, color: "#F59E0B", pct: Math.round((data.webhookPending / funnelTotal) * 100) },
              { label: "נכשל", value: data.webhookFailed, color: "#EF4444", pct: Math.round((data.webhookFailed / funnelTotal) * 100) },
            ].map((step) => (
              <div key={step.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#716C70]">{step.label}</span>
                  <span className="font-bold text-[#2a2628] tabular-nums">{step.value.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: mounted ? `${step.pct}%` : "0%",
                      backgroundColor: step.color,
                    }}
                  />
                </div>
                <p className="text-[10px] text-[#9A969A] text-left" dir="ltr">{step.pct}%</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">דפים מובילים</CardTitle>
            <CardDescription className="text-xs">דפי נחיתה עם הכי הרבה לידים</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topPages.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-2.5">
                {data.topPages.map((page, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#9A969A] w-5 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2a2628] truncate">{page.title}</p>
                    </div>
                    <span className="text-sm font-bold text-[#2a2628] tabular-nums">{page.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* UTM Sources */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">מקורות תנועה</CardTitle>
            <CardDescription className="text-xs">פילוח לפי UTM source</CardDescription>
          </CardHeader>
          <CardContent>
            {data.utmSources.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-3">
                {data.utmSources.map((source, idx) => {
                  const pct = Math.round((source.count / maxUtm) * 100);
                  const colors = ["#B8D900", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4"];
                  return (
                    <div key={source.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#716C70]">{source.source}</span>
                        <span className="font-bold text-[#2a2628] tabular-nums">{source.count}</span>
                      </div>
                      <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            backgroundColor: colors[idx % colors.length],
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

        {/* Device Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">פילוח מכשירים</CardTitle>
            <CardDescription className="text-xs">נייד, מחשב וטאבלט</CardDescription>
          </CardHeader>
          <CardContent>
            {data.deviceBreakdown.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-4">
                {/* CSS donut chart */}
                <div className="relative w-32 h-32 mx-auto">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {(() => {
                      let offset = 0;
                      return data.deviceBreakdown.map((device) => {
                        const pct = totalDevices > 0 ? (device.count / totalDevices) * 100 : 0;
                        const color = deviceColors[device.type] || "#9CA3AF";
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
                    const pct = totalDevices > 0 ? Math.round((device.count / totalDevices) * 100) : 0;
                    return (
                      <div key={device.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: deviceColors[device.type] || "#9CA3AF" }}
                          />
                          <span className="text-sm text-[#716C70]">
                            {deviceLabels[device.type] || device.type}
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
    </div>
  );
}
