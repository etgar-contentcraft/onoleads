"use client";

/**
 * Admin sidebar navigation — grouped by user intent.
 * Groups:
 *   Core:     Dashboard, Landing Pages, Analytics
 *   Marketing: Programs, Campaigns, AI Import, SEO
 *   Content:  Media, Faculty, Templates, Interest Areas, Global Sections
 *   System:   Settings, Pixels, Users, Audit Log, Help
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ImageIcon,
  BarChart3,
  Search,
  Settings,
  ChevronLeft,
  ShieldCheck,
  Globe,
  HelpCircle,
  GraduationCap,
  LayoutTemplate,
  Users2,
  Megaphone,
  Sparkles,
  Tag,
  Antenna,
} from "lucide-react";
import { useAdminLanguage } from "@/contexts/admin-language-context";
import type { TranslationKey } from "@/lib/i18n/admin-translations";

interface NavItem {
  labelKey: TranslationKey;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  /** Translation key for the group label (shown when sidebar is expanded) */
  labelKey?: TranslationKey;
  /** Group label in Hebrew — used as aria-label even when collapsed */
  labelHe: string;
  items: NavItem[];
}

/**
 * Grouped nav structure ordered by user intent.
 * Most-used actions (landing pages, analytics) come first.
 */
const navGroups: NavGroup[] = [
  {
    labelHe: "ראשי",
    items: [
      { labelKey: "nav_dashboard",  href: "/dashboard",           icon: LayoutDashboard },
      { labelKey: "nav_pages",      href: "/dashboard/pages",     icon: FileText },
      { labelKey: "nav_analytics",  href: "/dashboard/analytics", icon: BarChart3 },
    ],
  },
  {
    labelHe: "שיווק",
    items: [
      { labelKey: "nav_programs",  href: "/dashboard/programs",     icon: BookOpen },
      { labelKey: "nav_campaigns", href: "/dashboard/campaigns",    icon: Megaphone },
      { labelKey: "nav_seo",       href: "/dashboard/seo",          icon: Search },
      { labelKey: "nav_ai_import", href: "/dashboard/ai-import",    icon: Sparkles },
    ],
  },
  {
    labelHe: "תוכן",
    items: [
      { labelKey: "nav_media",            href: "/dashboard/media",           icon: ImageIcon },
      { labelKey: "nav_faculty",          href: "/dashboard/faculty",         icon: GraduationCap },
      { labelKey: "nav_templates",        href: "/dashboard/templates",       icon: LayoutTemplate },
      { labelKey: "nav_interest_areas",   href: "/dashboard/interest-areas",  icon: Tag },
      { labelKey: "nav_shared_sections",  href: "/dashboard/shared-sections", icon: Globe },
    ],
  },
  {
    labelHe: "מערכת",
    items: [
      { labelKey: "nav_settings", href: "/dashboard/settings", icon: Settings },
      { labelKey: "nav_pixels",   href: "/dashboard/pixels",   icon: Antenna },
      { labelKey: "nav_users",    href: "/dashboard/users",    icon: Users2 },
      { labelKey: "nav_audit",    href: "/dashboard/audit",    icon: ShieldCheck },
      { labelKey: "nav_help",     href: "/dashboard/help",     icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useAdminLanguage();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#1a1a2e] via-[#1a1a2e] to-[#16213e] text-white relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#B8D900]/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />

      {/* Logo Area */}
      <div className={cn(
        "flex items-center gap-3 px-5 py-5 relative",
        collapsed && "justify-center px-3"
      )}>
        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center shrink-0">
          <Image
            src="https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png"
            alt="Ono Logo"
            width={28}
            height={28}
            className="object-contain"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#B8D900] leading-tight tracking-tight">
              OnoLeads
            </h2>
            <p className="text-[10px] text-white/35 leading-tight truncate">
              {t("sidebar_tagline")}
            </p>
          </div>
        )}
        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            className="mr-auto p-1 rounded-md hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Separator */}
      <div className="mx-4 h-px bg-gradient-to-l from-transparent via-white/10 to-transparent" />

      {/* Navigation — grouped */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto scrollbar-thin space-y-1" aria-label={t("nav_title")}>
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className={gIdx > 0 ? "mt-1 pt-1" : ""}>
            {/* Group divider + label (only when expanded, only for non-first groups) */}
            {!collapsed && gIdx > 0 && (
              <div className="px-3 pb-1.5 pt-2.5">
                <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                  {group.labelHe}
                </span>
              </div>
            )}
            {/* Thin divider when collapsed (still gives visual break) */}
            {collapsed && gIdx > 0 && (
              <div className="mx-2 my-2 h-px bg-white/[0.06]" />
            )}

            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? t(item.labelKey) : undefined}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative",
                    collapsed && "justify-center px-2",
                    active
                      ? "bg-white/[0.08] text-[#B8D900]"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
                  )}
                >
                  {/* Active side indicator */}
                  {active && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full bg-[#B8D900] shadow-[0_0_8px_rgba(184,217,0,0.4)]" />
                  )}

                  <Icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0 transition-all duration-200",
                      active
                        ? "text-[#B8D900] drop-shadow-[0_0_4px_rgba(184,217,0,0.3)]"
                        : "text-white/40 group-hover:text-white/70"
                    )}
                  />
                  {!collapsed && (
                    <span className="transition-colors duration-200">{t(item.labelKey)}</span>
                  )}
                  {active && !collapsed && (
                    <div className="mr-auto w-1.5 h-1.5 rounded-full bg-[#B8D900] shadow-[0_0_6px_rgba(184,217,0,0.5)]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Area */}
      <div className="px-4 pb-4 relative">
        <div className="h-px bg-gradient-to-l from-transparent via-white/10 to-transparent mb-3" />
        {!collapsed ? (
          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
            <p className="text-[10px] text-white/25 leading-relaxed text-center">
              גרסה 1.0.0
            </p>
            <p className="text-[10px] text-white/35 leading-relaxed text-center mt-1">
              {t("sidebar_powered_by")}{" "}
              <span className="text-[#B8D900]/60 font-medium">OnoLeads</span>
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-[9px] text-white/25">v1.0</p>
          </div>
        )}
      </div>
    </div>
  );
}
