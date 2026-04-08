/**
 * Central `events` type definitions.
 *
 * An Event row is the single source of truth for a real-world event (open
 * day, webinar, career fair). Both the landing-page event section and the
 * `open_day` thank-you template can reference an event by id instead of
 * duplicating its details across every surface that displays it.
 *
 * The `events` table was originally created for the event-type landing
 * pages (see EventPageLayout) and is reused here. Its stable columns are
 * `name_he/en/ar`, `event_date`, `event_end_date`, `location`,
 * `description_he/en`, `is_active`, and `meta` (JSONB). We store the
 * remaining fields (location_url, organizer_name, organizer_email,
 * image_url, description_ar) inside `meta` to avoid a schema migration.
 */

/** JSONB blob shape for fields that don't have a dedicated column. */
export interface EventMeta {
  /** Maps / directions deeplink. Also used inside the generated ICS invite. */
  location_url?: string;
  /** Organizer display name (appears in the ICS ORGANIZER field). */
  organizer_name?: string;
  /** Organizer email (appears in the ICS ORGANIZER field). */
  organizer_email?: string;
  /** Organizer phone — shown inside the invite description for quick contact. */
  organizer_phone?: string;
  /** Organizer website / contact URL. */
  organizer_website?: string;
  /** Optional hero / thumbnail image. */
  image_url?: string;
  /** Arabic description — no dedicated column so it lives here. */
  description_ar?: string;
  /** Arabic title fallback when name_ar is blank. */
  title_ar?: string;

  /** True when the event happens online (Zoom / Teams / YouTube). */
  is_online?: boolean;
  /** Direct join URL for online events (Zoom link, Teams link, YouTube live, etc.). */
  online_url?: string;
  /** Online platform label (e.g. "Zoom", "Teams", "YouTube Live"). */
  online_platform?: string;

  /** Timezone label shown in the invite, e.g. "Asia/Jerusalem". */
  timezone?: string;
  /** Event agenda / schedule — free-form multiline text appended to the invite body. */
  agenda?: string;
  /** Things the attendee should bring / prepare — shown in the invite description. */
  what_to_bring?: string;
  /** Parking / accessibility note — shown on the page and inside the invite. */
  parking_info?: string;
  /** Dress code hint (e.g. "smart casual"). */
  dress_code?: string;
  /** Target audience ("prospective students", "parents", etc.). */
  audience?: string;
  /** Language the event will be held in — shown in the invite body. */
  event_language?: string;
  /** Price / free flag text, e.g. "כניסה חופשית". */
  price_info?: string;
}

/** Raw row from the `events` table. */
export interface EventRow {
  id: string;

  /** Visitor-facing title per language (also used as internal admin label). */
  name_he: string;
  name_en: string | null;
  name_ar: string | null;

  /** Long-form description per language. */
  description_he: string | null;
  description_en: string | null;

  /** Physical address (display). */
  location: string | null;

  /** ISO timestamp with timezone. */
  event_date: string;
  /** Optional end timestamp — default = start + 2h when generating invites. */
  event_end_date: string | null;

  /** Category the UI can use to filter events (open_day, webinar, etc.). */
  event_type: string;

  /** Extra fields stored as JSONB (see EventMeta above). */
  meta: EventMeta | null;

  is_active: boolean;

  created_at: string;
  updated_at: string;
}

/** Payload accepted by the events dashboard create/edit form. */
export interface EventInput {
  name_he: string;
  name_en: string;
  name_ar: string;
  description_he: string;
  description_en: string;
  description_ar: string;

  /** "physical" (location + maps link) vs "online" (join URL). */
  is_online: boolean;
  /** Zoom / Teams / YouTube / Meet URL — only used when is_online=true. */
  online_url: string;
  /** Platform label, free-form (e.g. "Zoom"). */
  online_platform: string;

  /** Physical address (displayed and embedded in the invite LOCATION). */
  location: string;
  /** Maps link — displayed and embedded in the invite description. */
  location_url: string;

  event_date: string;
  event_end_date: string;
  event_type: string;
  /** Timezone label (e.g. "Asia/Jerusalem"). */
  timezone: string;

  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  organizer_website: string;

  image_url: string;

  /** Rich extras — propagated into the calendar invite body. */
  agenda: string;
  what_to_bring: string;
  parking_info: string;
  dress_code: string;
  audience: string;
  event_language: string;
  price_info: string;

  is_active: boolean;
}

/** Starter values for "new event" flow. */
export const EMPTY_EVENT: EventInput = {
  name_he: "",
  name_en: "",
  name_ar: "",
  description_he: "",
  description_en: "",
  description_ar: "",
  is_online: false,
  online_url: "",
  online_platform: "",
  location: "",
  location_url: "",
  event_date: "",
  event_end_date: "",
  event_type: "open_day",
  timezone: "Asia/Jerusalem",
  organizer_name: "",
  organizer_email: "",
  organizer_phone: "",
  organizer_website: "",
  image_url: "",
  agenda: "",
  what_to_bring: "",
  parking_info: "",
  dress_code: "",
  audience: "",
  event_language: "",
  price_info: "",
  is_active: true,
};

/**
 * Pick the per-language title with a he→en→ar fallback chain.
 * Used by every surface that renders an event across multiple locales.
 */
export function eventTitle(event: EventRow, language: string): string {
  if (language === "en" && event.name_en) return event.name_en;
  if (language === "ar" && (event.name_ar || event.meta?.title_ar)) {
    return event.name_ar || event.meta?.title_ar || "";
  }
  return event.name_he || event.name_en || event.name_ar || "";
}

/** Per-language description with fallback chain (ar lives inside meta). */
export function eventDescription(event: EventRow, language: string): string {
  if (language === "en" && event.description_en) return event.description_en;
  if (language === "ar" && event.meta?.description_ar) return event.meta.description_ar;
  return event.description_he || event.description_en || event.meta?.description_ar || "";
}

/**
 * Turn a form payload into a row ready for insert/update.
 * Extra fields (location_url, organizer_*, image_url, description_ar) are
 * packed into the JSONB `meta` column; dedicated columns are populated
 * directly. Empty strings are normalized to null for nullable columns.
 */
export function toEventRow(input: EventInput): Omit<EventRow, "id" | "created_at" | "updated_at"> {
  const meta: EventMeta = {};
  if (input.location_url) meta.location_url = input.location_url;
  if (input.organizer_name) meta.organizer_name = input.organizer_name;
  if (input.organizer_email) meta.organizer_email = input.organizer_email;
  if (input.organizer_phone) meta.organizer_phone = input.organizer_phone;
  if (input.organizer_website) meta.organizer_website = input.organizer_website;
  if (input.image_url) meta.image_url = input.image_url;
  if (input.description_ar) meta.description_ar = input.description_ar;

  // Online-vs-physical toggle + online join details
  if (input.is_online) meta.is_online = true;
  if (input.online_url) meta.online_url = input.online_url;
  if (input.online_platform) meta.online_platform = input.online_platform;

  // Rich extras that flow through to the calendar invite
  if (input.timezone) meta.timezone = input.timezone;
  if (input.agenda) meta.agenda = input.agenda;
  if (input.what_to_bring) meta.what_to_bring = input.what_to_bring;
  if (input.parking_info) meta.parking_info = input.parking_info;
  if (input.dress_code) meta.dress_code = input.dress_code;
  if (input.audience) meta.audience = input.audience;
  if (input.event_language) meta.event_language = input.event_language;
  if (input.price_info) meta.price_info = input.price_info;

  return {
    name_he: input.name_he,
    name_en: input.name_en || null,
    name_ar: input.name_ar || null,
    description_he: input.description_he || null,
    description_en: input.description_en || null,
    location: input.location || null,
    event_date: input.event_date,
    event_end_date: input.event_end_date || null,
    event_type: input.event_type || "open_day",
    meta: Object.keys(meta).length > 0 ? meta : null,
    is_active: input.is_active,
  };
}

/** Extract form-friendly values from a DB row (inverse of toEventRow). */
export function fromEventRow(row: EventRow): EventInput {
  const meta = row.meta || {};
  return {
    name_he: row.name_he,
    name_en: row.name_en || "",
    name_ar: row.name_ar || "",
    description_he: row.description_he || "",
    description_en: row.description_en || "",
    description_ar: meta.description_ar || "",
    is_online: !!meta.is_online,
    online_url: meta.online_url || "",
    online_platform: meta.online_platform || "",
    location: row.location || "",
    location_url: meta.location_url || "",
    event_date: row.event_date,
    event_end_date: row.event_end_date || "",
    event_type: row.event_type || "open_day",
    timezone: meta.timezone || "Asia/Jerusalem",
    organizer_name: meta.organizer_name || "",
    organizer_email: meta.organizer_email || "",
    organizer_phone: meta.organizer_phone || "",
    organizer_website: meta.organizer_website || "",
    image_url: meta.image_url || "",
    agenda: meta.agenda || "",
    what_to_bring: meta.what_to_bring || "",
    parking_info: meta.parking_info || "",
    dress_code: meta.dress_code || "",
    audience: meta.audience || "",
    event_language: meta.event_language || "",
    price_info: meta.price_info || "",
    is_active: row.is_active,
  };
}
