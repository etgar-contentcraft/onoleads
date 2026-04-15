"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Search,
  Home,
} from "lucide-react";
import { useAdminLanguage } from "@/contexts/admin-language-context";
import type { AdminLang } from "@/lib/i18n/admin-translations";

interface HeaderProps {
  user: {
    email?: string;
    name?: string;
  } | null;
  onMenuClick: () => void;
}

/** Maps URL path segments to breadcrumb translation keys */
const BC_KEY_MAP: Record<string, string> = {
  "/dashboard": "bc_dashboard",
  "/dashboard/programs": "bc_programs",
  "/dashboard/pages": "bc_pages",
  "/dashboard/builder": "bc_builder",
  "/dashboard/events": "bc_events",
  "/dashboard/media": "bc_media",
  "/dashboard/analytics": "bc_analytics",
  "/dashboard/seo": "bc_seo",
  "/dashboard/settings": "bc_settings",
  "/dashboard/templates": "bc_templates",
  "/dashboard/faculty": "bc_faculty",
  "/dashboard/shared-sections": "bc_shared_sections",
  "/dashboard/audit": "bc_audit",
  "/dashboard/changelog": "bc_changelog",
  "/dashboard/help": "bc_help",
  "/dashboard/users": "bc_users",
};

const LANG_LABELS: { lang: AdminLang; label: string }[] = [
  { lang: "he", label: "עב" },
  { lang: "en", label: "EN" },
  { lang: "ar", label: "عر" },
];

export function Header({ user, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const { lang, setLang, t, isRtl } = useAdminLanguage();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Use replace (not push) so the user can't navigate back to dashboard after logout.
    // Do NOT call router.refresh() after push — it can crash if the component is unmounting.
    router.replace("/login");
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];

    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const key = BC_KEY_MAP[currentPath];
      if (key) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        crumbs.push({ label: t(key as any), href: currentPath });
      }
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const userInitials = user?.name
    ? user.name.substring(0, 2).toUpperCase()
    : user?.email
      ? user.email.substring(0, 2).toUpperCase()
      : "??";
  const displayName = user?.name || user?.email || t("role_admin");

  // Chevron direction follows reading direction
  const BreadcrumbChevron = isRtl ? ChevronLeft : ChevronRight;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#e5e7eb]/60">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Leading side: Menu + Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-[#716C70] hover:text-[#2a2628] hover:bg-[#f3f4f6] rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm">
            <Home className="w-3.5 h-3.5 text-[#9A969A]" />
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-1.5">
                <BreadcrumbChevron className="w-3.5 h-3.5 text-[#d1d5db]" />
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? "text-[#2a2628] font-semibold"
                      : "text-[#9A969A] hover:text-[#716C70] cursor-pointer transition-colors"
                  }
                >
                  {crumb.label}
                </span>
              </div>
            ))}
          </nav>
        </div>

        {/* Trailing side: Language switcher + Search + Notifications + User */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="hidden sm:flex items-center gap-0.5 bg-[#f3f4f6] rounded-xl p-0.5">
            {LANG_LABELS.map(({ lang: l, label }) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  lang === l
                    ? "bg-white text-[#2a2628] shadow-sm"
                    : "text-[#9A969A] hover:text-[#4A4648]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className={`relative transition-all duration-300 ${searchOpen ? "w-56" : "w-0"} overflow-hidden`}>
            <Input
              placeholder={t("search_placeholder")}
              className="h-9 bg-[#f3f4f6] border-0 rounded-xl pr-9 text-sm"
              dir={isRtl ? "rtl" : "ltr"}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9A969A]" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            className={`text-[#716C70] hover:text-[#2a2628] hover:bg-[#f3f4f6] rounded-xl transition-colors ${
              searchOpen ? "bg-[#f3f4f6] text-[#2a2628]" : ""
            }`}
          >
            <Search className="w-[18px] h-[18px]" />
          </Button>

          {/* Notifications bell removed: previously rendered a hard-coded "3"
           * badge with no real notifications backing it. Misleading to admins.
           * Re-enable once the notifications feature is built. */}

          {/* Separator */}
          <div className="w-px h-7 bg-[#e5e7eb] mx-1 hidden md:block" />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#f3f4f6] transition-all duration-200 cursor-pointer outline-none"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-gradient-to-br from-[#B8D900] to-[#9AB800] text-[#2a2628] text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-[#2a2628] max-w-[120px] truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#9A969A] leading-tight">{t("role_admin")}</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 text-[#9A969A] rotate-[-90deg] hidden md:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-[#2a2628]">{displayName}</p>
                  <p className="text-xs text-[#9A969A]">{user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2.5 cursor-pointer rounded-lg">
                <User className="w-4 h-4 text-[#716C70]" />
                <span>{t("menu_profile")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 cursor-pointer rounded-lg">
                <Settings className="w-4 h-4 text-[#716C70]" />
                <span>{t("menu_settings")}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2.5 cursor-pointer rounded-lg text-red-500 focus:text-red-500"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span>{t("menu_logout")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
