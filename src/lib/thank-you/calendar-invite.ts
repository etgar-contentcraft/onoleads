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
  /** Event body/description (DESCRIPTION). This is the short summary — rich
   *  extras (agenda, what-to-bring, parking, etc.) are passed via `extras`
   *  and auto-appended to the final DESCRIPTION block. */
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
  /** Public URL of the landing page the attendee came from (attached as URL). */
  url?: string;

  /** Extra structured fields that get appended to DESCRIPTION as labeled lines.
   *  This is the mechanism that lets a linked `events` row surface every field
   *  it has (join link, agenda, parking, dress code, etc.) inside the invite. */
  extras?: CalendarEventExtras;
}

/**
 * Rich, optional extras appended to the calendar invite DESCRIPTION as
 * labeled lines. Every field is optional — empty fields are skipped.
 * Used by the open_day thank-you template when a linked events row
 * provides more than just title/date/location.
 */
export interface CalendarEventExtras {
  /** "Asia/Jerusalem" */
  timezone?: string;
  /** Event agenda / schedule — preserves line breaks. */
  agenda?: string;
  /** What to bring / prepare. */
  whatToBring?: string;
  /** Parking / accessibility info. */
  parkingInfo?: string;
  /** Dress code hint. */
  dressCode?: string;
  /** Target audience. */
  audience?: string;
  /** Language the event will be held in. */
  eventLanguage?: string;
  /** Price / free flag. */
  priceInfo?: string;
  /** Organizer phone for quick contact. */
  organizerPhone?: string;
  /** Organizer website. */
  organizerWebsite?: string;
  /** Online join URL (Zoom / Teams / etc.) — added as "Join: <url>". */
  onlineUrl?: string;
  /** Platform label shown alongside the online URL. */
  onlinePlatform?: string;
  /** Maps / directions URL for physical events — added as "Directions: <url>". */
  directionsUrl?: string;
  /** Labels used when formatting the extras (localized by caller). */
  labels?: CalendarExtraLabels;
}

/** Per-language labels for the extras section of the invite body. */
export interface CalendarExtraLabels {
  agenda?: string;
  whatToBring?: string;
  parkingInfo?: string;
  dressCode?: string;
  audience?: string;
  eventLanguage?: string;
  priceInfo?: string;
  organizerPhone?: string;
  organizerWebsite?: string;
  onlineJoin?: string;
  directions?: string;
  timezone?: string;
  when?: string;
}

/** Default English labels — used if caller doesn't provide its own. */
const DEFAULT_LABELS: Required<CalendarExtraLabels> = {
  agenda: "Agenda",
  whatToBring: "What to bring",
  parkingInfo: "Parking / accessibility",
  dressCode: "Dress code",
  audience: "Audience",
  eventLanguage: "Language",
  priceInfo: "Price",
  organizerPhone: "Organizer phone",
  organizerWebsite: "Organizer website",
  onlineJoin: "Join online",
  directions: "Directions",
  timezone: "Timezone",
  when: "When",
};

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
 * Compose the full, human-friendly body of the invite by combining the
 * short description with every filled-in extra field. Each extra is added
 * as a "Label: value" line so the body stays scannable inside Calendar apps.
 *
 * Returns plain text with "\n" line breaks — the ICS escaper converts these
 * to "\\n" before they're written into DESCRIPTION, and the Google/Outlook
 * URL builders URL-encode them as real newlines.
 */
export function buildInviteBody(event: CalendarEvent): string {
  const lines: string[] = [];
  if (event.description) lines.push(event.description.trim());

  const ex = event.extras;
  if (!ex) return lines.join("\n\n");

  const labels: Required<CalendarExtraLabels> = { ...DEFAULT_LABELS, ...(ex.labels || {}) };

  const section: string[] = [];
  const pushLine = (label: string, value?: string) => {
    if (value && value.trim()) section.push(`${label}: ${value.trim()}`);
  };

  // Online join block — surfaced first because attendees need it most.
  if (ex.onlineUrl) {
    const label = ex.onlinePlatform
      ? `${labels.onlineJoin} (${ex.onlinePlatform})`
      : labels.onlineJoin;
    pushLine(label, ex.onlineUrl);
  }

  // Physical directions link.
  pushLine(labels.directions, ex.directionsUrl);

  pushLine(labels.timezone, ex.timezone);
  pushLine(labels.audience, ex.audience);
  pushLine(labels.eventLanguage, ex.eventLanguage);
  pushLine(labels.dressCode, ex.dressCode);
  pushLine(labels.priceInfo, ex.priceInfo);
  pushLine(labels.parkingInfo, ex.parkingInfo);

  // Longer fields come last and are each given their own labeled block so
  // line breaks are preserved when Calendar apps render DESCRIPTION.
  if (ex.agenda && ex.agenda.trim()) {
    section.push("");
    section.push(`${labels.agenda}:`);
    section.push(ex.agenda.trim());
  }
  if (ex.whatToBring && ex.whatToBring.trim()) {
    section.push("");
    section.push(`${labels.whatToBring}:`);
    section.push(ex.whatToBring.trim());
  }

  pushLine(labels.organizerPhone, ex.organizerPhone);
  pushLine(labels.organizerWebsite, ex.organizerWebsite);

  if (section.length > 0) {
    lines.push(section.join("\n"));
  }

  return lines.join("\n\n");
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

  // For online events, prefer the join URL as LOCATION so Calendar apps
  // render it as a clickable link; the physical location (if present) is
  // still shown inside the description block.
  const location = event.extras?.onlineUrl || event.location || "";
  const body = buildInviteBody(event);

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
    `DESCRIPTION:${escapeIcsText(body)}`,
    `LOCATION:${escapeIcsText(location)}`,
  ];

  if (event.url) {
    lines.push(`URL:${escapeIcsText(event.url)}`);
  }

  if (event.organizerEmail) {
    const cn = event.organizerName ? `CN=${escapeIcsText(event.organizerName)}:` : "";
    lines.push(`ORGANIZER;${cn}mailto:${event.organizerEmail}`);
  }

  // Remind the attendee 1 hour before the event.
  lines.push(
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(event.title)}`,
    "TRIGGER:-PT1H",
    "END:VALARM",
  );

  lines.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR");

  // Fold any line over 75 chars and join with CRLF (RFC requires CRLF)
  return lines.map(foldLine).join("\r\n");
}

/** Build a Google Calendar "quick add" URL — opens in a new tab. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const start = parseIso(event.startIso);
  const end = effectiveEnd(event);
  if (!start || !end) return "";

  const location = event.extras?.onlineUrl || event.location || "";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCalendarFormat(start)}/${toCalendarFormat(end)}`,
    details: buildInviteBody(event),
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build an Outlook.com "deeplink" URL for adding the event. */
export function outlookCalendarUrl(event: CalendarEvent): string {
  const start = parseIso(event.startIso);
  const end = effectiveEnd(event);
  if (!start || !end) return "";

  const location = event.extras?.onlineUrl || event.location || "";
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    subject: event.title,
    body: buildInviteBody(event),
    location,
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
