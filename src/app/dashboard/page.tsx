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
import {
  BookOpen,
  FileText,
  Users,
  TrendingUp,
  Plus,
  ArrowUpLeft,
  Clock,
  CalendarDays,
  Eye,
  UserPlus,
  Zap,
} from "lucide-react";

// Stats card data
interface StatCard {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const statsCards: StatCard[] = [
  {
    title: "תוכניות לימוד",
    value: "24",
    change: "+2 החודש",
    changeType: "up",
    icon: BookOpen,
    color: "#B8D900",
    bgColor: "#F0F7CC",
  },
  {
    title: "דפי נחיתה פעילים",
    value: "18",
    change: "+3 השבוע",
    changeType: "up",
    icon: FileText,
    color: "#716C70",
    bgColor: "#F0F0F0",
  },
  {
    title: "לידים היום",
    value: "47",
    change: "+12% מאתמול",
    changeType: "up",
    icon: UserPlus,
    color: "#4A9B5F",
    bgColor: "#E8F5E9",
  },
  {
    title: "לידים השבוע",
    value: "312",
    change: "+8% משבוע שעבר",
    changeType: "up",
    icon: TrendingUp,
    color: "#3B82F6",
    bgColor: "#EFF6FF",
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

// Quick actions
const quickActions = [
  {
    label: "תוכנית חדשה",
    href: "/dashboard/programs/new",
    icon: BookOpen,
    color: "bg-[#B8D900] text-[#4A4648] hover:bg-[#9AB800]",
  },
  {
    label: "דף נחיתה חדש",
    href: "/dashboard/pages/new",
    icon: FileText,
    color: "bg-[#4A4648] text-white hover:bg-[#3A3638]",
  },
  {
    label: "אירוע חדש",
    href: "/dashboard/events/new",
    icon: CalendarDays,
    color: "bg-white text-[#716C70] border border-[#E5E5E5] hover:bg-[#F5F5F5]",
  },
];

const statusLabels: Record<Lead["status"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  new: { label: "חדש", variant: "default" },
  contacted: { label: "נוצר קשר", variant: "secondary" },
  qualified: { label: "מתאים", variant: "outline" },
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#4A4648]">
            שלום! ברוך הבא 👋
          </h1>
          <p className="text-sm text-[#9A969A] mt-0.5">
            הנה סקירה כללית של הפעילות במערכת
          </p>
        </div>
        <div className="flex items-center gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Button
                  className={`gap-2 text-sm font-medium ${action.color}`}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                mounted ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-[#9A969A] font-medium">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-[#4A4648] animate-count-up">
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-1">
                      <ArrowUpLeft
                        className={`w-3 h-3 ${
                          stat.changeType === "up"
                            ? "text-green-500 rotate-90"
                            : "text-red-500"
                        }`}
                      />
                      <span className="text-xs text-[#9A969A]">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{ backgroundColor: stat.bgColor }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: stat.color }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads Table */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base text-[#4A4648]">
                לידים אחרונים
              </CardTitle>
              <CardDescription>
                לידים שהתקבלו לאחרונה במערכת
              </CardDescription>
            </div>
            <Link href="/dashboard/leads">
              <Button variant="ghost" size="sm" className="text-[#B8D900] hover:text-[#9AB800] hover:bg-[#F0F7CC]">
                הצג הכל
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#E5E5E5]">
                    <th className="text-right text-xs font-medium text-[#9A969A] pb-3 px-4">
                      שם
                    </th>
                    <th className="text-right text-xs font-medium text-[#9A969A] pb-3 px-4">
                      תוכנית
                    </th>
                    <th className="text-right text-xs font-medium text-[#9A969A] pb-3 px-4">
                      מקור
                    </th>
                    <th className="text-right text-xs font-medium text-[#9A969A] pb-3 px-4">
                      זמן
                    </th>
                    <th className="text-right text-xs font-medium text-[#9A969A] pb-3 px-4">
                      סטטוס
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {recentLeads.map((lead) => {
                    const statusInfo = statusLabels[lead.status];
                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-[#F5F5F5]/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-[#4A4648]">
                              {lead.name}
                            </p>
                            <p className="text-xs text-[#9A969A]">
                              {lead.phone}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[#716C70]">
                            {lead.program}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[#716C70]">
                            {lead.source}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-xs text-[#9A969A]">
                            <Clock className="w-3 h-3" />
                            {lead.time}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={statusInfo.variant}
                            className={
                              lead.status === "new"
                                ? "bg-[#B8D900] text-[#4A4648] border-0"
                                : lead.status === "contacted"
                                ? "bg-blue-50 text-blue-600 border-0"
                                : "bg-green-50 text-green-600 border-0"
                            }
                          >
                            {statusInfo.label}
                          </Badge>
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
          {/* Quick Stats */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#4A4648]">
                סיכום חודשי
              </CardTitle>
              <CardDescription>מרץ 2026</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F0F7CC] flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#B8D900]" />
                  </div>
                  <span className="text-sm text-[#716C70]">סה״כ לידים</span>
                </div>
                <span className="text-sm font-bold text-[#4A4648]">
                  1,247
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
                    <Eye className="w-4 h-4 text-[#3B82F6]" />
                  </div>
                  <span className="text-sm text-[#716C70]">צפיות בדפים</span>
                </div>
                <span className="text-sm font-bold text-[#4A4648]">
                  8,432
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F5E9] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[#4A9B5F]" />
                  </div>
                  <span className="text-sm text-[#716C70]">שיעור המרה</span>
                </div>
                <span className="text-sm font-bold text-[#4A4648]">
                  14.8%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF3E0] flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <span className="text-sm text-[#716C70]">אירועים קרובים</span>
                </div>
                <span className="text-sm font-bold text-[#4A4648]">3</span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#4A4648]">
                פעילות אחרונה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    text: "דף נחיתה ׳MBA׳ עודכן",
                    time: "לפני 15 דקות",
                    icon: FileText,
                  },
                  {
                    text: "12 לידים חדשים מ-Google Ads",
                    time: "לפני שעה",
                    icon: UserPlus,
                  },
                  {
                    text: "אירוע יום פתוח פורסם",
                    time: "לפני 3 שעות",
                    icon: CalendarDays,
                  },
                  {
                    text: "תוכנית ׳מדעי הנתונים׳ נוספה",
                    time: "אתמול",
                    icon: BookOpen,
                  },
                ].map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-[#F5F5F5] flex items-center justify-center mt-0.5 shrink-0">
                        <Icon className="w-3.5 h-3.5 text-[#9A969A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[#4A4648]">
                          {activity.text}
                        </p>
                        <p className="text-xs text-[#9A969A]">
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
