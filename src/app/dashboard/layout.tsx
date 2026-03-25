"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/admin/header";
import { AdminLanguageProvider, useAdminLanguage } from "@/contexts/admin-language-context";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

interface UserInfo {
  email?: string;
  name?: string;
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const pathname = usePathname();
  const isBuilder = pathname?.includes("/builder");
  const { isRtl } = useAdminLanguage();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Prefer explicit display name; fall back to email prefix (before @)
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0] : undefined);
        setUser({ email: user.email, name });
      }
    });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f6]" dir={isRtl ? "rtl" : "ltr"}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0">
        <div className="w-full shadow-xl shadow-black/10">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="p-0 w-[280px] border-0 shadow-2xl"
        >
          <SheetTitle className="sr-only">תפריט ניווט / Navigation</SheetTitle>
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {isBuilder ? (
          /* Builder needs a full-height container without padding */
          <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto animate-fade-in">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLanguageProvider>
      <DashboardShell>{children}</DashboardShell>
    </AdminLanguageProvider>
  );
}
