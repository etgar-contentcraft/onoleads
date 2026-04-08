"use client";

/**
 * Events dashboard — single source of truth for real-world events.
 *
 * Lists all rows from `events`. Admins can:
 *   - Create new events (open day, webinar, career fair, etc.)
 *   - Edit existing events in a single primary language
 *   - Duplicate an existing event (copies all data, clears the id, shifts date +7d)
 *   - Toggle `is_active` to temporarily hide an event
 *   - Delete events (hard delete — only do this if no landing page / TY
 *     page references it)
 *
 * An event created here can be referenced by:
 *   1. The `open_day` thank-you template (via ty_settings.event_id)
 *   2. Event-type landing pages (event-section via events.event_id)
 *
 * When referenced, every visible event field is pulled from the row here —
 * edit once, every surface updates.
 *
 * Schema note: the `events` table keeps stable fields as flat columns
 * (name_*, event_date, location, event_type, is_active). Everything else —
 * speakers, schedule, highlights, FAQ, gallery, organizer contact info,
 * custom CTA — lives inside the `meta` JSONB column. See the helpers in
 * `src/lib/types/events.ts` (`toEventRow` / `fromEventRow`).
 *
 * Form UX philosophy: every field beyond title/date is optional. The form
 * is organised into collapsible sections, and only the "Basics" block is
 * expanded on open. Editors can scroll down to reveal speakers, schedule,
 * FAQ, testimonials, gallery, and extras as they need them.
 */

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import {
  Calendar as CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  Clock,
  Mail,
  User as UserIcon,
  Copy,
  Video,
  ChevronDown,
  ChevronRight,
  Users,
  ListOrdered,
  Sparkles,
  HelpCircle,
  Quote,
  ImagePlus,
  Tag as TagIcon,
  Star,
  Info,
  Megaphone,
  Link as LinkIcon,
  X as XIcon,
} from "lucide-react";
import type {
  EventRow,
  EventInput,
  EventSpeaker,
  EventScheduleItem,
  EventHighlight,
  EventFaqItem,
  EventTestimonial,
  EventGalleryImage,
  EventBadge,
  EventLanguage,
} from "@/lib/types/events";
import { EMPTY_EVENT, toEventRow, fromEventRow } from "@/lib/types/events";

// ─── Date/time helpers ─────────────────────────────────────────────────

/** Convert an ISO timestamp string to a value accepted by <input type="datetime-local">. */
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local value to an ISO string (treats input as local time). */
function fromDatetimeLocal(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/** Convert ISO date string to value for <input type="date">. */
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Convert ISO date string to a "HH:mm" value for <input type="time">. */
function toTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Split-field date+time picker.
 *
 * Why not `<input type="datetime-local">`? Some browsers (Safari/Firefox on
 * Windows, Chromium variants) emit an `onChange("")` event when the popup
 * closes without a confirmed selection, which wipes the controlled value.
 * By splitting into two independent inputs and only updating the parent ISO
 * when we have BOTH a valid date AND time, we prevent accidental clears.
 * Empty onChange events are silently ignored.
 */
function DateTimePicker({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (iso: string) => void;
}) {
  // Local mirror so date/time can be edited independently without nuking
  // each other when one of them is temporarily invalid/empty.
  const [localDate, setLocalDate] = useState(() => toDateInput(value));
  const [localTime, setLocalTime] = useState(() => toTimeInput(value) || "10:00");

  // Sync from external changes (e.g. duplicate event shifts the date by +7d)
  useEffect(() => {
    const nextDate = toDateInput(value);
    const nextTime = toTimeInput(value);
    if (nextDate) setLocalDate(nextDate);
    if (nextTime) setLocalTime(nextTime);
  }, [value]);

  /** Combine date + time into an ISO string and propagate up. */
  const commit = (date: string, time: string) => {
    if (!date || !time) return; // need BOTH to form a valid ISO
    const iso = fromDatetimeLocal(`${date}T${time}`);
    if (iso) onChange(iso);
  };

  return (
    <div className="grid grid-cols-[1fr_110px] gap-2">
      <Input
        type="date"
        value={localDate}
        onChange={(e) => {
          const v = e.target.value;
          setLocalDate(v);
          commit(v, localTime);
        }}
        dir="ltr"
      />
      <Input
        type="time"
        value={localTime}
        onChange={(e) => {
          const v = e.target.value;
          setLocalTime(v);
          commit(localDate, v);
        }}
        dir="ltr"
      />
    </div>
  );
}

/** Format an ISO timestamp for display in the Hebrew admin list. */
function formatDisplayDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("he-IL", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ─── Main dashboard ────────────────────────────────────────────────────

export default function EventsDashboard() {
  const supabase = createClient();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form state — null = dialog closed, otherwise edit/create
  const [editing, setEditing] = useState<{ id: string | null; data: EventInput } | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error(error);
      setEvents([]);
    } else {
      setEvents((data || []) as EventRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Open the create dialog with blank defaults. */
  function handleNew() {
    // Default start time: tomorrow at 18:00 local time
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    setEditing({
      id: null,
      data: { ...EMPTY_EVENT, event_date: d.toISOString() },
    });
  }

  /** Open the edit dialog pre-filled from an existing row. */
  function handleEdit(row: EventRow) {
    setEditing({ id: row.id, data: fromEventRow(row) });
  }

  /**
   * Duplicate — clone an existing event into a brand-new form.
   * Shifts the start date +7 days, copies EVERY field, and clears the id
   * so save-insert creates a separate row.
   */
  function handleDuplicate(row: EventRow) {
    const base = fromEventRow(row);
    // Shift start + end by 7 days so the clone doesn't collide on the list
    const shift = (iso: string) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      d.setDate(d.getDate() + 7);
      return d.toISOString();
    };
    setEditing({
      id: null,
      data: {
        ...base,
        name: base.name ? `${base.name} (עותק)` : "",
        event_date: shift(base.event_date),
        event_end_date: shift(base.event_end_date),
      },
    });
  }

  /** Save (insert or update) the current form to Supabase. */
  async function handleSave() {
    if (!editing) return;
    setSaving(true);

    const payload = toEventRow(editing.data);

    if (editing.id) {
      const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
      if (error) alert("שגיאה בשמירה: " + error.message);
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) alert("שגיאה ביצירה: " + error.message);
    }

    setSaving(false);
    setEditing(null);
    await loadEvents();
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "למחוק את האירוע? כל העמודים שמשויכים לאירוע הזה יחזרו לברירת המחדל של התבנית.",
      )
    )
      return;
    setBusyId(id);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) alert("שגיאה במחיקה: " + error.message);
    await loadEvents();
    setBusyId(null);
  }

  async function handleToggleActive(row: EventRow) {
    setBusyId(row.id);
    const { error } = await supabase
      .from("events")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) alert("שגיאה: " + error.message);
    await loadEvents();
    setBusyId(null);
  }

  /** Copy event id to clipboard so admins can paste it into page settings. */
  async function handleCopyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      alert(`מזהה האירוע הועתק: ${id}`);
    } catch {
      alert("לא ניתן להעתיק אוטומטית. המזהה: " + id);
    }
  }

  // Split events into upcoming vs past for at-a-glance triage
  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: EventRow[] = [];
    const pa: EventRow[] = [];
    for (const ev of events) {
      if (ev.event_date && new Date(ev.event_date).getTime() >= now) up.push(ev);
      else pa.push(ev);
    }
    return { upcoming: up, past: pa };
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">אירועים</h1>
          <p className="text-gray-600 mt-1">
            מקור אחד לפרטי אירוע — ניתן לקשר אירוע לעמוד תודה ולמקטע אירוע בעמוד נחיתה, וכל
            הפרטים יישאבו אוטומטית (תאריך, מיקום, ספירה לאחור, קובץ יומן, דוברים, לו&quot;ז,
            שאלות נפוצות ועוד).
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> אירוע חדש
        </Button>
      </div>

      {events.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
          <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">
            עדיין אין אירועים. לחצו על &quot;אירוע חדש&quot; כדי ליצור את הראשון.
          </p>
        </div>
      )}

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            אירועים עתידיים ({upcoming.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcoming.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                busy={busyId === ev.id}
                onEdit={() => handleEdit(ev)}
                onDuplicate={() => handleDuplicate(ev)}
                onDelete={() => handleDelete(ev.id)}
                onToggle={() => handleToggleActive(ev)}
                onCopyId={() => handleCopyId(ev.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past events */}
      {past.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            אירועי עבר ({past.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {past.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                busy={busyId === ev.id}
                onEdit={() => handleEdit(ev)}
                onDuplicate={() => handleDuplicate(ev)}
                onDelete={() => handleDelete(ev.id)}
                onToggle={() => handleToggleActive(ev)}
                onCopyId={() => handleCopyId(ev.id)}
                isPast
              />
            ))}
          </div>
        </section>
      )}

      {/* Create/Edit dialog — full screen so rich editors have breathing room */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent
          className="max-w-[98vw] sm:max-w-[98vw] w-[98vw] h-[96vh] max-h-[96vh] p-0 flex flex-col overflow-hidden"
          dir="rtl"
        >
          <DialogHeader className="px-6 py-4 border-b border-[#F0F0F0] shrink-0">
            <DialogTitle className="text-base font-bold text-[#2A2628]">
              {editing?.id ? "עריכת אירוע" : "אירוע חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {editing && (
              <div className="max-w-5xl mx-auto">
                <EventEditorForm
                  value={editing.data}
                  onChange={(data) => setEditing({ ...editing, data })}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 px-6 py-4 border-t border-[#F0F0F0] shrink-0">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !editing?.data.name || !editing?.data.event_date}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing?.id ? "שמור שינויים" : "צור אירוע"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Event card ────────────────────────────────────────────────────────

/**
 * Event card — compact display in the list view.
 * Shows the key facts (title, date, location) and exposes CRUD actions
 * including duplicate.
 */
function EventCard({
  event,
  busy,
  isPast,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  onCopyId,
}: {
  event: EventRow;
  busy: boolean;
  isPast?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onCopyId: () => void;
}) {
  const primaryLang: EventLanguage = event.meta?.primary_language
    || (event.name_en ? "en" : event.name_ar ? "ar" : "he");
  const displayName =
    primaryLang === "en"
      ? event.name_en || event.name_he
      : primaryLang === "ar"
        ? event.name_ar || event.name_he
        : event.name_he;

  return (
    <div
      className={`relative rounded-2xl border-2 bg-white overflow-hidden transition-all ${
        event.is_active ? "border-gray-200 hover:border-gray-300" : "border-gray-200 opacity-60"
      } ${isPast ? "bg-gray-50" : ""}`}
    >
      {/* Hero image */}
      {event.meta?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.meta.image_url}
          alt={displayName || ""}
          className="w-full h-32 object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      ) : (
        <div
          className={`w-full h-20 ${
            event.meta?.is_online
              ? "bg-gradient-to-br from-blue-50 to-blue-100"
              : "bg-gradient-to-br from-[#FF6B35]/5 to-[#FF6B35]/10"
          }`}
        />
      )}

      <div className="p-5">
        {!event.is_active && (
          <div className="absolute top-2 right-2 bg-gray-600 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md">
            מושבת
          </div>
        )}
        {isPast && event.is_active && (
          <div className="absolute top-2 right-2 bg-gray-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md">
            עבר
          </div>
        )}

        <div className="flex items-start gap-3 mb-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              event.meta?.is_online ? "bg-blue-50" : "bg-[#FF6B35]/10"
            }`}
          >
            {event.meta?.is_online ? (
              <Video className="w-5 h-5 text-blue-600" />
            ) : (
              <CalendarIcon className="w-5 h-5 text-[#FF6B35]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-gray-900 leading-tight line-clamp-2">
              {displayName || "אירוע ללא שם"}
            </h3>
            <p className="text-xs text-gray-500 mt-1 line-clamp-1 flex items-center gap-1.5">
              <span>
                {event.event_type === "open_day"
                  ? "יום פתוח"
                  : event.event_type === "webinar"
                    ? "וובינר"
                    : event.event_type === "conference"
                      ? "כנס"
                      : event.event_type === "workshop"
                        ? "סדנה"
                        : event.event_type}
              </span>
              {event.meta?.is_online && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  אונליין
                </span>
              )}
              {primaryLang !== "he" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold uppercase">
                  {primaryLang}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs text-gray-600 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{formatDisplayDate(event.event_date)}</span>
          </div>
          {event.meta?.is_online ? (
            event.meta?.online_url && (
              <div className="flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                <span className="truncate" dir="ltr">
                  {event.meta.online_platform || event.meta.online_url}
                </span>
              </div>
            )
          ) : (
            event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                <span className="truncate">{event.location}</span>
              </div>
            )
          )}
          {event.meta?.organizer_name && (
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate">{event.meta.organizer_name}</span>
            </div>
          )}
          {event.meta?.organizer_email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
              <span className="truncate" dir="ltr">
                {event.meta.organizer_email}
              </span>
            </div>
          )}

          {/* Rich content summary */}
          {(event.meta?.speakers?.length ||
            event.meta?.schedule?.length ||
            event.meta?.faq?.length ||
            event.meta?.capacity) && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {!!event.meta?.speakers?.length && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
                  <Users className="w-2.5 h-2.5" /> {event.meta.speakers.length} דוברים
                </span>
              )}
              {!!event.meta?.schedule?.length && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                  <ListOrdered className="w-2.5 h-2.5" /> {event.meta.schedule.length} סדר יום
                </span>
              )}
              {!!event.meta?.faq?.length && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                  <HelpCircle className="w-2.5 h-2.5" /> {event.meta.faq.length} שאלות נפוצות
                </span>
              )}
              {!!event.meta?.capacity && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                  <Star className="w-2.5 h-2.5" /> {event.meta.registered_count || 0}/
                  {event.meta.capacity}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onEdit}
            disabled={busy}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
          >
            <Pencil className="w-3.5 h-3.5" /> ערוך
          </button>
          <button
            onClick={onDuplicate}
            disabled={busy}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            title="שכפל את האירוע עם כל המידע"
          >
            <Copy className="w-3.5 h-3.5" /> שכפל
          </button>
          <button
            onClick={onCopyId}
            disabled={busy}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            title="העתק את מזהה האירוע כדי להדביק בהגדרות העמוד"
          >
            <LinkIcon className="w-3.5 h-3.5" /> העתק ID
          </button>
          <button
            onClick={onToggle}
            disabled={busy}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
          >
            {event.is_active ? "השבת" : "הפעל"}
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> מחק
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible section wrapper ───────────────────────────────────────

/**
 * Collapsible fieldset — click the header to expand/collapse. Used to keep
 * the form compact when the editor only cares about a subset of fields.
 */
function Section({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
  count,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-right"
      >
        <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            {typeof count === "number" && count > 0 && (
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#FF6B35] text-white">
                {count}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{subtitle}</p>}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3 border-t">{children}</div>}
    </div>
  );
}

// ─── The actual editor form ───────────────────────────────────────────

/**
 * Full editor for a single event. Broken into collapsible sections so the
 * form isn't overwhelming. Controlled component — receives value + onChange.
 */
function EventEditorForm({
  value,
  onChange,
}: {
  value: EventInput;
  onChange: (value: EventInput) => void;
}) {
  // Shortcut helper that patches a subset of fields
  const update = (patch: Partial<EventInput>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 py-2">
      {/* ─── Basics (always expanded) ─────────────────────────────── */}
      <Section
        title="פרטי יסוד"
        subtitle="שם, תאריך, תמונה, מיקום — הכרחי למעבר לשלבים הבאים"
        icon={<Info className="w-4 h-4 text-[#FF6B35]" />}
        defaultOpen
      >
        {/* Language + type + active toggle */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-semibold">שפת האירוע</Label>
            <select
              value={value.primary_language}
              onChange={(e) => update({ primary_language: e.target.value as EventLanguage })}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
            >
              <option value="he">עברית</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold">סוג אירוע</Label>
            <select
              value={value.event_type}
              onChange={(e) => update({ event_type: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
            >
              <option value="open_day">יום פתוח</option>
              <option value="webinar">וובינר</option>
              <option value="conference">כנס</option>
              <option value="workshop">סדנה</option>
              <option value="other">אחר</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pb-1 self-end">
            <Switch
              checked={value.is_active}
              onCheckedChange={(checked) => update({ is_active: checked })}
            />
            <Label className="text-xs">פעיל</Label>
          </div>
        </div>

        {/* Title (single language) */}
        <div>
          <Label className="text-xs">
            שם האירוע *
            <span className="text-gray-400 font-normal me-1">
              ({value.primary_language === "he"
                ? "עברית"
                : value.primary_language === "en"
                  ? "English"
                  : "العربية"})
            </span>
          </Label>
          <Input
            value={value.name}
            dir={value.primary_language === "en" ? "ltr" : "rtl"}
            onChange={(e) => update({ name: e.target.value })}
            placeholder={
              value.primary_language === "he"
                ? "יום פתוח — הקריה האקדמית אונו"
                : value.primary_language === "en"
                  ? "Open Day — Ono Academic College"
                  : "يوم مفتوح — كلية أونو الأكاديمية"
            }
            required
          />
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs">תיאור קצר</Label>
          <Textarea
            rows={3}
            value={value.description}
            dir={value.primary_language === "en" ? "ltr" : "rtl"}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="תיאור האירוע — מה חשוב למשתתפים לדעת"
          />
        </div>

        {/* Date + end date — split date+time picker avoids the browser's
            "wipe on blur" behaviour that single datetime-local inputs suffer from. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">מועד התחלה *</Label>
            <DateTimePicker
              value={value.event_date}
              onChange={(iso) => update({ event_date: iso })}
            />
            <p className="text-[10px] text-[#9A969A] mt-1">בחרו תאריך בלוח השנה ושעה בנפרד — שני הערכים נשמרים עצמאית</p>
          </div>
          <div>
            <Label className="text-xs">מועד סיום (ברירת מחדל +2 שעות)</Label>
            <DateTimePicker
              value={value.event_end_date}
              onChange={(iso) => update({ event_end_date: iso })}
            />
          </div>
        </div>

        {/* Event image */}
        <div>
          <Label className="text-xs">תמונת כיסוי</Label>
          <ImageUploadField
            value={value.image_url}
            onChange={(url) => update({ image_url: url })}
            recommendedSize="1600×900"
            hint="תמונה ראשית שתוצג בכל המקומות"
            previewAspect="aspect-video"
          />
        </div>

        {/* Physical vs online toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => update({ is_online: false })}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
              !value.is_online
                ? "border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <MapPin className="w-4 h-4" /> אירוע פיזי
          </button>
          <button
            type="button"
            onClick={() => update({ is_online: true })}
            className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
              value.is_online
                ? "border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <Video className="w-4 h-4" /> אירוע אונליין
          </button>
        </div>

        {value.is_online ? (
          <>
            <div>
              <Label className="text-xs">קישור להצטרפות (Zoom / Teams / YouTube / Meet)</Label>
              <Input
                dir="ltr"
                value={value.online_url}
                onChange={(e) => update({ online_url: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
            <div>
              <Label className="text-xs">פלטפורמה</Label>
              <Input
                value={value.online_platform}
                onChange={(e) => update({ online_platform: e.target.value })}
                placeholder="Zoom / Teams / YouTube Live / Google Meet"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-xs">כתובת פיזית</Label>
              <Input
                value={value.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder='קמפוס קריית אונו, צה"ל 104, קריית אונו'
              />
            </div>
            <div>
              <Label className="text-xs">קישור להוראות הגעה / מפה (לא יופיע כטקסט גולמי)</Label>
              <Input
                dir="ltr"
                value={value.location_url}
                onChange={(e) => update({ location_url: e.target.value })}
                placeholder="https://maps.google.com/?q=..."
              />
              <p className="text-[10px] text-gray-400 mt-1">
                קישור זה ייפתח בלחיצה על &quot;הוראות הגעה&quot; בעמודים וביומן — המשתמש לא יראה
                את הכתובת הארוכה.
              </p>
            </div>
            <div>
              <Label className="text-xs">חניה / נגישות</Label>
              <Textarea
                rows={2}
                value={value.parking_info}
                onChange={(e) => update({ parking_info: e.target.value })}
                placeholder="חניון ציבורי צמוד לקמפוס, כניסה נגישה לנכים"
              />
            </div>
          </>
        )}
      </Section>

      {/* ─── Speakers ─────────────────────────────────────────────── */}
      <Section
        title="דוברים / מרצים"
        subtitle="דוברים, מרצים, אורחים — יופיעו בקרוסלה מלאה בעמוד האירוע ובעמוד התודה"
        icon={<Users className="w-4 h-4 text-purple-600" />}
        count={value.speakers.length}
      >
        <RepeaterList<EventSpeaker>
          items={value.speakers}
          onChange={(speakers) => update({ speakers })}
          empty={{ name: "", role: "", bio: "", image_url: "", link_url: "" }}
          addLabel="הוסף דובר"
          renderItem={(item, idx, updateItem) => (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateItem({ ...item, name: e.target.value })}
                  placeholder="שם מלא — ד״ר רונית לוי"
                />
                <Input
                  value={item.role || ""}
                  onChange={(e) => updateItem({ ...item, role: e.target.value })}
                  placeholder="תפקיד — ראשת החוג"
                />
              </div>
              <Textarea
                rows={2}
                value={item.bio || ""}
                onChange={(e) => updateItem({ ...item, bio: e.target.value })}
                placeholder="ביוגרפיה קצרה (2-3 משפטים)"
              />
              <ImageUploadField
                value={item.image_url || ""}
                onChange={(url) => updateItem({ ...item, image_url: url })}
                recommendedSize="400×400"
                hint="תמונה ריבועית"
                previewAspect="aspect-square"
              />
              <Input
                dir="ltr"
                value={item.link_url || ""}
                onChange={(e) => updateItem({ ...item, link_url: e.target.value })}
                placeholder="https://www.linkedin.com/in/..."
              />
            </div>
          )}
        />
      </Section>

      {/* ─── Schedule ─────────────────────────────────────────────── */}
      <Section
        title="לוח זמנים / סדר יום"
        subtitle="טיימליין עם שעה, כותרת ואייקון — יוצג כלוח זמנים מעוצב בעמוד"
        icon={<ListOrdered className="w-4 h-4 text-amber-600" />}
        count={value.schedule.length}
      >
        <RepeaterList<EventScheduleItem>
          items={value.schedule}
          onChange={(schedule) => update({ schedule })}
          empty={{ time: "", title: "", description: "", icon: "talk" }}
          addLabel="הוסף סעיף ללוח הזמנים"
          renderItem={(item, idx, updateItem) => (
            <div className="space-y-3">
              {/* Labeled grid so each field is self-explanatory */}
              <div className="grid grid-cols-1 sm:grid-cols-[110px_1fr_160px] gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-[#716C70]">⏰ שעה</Label>
                  <Input
                    type="time"
                    value={item.time}
                    onChange={(e) => updateItem({ ...item, time: e.target.value })}
                    placeholder="18:00"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-[#716C70]">📌 כותרת הפעילות</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => updateItem({ ...item, title: e.target.value })}
                    placeholder="קבלה ורישום"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-semibold text-[#716C70]">🏷 סוג</Label>
                  <select
                    value={item.icon || "talk"}
                    onChange={(e) => updateItem({ ...item, icon: e.target.value })}
                    className="h-10 w-full px-3 rounded-md border border-gray-200 bg-white text-sm"
                  >
                    <option value="checkin">📝 רישום</option>
                    <option value="talk">🎤 הרצאה</option>
                    <option value="workshop">🛠 סדנה</option>
                    <option value="tour">🚶 סיור</option>
                    <option value="break">☕ הפסקה</option>
                    <option value="meal">🍽 ארוחה</option>
                    <option value="network">🤝 נטוורקינג</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-[#716C70]">📝 תיאור קצר (אופציונלי)</Label>
                <Input
                  value={item.description || ""}
                  onChange={(e) => updateItem({ ...item, description: e.target.value })}
                  placeholder="הסבר קצר על מה שיקרה בזמן הזה"
                />
              </div>
            </div>
          )}
        />
      </Section>

      {/* ─── Highlights ───────────────────────────────────────────── */}
      <Section
        title="מה מחכה לכם"
        subtitle="קלפי &quot;מה תקבלו&quot; — יוצגו כגריד צבעוני"
        icon={<Sparkles className="w-4 h-4 text-pink-600" />}
        count={value.highlights.length}
      >
        <RepeaterList<EventHighlight>
          items={value.highlights}
          onChange={(highlights) => update({ highlights })}
          empty={{ icon: "sparkles", title: "", description: "" }}
          addLabel="הוסף קלף הייליט"
          renderItem={(item, idx, updateItem) => (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                <select
                  value={item.icon || "sparkles"}
                  onChange={(e) => updateItem({ ...item, icon: e.target.value })}
                  className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                >
                  <option value="sparkles">✨ ניצוצות</option>
                  <option value="gift">🎁 מתנה</option>
                  <option value="users">👥 אנשים</option>
                  <option value="map">🗺 מפה</option>
                  <option value="star">⭐ כוכב</option>
                  <option value="award">🏆 פרס</option>
                  <option value="clock">⏰ שעון</option>
                  <option value="heart">❤️ לב</option>
                </select>
                <Input
                  value={item.title}
                  onChange={(e) => updateItem({ ...item, title: e.target.value })}
                  placeholder="כותרת — למשל: סיור בקמפוס"
                />
              </div>
              <Input
                value={item.description || ""}
                onChange={(e) => updateItem({ ...item, description: e.target.value })}
                placeholder="תיאור קצר (אופציונלי)"
              />
            </div>
          )}
        />
      </Section>

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <Section
        title="שאלות נפוצות"
        subtitle="שאלות ותשובות — יופיעו כאקורדיון"
        icon={<HelpCircle className="w-4 h-4 text-emerald-600" />}
        count={value.faq.length}
      >
        <RepeaterList<EventFaqItem>
          items={value.faq}
          onChange={(faq) => update({ faq })}
          empty={{ question: "", answer: "" }}
          addLabel="הוסף שאלה"
          renderItem={(item, idx, updateItem) => (
            <div className="space-y-2">
              <Input
                value={item.question}
                onChange={(e) => updateItem({ ...item, question: e.target.value })}
                placeholder="השאלה — למשל: האם יש חניה?"
              />
              <Textarea
                rows={2}
                value={item.answer}
                onChange={(e) => updateItem({ ...item, answer: e.target.value })}
                placeholder="התשובה"
              />
            </div>
          )}
        />
      </Section>

      {/* ─── Testimonials ─────────────────────────────────────────── */}
      <Section
        title="ציטוטים / חוות דעת"
        subtitle="עדויות ממשתתפים קודמים — יופיעו כקלפים עם תמונה וציטוט"
        icon={<Quote className="w-4 h-4 text-cyan-600" />}
        count={value.testimonials.length}
      >
        <RepeaterList<EventTestimonial>
          items={value.testimonials}
          onChange={(testimonials) => update({ testimonials })}
          empty={{ name: "", role: "", quote: "", image_url: "" }}
          addLabel="הוסף עדות"
          renderItem={(item, idx, updateItem) => (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateItem({ ...item, name: e.target.value })}
                  placeholder="שם — דניאל כהן"
                />
                <Input
                  value={item.role || ""}
                  onChange={(e) => updateItem({ ...item, role: e.target.value })}
                  placeholder="סטודנט / בוגר"
                />
              </div>
              <Textarea
                rows={3}
                value={item.quote}
                onChange={(e) => updateItem({ ...item, quote: e.target.value })}
                placeholder="הציטוט — מה הוא או היא אמרו על האירוע"
              />
              <ImageUploadField
                value={item.image_url || ""}
                onChange={(url) => updateItem({ ...item, image_url: url })}
                recommendedSize="400×400"
                hint="תמונה ריבועית"
                previewAspect="aspect-square"
              />
            </div>
          )}
        />
      </Section>

      {/* ─── Gallery ─────────────────────────────────────────────── */}
      <Section
        title="גלריית תמונות"
        subtitle="תמונות מאירועים קודמים — יופיעו כגריד גלריה"
        icon={<ImagePlus className="w-4 h-4 text-indigo-600" />}
        count={value.gallery.length}
      >
        <RepeaterList<EventGalleryImage>
          items={value.gallery}
          onChange={(gallery) => update({ gallery })}
          empty={{ url: "", caption: "" }}
          addLabel="הוסף תמונה"
          renderItem={(item, idx, updateItem) => (
            <div className="space-y-2">
              <ImageUploadField
                value={item.url}
                onChange={(url) => updateItem({ ...item, url })}
                recommendedSize="1200×800"
                hint="תמונת גלריה"
                previewAspect="aspect-[3/2]"
              />
              <Input
                value={item.caption || ""}
                onChange={(e) => updateItem({ ...item, caption: e.target.value })}
                placeholder="כיתוב (אופציונלי)"
              />
            </div>
          )}
        />
      </Section>

      {/* ─── Featured programs / partners ────────────────────────── */}
      <Section
        title="תוכניות / שותפים מובילים"
        subtitle="תוכניות לימוד או שותפים שמוצגים בתגיות / לוגואים"
        icon={<Megaphone className="w-4 h-4 text-orange-600" />}
        count={value.featured_programs.length}
      >
        <RepeaterList<EventBadge>
          items={value.featured_programs}
          onChange={(featured_programs) => update({ featured_programs })}
          empty={{ label: "", logo_url: "", link_url: "" }}
          addLabel="הוסף תוכנית / שותף"
          renderItem={(item, idx, updateItem) => (
            <div className="space-y-2">
              <Input
                value={item.label}
                onChange={(e) => updateItem({ ...item, label: e.target.value })}
                placeholder="שם — משפטים B.A."
              />
              <ImageUploadField
                value={item.logo_url || ""}
                onChange={(url) => updateItem({ ...item, logo_url: url })}
                recommendedSize="240×120"
                hint="לוגו (אופציונלי)"
                previewAspect="aspect-[3/2]"
              />
              <Input
                dir="ltr"
                value={item.link_url || ""}
                onChange={(e) => updateItem({ ...item, link_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}
        />
      </Section>

      {/* ─── Tags ─────────────────────────────────────────────────── */}
      <Section
        title="תגיות / נושאים"
        subtitle='מילות מפתח / תחומים — יוצגו כ"גלולות" קטנות'
        icon={<TagIcon className="w-4 h-4 text-sky-600" />}
        count={value.tags.length}
      >
        <TagEditor tags={value.tags} onChange={(tags) => update({ tags })} />
      </Section>

      {/* ─── Organizer ───────────────────────────────────────────── */}
      <Section
        title="פרטי מארגן"
        subtitle="שם, אימייל, טלפון ואתר — ייכנסו לזימון ליומן כ-ORGANIZER"
        icon={<UserIcon className="w-4 h-4 text-gray-600" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">שם המארגן</Label>
            <Input
              value={value.organizer_name}
              onChange={(e) => update({ organizer_name: e.target.value })}
              placeholder="הקריה האקדמית אונו"
            />
          </div>
          <div>
            <Label className="text-xs">אימייל</Label>
            <Input
              type="email"
              dir="ltr"
              value={value.organizer_email}
              onChange={(e) => update({ organizer_email: e.target.value })}
              placeholder="info@ono.ac.il"
            />
          </div>
          <div>
            <Label className="text-xs">טלפון</Label>
            <Input
              dir="ltr"
              value={value.organizer_phone}
              onChange={(e) => update({ organizer_phone: e.target.value })}
              placeholder="+972-3-123-4567"
            />
          </div>
          <div>
            <Label className="text-xs">אתר אינטרנט</Label>
            <Input
              dir="ltr"
              value={value.organizer_website}
              onChange={(e) => update({ organizer_website: e.target.value })}
              placeholder="https://www.ono.ac.il"
            />
          </div>
        </div>
      </Section>

      {/* ─── Registration ────────────────────────────────────────── */}
      <Section
        title="הרשמה"
        subtitle="קישור הרשמה חיצוני, דדליין, קיבולת וספירה נוכחית"
        icon={<CalendarIcon className="w-4 h-4 text-[#FF6B35]" />}
      >
        <div>
          <Label className="text-xs">קישור הרשמה חיצוני</Label>
          <Input
            dir="ltr"
            value={value.registration_url}
            onChange={(e) => update({ registration_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">דדליין להרשמה</Label>
            <Input
              type="date"
              value={toDateInput(value.registration_deadline)}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) update({ registration_deadline: "" });
                else {
                  const d = new Date(v);
                  update({ registration_deadline: d.toISOString() });
                }
              }}
            />
          </div>
          <div>
            <Label className="text-xs">קיבולת מקסימלית</Label>
            <Input
              type="number"
              value={value.capacity}
              onChange={(e) => update({ capacity: e.target.value })}
              placeholder="200"
            />
          </div>
          <div>
            <Label className="text-xs">רשומים עד כה</Label>
            <Input
              type="number"
              value={value.registered_count}
              onChange={(e) => update({ registered_count: e.target.value })}
              placeholder="47"
            />
          </div>
        </div>
      </Section>

      {/* ─── Extras (calendar invite + details) ──────────────────── */}
      <Section
        title="פרטים נוספים (מופיעים בזימון ליומן)"
        subtitle="סדר יום חופשי, מה להביא, קהל יעד, קוד לבוש, מחיר ועוד — הכל אופציונלי"
        icon={<Info className="w-4 h-4 text-gray-600" />}
      >
        <div>
          <Label className="text-xs">סדר יום (טקסט חופשי)</Label>
          <Textarea
            rows={3}
            value={value.agenda}
            onChange={(e) => update({ agenda: e.target.value })}
            placeholder={"18:00 – קבלה ורישום\n18:15 – הרצאה מרכזית\n19:00 – סיור בקמפוס"}
          />
        </div>
        <div>
          <Label className="text-xs">מה להביא</Label>
          <Textarea
            rows={2}
            value={value.what_to_bring}
            onChange={(e) => update({ what_to_bring: e.target.value })}
            placeholder="תעודת זהות, כוס מים, שאלות שהכנתם מראש"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">קהל יעד</Label>
            <Input
              value={value.audience}
              onChange={(e) => update({ audience: e.target.value })}
              placeholder="מועמדים ללימודים והוריהם"
            />
          </div>
          <div>
            <Label className="text-xs">שפת הדוברים</Label>
            <Input
              value={value.event_language}
              onChange={(e) => update({ event_language: e.target.value })}
              placeholder="עברית"
            />
          </div>
          <div>
            <Label className="text-xs">קוד לבוש</Label>
            <Input
              value={value.dress_code}
              onChange={(e) => update({ dress_code: e.target.value })}
              placeholder='קז"ואל חכם'
            />
          </div>
          <div>
            <Label className="text-xs">מחיר / עלות</Label>
            <Input
              value={value.price_info}
              onChange={(e) => update({ price_info: e.target.value })}
              placeholder="כניסה חופשית"
            />
          </div>
          <div>
            <Label className="text-xs">כיבוד</Label>
            <Input
              value={value.refreshments}
              onChange={(e) => update({ refreshments: e.target.value })}
              placeholder="קפה, תה, עוגיות"
            />
          </div>
          <div>
            <Label className="text-xs">האשטאג</Label>
            <Input
              dir="ltr"
              value={value.hashtag}
              onChange={(e) => update({ hashtag: e.target.value })}
              placeholder="#OnoOpenDay2026"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">תעודת השתתפות</Label>
          <Textarea
            rows={2}
            value={value.certificate_info}
            onChange={(e) => update({ certificate_info: e.target.value })}
            placeholder="תעודת השתתפות תישלח באימייל תוך שבוע"
          />
        </div>
        <div>
          <Label className="text-xs">אזור זמן</Label>
          <Input
            dir="ltr"
            value={value.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
            placeholder="Asia/Jerusalem"
          />
        </div>
      </Section>

      {/* ─── Media: video + hybrid links ─────────────────────────── */}
      <Section
        title="מדיה וסטרימינג"
        subtitle="סרטון הקדמה, לינק לסטרימינג בשידור חי, הקלטה לאחר האירוע"
        icon={<Video className="w-4 h-4 text-rose-600" />}
      >
        <div>
          <Label className="text-xs">סרטון הקדמה (YouTube / Vimeo / MP4)</Label>
          <Input
            dir="ltr"
            value={value.intro_video_url}
            onChange={(e) => update({ intro_video_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
        <div>
          <Label className="text-xs">קישור שידור חי (בנוסף לאירוע הפיזי)</Label>
          <Input
            dir="ltr"
            value={value.livestream_url}
            onChange={(e) => update({ livestream_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label className="text-xs">קישור להקלטה (לאחר האירוע)</Label>
          <Input
            dir="ltr"
            value={value.recording_url}
            onChange={(e) => update({ recording_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </Section>

      {/* ─── Custom CTA ─────────────────────────────────────────── */}
      <Section
        title="כפתור קריאה לפעולה (CTA)"
        subtitle="כפתור מותאם אישית שיופיע בעמוד"
        icon={<Star className="w-4 h-4 text-yellow-600" />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">טקסט הכפתור</Label>
            <Input
              value={value.cta_label}
              onChange={(e) => update({ cta_label: e.target.value })}
              placeholder="הרשמו עכשיו"
            />
          </div>
          <div>
            <Label className="text-xs">יעד הכפתור (URL)</Label>
            <Input
              dir="ltr"
              value={value.cta_url}
              onChange={(e) => update({ cta_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Generic repeater-list editor ─────────────────────────────────────

/**
 * Generic list editor — renders each item with the provided render function,
 * plus add/remove/reorder controls. Keeps the form clean even for complex
 * array-of-object fields like speakers and schedule rows.
 */
function RepeaterList<T>({
  items,
  onChange,
  renderItem,
  empty,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, idx: number, update: (item: T) => void) => React.ReactNode;
  empty: T;
  addLabel: string;
}) {
  function updateAt(idx: number, item: T) {
    const next = items.slice();
    next[idx] = item;
    onChange(next);
  }
  function removeAt(idx: number) {
    const next = items.slice();
    next.splice(idx, 1);
    onChange(next);
  }
  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = items.slice();
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }
  function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    const next = items.slice();
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }
  function add() {
    onChange([...items, { ...empty }]);
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-[11px] text-gray-400 text-center py-2">עדיין לא נוספו פריטים</p>
      )}
      {items.map((item, idx) => (
        <div
          key={idx}
          className="relative rounded-md border border-gray-200 bg-gray-50 p-3 pt-2"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">#{idx + 1}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                title="הזז למעלה"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === items.length - 1}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                title="הזז למטה"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="w-6 h-6 flex items-center justify-center rounded text-red-500 hover:bg-red-100"
                title="מחק"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {renderItem(item, idx, (updated) => updateAt(idx, updated))}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md border border-dashed border-gray-300 text-gray-600 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> {addLabel}
      </button>
    </div>
  );
}

// ─── Tag editor ────────────────────────────────────────────────────────

/** Simple pill-style tag editor — type + enter to add, click X to remove. */
function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
    setInput("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <p className="text-[11px] text-gray-400">עדיין לא נוספו תגיות</p>
        )}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="hover:text-sky-900"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="תגית חדשה ולחצו Enter"
          className="text-xs"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          הוסף
        </Button>
      </div>
    </div>
  );
}
