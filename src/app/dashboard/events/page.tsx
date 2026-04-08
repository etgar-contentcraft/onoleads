"use client";

/**
 * Events dashboard — single source of truth for real-world events.
 *
 * Lists all rows from `events`. Admins can:
 *   - Create new events (open day, webinar, career fair, etc.)
 *   - Edit existing events in all 3 languages (he/en/ar)
 *   - Toggle `is_active` to temporarily hide an event
 *   - Delete events (hard delete — only do this if no landing page / TY
 *     page references it)
 *
 * An event created here can be referenced by:
 *   1. The `open_day` thank-you template (via ty_settings.event_id)
 *   2. Event-type landing pages (future wiring)
 *
 * When referenced, every visible event field (title, date, location,
 * organizer) is pulled from the row here — edit once, every surface
 * updates.
 *
 * Schema note: the `events` table keeps most fields as flat columns
 * (name_*, event_date, location, …) but stores extras (location_url,
 * organizer_*, image_url, description_ar) inside a `meta` JSONB column.
 * See `src/lib/types/events.ts` helpers `toEventRow` / `fromEventRow`.
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
  Globe,
} from "lucide-react";
import type { EventRow, EventInput } from "@/lib/types/events";
import { EMPTY_EVENT, toEventRow, fromEventRow } from "@/lib/types/events";

/** Convert an ISO timestamp string to a value accepted by <input type="datetime-local">. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local expects "YYYY-MM-DDTHH:MM" in **local** time (no Z).
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
    if (!confirm("למחוק את האירוע? כל העמודים שמשויכים לאירוע הזה יחזרו לברירת המחדל של התבנית.")) return;
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
            מקור אחד לפרטי אירוע — ניתן לקשר אירוע לעמוד תודה (ובהמשך גם לעמוד נחיתה), וכל הפרטים
            יישאבו אוטומטית (תאריך, מיקום, ספירה לאחור, קובץ יומן).
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> אירוע חדש
        </Button>
      </div>

      {events.length === 0 && (
        <div className="text-center py-20 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
          <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">עדיין אין אירועים. לחצו על &quot;אירוע חדש&quot; כדי ליצור את הראשון.</p>
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
                onDelete={() => handleDelete(ev.id)}
                onToggle={() => handleToggleActive(ev)}
                onCopyId={() => handleCopyId(ev.id)}
                isPast
              />
            ))}
          </div>
        </section>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "עריכת אירוע" : "אירוע חדש"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-5 py-2">
              {/* Active toggle + event type */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                <div>
                  <Label className="text-xs font-semibold">סוג אירוע</Label>
                  <select
                    value={editing.data.event_type}
                    onChange={(e) =>
                      setEditing({ ...editing, data: { ...editing.data, event_type: e.target.value } })
                    }
                    className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
                  >
                    <option value="open_day">יום פתוח</option>
                    <option value="webinar">וובינר</option>
                    <option value="conference">כנס</option>
                    <option value="workshop">סדנה</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    checked={editing.data.is_active}
                    onCheckedChange={(checked) =>
                      setEditing({ ...editing, data: { ...editing.data, is_active: checked } })
                    }
                  />
                  <Label className="text-xs">פעיל</Label>
                </div>
              </div>

              {/* Title (3 languages) */}
              <fieldset className="space-y-3 border rounded-lg p-4">
                <legend className="text-xs font-bold px-2 text-gray-700">כותרת האירוע</legend>
                <div>
                  <Label className="text-xs">עברית *</Label>
                  <Input
                    value={editing.data.name_he}
                    onChange={(e) =>
                      setEditing({ ...editing, data: { ...editing.data, name_he: e.target.value } })
                    }
                    placeholder="יום פתוח — הקריה האקדמית אונו"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">English</Label>
                  <Input
                    dir="ltr"
                    value={editing.data.name_en}
                    onChange={(e) =>
                      setEditing({ ...editing, data: { ...editing.data, name_en: e.target.value } })
                    }
                    placeholder="Open Day — Ono Academic College"
                  />
                </div>
                <div>
                  <Label className="text-xs">العربية</Label>
                  <Input
                    value={editing.data.name_ar}
                    onChange={(e) =>
                      setEditing({ ...editing, data: { ...editing.data, name_ar: e.target.value } })
                    }
                    placeholder="يوم مفتوح — كلية أونو الأكاديمية"
                  />
                </div>
              </fieldset>

              {/* Description (3 languages) */}
              <fieldset className="space-y-3 border rounded-lg p-4">
                <legend className="text-xs font-bold px-2 text-gray-700">תיאור האירוע</legend>
                <div>
                  <Label className="text-xs">עברית</Label>
                  <Textarea
                    rows={3}
                    value={editing.data.description_he}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, description_he: e.target.value },
                      })
                    }
                    placeholder="יום פתוח להכרת התוכניות שלנו..."
                  />
                </div>
                <div>
                  <Label className="text-xs">English</Label>
                  <Textarea
                    dir="ltr"
                    rows={3}
                    value={editing.data.description_en}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, description_en: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">العربية</Label>
                  <Textarea
                    rows={3}
                    value={editing.data.description_ar}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, description_ar: e.target.value },
                      })
                    }
                  />
                </div>
              </fieldset>

              {/* Date/time */}
              <fieldset className="space-y-3 border rounded-lg p-4">
                <legend className="text-xs font-bold px-2 text-gray-700">מועד</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">התחלה *</Label>
                    <Input
                      type="datetime-local"
                      value={toDatetimeLocal(editing.data.event_date)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: {
                            ...editing.data,
                            event_date: fromDatetimeLocal(e.target.value),
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">סיום (אופציונלי — ברירת מחדל: +2 שעות)</Label>
                    <Input
                      type="datetime-local"
                      value={toDatetimeLocal(editing.data.event_end_date)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: {
                            ...editing.data,
                            event_end_date: fromDatetimeLocal(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </fieldset>

              {/* Physical vs online toggle */}
              <fieldset className="space-y-3 border rounded-lg p-4">
                <legend className="text-xs font-bold px-2 text-gray-700">סוג מיקום</legend>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, is_online: false },
                      })
                    }
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                      !editing.data.is_online
                        ? "border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <MapPin className="w-4 h-4" /> אירוע פיזי
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, is_online: true },
                      })
                    }
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                      editing.data.is_online
                        ? "border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    <Video className="w-4 h-4" /> אירוע אונליין
                  </button>
                </div>

                {editing.data.is_online ? (
                  <>
                    <div>
                      <Label className="text-xs">קישור להצטרפות (Zoom / Teams / YouTube / Meet) *</Label>
                      <Input
                        dir="ltr"
                        value={editing.data.online_url}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            data: { ...editing.data, online_url: e.target.value },
                          })
                        }
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">פלטפורמה</Label>
                      <Input
                        value={editing.data.online_platform}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            data: { ...editing.data, online_platform: e.target.value },
                          })
                        }
                        placeholder="Zoom / Teams / YouTube Live / Google Meet"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs">כתובת / מקום</Label>
                      <Input
                        value={editing.data.location}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            data: { ...editing.data, location: e.target.value },
                          })
                        }
                        placeholder='קמפוס קריית אונו, צה"ל 104, קריית אונו'
                      />
                    </div>
                    <div>
                      <Label className="text-xs">קישור למפה / הוראות הגעה</Label>
                      <Input
                        dir="ltr"
                        value={editing.data.location_url}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            data: { ...editing.data, location_url: e.target.value },
                          })
                        }
                        placeholder="https://maps.google.com/?q=..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">חניה / נגישות (אופציונלי)</Label>
                      <Textarea
                        rows={2}
                        value={editing.data.parking_info}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            data: { ...editing.data, parking_info: e.target.value },
                          })
                        }
                        placeholder="חניון ציבורי צמוד לקמפוס, כניסה נגישה לנכים"
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-xs">אזור זמן</Label>
                  <Input
                    dir="ltr"
                    value={editing.data.timezone}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, timezone: e.target.value },
                      })
                    }
                    placeholder="Asia/Jerusalem"
                  />
                </div>
              </fieldset>

              {/* Organizer */}
              <fieldset className="space-y-3 border rounded-lg p-4">
                <legend className="text-xs font-bold px-2 text-gray-700">מארגן</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">שם המארגן</Label>
                    <Input
                      value={editing.data.organizer_name}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, organizer_name: e.target.value },
                        })
                      }
                      placeholder="הקריה האקדמית אונו"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">אימייל</Label>
                    <Input
                      type="email"
                      dir="ltr"
                      value={editing.data.organizer_email}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, organizer_email: e.target.value },
                        })
                      }
                      placeholder="info@ono.ac.il"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">טלפון</Label>
                    <Input
                      dir="ltr"
                      value={editing.data.organizer_phone}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, organizer_phone: e.target.value },
                        })
                      }
                      placeholder="+972-3-123-4567"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">אתר אינטרנט</Label>
                    <Input
                      dir="ltr"
                      value={editing.data.organizer_website}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, organizer_website: e.target.value },
                        })
                      }
                      placeholder="https://www.ono.ac.il"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Rich extras — propagated to the calendar invite */}
              <fieldset className="space-y-3 border rounded-lg p-4">
                <legend className="text-xs font-bold px-2 text-gray-700 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> פרטים נוספים (נכללים בזימון ליומן)
                </legend>
                <p className="text-[11px] text-gray-500 -mt-1">
                  כל שדה שימולא יישלח לכל מי שיוריד את הזימון לאירוע מעמוד התודה — סדר יום, מה
                  להביא, חניה, קוד לבוש, קהל יעד ועוד.
                </p>

                <div>
                  <Label className="text-xs">סדר יום / לו&quot;ז</Label>
                  <Textarea
                    rows={3}
                    value={editing.data.agenda}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, agenda: e.target.value },
                      })
                    }
                    placeholder="18:00 – קבלה ורישום&#10;18:15 – הרצאה מרכזית&#10;19:00 – סיור בקמפוס"
                  />
                </div>

                <div>
                  <Label className="text-xs">מה להביא</Label>
                  <Textarea
                    rows={2}
                    value={editing.data.what_to_bring}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        data: { ...editing.data, what_to_bring: e.target.value },
                      })
                    }
                    placeholder="תעודת זהות, כוס מים, שאלות שהכנתם מראש"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">קהל יעד</Label>
                    <Input
                      value={editing.data.audience}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, audience: e.target.value },
                        })
                      }
                      placeholder="מועמדים ללימודים והוריהם"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">שפת האירוע</Label>
                    <Input
                      value={editing.data.event_language}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, event_language: e.target.value },
                        })
                      }
                      placeholder="עברית"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">קוד לבוש</Label>
                    <Input
                      value={editing.data.dress_code}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, dress_code: e.target.value },
                        })
                      }
                      placeholder="קז&quot;ואל חכם"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">מחיר / עלות</Label>
                    <Input
                      value={editing.data.price_info}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          data: { ...editing.data, price_info: e.target.value },
                        })
                      }
                      placeholder="כניסה חופשית"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Image URL */}
              <div>
                <Label className="text-xs">תמונת אירוע (אופציונלי)</Label>
                <Input
                  dir="ltr"
                  value={editing.data.image_url}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      data: { ...editing.data, image_url: e.target.value },
                    })
                  }
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !editing?.data.name_he || !editing?.data.event_date}
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

/**
 * Event card — compact display in the list view.
 * Shows the key facts (title, date, location) and exposes CRUD actions.
 */
function EventCard({
  event,
  busy,
  isPast,
  onEdit,
  onDelete,
  onToggle,
  onCopyId,
}: {
  event: EventRow;
  busy: boolean;
  isPast?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onCopyId: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl border-2 bg-white p-5 transition-all ${
        event.is_active ? "border-gray-200 hover:border-gray-300" : "border-gray-200 opacity-60"
      } ${isPast ? "bg-gray-50" : ""}`}
    >
      {!event.is_active && (
        <div className="absolute -top-3 right-4 bg-gray-400 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md">
          מושבת
        </div>
      )}
      {isPast && event.is_active && (
        <div className="absolute -top-3 right-4 bg-gray-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md">
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
            {event.name_he}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {event.event_type === "open_day" ? "יום פתוח" : event.event_type}
            {event.meta?.is_online && (
              <span className="ms-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                אונליין
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
          onClick={onCopyId}
          disabled={busy}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
          title="העתק את מזהה האירוע כדי להדביק בהגדרות העמוד"
        >
          <Copy className="w-3.5 h-3.5" /> העתק ID
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
  );
}
