"use client";

/**
 * Audit Log Admin Page (/dashboard/audit)
 *
 * Shows two tabs:
 *   1. Login History  — all admin_login / admin_login_failed / admin_logout events
 *   2. Action Log     — all admin_page_*, admin_settings_*, lead_*, rate_limit, bot, csrf events
 *
 * Each row includes: timestamp, action, actor, IP, resource, and metadata summary.
 * Intended for IT/security and high-privilege admins.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLogRow {
  id: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACTION_CATEGORIES: Record<string, "login" | "action" | "security" | "lead"> = {
  admin_login: "login",
  admin_login_failed: "login",
  admin_logout: "login",
  admin_page_created: "action",
  admin_page_updated: "action",
  admin_page_deleted: "action",
  admin_settings_updated: "action",
  lead_submitted: "lead",
  lead_webhook_sent: "lead",
  lead_webhook_failed: "lead",
  rate_limit_exceeded: "security",
  bot_detected: "security",
  csrf_validation_failed: "security",
};

const ACTION_LABELS: Record<string, string> = {
  admin_login: "כניסה למערכת",
  admin_login_failed: "ניסיון כניסה נכשל",
  admin_logout: "יציאה מהמערכת",
  admin_page_created: "עמוד נוצר",
  admin_page_updated: "עמוד עודכן",
  admin_page_deleted: "עמוד נמחק",
  admin_settings_updated: "הגדרות עודכנו",
  lead_submitted: "ליד הוגש",
  lead_webhook_sent: "Webhook נשלח",
  lead_webhook_failed: "Webhook נכשל",
  rate_limit_exceeded: "Rate limit חרג",
  bot_detected: "בוט זוהה",
  csrf_validation_failed: "אימות CSRF נכשל",
};

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  login: "bg-blue-100 text-blue-700",
  action: "bg-[#B8D900]/15 text-[#4A6000]",
  lead: "bg-purple-100 text-purple-700",
  security: "bg-red-100 text-red-700",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function shortUA(ua: string | null): string {
  if (!ua) return "—";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return ua.slice(0, 20) + "…";
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function LogRow({ row }: { row: AuditLogRow }) {
  const [expanded, setExpanded] = useState(false);
  const cat = ACTION_CATEGORIES[row.action] || "action";
  const label = ACTION_LABELS[row.action] || row.action;
  const badgeClass = CATEGORY_BADGE_CLASS[cat] || "bg-gray-100 text-gray-600";

  return (
    <>
      <tr
        className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] cursor-pointer transition-colors text-sm"
        onClick={() => setExpanded((x) => !x)}
      >
        <td className="py-2.5 px-4 font-mono text-[11px] text-[#9A969A] whitespace-nowrap">
          {formatDate(row.created_at)}
        </td>
        <td className="py-2.5 px-4">
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
            {label}
          </span>
        </td>
        <td className="py-2.5 px-4 text-[#2A2628] max-w-[160px] truncate">
          {row.actor_email || row.actor_id?.slice(0, 8) || "מערכת"}
        </td>
        <td className="py-2.5 px-4 font-mono text-[11px] text-[#9A969A]">{row.ip_address || "—"}</td>
        <td className="py-2.5 px-4 text-[11px] text-[#716C70]">
          {row.resource_type ? `${row.resource_type}${row.resource_id ? ` / ${row.resource_id.slice(0, 8)}…` : ""}` : "—"}
        </td>
        <td className="py-2.5 px-4 text-[11px] text-[#9A969A]">{shortUA(row.user_agent)}</td>
      </tr>
      {expanded && row.metadata && (
        <tr className="bg-[#F9F9F9] border-b border-[#F5F5F5]">
          <td colSpan={6} className="px-6 py-3">
            <pre className="text-[11px] text-[#716C70] font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type Tab = "all" | "login" | "action" | "security" | "lead";

const TAB_LABELS: Record<Tab, string> = {
  all: "הכל",
  login: "כניסות",
  action: "פעולות ניהול",
  security: "אבטחה",
  lead: "לידים",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchLogs = async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (tab !== "all") {
      const actionsInTab = Object.entries(ACTION_CATEGORIES)
        .filter(([, v]) => v === tab)
        .map(([k]) => k);
      query = query.in("action", actionsInTab);
    }

    const { data } = await query;
    setLogs((data as AuditLogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
  }, [tab, search]);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  const filtered = search.trim()
    ? logs.filter(
        (r) =>
          r.actor_email?.includes(search) ||
          r.ip_address?.includes(search) ||
          r.action.includes(search) ||
          r.resource_id?.includes(search)
      )
    : logs;

  // Stats summary
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLogins = logs.filter((r) => r.action === "admin_login" && r.created_at.startsWith(todayStr)).length;
  const todayLeads = logs.filter((r) => r.action === "lead_submitted" && r.created_at.startsWith(todayStr)).length;
  const securityEvents = logs.filter((r) => ACTION_CATEGORIES[r.action] === "security").length;

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-[#2A2628]">יומן ביקורת</h1>
        <p className="text-sm text-[#9A969A] mt-1">היסטוריית כניסות, פעולות ניהול, ואירועי אבטחה</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#9A969A] uppercase tracking-wider">כניסות היום</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-[#2A2628]">{todayLogins}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#9A969A] uppercase tracking-wider">לידים היום</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-heading font-bold text-[#2A2628]">{todayLeads}</p>
          </CardContent>
        </Card>
        <Card className={`border-[#E5E5E5] ${securityEvents > 0 ? "border-red-200 bg-red-50" : ""}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-[#9A969A] uppercase tracking-wider">אירועי אבטחה</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-heading font-bold ${securityEvents > 0 ? "text-red-600" : "text-[#2A2628]"}`}>{securityEvents}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${tab === t ? "bg-[#2A2628] text-white" : "bg-[#F3F4F6] text-[#716C70] hover:bg-[#E5E5E5]"}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
        <div className="flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי מייל, IP, פעולה..."
            dir="rtl"
            className="h-9 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="h-9">
          רענן
        </Button>
      </div>

      {/* Table */}
      <Card className="border-[#E5E5E5] overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#9A969A] text-sm">טוען...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-[#9A969A] text-sm">לא נמצאו רשומות</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA]">
                    <th className="py-3 px-4 text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">תאריך ושעה</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">פעולה</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">משתמש</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">כתובת IP</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">משאב</th>
                    <th className="py-3 px-4 text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">דפדפן</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <LogRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#9A969A]">
        <span>מציג {filtered.length} רשומות</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="h-8">
            הקודם
          </Button>
          <Button variant="outline" size="sm" disabled={filtered.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)} className="h-8">
            הבא
          </Button>
        </div>
      </div>
    </div>
  );
}
