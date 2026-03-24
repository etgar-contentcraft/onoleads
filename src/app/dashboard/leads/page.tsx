"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  CalendarDays,
  TrendingUp,
  Search,
  Download,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Globe,
  Monitor,
  Clock,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";

// Types
interface Lead {
  id: string;
  page_id: string | null;
  program_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  program_interest: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  cookie_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  language: string | null;
  device_type: string | null;
  extra_data: Record<string, unknown> | null;
  webhook_status: "pending" | "sent" | "failed";
  webhook_response: Record<string, unknown> | null;
  created_at: string;
}

interface LeadStats {
  total: number;
  today: number;
  thisWeek: number;
  conversionRate: number;
}

const WEBHOOK_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "ממתין", className: "bg-yellow-50 text-yellow-700 border-0" },
  sent: { label: "נשלח", className: "bg-green-50 text-green-700 border-0" },
  failed: { label: "נכשל", className: "bg-red-50 text-red-700 border-0" },
};

const PAGE_SIZE = 20;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats>({ total: 0, today: 0, thisWeek: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgram, setFilterProgram] = useState<string>("all");
  const [filterWebhookStatus, setFilterWebhookStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [programs, setPrograms] = useState<{ id: string; name_he: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const supabase = createClient();

  // Fetch programs for filter
  useEffect(() => {
    async function fetchPrograms() {
      const { data } = await supabase
        .from("programs")
        .select("id, name_he")
        .eq("is_active", true)
        .order("name_he");
      if (data) setPrograms(data);
    }
    fetchPrograms();
  }, []);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (searchQuery) {
      query = query.or(
        `full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      );
    }
    if (filterProgram && filterProgram !== "all") {
      query = query.eq("program_id", filterProgram);
    }
    if (filterWebhookStatus && filterWebhookStatus !== "all") {
      query = query.eq("webhook_status", filterWebhookStatus);
    }
    if (filterDateFrom) {
      query = query.gte("created_at", filterDateFrom);
    }
    if (filterDateTo) {
      query = query.lte("created_at", filterDateTo + "T23:59:59");
    }

    const { data, count, error } = await query;

    if (!error && data) {
      setLeads(data);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [page, searchQuery, filterProgram, filterWebhookStatus, filterDateFrom, filterDateTo]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();

    const [totalRes, todayRes, weekRes, sentRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("webhook_status", "sent"),
    ]);

    const total = totalRes.count ?? 0;
    const sent = sentRes.count ?? 0;

    setStats({
      total,
      today: todayRes.count ?? 0,
      thisWeek: weekRes.count ?? 0,
      conversionRate: total > 0 ? Math.round((sent / total) * 100 * 10) / 10 : 0,
    });
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Export CSV
  const handleExportCSV = async () => {
    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (searchQuery) {
      query = query.or(
        `full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
      );
    }
    if (filterProgram && filterProgram !== "all") {
      query = query.eq("program_id", filterProgram);
    }
    if (filterWebhookStatus && filterWebhookStatus !== "all") {
      query = query.eq("webhook_status", filterWebhookStatus);
    }

    const { data } = await query;
    if (!data || data.length === 0) return;

    const headers = [
      "שם מלא",
      "טלפון",
      "אימייל",
      "תוכנית",
      "מקור",
      "מדיום",
      "קמפיין",
      "סטטוס Webhook",
      "תאריך",
    ];
    const rows = data.map((lead: Lead) => [
      lead.full_name,
      lead.phone,
      lead.email ?? "",
      lead.program_interest ?? "",
      lead.utm_source ?? "",
      lead.utm_medium ?? "",
      lead.utm_campaign ?? "",
      lead.webhook_status,
      new Date(lead.created_at).toLocaleString("he-IL"),
    ]);

    const BOM = "\uFEFF";
    const csv = BOM + [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const clearFilters = () => {
    setFilterProgram("all");
    setFilterWebhookStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchQuery("");
    setPage(0);
  };

  const hasActiveFilters =
    filterProgram !== "all" ||
    filterWebhookStatus !== "all" ||
    filterDateFrom !== "" ||
    filterDateTo !== "" ||
    searchQuery !== "";

  const statsCards = [
    {
      title: "סה״כ לידים",
      value: stats.total.toLocaleString("he-IL"),
      icon: Users,
      color: "#B8D900",
      bgColor: "#F0F7CC",
    },
    {
      title: "לידים היום",
      value: stats.today.toLocaleString("he-IL"),
      icon: UserPlus,
      color: "#4A9B5F",
      bgColor: "#E8F5E9",
    },
    {
      title: "לידים השבוע",
      value: stats.thisWeek.toLocaleString("he-IL"),
      icon: CalendarDays,
      color: "#3B82F6",
      bgColor: "#EFF6FF",
    },
    {
      title: "שיעור שליחה",
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: "#F59E0B",
      bgColor: "#FFF3E0",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#4A4648]">ניהול לידים</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">
            כל הלידים שהתקבלו מדפי הנחיתה
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          className="gap-2 bg-[#4A4648] text-white hover:bg-[#3A3638]"
        >
          <Download className="w-4 h-4" />
          ייצוא CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-0 shadow-sm">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-[#9A969A] font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-[#4A4648]">{stat.value}</p>
                  </div>
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{ backgroundColor: stat.bgColor }}
                  >
                    <Icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
              <Input
                placeholder="חיפוש לפי שם, טלפון או אימייל..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="pr-10 h-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 ${showFilters ? "bg-[#F0F7CC] border-[#B8D900]" : ""}`}
            >
              <Filter className="w-4 h-4" />
              סינון
              {hasActiveFilters && (
                <span className="bg-[#B8D900] text-[#4A4648] text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  !
                </span>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-1 text-[#9A969A]">
                <X className="w-4 h-4" />
                נקה
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E5E5E5]">
              <div>
                <label className="text-xs text-[#9A969A] mb-1 block">תוכנית</label>
                <Select
                  value={filterProgram}
                  onValueChange={(val) => {
                    setFilterProgram(val as string);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="כל התוכניות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל התוכניות</SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name_he}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-[#9A969A] mb-1 block">סטטוס Webhook</label>
                <Select
                  value={filterWebhookStatus}
                  onValueChange={(val) => {
                    setFilterWebhookStatus(val as string);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="כל הסטטוסים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="pending">ממתין</SelectItem>
                    <SelectItem value="sent">נשלח</SelectItem>
                    <SelectItem value="failed">נכשל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-[#9A969A] mb-1 block">מתאריך</label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => {
                    setFilterDateFrom(e.target.value);
                    setPage(0);
                  }}
                  className="h-9"
                />
              </div>

              <div>
                <label className="text-xs text-[#9A969A] mb-1 block">עד תאריך</label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value);
                    setPage(0);
                  }}
                  className="h-9"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base text-[#4A4648]">
            {totalCount > 0 ? `${totalCount.toLocaleString("he-IL")} לידים` : "לידים"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-[#9A969A]">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">אין לידים</p>
              <p className="text-sm mt-1">עדיין לא התקבלו לידים או שהסינון אינו מחזיר תוצאות</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם מלא</TableHead>
                    <TableHead className="text-right">טלפון</TableHead>
                    <TableHead className="text-right hidden md:table-cell">אימייל</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">תוכנית</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">מקור</TableHead>
                    <TableHead className="text-right">תאריך</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const statusInfo = WEBHOOK_STATUS_LABELS[lead.webhook_status];
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-[#F5F5F5]/50"
                        onClick={() => {
                          setSelectedLead(lead);
                          setDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium text-[#4A4648]">
                          {lead.full_name}
                        </TableCell>
                        <TableCell className="text-[#716C70] font-mono text-xs" dir="ltr">
                          {lead.phone}
                        </TableCell>
                        <TableCell className="text-[#716C70] hidden md:table-cell text-xs" dir="ltr">
                          {lead.email ?? "-"}
                        </TableCell>
                        <TableCell className="text-[#716C70] hidden lg:table-cell">
                          {lead.program_interest ?? "-"}
                        </TableCell>
                        <TableCell className="text-[#716C70] hidden lg:table-cell">
                          {lead.utm_source ?? "-"}
                        </TableCell>
                        <TableCell className="text-[#9A969A] text-xs">
                          {formatDate(lead.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ChevronLeft className="w-4 h-4 text-[#9A969A]" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E5E5]">
                  <p className="text-sm text-[#9A969A]">
                    עמוד {page + 1} מתוך {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      <ChevronRight className="w-4 h-4" />
                      הקודם
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      הבא
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{selectedLead.full_name}</DialogTitle>
                <DialogDescription>
                  ליד מ-{formatDate(selectedLead.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[#4A4648]">פרטי קשר</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-[#9A969A]" />
                      <span dir="ltr" className="font-mono">{selectedLead.phone}</span>
                    </div>
                    {selectedLead.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-[#9A969A]" />
                        <span dir="ltr">{selectedLead.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Program */}
                {selectedLead.program_interest && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#4A4648]">תוכנית</h4>
                    <p className="text-sm text-[#716C70]">{selectedLead.program_interest}</p>
                  </div>
                )}

                {/* UTM Data */}
                {(selectedLead.utm_source || selectedLead.utm_medium || selectedLead.utm_campaign) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#4A4648]">נתוני UTM</h4>
                    <div className="bg-[#F5F5F5] rounded-lg p-3 space-y-1 text-xs">
                      {selectedLead.utm_source && (
                        <div className="flex justify-between">
                          <span className="text-[#9A969A]">מקור</span>
                          <span className="text-[#4A4648] font-medium">{selectedLead.utm_source}</span>
                        </div>
                      )}
                      {selectedLead.utm_medium && (
                        <div className="flex justify-between">
                          <span className="text-[#9A969A]">מדיום</span>
                          <span className="text-[#4A4648] font-medium">{selectedLead.utm_medium}</span>
                        </div>
                      )}
                      {selectedLead.utm_campaign && (
                        <div className="flex justify-between">
                          <span className="text-[#9A969A]">קמפיין</span>
                          <span className="text-[#4A4648] font-medium">{selectedLead.utm_campaign}</span>
                        </div>
                      )}
                      {selectedLead.utm_content && (
                        <div className="flex justify-between">
                          <span className="text-[#9A969A]">תוכן</span>
                          <span className="text-[#4A4648] font-medium">{selectedLead.utm_content}</span>
                        </div>
                      )}
                      {selectedLead.utm_term && (
                        <div className="flex justify-between">
                          <span className="text-[#9A969A]">מונח</span>
                          <span className="text-[#4A4648] font-medium">{selectedLead.utm_term}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Technical Info */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[#4A4648]">מידע טכני</h4>
                  <div className="bg-[#F5F5F5] rounded-lg p-3 space-y-1 text-xs">
                    {selectedLead.device_type && (
                      <div className="flex justify-between">
                        <span className="text-[#9A969A]">מכשיר</span>
                        <span className="text-[#4A4648]">{selectedLead.device_type}</span>
                      </div>
                    )}
                    {selectedLead.language && (
                      <div className="flex justify-between">
                        <span className="text-[#9A969A]">שפה</span>
                        <span className="text-[#4A4648]">{selectedLead.language}</span>
                      </div>
                    )}
                    {selectedLead.ip_address && (
                      <div className="flex justify-between">
                        <span className="text-[#9A969A]">IP</span>
                        <span className="text-[#4A4648] font-mono" dir="ltr">{selectedLead.ip_address}</span>
                      </div>
                    )}
                    {selectedLead.cookie_id && (
                      <div className="flex justify-between">
                        <span className="text-[#9A969A]">Cookie ID</span>
                        <span className="text-[#4A4648] font-mono truncate max-w-[180px]" dir="ltr">
                          {selectedLead.cookie_id}
                        </span>
                      </div>
                    )}
                    {selectedLead.referrer && (
                      <div className="flex justify-between">
                        <span className="text-[#9A969A]">Referrer</span>
                        <span className="text-[#4A4648] truncate max-w-[180px]" dir="ltr">
                          {selectedLead.referrer}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Webhook Status */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[#4A4648]">Webhook</h4>
                  <Badge className={WEBHOOK_STATUS_LABELS[selectedLead.webhook_status].className}>
                    {WEBHOOK_STATUS_LABELS[selectedLead.webhook_status].label}
                  </Badge>
                </div>

                {/* Link to full detail page */}
                <Link
                  href={`/dashboard/leads/${selectedLead.id}`}
                  className="flex items-center gap-2 text-sm text-[#B8D900] hover:text-[#9AB800] font-medium mt-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  צפה בעמוד הליד המלא
                </Link>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
