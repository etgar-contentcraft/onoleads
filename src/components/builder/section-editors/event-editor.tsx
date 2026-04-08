"use client";

/**
 * Event section editor — the builder-side panel for "event / open day" sections.
 *
 * Editors have two modes (toggle):
 *   1. **Link existing event** — pick a row from the `events` table (the
 *      single source of truth). The section reads every field from the
 *      linked row at render time, so updating the event once updates every
 *      page that references it.
 *   2. **Write manually** — inline fields for one-off pages that aren't
 *      tied to a reusable event. Same legacy content keys the old editor
 *      supported (heading, description, event_date, event_time, venue,
 *      schedule, speakers, etc.).
 *
 * The linked-event mode also shows a read-only preview of the key fields
 * so editors can verify they picked the right row without bouncing to the
 * Events dashboard.
 */

import { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ExternalLink, Loader2, Link2, PencilLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EventRow, EventScheduleItem, EventSpeaker } from "@/lib/types/events";
import { eventTitle } from "@/lib/types/events";

interface EventEditorProps {
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

/** Labeled field row used throughout the panel. */
function F({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label title={tip} className={`text-xs font-semibold leading-none ${tip ? "cursor-help" : ""}`}>
        {label}
        {tip && <span className="mr-1 text-[#9A969A] text-[10px]">ℹ</span>}
      </Label>
      {children}
    </div>
  );
}

/**
 * Format an ISO timestamp into a locale-independent "YYYY-MM-DD HH:mm" string
 * suitable for the read-only preview card. Safe for any locale and RTL.
 */
function prettyDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
}

export function EventEditor({ content, onChange }: EventEditorProps) {
  const supabase = useMemo(() => createClient(), []);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load the full event list once ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("is_active", true)
        .order("event_date", { ascending: true });
      if (!cancelled) {
        setEvents((data || []) as EventRow[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const linkedEventId = (content.event_id as string) || "";
  const isLinked = !!linkedEventId;
  const linkedEvent = events.find((e) => e.id === linkedEventId);

  // Manual mode fields (legacy content keys kept for backwards compatibility)
  const headingHe = (content.heading_he as string) || "";
  const descriptionHe = (content.description_he as string) || "";
  const eventDate = (content.event_date as string) || "";
  const eventTime = (content.event_time as string) || "";
  const eventType = (content.event_type as string) || "event_physical";
  const venue = (content.venue as string) || "";
  const googleMapsUrl = (content.google_maps_url as string) || "";
  const zoomLink = (content.zoom_link as string) || "";
  const parkingInfo = (content.parking_info as string) || "";
  const schedule = (content.schedule as EventScheduleItem[]) || [];
  const speakers = (content.speakers as EventSpeaker[]) || [];

  /** Shallow-merge a partial update into the content blob. */
  const update = (patch: Record<string, unknown>) => onChange({ ...content, ...patch });

  /** Clear all inline fields (used when switching to linked mode). */
  const clearManualFields = () => {
    onChange({
      ...content,
      heading_he: undefined,
      description_he: undefined,
      event_date: undefined,
      event_time: undefined,
      venue: undefined,
      google_maps_url: undefined,
      zoom_link: undefined,
      parking_info: undefined,
      schedule: undefined,
      speakers: undefined,
    });
  };

  /** Clear the linked event (used when switching to manual mode). */
  const clearLinkedEvent = () => {
    const next = { ...content };
    delete next.event_id;
    onChange(next);
  };

  return (
    <div className="space-y-5">
      {/* ── Mode toggle ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#B8D900]/40 bg-[#B8D900]/5 p-3 space-y-2">
        <p className="text-[11px] font-bold text-[#2A2628]">מקור הנתונים</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isLinked) return;
              clearLinkedEvent();
            }}
            className={`rounded-lg px-3 py-2 text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${
              !isLinked
                ? "bg-white border-2 border-[#B8D900] text-[#2A2628]"
                : "bg-transparent border border-[#D0D0D0] text-[#716C70] hover:bg-white"
            }`}
          >
            <PencilLine className="w-3.5 h-3.5" />
            עריכה ידנית
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLinked) return;
              clearManualFields();
            }}
            className={`rounded-lg px-3 py-2 text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${
              isLinked
                ? "bg-white border-2 border-[#B8D900] text-[#2A2628]"
                : "bg-transparent border border-[#D0D0D0] text-[#716C70] hover:bg-white"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            קישור לאירוע
          </button>
        </div>
        <p className="text-[10px] text-[#716C70] leading-relaxed">
          {isLinked
            ? "הסקשן מקושר לאירוע מהמאגר — כל שינוי בדף האירועים יתעדכן גם כאן."
            : "כל פרטי האירוע מוזנים ישירות בסקשן. למצב זה אין שיתוף בין עמודים."}
        </p>
      </div>

      {/* ── Linked mode: event picker + preview ────────────────────────── */}
      {isLinked && (
        <div className="space-y-4">
          <F label="בחרו אירוע" tip="רשימת האירועים הפעילים מה-Events dashboard. עריכת הפרטים עצמם מתבצעת שם.">
            {loading ? (
              <div className="flex items-center gap-2 text-[11px] text-[#9A969A] py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                טוען אירועים...
              </div>
            ) : events.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed border-[#E0E0E0] bg-[#FAFAFA] text-[11px] text-[#9A969A] text-center">
                אין אירועים פעילים במאגר.
                <br />
                <a href="/dashboard/events" target="_blank" className="text-[#B8D900] underline font-bold">
                  צרו אירוע חדש ←
                </a>
              </div>
            ) : (
              <select
                value={linkedEventId}
                onChange={(e) => update({ event_id: e.target.value })}
                className="w-full rounded-lg border border-[#D0D0D0] bg-white px-3 py-2 text-[11px] text-[#2A2628] focus:outline-none focus:border-[#B8D900]"
              >
                <option value="">— בחרו אירוע —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {eventTitle(ev, "he")} — {prettyDate(ev.event_date)}
                  </option>
                ))}
              </select>
            )}
          </F>

          {linkedEvent && (
            <div className="rounded-xl border border-[#E0E0E0] bg-[#FAFAFA] p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#9A969A]">
                תצוגה מקדימה
              </p>
              <h4 className="text-xs font-bold text-[#2A2628]">{eventTitle(linkedEvent, "he")}</h4>
              {linkedEvent.description_he && (
                <p className="text-[10px] text-[#716C70] leading-relaxed line-clamp-2">
                  {linkedEvent.description_he}
                </p>
              )}
              <div className="grid grid-cols-2 gap-1 text-[10px] text-[#716C70]">
                <div>
                  <span className="text-[#9A969A]">תאריך:</span> {prettyDate(linkedEvent.event_date)}
                </div>
                <div>
                  <span className="text-[#9A969A]">מיקום:</span>{" "}
                  {linkedEvent.meta?.is_online
                    ? `🎥 ${linkedEvent.meta.online_platform || "אונליין"}`
                    : linkedEvent.location || "—"}
                </div>
                {linkedEvent.meta?.speakers && linkedEvent.meta.speakers.length > 0 && (
                  <div>
                    <span className="text-[#9A969A]">מרצים:</span> {linkedEvent.meta.speakers.length}
                  </div>
                )}
                {linkedEvent.meta?.schedule && linkedEvent.meta.schedule.length > 0 && (
                  <div>
                    <span className="text-[#9A969A]">לו״ז:</span> {linkedEvent.meta.schedule.length} פריטים
                  </div>
                )}
                {linkedEvent.meta?.faq && linkedEvent.meta.faq.length > 0 && (
                  <div>
                    <span className="text-[#9A969A]">FAQ:</span> {linkedEvent.meta.faq.length} שאלות
                  </div>
                )}
                {linkedEvent.meta?.capacity && (
                  <div>
                    <span className="text-[#9A969A]">קיבולת:</span> {linkedEvent.meta.capacity}
                  </div>
                )}
              </div>
              <a
                href="/dashboard/events"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#B8D900] hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                עריכת האירוע ב-Events dashboard
              </a>
            </div>
          )}
        </div>
      )}

      {/* ── Manual mode: inline fields ─────────────────────────────────── */}
      {!isLinked && (
        <div className="space-y-4">
          <F label="כותרת" tip="שם האירוע שמופיע מעל פרטי האירוע.">
            <Input
              value={headingHe}
              onChange={(e) => update({ heading_he: e.target.value })}
              placeholder="יום פתוח - 15 במאי"
            />
          </F>

          <F label="תיאור קצר" tip="2-3 משפטים על מה שצופים יקבלו באירוע.">
            <Textarea
              value={descriptionHe}
              onChange={(e) => update({ description_he: e.target.value })}
              rows={3}
              placeholder="תיאור קצר של האירוע..."
            />
          </F>

          <div className="grid grid-cols-2 gap-3">
            <F label="תאריך">
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => update({ event_date: e.target.value })}
              />
            </F>
            <F label="שעה">
              <Input
                value={eventTime}
                onChange={(e) => update({ event_time: e.target.value })}
                placeholder="18:00"
                dir="ltr"
              />
            </F>
          </div>

          <F label="סוג אירוע">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update({ event_type: "event_physical" })}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold ${
                  eventType === "event_physical"
                    ? "bg-[#B8D900] text-[#2A2628]"
                    : "bg-white border border-[#D0D0D0] text-[#716C70]"
                }`}
              >
                🏛️ פיזי
              </button>
              <button
                type="button"
                onClick={() => update({ event_type: "event_zoom" })}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold ${
                  eventType === "event_zoom"
                    ? "bg-[#B8D900] text-[#2A2628]"
                    : "bg-white border border-[#D0D0D0] text-[#716C70]"
                }`}
              >
                🎥 אונליין
              </button>
            </div>
          </F>

          {eventType === "event_physical" ? (
            <>
              <F label="כתובת / מיקום">
                <Input
                  value={venue}
                  onChange={(e) => update({ venue: e.target.value })}
                  placeholder="קמפוס קריית אונו, אולם 1"
                />
              </F>
              <F label="Google Maps URL" tip="לינק למפה שייפתח כשלוחצים על כפתור הניווט.">
                <Input
                  value={googleMapsUrl}
                  onChange={(e) => update({ google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/?q=..."
                  dir="ltr"
                />
              </F>
              <F label="חניה">
                <Input
                  value={parkingInfo}
                  onChange={(e) => update({ parking_info: e.target.value })}
                  placeholder="חניה ציבורית בכניסה הדרומית"
                />
              </F>
            </>
          ) : (
            <F label="קישור Zoom / פלטפורמה" tip="הקישור שאליו המשתתפים יקליקו.">
              <Input
                value={zoomLink}
                onChange={(e) => update({ zoom_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
                dir="ltr"
              />
            </F>
          )}

          {/* Simple schedule repeater */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">סדר היום</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  update({
                    schedule: [...schedule, { time: "", title: "" } as EventScheduleItem],
                  })
                }
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {schedule.map((item, i) => (
              <div key={i} className="grid grid-cols-[60px_1fr_auto] gap-2 items-center">
                <Input
                  value={item.time}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[i] = { ...next[i], time: e.target.value };
                    update({ schedule: next });
                  }}
                  placeholder="18:00"
                  dir="ltr"
                />
                <Input
                  value={item.title}
                  onChange={(e) => {
                    const next = [...schedule];
                    next[i] = { ...next[i], title: e.target.value };
                    update({ schedule: next });
                  }}
                  placeholder="קבלת פנים"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => update({ schedule: schedule.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Simple speakers repeater */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">מרצים</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  update({
                    speakers: [...speakers, { name: "", role: "" } as EventSpeaker],
                  })
                }
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {speakers.map((speaker, i) => (
              <div key={i} className="p-2 rounded-lg border border-[#E0E0E0] space-y-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    value={speaker.name}
                    onChange={(e) => {
                      const next = [...speakers];
                      next[i] = { ...next[i], name: e.target.value };
                      update({ speakers: next });
                    }}
                    placeholder="שם מלא"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => update({ speakers: speakers.filter((_, idx) => idx !== i) })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <Input
                  value={speaker.role || ""}
                  onChange={(e) => {
                    const next = [...speakers];
                    next[i] = { ...next[i], role: e.target.value };
                    update({ speakers: next });
                  }}
                  placeholder="תפקיד / מחלקה"
                />
              </div>
            ))}
            <p className="text-[10px] text-[#9A969A]">
              לעריכת מרצים עם תמונה וביו — השתמשו במצב &quot;קישור לאירוע&quot;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
