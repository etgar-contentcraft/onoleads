// ============================================================================
// OnoLeads Database Types
// Maps to Supabase schema tables
// ============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ProgramLevel = "bachelor" | "master" | "certificate" | "continuing_ed";

export type DegreeType = string; // e.g. "B.A.", "M.A.", "B.Sc.", etc.

export type Language = "he" | "en" | "ar";

export type PageStatus = "draft" | "published" | "archived";

export type PageType = "degree" | "event" | "sales" | "specialization";

export type TemplateType =
  | "degree_program"
  | "event"
  | "sales_event"
  | "specialization";

export type WebhookStatus = "pending" | "sent" | "failed";

export type DeviceType = "desktop" | "mobile" | "tablet";

export type EventType = string; // e.g. "open_day", "webinar", "info_session"

// ---------------------------------------------------------------------------
// Faculty
// ---------------------------------------------------------------------------

export interface Faculty {
  id: string;
  name_he: string;
  name_en: string | null;
  name_ar: string | null;
  slug: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type FacultyInsert = Omit<Faculty, "id" | "created_at" | "updated_at">;
export type FacultyUpdate = Partial<FacultyInsert>;

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

export interface CareerOutcome {
  title_he: string;
  title_en?: string;
  title_ar?: string;
  icon?: string;
}

export interface ProgramMeta {
  [key: string]: unknown;
}

export interface Program {
  id: string;
  faculty_id: string;
  name_he: string;
  name_en: string | null;
  name_ar: string | null;
  slug: string;
  degree_type: DegreeType;
  level: ProgramLevel;
  original_url: string | null;
  description_he: string | null;
  description_en: string | null;
  description_ar: string | null;
  duration_semesters: number | null;
  campuses: string[];
  schedule_options: string[];
  is_international: boolean;
  is_active: boolean;
  hero_image_url: string | null;
  hero_stat_value: string | null;
  hero_stat_label_he: string | null;
  hero_stat_label_en: string | null;
  career_outcomes: CareerOutcome[] | null;
  meta: ProgramMeta | null;
  /** Slug of the featured landing page for this program, linked from the homepage finder. Null = use program slug. */
  featured_page_slug: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type ProgramInsert = Omit<Program, "id" | "created_at" | "updated_at">;
export type ProgramUpdate = Partial<ProgramInsert>;

/** Program row joined with its faculty for list views */
export interface ProgramWithFaculty extends Program {
  faculty?: Faculty | null;
}

// ---------------------------------------------------------------------------
// Specialization
// ---------------------------------------------------------------------------

export interface Specialization {
  id: string;
  program_id: string;
  name_he: string;
  name_en: string | null;
  name_ar: string | null;
  slug: string;
  promote_as_standalone: boolean;
  description_he: string | null;
  description_en: string | null;
  description_ar: string | null;
  meta: Record<string, unknown> | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type SpecializationInsert = Omit<
  Specialization,
  "id" | "created_at" | "updated_at"
>;
export type SpecializationUpdate = Partial<SpecializationInsert>;

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  section_schema: Record<string, unknown> | null;
  default_styles: Record<string, unknown> | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type TemplateInsert = Omit<Template, "id" | "created_at" | "updated_at">;
export type TemplateUpdate = Partial<TemplateInsert>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export interface Page {
  id: string;
  program_id: string | null;
  specialization_id: string | null;
  template_id: string | null;
  title_he: string;
  title_en: string | null;
  title_ar: string | null;
  slug: string;
  language: Language;
  status: PageStatus;
  page_type: PageType;
  seo_title: string | null;
  seo_description: string | null;
  custom_styles: Record<string, unknown> | null;
  published_at: string | null;
  last_built_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PageInsert = Omit<Page, "id" | "created_at" | "updated_at">;
export type PageUpdate = Partial<PageInsert>;

// ---------------------------------------------------------------------------
// PageSection
// ---------------------------------------------------------------------------

export interface PageSection {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  is_visible: boolean;
  content: Record<string, unknown> | null;
  styles: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export type PageSectionInsert = Omit<
  PageSection,
  "id" | "created_at" | "updated_at"
>;
export type PageSectionUpdate = Partial<PageSectionInsert>;

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

export interface Lead {
  id: string;
  page_id: string | null;
  program_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  program_interest: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  cookie_id: string | null;
  device_type: DeviceType | null;
  webhook_status: WebhookStatus;
  created_at: string;
}

export type LeadInsert = Omit<Lead, "id" | "created_at">;
export type LeadUpdate = Partial<LeadInsert>;

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export interface Media {
  id: string;
  filename: string;
  storage_path: string;
  url: string;
  mime_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text_he: string | null;
  alt_text_en: string | null;
  folder: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MediaInsert = Omit<Media, "id" | "created_at" | "updated_at">;
export type MediaUpdate = Partial<MediaInsert>;

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

export interface Event {
  id: string;
  name_he: string;
  name_en: string | null;
  name_ar: string | null;
  event_type: EventType;
  event_date: string | null;
  location: string | null;
  programs: string[] | null;
  page_id: string | null;
  is_active: boolean;
  meta: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export type EventInsert = Omit<Event, "id" | "created_at" | "updated_at">;
export type EventUpdate = Partial<EventInsert>;
