"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
  "/dashboard/media": "מדיה",
  "/dashboard/analytics": "אנליטיקס",
  "/dashboard/settings": "הגדרות",
};

export function Header({ user, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

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
  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "??";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-[#E5E5E5] shadow-sm shadow-black/[0.03]">
      {/* Right Side: Menu + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden text-[#716C70] hover:text-[#4A4648] hover:bg-[#F5F5F5]"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronLeft className="w-3.5 h-3.5 text-[#9A969A]" />
              )}
              <span
                className={
                  index === breadcrumbs.length - 1
                    ? "text-[#4A4648] font-medium"
                    : "text-[#9A969A]"
                }
              >
                {crumb.label}
              </span>
            </div>
          ))}
        </nav>
      </div>

      {/* Left Side: Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#716C70] hover:text-[#4A4648] hover:bg-[#F5F5F5]"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#B8D900] rounded-full border-2 border-white" />
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-colors cursor-pointer outline-none"
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-[#B8D900] text-[#4A4648] text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-[#716C70] hidden md:block max-w-[150px] truncate">
              {user?.email || "משתמש"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
            <DropdownMenuLabel className="text-xs text-[#9A969A]">
              {user?.email || ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              <span>פרופיל</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              <span>הגדרות</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span>התנתקות</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
