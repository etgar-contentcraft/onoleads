/**
 * Calendar invite helpers — builds calendar-service URLs and generates a
 * fully-valid .ics file so a lead can add an event to Google Calendar /
 * Outlook / Apple Calendar with a single click.
 *
 * Used by the `open_day` thank-you layout. All functions are pure and run
 * client-side (no network calls, no SDKs).
 *
 * Standard reference: RFC 5545 (iCalendar).
 */

export interface CalendarEvent {
  /** Event title (SUMMARY in iCalendar) */
  title: string;
  /** Event body/description (DESCRIPTION) */
  description: string;
  /** Physical address or URL (LOCATION) */
  location: string;
  /** Start in ISO 8601 — "2026-05-15T18:00:00+03:00" */
  startIso: string;
  /** End in ISO 8601 — if blank, we default to start + 2h */
  endIso?: string;
  /** Organizer display name (ORGANIZER CN) */
  organizerName?: string;
  /** Organizer email (ORGANIZER mailto) */
  organizerEmail?: string;
  /** Stable identifier used as UID — falls back to a deterministic hash */
  uid?: string;
}

/** Default event duration when end time is not provided (2 hours) */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** Parse an ISO timestamp into a Date, returning null for invalid input */
export function parseIso(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date into the "YYYYMMDDTHHMMSSZ" compact UTC form that iCalendar
 * and Google/Outlook URL schemes require.
 */
export function toCalendarFormat(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/** Resolve the effective end time from the event (with 2h fallback) */
export function effectiveEnd(event: CalendarEvent): Date | null {
  const start = parseIso(event.startIso);
  if (!start) return null;
  const end = parseIso(event.endIso);
  if (end) return end;
  return new Date(start.getTime() + DEFAULT_DURATION_MS);
}

/** Generate a stable UID for the invite (deterministic per title + start) */
function generateUid(event: CalendarEvent): string {
  if (event.uid) return event.uid;
  // Simple hash over title + startIso to keep it stable across clicks
  let hash = 0;
  const src = `${event.title}|${event.startIso}`;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 31 + src.charCodeAt(i)) | 0;
  }
  return `ono-${Math.abs(hash).toString(36)}@onoleads.app`;
}

/**
 * Escape iCalendar text per RFC 5545 §3.3.11:
 *   \ → \\   ,  , → \,   ,  ; → \;   ,  \n → \n
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Fold a long iCalendar content line at 75 octets per RFC 5545 §3.1 —
 * subsequent lines must begin with a single space.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

/**
 * Build a fully RFC-5545-compliant .ics payload for the event. The result
 * is a single string the browser can turn into a Blob download.
 */
export function buildIcs(event: CalendarEvent): string {
  const start = parseIso(event.startIso);
  const end = effectiveEnd(event);
  if (!start || !end) return "";

  const uid = generateUid(event);
  const dtstamp = toCalendarFormat(new Date());
  const dtstart = toCalendarFormat(start);
  const dtend = toCalendarFormat(end);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ono Academic College//Thank You Open Day//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description || "")}`,
    `LOCATION:${escapeIcsText(event.location || "")}`,
  ];

  if (event.organizerEmail) {
    const cn = event.organizerName ? `CN=${escapeIcsText(event.organizerName)}:` : "";
    lines.push(`ORGANIZER;${cn}mailto:${event.organizerEmail}`);
  }

  lines.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR");

  // Fold any line over 75 chars and join with CRLF (RFC requires CRLF)
  return lines.map(foldLine).join("\r\n");
}

/** Build a Google Calendar "quick add" URL — opens in a new tab. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = parseIso(event.startIso);
  const end = effectiveEnd(event);
  if (!start || !end) return "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarFormat(start)}/${toCalendarFormat(end)}`,
    details: event.description || "",
    location: event.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build an Outlook.com "deeplink" URL for adding the event. */
export function outlookCalendarUrl(event: CalendarEvent): string {
  const start = parseIso(event.startIso);
  const end = effectiveEnd(event);
  if (!start || !end) return "";

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    subject: event.title,
    body: event.description || "",
    location: event.location || "",
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Turn an ICS payload into a data URL. Apple Calendar (iOS / macOS) and
 * most desktop mail clients open .ics downloads directly in the default
 * calendar app when clicked.
 */
export function icsDataUrl(event: CalendarEvent): string {
  const ics = buildIcs(event);
  if (!ics) return "";
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

/** A safe filename for the .ics download — no special chars, always .ics */
export function icsFilename(event: CalendarEvent): string {
  const base = (event.title || "event")
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "event"}.ics`;
}
