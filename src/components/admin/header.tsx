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
  LogOut,
  User,
  Settings,
  Bell,
  Search,
  Home,
} from "lucide-react";

interface HeaderProps {
  user: {
    email?: string;
    name?: string;
  } | null;
  onMenuClick: () => void;
}

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "לוח בקרה",
  "/dashboard/programs": "תוכניות לימוד",
  "/dashboard/pages": "דפי נחיתה",
  "/dashboard/builder": "בונה דפים",
  "/dashboard/leads": "לידים",
  "/dashboard/events": "אירועים",
  "/dashboard/media": "ספריית מדיה",
  "/dashboard/analytics": "אנליטיקס",
  "/dashboard/seo": "SEO",
  "/dashboard/settings": "הגדרות",
};

export function Header({ user, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];

    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const label = breadcrumbMap[currentPath];
      if (label) {
        crumbs.push({ label, href: currentPath });
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
  const displayName = user?.name || user?.email || "משתמש";

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#e5e7eb]/60">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Right Side: Menu + Breadcrumbs */}
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
                <ChevronLeft className="w-3.5 h-3.5 text-[#d1d5db]" />
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

        {/* Left Side: Search + Notifications + User */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={`relative transition-all duration-300 ${searchOpen ? "w-56" : "w-0"} overflow-hidden`}>
            <Input
              placeholder="חיפוש מהיר..."
              className="h-9 bg-[#f3f4f6] border-0 rounded-xl pr-9 text-sm"
              dir="rtl"
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

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-[#716C70] hover:text-[#2a2628] hover:bg-[#f3f4f6] rounded-xl"
          >
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[9px] font-bold text-white shadow-sm">
              3
            </span>
          </Button>

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
                <span className="text-[10px] text-[#9A969A] leading-tight">מנהל</span>
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
                <span>פרופיל</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2.5 cursor-pointer rounded-lg">
                <Settings className="w-4 h-4 text-[#716C70]" />
                <span>הגדרות</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2.5 cursor-pointer rounded-lg text-red-500 focus:text-red-500"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span>התנתקות</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
