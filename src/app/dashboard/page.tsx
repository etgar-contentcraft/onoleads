"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BookOpen,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  Plus,
  Clock,
  CalendarDays,
  Eye,
  UserPlus,
  Zap,
  ArrowUpLeft,
  ArrowDownRight,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";

// Stats card data
interface StatCard {
  title: string;
  value: number;
  displayValue: string;
  change: string;
  changePercent: string;
  changeType: "up" | "down" | "neutral";
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
}

const statsCards: StatCard[] = [
  {
    title: "תוכניות פעילות",
    value: 24,
    displayValue: "24",
    change: "+2 החודש",
    changePercent: "+8.3%",
    changeType: "up",
    icon: BookOpen,
    gradient: "from-[#B8D900]/10 to-[#B8D900]/5",
    iconBg: "bg-[#B8D900]/15 text-[#8BA300]",
  },
  {
    title: "דפי נחיתה מפורסמים",
    value: 18,
    displayValue: "18",
    change: "+3 השבוע",
    changePercent: "+16.7%",
    changeType: "up",
    icon: FileText,
    gradient: "from-blue-500/10 to-blue-500/5",
    iconBg: "bg-blue-500/15 text-blue-600",
  },
  {
    title: "לידים היום",
    value: 47,
    displayValue: "47",
    change: "+12 מאתמול",
    changePercent: "+12%",
    changeType: "up",
    icon: UserPlus,
    gradient: "from-emerald-500/10 to-emerald-500/5",
    iconBg: "bg-emerald-500/15 text-emerald-600",
  },
  {
    title: "לידים החודש",
    value: 1247,
    displayValue: "1,247",
    change: "+98 משבוע שעבר",
    changePercent: "+8%",
    changeType: "up",
    icon: TrendingUp,
    gradient: "from-violet-500/10 to-violet-500/5",
    iconBg: "bg-violet-500/15 text-violet-600",
  },
];

// Recent leads data
interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  program: string;
  source: string;
  time: string;
  status: "new" | "contacted" | "qualified";
}

const recentLeads: Lead[] = [
  {
    id: "1",
    name: "יוסי כהן",
    email: "yossi@gmail.com",
    phone: "050-1234567",
    program: "תואר ראשון במשפטים",
    source: "Google Ads",
    time: "לפני 5 דקות",
    status: "new",
  },
  {
    id: "2",
    name: "שרה לוי",
    email: "sarah@gmail.com",
    phone: "052-9876543",
    program: "MBA מנהל עסקים",
    source: "Facebook",
    time: "לפני 12 דקות",
    status: "new",
  },
  {
    id: "3",
    name: "דוד ישראלי",
    email: "david@gmail.com",
    phone: "054-5551234",
    program: "תואר שני בחינוך",
    source: "אורגני",
    time: "לפני 28 דקות",
    status: "contacted",
  },
  {
    id: "4",
    name: "רחל אברהמי",
    email: "rachel@gmail.com",
    phone: "050-7778899",
    program: "חשבונאות",
    source: "Instagram",
    time: "לפני שעה",
    status: "qualified",
  },
  {
    id: "5",
    name: "אלי מזרחי",
    email: "eli@gmail.com",
    phone: "053-1112233",
    program: "מדעי המחשב",
    source: "Google Ads",
    time: "לפני שעתיים",
    status: "contacted",
  },
];

// Quick actions (header buttons)
const quickActions = [
  {
    label: "צור עמוד חדש",
    href: "/dashboard/pages/new",
    icon: FileText,
    variant: "primary" as const,
  },
  {
    label: "צפה בלידים",
    href: "/dashboard/leads",
    icon: Users,
    variant: "secondary" as const,
  },
  {
    label: "ערוך תוכנית",
    href: "/dashboard/programs",
    icon: BookOpen,
    variant: "outline" as const,
  },
];

// Quick action cards for the dashboard grid
const quickActionCards = [
  {
    title: "צור עמוד חדש",
    description: "בנה דף נחיתה חדש לתוכנית לימודים",
    href: "/dashboard/pages/new",
    color: "from-[#B8D900]/20 to-[#B8D900]/5",
    iconColor: "text-[#8BA300]",
  },
  {
    title: "צפה בלידים",
    description: "ניהול וצפייה בכל הלידים שהתקבלו",
    href: "/dashboard/leads",
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

const statusConfig: Record<Lead["status"], { label: string; className: string }> = {
  new: {
    label: "חדש",
    className: "bg-[#B8D900]/15 text-[#7A8F00] border-[#B8D900]/30",
  },
  contacted: {
    label: "נוצר קשר",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  qualified: {
    label: "מתאים",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  },
};

// Weekly leads data for CSS bar chart
const weeklyLeads = [
  { day: "ראשון", value: 45, max: 80 },
  { day: "שני", value: 62, max: 80 },
  { day: "שלישי", value: 38, max: 80 },
  { day: "רביעי", value: 71, max: 80 },
  { day: "חמישי", value: 55, max: 80 },
  { day: "שישי", value: 28, max: 80 },
  { day: "שבת", value: 12, max: 80 },
];

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

  return <>{current.toLocaleString()}</>;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#B8D900]" />
            <span className="text-sm text-[#B8D900] font-medium">בוקר טוב</span>
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
                {/* Subtle gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="relative flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-[#9A969A] font-medium">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold text-[#2a2628] tabular-nums tracking-tight">
                      {mounted ? <AnimatedNumber value={stat.value} /> : "0"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {stat.changeType === "up" ? (
                        <div className="flex items-center gap-0.5 text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-[11px] font-semibold">{stat.changePercent}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-[11px] font-semibold">{stat.changePercent}</span>
                        </div>
                      )}
                      <span className="text-[11px] text-[#9A969A]">
                        {stat.change}
                      </span>
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
        {/* Recent Leads Table */}
        <Card className="lg:col-span-2 border-0 shadow-sm overflow-hidden">
          <CardHeader className="flex-row items-center justify-between bg-gradient-to-l from-[#f9fafb] to-white pb-4">
            <div>
              <CardTitle className="text-base font-bold text-[#2a2628]">
                לידים אחרונים
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                לידים שהתקבלו לאחרונה במערכת
              </CardDescription>
            </div>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="text-[#B8D900] hover:text-[#9AB800] hover:bg-[#B8D900]/10 rounded-lg gap-1 text-xs">
                הצג הכל
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#f3f4f6]">
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-2 px-6">
                      שם
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-2 px-4">
                      תוכנית
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-2 px-4">
                      מקור
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-2 px-4">
                      זמן
                    </th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider pb-3 pt-2 px-4">
                      סטטוס
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead, index) => {
                    const statusInfo = statusConfig[lead.status];
                    const initials = lead.name.split(" ").map(n => n[0]).join("");
                    const colors = [
                      "bg-[#B8D900]/15 text-[#7A8F00]",
                      "bg-blue-500/15 text-blue-600",
                      "bg-violet-500/15 text-violet-600",
                      "bg-amber-500/15 text-amber-600",
                      "bg-emerald-500/15 text-emerald-600",
                    ];
                    return (
                      <tr
                        key={lead.id}
                        className={`group hover:bg-[#f9fafb] transition-colors duration-150 ${
                          index < recentLeads.length - 1 ? "border-b border-[#f3f4f6]" : ""
                        }`}
                      >
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar size="sm">
                              <AvatarFallback className={`${colors[index % colors.length]} text-[10px] font-bold`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-[#2a2628]">
                                {lead.name}
                              </p>
                              <p className="text-[11px] text-[#9A969A]">
                                {lead.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-sm text-[#716C70]">
                            {lead.program}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-sm text-[#716C70] bg-[#f3f4f6] px-2 py-0.5 rounded-md text-xs">
                            {lead.source}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-[#9A969A]">
                            <Clock className="w-3 h-3" />
                            {lead.time}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Leads Per Week Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-[#2a2628]">
                  לידים השבוע
                </CardTitle>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-[#9A969A] hover:text-[#716C70]">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-xs">התפלגות לידים יומית</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-36 pt-2">
                {weeklyLeads.map((day, index) => {
                  const height = (day.value / day.max) * 100;
                  const isHighest = day.value === Math.max(...weeklyLeads.map(d => d.value));
                  return (
                    <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-[#2a2628]">{day.value}</span>
                      <div className="w-full relative h-24">
                        <div
                          className={`absolute bottom-0 w-full rounded-lg transition-all duration-700 ease-out ${
                            isHighest
                              ? "bg-gradient-to-t from-[#B8D900] to-[#d4f040]"
                              : "bg-gradient-to-t from-[#e5e7eb] to-[#f3f4f6] hover:from-[#B8D900]/40 hover:to-[#B8D900]/20"
                          }`}
                          style={{
                            height: mounted ? `${height}%` : "0%",
                            transitionDelay: `${index * 80}ms`,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#9A969A]">{day.day}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#2a2628]">
                סיכום חודשי
              </CardTitle>
              <CardDescription className="text-xs">מרץ 2026</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  icon: Users,
                  label: "סה״כ לידים",
                  value: "1,247",
                  iconBg: "bg-[#B8D900]/15 text-[#8BA300]",
                },
                {
                  icon: Eye,
                  label: "צפיות בדפים",
                  value: "8,432",
                  iconBg: "bg-blue-500/15 text-blue-600",
                },
                {
                  icon: Zap,
                  label: "שיעור המרה",
                  value: "14.8%",
                  iconBg: "bg-emerald-500/15 text-emerald-600",
                },
                {
                  icon: CalendarDays,
                  label: "אירועים קרובים",
                  value: "3",
                  iconBg: "bg-amber-500/15 text-amber-600",
                },
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
                    <span className="text-sm font-bold text-[#2a2628] tabular-nums">
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-[#2a2628]">
                פעילות אחרונה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative">
                {/* Timeline line */}
                <div className="absolute top-2 right-[13px] bottom-2 w-px bg-gradient-to-b from-[#e5e7eb] to-transparent" />

                {[
                  {
                    text: "דף נחיתה 'MBA' עודכן",
                    time: "לפני 15 דקות",
                    icon: FileText,
                    color: "bg-blue-500/15 text-blue-600",
                  },
                  {
                    text: "12 לידים חדשים מ-Google Ads",
                    time: "לפני שעה",
                    icon: UserPlus,
                    color: "bg-[#B8D900]/15 text-[#8BA300]",
                  },
                  {
                    text: "אירוע יום פתוח פורסם",
                    time: "לפני 3 שעות",
                    icon: CalendarDays,
                    color: "bg-amber-500/15 text-amber-600",
                  },
                  {
                    text: "תוכנית 'מדעי הנתונים' נוספה",
                    time: "אתמול",
                    icon: BookOpen,
                    color: "bg-violet-500/15 text-violet-600",
                  },
                ].map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 relative"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${activity.color} ring-2 ring-white z-10`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm text-[#2a2628]">
                          {activity.text}
                        </p>
                        <p className="text-[11px] text-[#9A969A] mt-0.5">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
