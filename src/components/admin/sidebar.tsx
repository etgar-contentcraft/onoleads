"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FileText,
  Paintbrush,
  Users,
  CalendarDays,
  ImageIcon,
  BarChart3,
  Settings,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    label: "לוח בקרה",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "תוכניות לימוד",
    href: "/dashboard/programs",
    icon: BookOpen,
  },
  {
    label: "דפי נחיתה",
    href: "/dashboard/pages",
    icon: FileText,
  },
  {
    label: "בונה דפים",
    href: "/dashboard/builder",
    icon: Paintbrush,
  },
  {
    label: "לידים",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    label: "אירועים",
    href: "/dashboard/events",
    icon: CalendarDays,
  },
  {
    label: "מדיה",
    href: "/dashboard/media",
    icon: ImageIcon,
  },
  {
    label: "אנליטיקס",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    label: "הגדרות",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-[#4A4648] text-white">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#B8D900] shrink-0">
          <GraduationCap className="w-5 h-5 text-[#4A4648]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white leading-tight truncate">
            OnoLeads
          </h2>
          <p className="text-[11px] text-[#9A969A] leading-tight truncate">
            ניהול לידים ודפי נחיתה
          </p>
        </div>
      </div>

      <Separator className="bg-white/10 mx-4" />

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[#B8D900]/15 text-[#B8D900]"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px] shrink-0",
                  active ? "text-[#B8D900]" : "text-white/50"
                )}
              />
              <span>{item.label}</span>
              {active && (
                <div className="mr-auto w-1.5 h-1.5 rounded-full bg-[#B8D900]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Area */}
      <div className="px-4 pb-4">
        <Separator className="bg-white/10 mb-3" />
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-[11px] text-white/50 leading-relaxed text-center">
            הקריה האקדמית אונו
            <br />
            המכללה המומלצת בישראל
          </p>
        </div>
      </div>
    </div>
  );
}
