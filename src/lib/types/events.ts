/**
 * Central `events` type definitions.
 *
 * An Event row is the single source of truth for a real-world event (open
 * day, webinar, career fair). Both the landing-page event section and the
 * `open_day` thank-you template can reference an event by id instead of
 * duplicating its details across every surface that displays it.
 *
 * The `events` table has flat columns for the "stable" fields
 * (`name_*`, `description_*`, `event_date`, `event_end_date`, `location`,
 * `event_type`, `is_active`). Everything richer — speakers, schedule, FAQ,
 * highlights, capacity, tags, gallery, etc. — lives inside the `meta` JSONB
 * column, which is the only place we can extend without a migration.
 *
 * Design philosophy: every rich field below is OPTIONAL. The dashboard
 * form never forces the editor to fill anything beyond title/date. Layouts
 * render each block only if its data exists, so sparse events look clean
 * and rich events look incredible.
 */

// ─── Primary language ───────────────────────────────────────────────────

/** Primary language the event is held in — also picks which name_* column is authoritative. */
export type EventLanguage = "he" | "en" | "ar";

// ─── Rich sub-structures (live inside meta JSONB) ──────────────────────

/** A single speaker / presenter shown on the event hero + a carousel section. */
export interface EventSpeaker {
  /** Full name, e.g. "ד״ר רונית לוי" */
  name: string;
  /** Role / title, e.g. "ראש החוג למנהל עסקים" */
  role?: string;
  /** Short bio — 1-3 sentences. */
  bio?: string;
  /** Portrait image URL (square works best). */
  image_url?: string;
  /** Optional personal link (LinkedIn, homepage). */
  link_url?: string;
}

/** One row in the event schedule timeline. */
export interface EventScheduleItem {
  /** Display time, e.g. "17:00" or "5:30 PM". */
  time: string;
  /** Session title. */
  title: string;
  /** Optional 1-line description. */
  description?: string;
  /** Optional icon key from a fixed set ("talk", "break", "tour", "workshop", "meal", "network", "checkin"). */
  icon?: string;
}

/** A single "what you'll get / highlight" card. */
export interface EventHighlight {
  /** Icon key ("gift", "sparkles", "users", "map", "star", "award", "clock", "heart"). */
  icon?: string;
  /** Card title. */
  title: string;
  /** Optional subtitle / description. */
  description?: string;
}

/** One Q&A item for the FAQ accordion. */
export interface EventFaqItem {
  question: string;
  answer: string;
}

/** A single testimonial from a past attendee. */
export interface EventTestimonial {
  /** Attendee name. */
  name: string;
  /** Short role ("Student", "Parent", etc.). */
  role?: string;
  /** Testimonial quote. */
  quote: string;
  /** Optional portrait URL. */
  image_url?: string;
}

/** A photo-gallery image from a past event. */
export interface EventGalleryImage {
  /** Image URL. */
  url: string;
  /** Optional caption. */
  caption?: string;
}

/** Partner / sponsor / featured-program badge. */
export interface EventBadge {
  /** Badge label. */
  label: string;
  /** Optional logo URL. */
  logo_url?: string;
  /** Optional link. */
  link_url?: string;
}

// ─── The meta JSONB blob ───────────────────────────────────────────────

/** JSONB blob shape for fields that don't have a dedicated column. */
export interface EventMeta {
  // Primary language picked in the dashboard form (drives name_*/description_* column writes)
  primary_language?: EventLanguage;

  // Location & online ─────────────────────────────────────────────────
  location_url?: string;
  is_online?: boolean;
  online_url?: string;
  online_platform?: string;

  // Organizer ─────────────────────────────────────────────────────────
  organizer_name?: string;
  organizer_email?: string;
  organizer_phone?: string;
  organizer_website?: string;

  // Images & media ────────────────────────────────────────────────────
  /** Hero image — 1600×900 recommended. */
  image_url?: string;
  /** Optional intro video (YouTube / Vimeo / mp4). */
  intro_video_url?: string;
  /** Photo gallery from past editions. */
  gallery?: EventGalleryImage[];

  // Legacy extra description text kept for compatibility ──────────────
  description_ar?: string;
  title_ar?: string;

  // Rich structured content ───────────────────────────────────────────
  /** Speakers / presenters. */
  speakers?: EventSpeaker[];
  /** Schedule / agenda timeline. */
  schedule?: EventScheduleItem[];
  /** Highlights / what you'll get cards. */
  highlights?: EventHighlight[];
  /** FAQ accordion. */
  faq?: EventFaqItem[];
  /** Testimonials from past events. */
  testimonials?: EventTestimonial[];
  /** Partner / sponsor badges (or featured programs, e.g. degree names). */
  featured_programs?: EventBadge[];
  /** Free-form tags / topics shown as pills. */
  tags?: string[];

  // Free-form text extras ─────────────────────────────────────────────
  /** Legacy free-form agenda text (if editor pastes a block instead of using schedule[]). */
  agenda?: string;
  what_to_bring?: string;
  parking_info?: string;
  dress_code?: string;
  audience?: string;
  /** Human label for the event's spoken language. */
  event_language?: string;
  price_info?: string;
  /** Will refreshments / food be served? */
  refreshments?: string;
  /** Hashtag for social media. */
  hashtag?: string;
  /** Certificate of attendance description. */
  certificate_info?: string;
  /** External registration URL. */
  registration_url?: string;
  /** Registration deadline ISO date. */
  registration_deadline?: string;
  /** Capacity (max attendees). */
  capacity?: number;
  /** How many people already registered (optional live counter). */
  registered_count?: number;
  /** Live-stream URL (in addition to venue — for hybrid events). */
  livestream_url?: string;
  /** Recording URL (for past events). */
  recording_url?: string;
  /** Custom CTA button label. */
  cta_label?: string;
  /** Custom CTA destination URL. */
  cta_url?: string;

  // Timing ────────────────────────────────────────────────────────────
  /** IANA timezone identifier, e.g. "Asia/Jerusalem". */
  timezone?: string;
}

/** Raw row from the `events` table. */
export interface EventRow {
  id: string;

  /** Visitor-facing title per language. */
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

// ─── Form payload ──────────────────────────────────────────────────────

/**
 * Flat form payload the dashboard edits. The form always binds to a
 * single primary language — `name`/`description` are the single editable
 * strings and we route them to the `name_{lang}`/`description_{lang}`
 * DB column before insert.
 */
export interface EventInput {
  /** Primary language of the event (he/en/ar). */
  primary_language: EventLanguage;

  /** Event title in the primary language. */
  name: string;
  /** Short description in the primary language. */
  description: string;

  event_type: string;

  // Date & time
  event_date: string;
  event_end_date: string;
  timezone: string;

  // Location mode
  is_online: boolean;
  online_url: string;
  online_platform: string;
  location: string;
  location_url: string;
  parking_info: string;

  // Media
  image_url: string;
  intro_video_url: string;

  // Organizer
  organizer_name: string;
  organizer_email: string;
  organizer_phone: string;
  organizer_website: string;

  // Rich structured content
  speakers: EventSpeaker[];
  schedule: EventScheduleItem[];
  highlights: EventHighlight[];
  faq: EventFaqItem[];
  testimonials: EventTestimonial[];
  featured_programs: EventBadge[];
  gallery: EventGalleryImage[];
  tags: string[];

  // Free-form text
  agenda: string;
  what_to_bring: string;
  dress_code: string;
  audience: string;
  event_language: string;
  price_info: string;
  refreshments: string;
  hashtag: string;
  certificate_info: string;

  // Registration
  registration_url: string;
  registration_deadline: string;
  capacity: string; // kept as string so blank = unset
  registered_count: string;

  // Hybrid / post-event
  livestream_url: string;
  recording_url: string;

  // Custom CTA button
  cta_label: string;
  cta_url: string;

  is_active: boolean;
}

/** Starter values for the "new event" flow. */
export const EMPTY_EVENT: EventInput = {
  primary_language: "he",
  name: "",
  description: "",
  event_type: "open_day",
  event_date: "",
  event_end_date: "",
  timezone: "Asia/Jerusalem",
  is_online: false,
  online_url: "",
  online_platform: "",
  location: "",
  location_url: "",
  parking_info: "",
  image_url: "",
  intro_video_url: "",
  organizer_name: "",
  organizer_email: "",
  organizer_phone: "",
  organizer_website: "",
  speakers: [],
  schedule: [],
  highlights: [],
  faq: [],
  testimonials: [],
  featured_programs: [],
  gallery: [],
  tags: [],
  agenda: "",
  what_to_bring: "",
  dress_code: "",
  audience: "",
  event_language: "",
  price_info: "",
  refreshments: "",
  hashtag: "",
  certificate_info: "",
  registration_url: "",
  registration_deadline: "",
  capacity: "",
  registered_count: "",
  livestream_url: "",
  recording_url: "",
  cta_label: "",
  cta_url: "",
  is_active: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────

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
 *
 * We write the primary-language name/description into the matching
 * column (name_he, name_en, name_ar OR description_he, description_en,
 * meta.description_ar) and clear the others. Everything else lands in
 * `meta` (JSONB), which is the only place we can freely extend without
 * a migration.
 */
export function toEventRow(input: EventInput): Omit<EventRow, "id" | "created_at" | "updated_at"> {
  const meta: EventMeta = { primary_language: input.primary_language };

  // Flat location/organizer fields
  if (input.location_url) meta.location_url = input.location_url;
  if (input.is_online) meta.is_online = true;
  if (input.online_url) meta.online_url = input.online_url;
  if (input.online_platform) meta.online_platform = input.online_platform;
  if (input.organizer_name) meta.organizer_name = input.organizer_name;
  if (input.organizer_email) meta.organizer_email = input.organizer_email;
  if (input.organizer_phone) meta.organizer_phone = input.organizer_phone;
  if (input.organizer_website) meta.organizer_website = input.organizer_website;

  // Media
  if (input.image_url) meta.image_url = input.image_url;
  if (input.intro_video_url) meta.intro_video_url = input.intro_video_url;
  if (input.gallery.length > 0) meta.gallery = input.gallery;

  // Free-form text extras
  if (input.timezone) meta.timezone = input.timezone;
  if (input.agenda) meta.agenda = input.agenda;
  if (input.what_to_bring) meta.what_to_bring = input.what_to_bring;
  if (input.parking_info) meta.parking_info = input.parking_info;
  if (input.dress_code) meta.dress_code = input.dress_code;
  if (input.audience) meta.audience = input.audience;
  if (input.event_language) meta.event_language = input.event_language;
  if (input.price_info) meta.price_info = input.price_info;
  if (input.refreshments) meta.refreshments = input.refreshments;
  if (input.hashtag) meta.hashtag = input.hashtag;
  if (input.certificate_info) meta.certificate_info = input.certificate_info;

  // Registration
  if (input.registration_url) meta.registration_url = input.registration_url;
  if (input.registration_deadline) meta.registration_deadline = input.registration_deadline;
  if (input.capacity && Number(input.capacity) > 0) meta.capacity = Number(input.capacity);
  if (input.registered_count && Number(input.registered_count) > 0) {
    meta.registered_count = Number(input.registered_count);
  }

  // Hybrid / post-event
  if (input.livestream_url) meta.livestream_url = input.livestream_url;
  if (input.recording_url) meta.recording_url = input.recording_url;

  // Custom CTA
  if (input.cta_label) meta.cta_label = input.cta_label;
  if (input.cta_url) meta.cta_url = input.cta_url;

  // Rich structured lists (only persist non-empty arrays)
  if (input.speakers.length > 0) meta.speakers = input.speakers;
  if (input.schedule.length > 0) meta.schedule = input.schedule;
  if (input.highlights.length > 0) meta.highlights = input.highlights;
  if (input.faq.length > 0) meta.faq = input.faq;
  if (input.testimonials.length > 0) meta.testimonials = input.testimonials;
  if (input.featured_programs.length > 0) meta.featured_programs = input.featured_programs;
  if (input.tags.length > 0) meta.tags = input.tags;

  // Route name/description into the correct per-language columns
  const lang = input.primary_language;
  const name_he = lang === "he" ? input.name : "";
  const name_en = lang === "en" ? input.name : null;
  const name_ar = lang === "ar" ? input.name : null;
  const description_he = lang === "he" ? input.description : null;
  const description_en = lang === "en" ? input.description : null;
  if (lang === "ar") meta.description_ar = input.description;

  // name_he is NOT-NULL in the schema. If primary isn't Hebrew, store the
  // title there anyway so the row always has a non-null he column.
  const finalNameHe = name_he || input.name;

  return {
    name_he: finalNameHe,
    name_en,
    name_ar,
    description_he,
    description_en,
    location: input.is_online ? null : input.location || null,
    event_date: input.event_date,
    event_end_date: input.event_end_date || null,
    event_type: input.event_type || "open_day",
    meta,
    is_active: input.is_active,
  };
}

/** Extract form-friendly values from a DB row (inverse of toEventRow). */
export function fromEventRow(row: EventRow): EventInput {
  const meta = row.meta || {};
  const lang: EventLanguage = meta.primary_language
    || (row.name_en ? "en" : row.name_ar ? "ar" : "he");

  // Pick the authoritative name/description for the primary language
  const name =
    lang === "en" ? row.name_en || row.name_he
    : lang === "ar" ? row.name_ar || row.name_he
    : row.name_he;
  const description =
    lang === "en" ? row.description_en || ""
    : lang === "ar" ? meta.description_ar || ""
    : row.description_he || "";

  return {
    primary_language: lang,
    name: name || "",
    description: description || "",
    event_type: row.event_type || "open_day",
    event_date: row.event_date,
    event_end_date: row.event_end_date || "",
    timezone: meta.timezone || "Asia/Jerusalem",
    is_online: !!meta.is_online,
    online_url: meta.online_url || "",
    online_platform: meta.online_platform || "",
    location: row.location || "",
    location_url: meta.location_url || "",
    parking_info: meta.parking_info || "",
    image_url: meta.image_url || "",
    intro_video_url: meta.intro_video_url || "",
    organizer_name: meta.organizer_name || "",
    organizer_email: meta.organizer_email || "",
    organizer_phone: meta.organizer_phone || "",
    organizer_website: meta.organizer_website || "",
    speakers: meta.speakers || [],
    schedule: meta.schedule || [],
    highlights: meta.highlights || [],
    faq: meta.faq || [],
    testimonials: meta.testimonials || [],
    featured_programs: meta.featured_programs || [],
    gallery: meta.gallery || [],
    tags: meta.tags || [],
    agenda: meta.agenda || "",
    what_to_bring: meta.what_to_bring || "",
    dress_code: meta.dress_code || "",
    audience: meta.audience || "",
    event_language: meta.event_language || "",
    price_info: meta.price_info || "",
    refreshments: meta.refreshments || "",
    hashtag: meta.hashtag || "",
    certificate_info: meta.certificate_info || "",
    registration_url: meta.registration_url || "",
    registration_deadline: meta.registration_deadline || "",
    capacity: meta.capacity ? String(meta.capacity) : "",
    registered_count: meta.registered_count ? String(meta.registered_count) : "",
    livestream_url: meta.livestream_url || "",
    recording_url: meta.recording_url || "",
    cta_label: meta.cta_label || "",
    cta_url: meta.cta_url || "",
    is_active: row.is_active,
  };
}
