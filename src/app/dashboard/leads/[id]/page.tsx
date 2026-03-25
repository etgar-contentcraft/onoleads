/**
 * Lead Detail page - Full view with activity timeline, notes, tags, and webhook management.
 * Features: timeline, webhook retry, notes, lead tagging, CSV export.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

/** Lead record shape */
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

/** Note record shape */
interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
}

/** Toast notification state */
interface Toast {
  message: string;
  type: "success" | "error";
}

/** Webhook status badge configuration */
const WEBHOOK_STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "ממתין", className: "bg-yellow-50 text-yellow-700 border-0" },
  sent: { label: "נשלח", className: "bg-green-50 text-green-700 border-0" },
  failed: { label: "נכשל", className: "bg-red-50 text-red-700 border-0" },
};

/** Lead temperature tags */
const LEAD_TAGS = [
  { value: "hot", label: "חם", color: "bg-red-50 text-red-600 border-red-200" },
  { value: "warm", label: "חמים", color: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "cold", label: "קר", color: "bg-blue-50 text-blue-600 border-blue-200" },
];

/** Info row component for displaying label-value pairs */
function InfoRow({ label, value, dir, mono }: { label: string; value: string | null | undefined; dir?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2.5">
      <span className="text-sm text-[#9A969A] shrink-0">{label}</span>
      <span
        className={`text-sm text-[#2a2628] text-left max-w-[60%] break-all ${mono ? "font-mono text-xs" : ""}`}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [programName, setProgramName] = useState<string | null>(null);
  const [pageName, setPageName] = useState<string | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [currentTag, setCurrentTag] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const supabase = createClient();

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Fetches the lead and related data */
  useEffect(() => {
    async function fetchLead() {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setLead(data);

      /* Fetch tag from extra_data */
      if (data.extra_data && typeof data.extra_data === "object") {
        setCurrentTag((data.extra_data as Record<string, string>).tag || null);
      }

      /* Fetch program name */
      if (data.program_id) {
        const { data: prog } = await supabase
          .from("programs")
          .select("name_he")
          .eq("id", data.program_id)
          .single();
        if (prog) setProgramName(prog.name_he);
      }

      /* Fetch page name */
      if (data.page_id) {
        const { data: pg } = await supabase
          .from("pages")
          .select("title_he")
          .eq("id", data.page_id)
          .single();
        if (pg) setPageName(pg.title_he);
      }

      /* Fetch notes */
      const { data: notesData } = await supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", params.id)
        .order("created_at", { ascending: false });

      if (notesData) setNotes(notesData);

      setLoading(false);
    }

    fetchLead();
  }, [params.id]);

  /** Adds a note to the lead */
  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);

    const { data, error } = await supabase
      .from("lead_notes")
      .insert({ lead_id: params.id, content: newNote.trim() })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
      showToast("הערה נוספה בהצלחה");
    } else {
      showToast("שגיאה בהוספת הערה", "error");
    }
    setAddingNote(false);
  }, [newNote, params.id, showToast]);

  /** Updates lead tag */
  const handleSetTag = useCallback(async (tag: string) => {
    if (!lead) return;
    const newTag = currentTag === tag ? null : tag;
    setCurrentTag(newTag);

    const extraData = { ...(lead.extra_data || {}), tag: newTag };
    await supabase
      .from("leads")
      .update({ extra_data: extraData })
      .eq("id", lead.id);

    showToast(newTag ? `ליד סומן כ-${LEAD_TAGS.find((t) => t.value === newTag)?.label}` : "תגית הוסרה");
  }, [lead, currentTag, showToast]);

  /** Retries webhook delivery */
  const handleRetryWebhook = useCallback(async () => {
    if (!lead) return;
    setRetrying(true);

    /* Reset status to pending to trigger re-send */
    const { error } = await supabase
      .from("leads")
      .update({ webhook_status: "pending" })
      .eq("id", lead.id);

    if (!error) {
      setLead((prev) => prev ? { ...prev, webhook_status: "pending" } : null);
      showToast("Webhook נשלח מחדש");
    } else {
      showToast("שגיאה בשליחה מחדש", "error");
    }
    setRetrying(false);
  }, [lead, showToast]);

  /** Exports single lead as CSV */
  const handleExportLead = useCallback(() => {
    if (!lead) return;
    const headers = ["שם מלא", "טלפון", "אימייל", "תוכנית", "מקור", "סטטוס", "תאריך"];
    const row = [
      lead.full_name,
      lead.phone,
      lead.email || "",
      lead.program_interest || "",
      lead.utm_source || "",
      lead.webhook_status,
      new Date(lead.created_at).toLocaleString("he-IL"),
    ];

    const BOM = "\uFEFF";
    const csv = BOM + [headers.join(","), row.map((c) => `"${c}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lead_${lead.full_name.replace(/\s/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("הליד יוצא בהצלחה");
  }, [lead, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-24">
        <p className="text-lg text-[#9A969A]">ליד לא נמצא</p>
        <Link href="/dashboard/leads">
          <Button variant="outline" className="mt-4 gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            חזרה ללידים
          </Button>
        </Link>
      </div>
    );
  }

  const createdDate = new Date(lead.created_at);
  const statusInfo = WEBHOOK_STATUS_MAP[lead.webhook_status];

  /* Build activity timeline */
  const timeline = [
    {
      time: createdDate,
      label: "ליד התקבל",
      detail: `מ-${lead.utm_source || "ישיר"} דרך ${lead.device_type || "לא ידוע"}`,
      color: "bg-[#B8D900]",
    },
    ...(lead.webhook_status === "sent"
      ? [{ time: createdDate, label: "Webhook נשלח בהצלחה", detail: "", color: "bg-emerald-500" }]
      : []),
    ...(lead.webhook_status === "failed"
      ? [{ time: createdDate, label: "Webhook נכשל", detail: "ניתן לנסות שנית", color: "bg-red-500" }]
      : []),
    ...notes.map((note) => ({
      time: new Date(note.created_at),
      label: "הערה נוספה",
      detail: note.content,
      color: "bg-blue-500",
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime());

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="sm" className="gap-2 text-[#9A969A] hover:text-[#2a2628]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            חזרה ללידים
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#2a2628]">{lead.full_name}</h1>
            {currentTag && (
              <Badge className={LEAD_TAGS.find((t) => t.value === currentTag)?.color || ""}>
                {LEAD_TAGS.find((t) => t.value === currentTag)?.label}
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#9A969A] mt-0.5">
            {createdDate.toLocaleDateString("he-IL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportLead} variant="outline" className="gap-2 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            ייצוא
          </Button>
          <Badge className={statusInfo.className + " text-sm px-3 py-1.5"}>
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Tags */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#9A969A] font-medium">סמן ליד:</span>
            <div className="flex gap-2">
              {LEAD_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  onClick={() => handleSetTag(tag.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    currentTag === tag.value
                      ? tag.color + " ring-2 ring-offset-1"
                      : "border-[#e5e7eb] text-[#716C70] hover:border-[#d1d5db]"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                פרטי קשר
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-[#f3f4f6]">
                <InfoRow label="שם מלא" value={lead.full_name} />
                <InfoRow label="טלפון" value={lead.phone} dir="ltr" mono />
                <InfoRow label="אימייל" value={lead.email} dir="ltr" mono />
                <InfoRow label="תוכנית (טקסט)" value={lead.program_interest} />
                <InfoRow label="תוכנית מקושרת" value={programName} />
                <InfoRow label="דף נחיתה" value={pageName} />
              </div>
            </CardContent>
          </Card>

          {/* UTM & Technical */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-[#2a2628]">פרמטרי UTM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[#f3f4f6]">
                  <InfoRow label="Source" value={lead.utm_source} dir="ltr" />
                  <InfoRow label="Medium" value={lead.utm_medium} dir="ltr" />
                  <InfoRow label="Campaign" value={lead.utm_campaign} dir="ltr" />
                  <InfoRow label="Content" value={lead.utm_content} dir="ltr" />
                  <InfoRow label="Term" value={lead.utm_term} dir="ltr" />
                  <InfoRow label="Referrer" value={lead.referrer} dir="ltr" mono />
                </div>
                {!lead.utm_source && !lead.utm_medium && !lead.utm_campaign && (
                  <p className="text-sm text-[#9A969A] text-center py-4">אין נתוני UTM</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base text-[#2a2628]">מידע טכני</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[#f3f4f6]">
                  <InfoRow label="מכשיר" value={lead.device_type} />
                  <InfoRow label="שפה" value={lead.language} dir="ltr" />
                  <InfoRow label="IP" value={lead.ip_address} dir="ltr" mono />
                  <InfoRow label="Cookie ID" value={lead.cookie_id} dir="ltr" mono />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Webhook */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-[#9A969A]">סטטוס:</span>
                <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                {(lead.webhook_status === "failed" || lead.webhook_status === "pending") && (
                  <Button
                    onClick={handleRetryWebhook}
                    disabled={retrying}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                  >
                    {retrying ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-[#B8D900] border-t-transparent" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                    )}
                    שלח שנית
                  </Button>
                )}
              </div>
              {lead.webhook_response && (
                <div>
                  <p className="text-sm text-[#9A969A] mb-2">תגובה:</p>
                  <pre
                    className="text-xs font-mono text-[#716C70] bg-[#f3f4f6] rounded-xl p-3 overflow-x-auto max-h-40"
                    dir="ltr"
                  >
                    {JSON.stringify(lead.webhook_response, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Timeline & Notes */}
        <div className="space-y-6">
          {/* Activity Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#2a2628]">ציר זמן</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 relative">
                <div className="absolute top-2 right-[11px] bottom-2 w-px bg-gradient-to-b from-[#e5e7eb] to-transparent" />
                {timeline.map((event, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <div className={`w-6 h-6 rounded-full ${event.color} flex items-center justify-center shrink-0 ring-2 ring-white z-10`}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-[#2a2628]">{event.label}</p>
                      {event.detail && (
                        <p className="text-xs text-[#9A969A] mt-0.5 break-words">{event.detail}</p>
                      )}
                      <p className="text-[10px] text-[#9A969A] mt-1">
                        {event.time.toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-[#2a2628]">הערות</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add note form */}
              <div className="space-y-2 mb-4">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="הוסף הערה..."
                  rows={2}
                  className="text-sm"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="w-full bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] text-sm"
                >
                  {addingNote ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2a2628] border-t-transparent" />
                  ) : (
                    "הוסף הערה"
                  )}
                </Button>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <p className="text-sm text-[#9A969A] text-center py-4">אין הערות עדיין</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-[#f9fafb] rounded-xl p-3">
                      <p className="text-sm text-[#2a2628]">{note.content}</p>
                      <p className="text-[10px] text-[#9A969A] mt-1.5">
                        {new Date(note.created_at).toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
