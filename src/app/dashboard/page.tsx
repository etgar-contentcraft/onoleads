/**
 * Dashboard homepage — overview of anonymous analytics and system activity.
 * No PII is displayed. All metrics come from analytics_events table.
 */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
import {
  BookOpen,
  FileText,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  Zap,
  BarChart3,
  Sparkles,
  MoreHorizontal,
  CalendarDays,
  ImageIcon,
  Settings,
  MousePointerClick,
} from "lucide-react";

/** Animated number counter for stat cards */
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <>{current.toLocaleString("he-IL")}</>;
}

/** Quick action cards for the dashboard grid */
const quickActionCards = [
  {
    title: "צור עמוד חדש",
    description: "בנה דף נחיתה חדש לתוכנית לימודים",
    href: "/dashboard/pages/new",
    color: "from-[#B8D900]/20 to-[#B8D900]/5",
    iconColor: "text-[#8BA300]",
  },
  {
    title: "אנליטיקס",
    description: "ניתוח מקיף של ביצועי העמודים",
    href: "/dashboard/analytics",
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-600",
  },
  {
    title: "העלה מדיה",
    description: "העלאת תמונות וסרטונים לספרייה",
    href: "/dashboard/media",
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-600",
  },
  {
    title: "הגדרות",
    description: "עדכון הגדרות מערכת ומותג",
    href: "/dashboard/settings",
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-600",
  },
];

/** Quick actions (header buttons) */
const quickActions = [
  {
    label: "צור עמוד חדש",
    href: "/dashboard/pages/new",
    icon: FileText,
    variant: "primary" as const,
  },
  {
    label: "אנליטיקס",
    href: "/dashboard/analytics",
    icon: BarChart3,
    variant: "secondary" as const,
  },
  {
    label: "ערוך תוכנית",
    href: "/dashboard/programs",
    icon: BookOpen,
    variant: "outline" as const,
  },
];

/** Dashboard analytics data */
interface DashboardData {
  todayViews: number;
  todaySubmissions: number;
  weekSubmissions: number;
  monthSubmissions: number;
  prevWeekSubmissions: number;
  prevMonthSubmissions: number;
  todayUniqueVisitors: number;
  monthViews: number;
  conversionRate: number;
  dailyData: { day: string; views: number; submissions: number }[];
  topPages: { id: string; title: string; submissions: number }[];
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Fetches anonymous analytics data from analytics_events */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const prevWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const [
      todayViewsRes,
      todaySubsRes,
      todayVisitorsRes,
      weekSubsRes,
      prevWeekSubsRes,
      monthSubsRes,
      prevMonthSubsRes,
      monthViewsRes,
      dailyRes,
      topPagesRes,
    ] = await Promise.all([
      supabaseRef.current.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", todayStart),
      supabaseRef.current.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "form_submit").gte("created_at", todayStart),
      supabaseRef.current.from("analytics_events").select("cookie_id").eq("event_type", "page_view").gte("created_at", todayStart),
      supabaseRef.current.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "form_submit").gte("created_at", weekStart),
      supabaseRef.current.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "form_submit").gte("created_at", prevWeekStart).lt("created_at", weekStart),
      supabaseRef.current.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "form_submit").gte("created_at", monthStart),
      supabaseRef.current.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "form_submit").gte("created_at", prevMonthStart).lt("created_at", prevMonthEnd),
      supabaseRef.current.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", monthStart),
      supabaseRef.current.from("analytics_events").select("event_type, created_at").gte("created_at", weekStart).in("event_type", ["page_view", "form_submit"]).order("created_at", { ascending: true }),
      supabaseRef.current.from("analytics_events").select("page_id").eq("event_type", "form_submit").gte("created_at", monthStart).not("page_id", "is", null),
    ]);

    /* Unique visitors today */
    const uniqueCookies = new Set((todayVisitorsRes.data || []).map(r => r.cookie_id).filter(Boolean));
    const todayUniqueVisitors = uniqueCookies.size;

    /* Conversion rate */
    const todayViews = todayViewsRes.count ?? 0;
    const todaySubmissions = todaySubsRes.count ?? 0;
    const conversionRate = todayUniqueVisitors > 0 ? (todaySubmissions / todayUniqueVisitors) * 100 : 0;

    /* Daily breakdown for bar chart (last 7 days) */
    const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const dailyMap = new Map<string, { views: number; submissions: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dailyMap.set(key, { views: 0, submissions: 0 });
    }
    if (dailyRes.data) {
      for (const ev of dailyRes.data) {
        const key = ev.created_at.split("T")[0];
        const entry = dailyMap.get(key);
        if (entry) {
          if (ev.event_type === "page_view") entry.views++;
          if (ev.event_type === "form_submit") entry.submissions++;
        }
      }
    }
    const dailyData = Array.from(dailyMap.entries()).map(([dateStr, vals]) => ({
      day: dayNames[new Date(dateStr).getDay()],
      ...vals,
    }));

    /* Top pages by submissions */
    const pageCountMap = new Map<string, number>();
    if (topPagesRes.data) {
      for (const ev of topPagesRes.data) {
        if (ev.page_id) pageCountMap.set(ev.page_id, (pageCountMap.get(ev.page_id) || 0) + 1);
      }
    }
    const topPageIds = Array.from(pageCountMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    /* Fetch page titles */
    let topPages: { id: string; title: string; submissions: number }[] = [];
    if (topPageIds.length > 0) {
      const { data: pages } = await supabaseRef.current.from("pages").select("id, title_he").in("id", topPageIds.map(p => p[0]));
      const titleMap = new Map((pages || []).map(p => [p.id, p.title_he || "ללא שם"]));
      topPages = topPageIds.map(([id, count]) => ({ id, title: titleMap.get(id) || "ללא שם", submissions: count }));
    }

    setData({
      todayViews,
      todaySubmissions,
      weekSubmissions: weekSubsRes.count ?? 0,
      monthSubmissions: monthSubsRes.count ?? 0,
      prevWeekSubmissions: prevWeekSubsRes.count ?? 0,
      prevMonthSubmissions: prevMonthSubsRes.count ?? 0,
      monthViews: monthViewsRes.count ?? 0,
      todayUniqueVisitors,
      conversionRate,
      dailyData,
      topPages,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Realtime subscription for new events — debounced to avoid rapid re-fetches */
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;
    const channel = supabaseRef.current
      .channel("dashboard-events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "analytics_events" }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchData(), 2000);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabaseRef.current.removeChannel(channel);
    };
  }, [fetchData]);

  /** Calculates percentage change between current and previous periods */
  function pctChange(current: number, previous: number): { text: string; type: "up" | "down" | "neutral" } {
    if (previous === 0) return current > 0 ? { text: "+100%", type: "up" } : { text: "0%", type: "neutral" };
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 0) return { text: `+${pct}%`, type: "up" };
    if (pct < 0) return { text: `${pct}%`, type: "down" };
    return { text: "0%", type: "neutral" };
  }

  const weekChange = data ? pctChange(data.weekSubmissions, data.prevWeekSubmissions) : { text: "0%", type: "neutral" as const };
  const monthChange = data ? pctChange(data.monthSubmissions, data.prevMonthSubmissions) : { text: "0%", type: "neutral" as const };

  const statsCards = [
    {
      title: "צפיות היום",
      value: data?.todayViews ?? 0,
      change: `${data?.todayUniqueVisitors ?? 0} מבקרים ייחודיים`,
      changePercent: "",
      changeType: "neutral" as const,
      icon: Eye,
      gradient: "from-[#B8D900]/10 to-[#B8D900]/5",
      iconBg: "bg-[#B8D900]/15 text-[#8BA300]",
    },
    {
      title: "טפסים היום",
      value: data?.todaySubmissions ?? 0,
      change: `המרה: ${(data?.conversionRate ?? 0).toFixed(1)}%`,
      changePercent: "",
      changeType: "neutral" as const,
      icon: MousePointerClick,
      gradient: "from-blue-500/10 to-blue-500/5",
      iconBg: "bg-blue-500/15 text-blue-600",
    },
    {
      title: "טפסים השבוע",
      value: data?.weekSubmissions ?? 0,
      change: "משבוע קודם",
      changePercent: weekChange.text,
      changeType: weekChange.type,
      icon: TrendingUp,
      gradient: "from-emerald-500/10 to-emerald-500/5",
      iconBg: "bg-emerald-500/15 text-emerald-600",
    },
    {
      title: "טפסים החודש",
      value: data?.monthSubmissions ?? 0,
      change: "מחודש קודם",
      changePercent: monthChange.text,
      changeType: monthChange.type,
      icon: CalendarDays,
      gradient: "from-violet-500/10 to-violet-500/5",
      iconBg: "bg-violet-500/15 text-violet-600",
    },
  ];

  const maxDaily = data ? Math.max(...data.dailyData.map(d => d.views + d.submissions), 1) : 1;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#B8D900]" />
            <span className="text-sm text-[#B8D900] font-medium">שלום</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#2a2628]">
            ברוך הבא למערכת
          </h1>
          <p className="text-[#9A969A] mt-1 text-sm">
            הנה סקירה כללית של הפעילות שלך היום
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Button
                  className={`gap-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                    action.variant === "primary"
                      ? "bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] shadow-md shadow-[#B8D900]/20 hover:shadow-lg hover:shadow-[#B8D900]/30 hover:-translate-y-0.5"
                      : action.variant === "secondary"
                        ? "bg-[#2a2628] text-white hover:bg-[#3a3638] shadow-md shadow-black/10"
                        : "bg-white text-[#716C70] border border-[#e5e7eb] hover:bg-[#f9fafb] hover:border-[#d1d5db] shadow-sm"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`group border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
                mounted ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
            >
              <CardContent className="pt-5 pb-5 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-[#9A969A] font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold text-[#2a2628] tabular-nums tracking-tight">
                      {mounted && !loading ? <AnimatedNumber value={stat.value} /> : "—"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {stat.changePercent && stat.changeType === "up" && (
                        <div className="flex items-center gap-0.5 text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-[11px] font-semibold">{stat.changePercent}</span>
                        </div>
                      )}
                      {stat.changePercent && stat.changeType === "down" && (
                        <div className="flex items-center gap-0.5 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-[11px] font-semibold">{stat.changePercent}</span>
                        </div>
                      )}
                      <span className="text-[11px] text-[#9A969A]">{stat.change}</span>
                    </div>
                  </div>
                  <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${stat.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActionCards.map((card, index) => (
          <Link key={card.title} href={card.href}>
            <Card
              className={`group border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden ${
                mounted ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${(index + 4) * 100}ms`, animationFillMode: "both" }}
            >
              <CardContent className="pt-4 pb-4">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-50`} />
                <div className="relative">
                  <h3 className="text-sm font-bold text-[#2a2628] group-hover:text-[#B8D900] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-[#9A969A] mt-0.5">{card.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm overflow-hidden">
          <CardHeader className="flex-row items-center justify-between bg-gradient-to-l from-[#f9fafb] to-white pb-4">
            <div>
              <CardTitle className="text-base font-bold text-[#2a2628]">
                פעילות השבוע
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                צפיות ושליחות טפסים ב-7 ימים אחרונים
              </CardDescription>
            </div>
            <Link href="/dashboard/analytics">
              <Button variant="ghost" size="sm" className="text-[#B8D900] hover:text-[#9AB800] hover:bg-[#B8D900]/10 rounded-lg gap-1 text-xs">
                אנליטיקס מלא
                <BarChart3 className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading || !data ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
              </div>
            ) : (
              <div className="flex items-end justify-between gap-2 h-44 pt-2">
                {data.dailyData.map((day, index) => {
                  const total = day.views + day.submissions;
                  const heightPct = (total / maxDaily) * 100;
                  const subPct = total > 0 ? (day.submissions / total) * 100 : 0;
                  return (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <span className="text-[10px] font-semibold text-[#2a2628] opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.views} / {day.submissions}
                      </span>
                      <div className="w-full relative h-32">
                        <div
                          className="absolute bottom-0 w-full rounded-lg overflow-hidden transition-all duration-700 ease-out"
                          style={{
                            height: mounted ? `${Math.max(heightPct, 3)}%` : "0%",
                            transitionDelay: `${index * 80}ms`,
                          }}
                        >
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-[#3B82F6] to-[#60A5FA]"
                            style={{ height: `${subPct}%` }}
                          />
                          <div
                            className="absolute top-0 w-full bg-gradient-to-t from-[#B8D900] to-[#d4f040]"
                            style={{ height: `${100 - subPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-[#9A969A]">{day.day}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-4 text-[11px] text-[#9A969A]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#B8D900]" />
                <span>צפיות</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                <span>טפסים</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top Pages */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-[#2a2628]">
                  עמודים מובילים
                </CardTitle>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-[#9A969A] hover:text-[#716C70]">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-xs">לפי שליחות טפסים החודש</CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#B8D900]" />
                </div>
              ) : data.topPages.length === 0 ? (
                <p className="text-center text-sm text-[#9A969A] py-8">אין נתונים עדיין</p>
              ) : (
                <div className="space-y-3">
                  {data.topPages.map((page, idx) => {
                    const colors = [
                      "bg-[#B8D900]/15 text-[#8BA300]",
                      "bg-blue-500/15 text-blue-600",
                      "bg-violet-500/15 text-violet-600",
                      "bg-amber-500/15 text-amber-600",
                      "bg-emerald-500/15 text-emerald-600",
                    ];
                    return (
                      <Link key={page.id} href={`/dashboard/pages/${page.id}/analytics`}>
                        <div className="flex items-center gap-3 group hover:bg-[#f9fafb] rounded-xl p-2 -mx-2 transition-colors cursor-pointer">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${colors[idx % colors.length]}`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#2a2628] truncate group-hover:text-[#B8D900] transition-colors">
                              {page.title}
                            </p>
                          </div>
                          <span className="text-sm font-bold text-[#2a2628] tabular-nums">{page.submissions}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#2a2628]">סיכום חודשי</CardTitle>
              <CardDescription className="text-xs">
                {new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: MousePointerClick, label: "טפסים שנשלחו", value: (data?.monthSubmissions ?? 0).toLocaleString("he-IL"), iconBg: "bg-[#B8D900]/15 text-[#8BA300]" },
                { icon: Eye, label: "צפיות בדפים", value: data?.monthViews?.toLocaleString("he-IL") ?? "0", iconBg: "bg-blue-500/15 text-blue-600" },
                { icon: Zap, label: "שיעור המרה", value: `${(data?.conversionRate ?? 0).toFixed(1)}%`, iconBg: "bg-emerald-500/15 text-emerald-600" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between group hover:bg-[#f9fafb] rounded-xl p-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.iconBg} transition-transform duration-200 group-hover:scale-105`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-[#716C70]">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-[#2a2628] tabular-nums">{item.value}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
