/**
 * Single source of truth for all section type metadata.
 * Every consumer (palette, shared-sections, templates, etc.) should import
 * from here instead of defining its own local maps.
 */

import {
  LayoutTemplate,
  FileText,
  Video,
  BarChart3,
  HelpCircle,
  Quote,
  BookOpen,
  MousePointerClick,
  MessageCircle,
  PanelTop,
  ChevronDown,
  ImageIcon,
  Code2,
  Info,
  Briefcase,
  Users,
  Map as MapPin,
  Timer,
  Star,
  CalendarDays,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Palette grouping category for a section type */
export type SectionCategory =
  | "structure"
  | "content"
  | "media"
  | "social"
  | "conversion";

/**
 * Full metadata for a single section type.
 * This is the canonical definition used across the entire app.
 */
export interface SectionTypeMeta {
  /** Internal key used in the DB and throughout code (snake_case) */
  type: string;
  /** Hebrew label shown to end users */
  labelHe: string;
  /** Short English label used in developer-facing UIs */
  labelEn: string;
  /** Lucide icon that represents this section type */
  icon: LucideIcon;
  /** One-line description for palette tooltips and help text */
  description: string;
  /** Grouping category used to organise the section palette */
  category: SectionCategory;
  /** Tailwind classes for the badge shown in the templates editor */
  badgeColor: string;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Complete registry of every section type known to the application.
 * Add new section types here and they will automatically propagate to all
 * consumers that derive their data from this array.
 */
export const SECTION_REGISTRY: SectionTypeMeta[] = [
  {
    type: "hero",
    labelHe: "כותרת ראשית",
    labelEn: "Hero",
    icon: LayoutTemplate,
    description: "Main hero banner with background image and CTA",
    category: "structure",
    badgeColor: "bg-yellow-100 text-yellow-700",
  },
  {
    type: "program_info_bar",
    labelHe: "סרגל מידע על התוכנית",
    labelEn: "Program Info Bar",
    icon: Info,
    description: "Compact bar showing key program details",
    category: "structure",
    badgeColor: "bg-gray-100 text-gray-600",
  },
  {
    type: "about",
    labelHe: "אודות",
    labelEn: "About",
    icon: GraduationCap,
    description: "About section describing the program or institution",
    category: "content",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    type: "benefits",
    labelHe: "יתרונות",
    labelEn: "Benefits",
    icon: Star,
    description: "Highlighted benefits or selling points",
    category: "content",
    badgeColor: "bg-green-100 text-green-700",
  },
  {
    type: "stats",
    labelHe: "סטטיסטיקות",
    labelEn: "Stats",
    icon: BarChart3,
    description: "Animated stat counters",
    category: "content",
    badgeColor: "bg-cyan-100 text-cyan-700",
  },
  {
    type: "testimonials",
    labelHe: "המלצות",
    labelEn: "Testimonials",
    icon: Quote,
    description: "Student or alumni quotes",
    category: "content",
    badgeColor: "bg-pink-100 text-pink-700",
  },
  {
    type: "faq",
    labelHe: "שאלות נפוצות",
    labelEn: "FAQ",
    icon: HelpCircle,
    description: "Frequently asked questions",
    category: "content",
    badgeColor: "bg-teal-100 text-teal-700",
  },
  {
    type: "curriculum",
    labelHe: "תוכנית לימודים",
    labelEn: "Curriculum",
    icon: BookOpen,
    description: "Program curriculum and course list",
    category: "content",
    badgeColor: "bg-indigo-100 text-indigo-700",
  },
  {
    type: "career",
    labelHe: "קריירה",
    labelEn: "Career",
    icon: Briefcase,
    description: "Career paths and job outcomes",
    category: "content",
    badgeColor: "bg-orange-100 text-orange-700",
  },
  {
    type: "faculty",
    labelHe: "סגל",
    labelEn: "Faculty",
    icon: Users,
    description: "Faculty and staff profiles",
    category: "content",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  {
    type: "admission",
    labelHe: "תנאי קבלה",
    labelEn: "Admission",
    icon: FileText,
    description: "Admission requirements and process",
    category: "content",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  {
    type: "program_outcomes",
    labelHe: "תוצאות התוכנית",
    labelEn: "Program Outcomes",
    icon: GraduationCap,
    description: "Learning outcomes and graduate achievements",
    category: "content",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    type: "cta",
    labelHe: "קריאה לפעולה",
    labelEn: "CTA Banner",
    icon: MousePointerClick,
    description: "Call-to-action banner",
    category: "conversion",
    badgeColor: "bg-lime-100 text-lime-700",
  },
  {
    type: "form",
    labelHe: "טופס לידים",
    labelEn: "Lead Form",
    icon: FileText,
    description: "Lead capture form",
    category: "conversion",
    badgeColor: "bg-lime-100 text-lime-700",
  },
  {
    type: "contact_info",
    labelHe: "פרטי יצירת קשר",
    labelEn: "Contact Info",
    icon: MessageCircle,
    description: "Contact details and address block",
    category: "conversion",
    badgeColor: "bg-slate-100 text-slate-700",
  },
  {
    type: "whatsapp",
    labelHe: "WhatsApp צף",
    labelEn: "WhatsApp",
    icon: MessageCircle,
    description: "Floating WhatsApp button",
    category: "social",
    badgeColor: "bg-green-100 text-green-600",
  },
  {
    type: "video",
    labelHe: "וידאו",
    labelEn: "Video",
    icon: Video,
    description: "YouTube or Vimeo embed",
    category: "media",
    badgeColor: "bg-red-100 text-red-700",
  },
  {
    type: "gallery",
    labelHe: "גלריה",
    labelEn: "Gallery",
    icon: ImageIcon,
    description: "Image gallery or carousel",
    category: "media",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  {
    type: "single_image",
    labelHe: "תמונה בודדת",
    labelEn: "Single Image",
    icon: ImageIcon,
    description: "One full-width image with optional caption — no heading, no CTA",
    category: "media",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  {
    type: "map",
    labelHe: "מפה",
    labelEn: "Map",
    icon: MapPin,
    description: "Embedded Google Maps location",
    category: "media",
    badgeColor: "bg-sky-100 text-sky-700",
  },
  {
    type: "countdown",
    labelHe: "ספירה לאחור",
    labelEn: "Countdown",
    icon: Timer,
    description: "Countdown timer to a deadline or event",
    category: "content",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    type: "event",
    labelHe: "אירוע / יום פתוח",
    labelEn: "Event",
    icon: CalendarDays,
    description: "Open day or event details block",
    category: "content",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  {
    type: "sticky_header",
    labelHe: "כותרת נצמדת",
    labelEn: "Sticky Header",
    icon: PanelTop,
    description: "Sticky top navigation bar",
    category: "structure",
    badgeColor: "bg-gray-100 text-gray-600",
  },
  {
    type: "accordion",
    labelHe: "אקורדיון",
    labelEn: "Accordion",
    icon: ChevronDown,
    description: "Expandable content sections",
    category: "content",
    badgeColor: "bg-gray-100 text-gray-600",
  },
  {
    type: "custom_html",
    labelHe: "HTML מותאם",
    labelEn: "Custom HTML",
    icon: Code2,
    description: "Raw HTML block",
    category: "content",
    badgeColor: "bg-gray-100 text-gray-600",
  },
];

// ---------------------------------------------------------------------------
// Derived look-up maps (computed once, used everywhere)
// ---------------------------------------------------------------------------

/**
 * Fast O(1) look-up of a section's full metadata by its type key.
 * Prefer this over iterating SECTION_REGISTRY when you only need one entry.
 * Uses globalThis.Map to avoid name collision with the lucide-react Map icon alias.
 */
export const SECTION_REGISTRY_MAP: Readonly<globalThis.Map<string, SectionTypeMeta>> = new globalThis.Map(
  SECTION_REGISTRY.map((entry) => [entry.type, entry] as [string, SectionTypeMeta])
);

/**
 * Record mapping each section type to its Hebrew label.
 * Drop-in replacement for all the local `SECTION_TYPE_LABELS` constants
 * that previously lived in each page file.
 *
 * @example
 * import { SECTION_TYPE_LABELS } from "@/lib/sections/registry";
 * const label = SECTION_TYPE_LABELS[section.section_type] ?? section.section_type;
 */
export const SECTION_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(SECTION_REGISTRY.map((entry) => [entry.type, entry.labelHe]))
);

/**
 * Record mapping each section type to the badge color classes used in the
 * templates editor.  Replaces the `color` field in the old local SECTION_CONFIG.
 *
 * @example
 * import { SECTION_BADGE_COLORS } from "@/lib/sections/registry";
 * const colorClasses = SECTION_BADGE_COLORS[type] ?? "bg-gray-100 text-gray-600";
 */
export const SECTION_BADGE_COLORS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(SECTION_REGISTRY.map((entry) => [entry.type, entry.badgeColor]))
);

/**
 * Ordered list of every known section type key.
 * Useful when building <select> dropdowns or iteration order matters.
 */
export const ALL_SECTION_TYPE_KEYS: readonly string[] = Object.freeze(
  SECTION_REGISTRY.map((entry) => entry.type)
);
