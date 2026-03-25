/**
 * Premium Visual Page Builder
 * Two-panel layout: left = section library, right = current page sections.
 * Features: add sections, drag-to-reorder, up/down controls, visibility toggle,
 * per-section content edit modal, delete with confirmation, auto-save to Supabase.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import type { PageSection } from "@/lib/types/database";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";
import { ONO_TY_DEFAULTS } from "@/lib/types/thank-you";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Plus,
  GripVertical,
  ExternalLink,
  Save,
  Loader2,
  Check,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Layers,
  X,
  AlertTriangle,
  Settings2,
  Users,
  Globe,
  Search,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-page settings that override the global settings defaults */
interface PageOverrideSettings {
  webhook_url?: string;
  whatsapp_number?: string;
  phone_number?: string;
  logo_url?: string;
  default_cta_text?: string;
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  /** "true" to enable exit-intent popup on this page (off by default) */
  exit_intent_enabled?: string;
  /** "true" to enable social proof toast on this page (off by default) */
  social_proof_enabled?: string;
  /** Days window for social proof count, stored as string */
  social_proof_days?: string;
}

/** A shared (global) section from the shared_sections library */
interface GlobalSectionItem {
  id: string;
  name_he: string;
  section_type: string;
  category: string;
  content: Record<string, unknown>;
  styles: Record<string, unknown> | null;
}

/** A saved version snapshot of page sections */
interface PageVersion {
  id: string;
  version_num: number;
  sections_snapshot: Record<string, unknown>[];
  created_at: string;
  created_by: string | null;
}

interface PageData {
  id: string;
  title_he: string | null;
  slug: string;
  status: string;
  custom_styles?: Record<string, unknown> | null;
}

interface SectionLibraryItem {
  type: string;
  nameHe: string;
  descriptionHe: string;
  /** Tailwind bg color for the icon area */
  color: string;
  /** SVG path data for the icon */
  iconPath: string;
}

// ---------------------------------------------------------------------------
// Section library — all available section types
// ---------------------------------------------------------------------------

const SECTION_LIBRARY: SectionLibraryItem[] = [
  {
    type: "hero",
    nameHe: "כותרת ראשית",
    descriptionHe: "Hero מלא עם תמונת רקע וקריאה לפעולה",
    color: "bg-violet-100 text-violet-600",
    iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  },
  {
    type: "program_info_bar",
    nameHe: "פס מידע",
    descriptionHe: "משך, קמפוס, מסגרת, תואר",
    color: "bg-blue-100 text-blue-600",
    iconPath: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  },
  {
    type: "about",
    nameHe: "אודות",
    descriptionHe: "תיאור, תמונה ורשימת נקודות מפתח",
    color: "bg-cyan-100 text-cyan-600",
    iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  {
    type: "benefits",
    nameHe: "יתרונות",
    descriptionHe: "גריד יתרונות עם כותרות ותיאורים",
    color: "bg-amber-100 text-amber-600",
    iconPath: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 0 0 .95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 0 0-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 0 0-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 0 0-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 0 0 .951-.69l1.519-4.674z",
  },
  {
    type: "curriculum",
    nameHe: "תוכנית לימודים",
    descriptionHe: "אקורדיון שנתי עם קורסים",
    color: "bg-green-100 text-green-600",
    iconPath: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
  {
    type: "career",
    nameHe: "אפשרויות קריירה",
    descriptionHe: "תפקידים ואפשרויות תעסוקה בוגרים",
    color: "bg-teal-100 text-teal-600",
    iconPath: "M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m4 6h.01M5 20h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z",
  },
  {
    type: "testimonials",
    nameHe: "המלצות",
    descriptionHe: "קרוסלת ציטוטים מסטודנטים",
    color: "bg-pink-100 text-pink-600",
    iconPath: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  },
  {
    type: "faculty",
    nameHe: "סגל אקדמי",
    descriptionHe: "גריד חברי סגל עם תמונות ותפקידים",
    color: "bg-indigo-100 text-indigo-600",
    iconPath: "M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
  },
  {
    type: "stats",
    nameHe: "נתונים",
    descriptionHe: "סטטיסטיקות עם אנימציית מספרים",
    color: "bg-orange-100 text-orange-600",
    iconPath: "M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 0-2 2h-2a2 2 0 0 1-2-2z",
  },
  {
    type: "faq",
    nameHe: "שאלות נפוצות",
    descriptionHe: "אקורדיון שאלות ותשובות",
    color: "bg-rose-100 text-rose-600",
    iconPath: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  {
    type: "video",
    nameHe: "סרטונים",
    descriptionHe: "הטמעת סרטוני YouTube",
    color: "bg-red-100 text-red-600",
    iconPath: "M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z",
  },
  {
    type: "gallery",
    nameHe: "גלריה",
    descriptionHe: "גלריית תמונות עם כיתובים",
    color: "bg-lime-100 text-lime-600",
    iconPath: "M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z",
  },
  {
    type: "admission",
    nameHe: "תנאי קבלה",
    descriptionHe: "דרישות ותנאי קבלה לתוכנית",
    color: "bg-sky-100 text-sky-600",
    iconPath: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  {
    type: "map",
    nameHe: "מפה ומיקום",
    descriptionHe: "מפת מיקום לאירועים",
    color: "bg-emerald-100 text-emerald-600",
    iconPath: "M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  },
  {
    type: "cta",
    nameHe: "קריאה לפעולה",
    descriptionHe: "באנר CTA עם כפתור בולט",
    color: "bg-yellow-100 text-yellow-600",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    type: "whatsapp",
    nameHe: "וואטסאפ",
    descriptionHe: "כפתור WhatsApp צף עם הודעה",
    color: "bg-green-100 text-green-700",
    iconPath: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M11.999 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.944-1.376A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z",
  },
  {
    type: "event",
    nameHe: "אירוע / יום פתוח",
    descriptionHe: "הגדרות לדף אירוע (תאריך, מיקום, לוז, דוברים)",
    color: "bg-purple-100 text-purple-600",
    iconPath: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z",
  },
  {
    type: "countdown",
    nameHe: "טיימר ספירה לאחור",
    descriptionHe: "יוצר דחיפות — קבוע לתאריך מסוים או evergreen לכל מבקר",
    color: "bg-rose-100 text-rose-600",
    iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

/** Default content per section type */
function getDefaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        heading_he: "כותרת ראשית",
        subheading_he: "כותרת משנה",
        cta_text_he: "השאירו פרטים",
        stat_value: "",
        stat_label_he: "",
        background_image_url: "",
      };
    case "program_info_bar":
      return { duration: "", campus: "", format: "", degree: "" };
    case "about":
      return { heading_he: "אודות התוכנית", description_he: "", image_url: "", bullets: [] };
    case "benefits":
      return { heading_he: "למה ללמוד אצלנו", items: [] };
    case "curriculum":
      return { heading_he: "תוכנית הלימודים", years: [] };
    case "career":
      return { heading_he: "אפשרויות קריירה", items: [] };
    case "testimonials":
      return { heading_he: "מה אומרים הסטודנטים", items: [] };
    case "faculty":
      return { heading_he: "הסגל האקדמי", members: [] };
    case "stats":
      return { heading_he: "אנו במספרים", stats: [] };
    case "faq":
      return { heading_he: "שאלות נפוצות", items: [] };
    case "video":
      return { heading_he: "צפו בסרטון", videos: [] };
    case "gallery":
      return { heading_he: "גלריה", images: [] };
    case "admission":
      return { heading_he: "תנאי קבלה", requirements: [] };
    case "map":
      return { heading_he: "מיקום", address: "", map_url: "" };
    case "countdown":
      return {
        heading_he: "הרשמה מוקדמת מסתיימת בקרוב",
        subheading_he: "אל תפספסו את ההזדמנות",
        badge_he: "⏰ הצעה מוגבלת בזמן",
        mode: "evergreen",
        interval_days: "7",
        target_date: "",
        expired_text_he: "ההרשמה הסתיימה. צרו קשר לבדיקת מקומות",
      };
    case "cta":
      return { heading_he: "מוכנים להתחיל?", description_he: "", button_text_he: "להרשמה", phone: "" };
    case "whatsapp":
      return { phone: "", message_he: "היי, אשמח לקבל פרטים" };
    case "event":
      return {
        heading_he: "יום פתוח",
        description_he: "",
        event_type: "event_physical",
        event_date: "",
        event_time: "",
        venue: "",
        google_maps_url: "",
        zoom_link: "",
        parking_info: "",
        programs_featured: [],
        schedule: [],
        speakers: [],
        faq: [],
      };
    default:
      return {};
  }
}

/** Hebrew labels for section types — used in the canvas list */
const SECTION_LABELS: Record<string, string> = {
  hero: "כותרת ראשית",
  program_info_bar: "פס מידע",
  about: "אודות",
  benefits: "יתרונות",
  curriculum: "תוכנית לימודים",
  career: "אפשרויות קריירה",
  testimonials: "המלצות",
  faculty: "סגל אקדמי",
  stats: "נתונים",
  faq: "שאלות נפוצות",
  video: "סרטונים",
  gallery: "גלריה",
  admission: "תנאי קבלה",
  map: "מפה ומיקום",
  cta: "קריאה לפעולה",
  whatsapp: "וואטסאפ",
  event: "אירוע / יום פתוח",
};

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

interface ToastState {
  message: string;
  type: "success" | "error";
}

// ---------------------------------------------------------------------------
// Sortable section row component
// ---------------------------------------------------------------------------

function SortableSectionRow({
  section,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onEdit,
  onDelete,
}: {
  section: PageSection;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const libItem = SECTION_LIBRARY.find((s) => s.type === section.section_type);
  const label = SECTION_LABELS[section.section_type] || section.section_type;
  const content = section.content as Record<string, unknown> | null;

  /** Extract a short preview string from content */
  const preview = (() => {
    if (!content) return "";
    const h = content.heading_he || content.title_he;
    if (typeof h === "string" && h) return h;
    return "";
  })();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 ${
        !section.is_visible
          ? "border-[#E5E5E5] bg-[#FAFAFA] opacity-60"
          : "border-[#E5E5E5] bg-white hover:border-[#B8D900]/50 hover:shadow-sm"
      }`}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-[#C8C4C8] hover:text-[#9A969A] transition-colors shrink-0"
        {...attributes}
        {...listeners}
        title="גרור לשינוי סדר"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Section icon */}
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          libItem?.color ?? "bg-gray-100 text-gray-500"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={libItem?.iconPath ?? "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </div>

      {/* Section info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#9A969A] bg-[#F3F4F6] rounded px-1.5 py-0.5">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-[#2A2628]">{label}</span>
          {!section.is_visible && (
            <Badge className="text-[10px] bg-[#F3F4F6] text-[#9A969A] border-0 px-1.5">
              מוסתר
            </Badge>
          )}
          {section.shared_section_id && (
            <Badge className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-1.5 gap-1">
              🔗 גלובלי
            </Badge>
          )}
        </div>
        {preview && (
          <p className="text-xs text-[#9A969A] mt-0.5 truncate">{preview}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Move up */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={index === 0}
          className="h-8 w-8 p-0 text-[#C8C4C8] hover:text-[#4A4648] disabled:opacity-30"
          title="הזז למעלה"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>

        {/* Move down */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="h-8 w-8 p-0 text-[#C8C4C8] hover:text-[#4A4648] disabled:opacity-30"
          title="הזז למטה"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>

        {/* Visibility */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleVisibility}
          className={`h-8 w-8 p-0 transition-colors ${
            section.is_visible
              ? "text-[#B8D900] hover:text-[#9AB800]"
              : "text-[#C8C4C8] hover:text-[#9A969A]"
          }`}
          title={section.is_visible ? "הסתר" : "הצג"}
        >
          {section.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>

        {/* Edit */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#4A4648] opacity-0 group-hover:opacity-100 transition-all"
          title="ערוך תוכן"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-[#C8C4C8] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
          title="מחק"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File-scope field helper components for the Section Edit Modal.
// Defined here (not inside SectionEditModal) to prevent React from treating
// them as new component types on every render, which would cause inputs to
// unmount/remount and lose focus on every keystroke.
// ---------------------------------------------------------------------------

/** Tooltip hint showing supported DTR variables — shown below text fields */
const DTR_HINT = (
  <p className="text-[10px] text-[#B8D900]/80 mt-0.5 font-mono leading-relaxed" dir="ltr">
    ⓘ תומך ב: {"{{utm_source}}"} {"{{utm_campaign}}"} {"{{utm_medium}}"} {"{{utm_term}}"} {"{{utm_content}}"} {"{{referrer}}"} &#8203;| fallback: {"{{utm_source|Google}}"}
  </p>
);

/** Props shared by simple field helpers */
interface FieldProps {
  label: string;
  fieldKey: string;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  /** When true, shows the DTR variable hint below the field */
  dtrHint?: boolean;
  draft: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
}

/** Renders a labeled text input bound to draft[fieldKey] */
function Field({ label, fieldKey, placeholder = "", dir = "rtl", dtrHint, draft, set }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Input
        value={(draft[fieldKey] as string) || ""}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="h-9 text-sm"
      />
      {dtrHint && DTR_HINT}
    </div>
  );
}

interface TextareaFieldProps extends FieldProps {
  rows?: number;
}

/** Renders a labeled textarea bound to draft[fieldKey] */
function TextareaField({ label, fieldKey, placeholder = "", rows = 3, dir = "rtl", dtrHint, draft, set }: TextareaFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Textarea
        value={(draft[fieldKey] as string) || ""}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        dir={dir}
        rows={rows}
        className="text-sm resize-none"
      />
      {dtrHint && DTR_HINT}
    </div>
  );
}

interface ImageFieldProps {
  label: string;
  fieldKey: string;
  recommendedSize?: string;
  draft: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
}

/** Image field with URL input + file upload to Supabase Storage */
function ImageField({ label, fieldKey, recommendedSize, draft, set }: ImageFieldProps) {
  const url = (draft[fieldKey] as string) || "";
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `sections/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const supabaseClient = createClient();
      const { error } = await supabaseClient.storage.from("media").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabaseClient.storage.from("media").getPublicUrl(path);
      set(fieldKey, urlData.publicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        {recommendedSize && (
          <span className="text-[10px] text-[#9A969A] bg-[#F3F4F6] rounded px-1.5 py-0.5">
            {recommendedSize}
          </span>
        )}
      </div>
      {/* URL input */}
      <Input
        value={url}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder="https://... או העלה תמונה"
        dir="ltr"
        className="h-9 text-sm font-mono"
      />
      {/* Upload button */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#C8C4C8] bg-[#F8F8F8] text-xs text-[#716C70] hover:border-[#B8D900] hover:text-[#2A2628] hover:bg-[#B8D900]/5 transition-all disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ImageIcon className="w-3 h-3" />
          )}
          {uploading ? "מעלה..." : "העלה תמונה"}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => set(fieldKey, "")}
            className="text-[10px] text-[#9A969A] hover:text-red-500 transition-colors"
          >
            הסר
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
      {/* Preview */}
      {url && (
        <div className="rounded-lg overflow-hidden border border-[#E5E5E5] h-28 bg-[#F3F4F6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="preview" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

interface StringListFieldProps {
  label: string;
  fieldKey: string;
  placeholder?: string;
  draft: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
}

/** Manages a simple editable list of strings */
function StringListField({ label, fieldKey, placeholder = "", draft, set }: StringListFieldProps) {
  const list = (draft[fieldKey] as string[]) || [];
  const addItem = () => set(fieldKey, [...list, ""]);
  const updateItem = (i: number, v: string) => {
    const copy = [...list];
    copy[i] = v;
    set(fieldKey, copy);
  };
  const removeItem = (i: number) => set(fieldKey, list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="h-7 gap-1 text-xs text-[#B8D900] hover:text-[#9AB800]"
        >
          <Plus className="w-3 h-3" /> הוסף
        </Button>
      </div>
      <div className="space-y-1.5">
        {list.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
              placeholder={placeholder}
              dir="rtl"
              className="h-8 text-sm flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeItem(i)}
              className="h-8 w-8 p-0 text-red-400 hover:text-red-600 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Extracts an 11-char YouTube video ID from a raw ID, watch URL, youtu.be, or embed URL.
 * Used client-side in the builder for thumbnail previews.
 */
function extractYoutubeIdLocal(input: string): string {
  if (!input) return "";
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("?")[0];
    const pathMatch = url.pathname.match(/\/(?:embed|v)\/([A-Za-z0-9_-]{11})/);
    if (pathMatch) return pathMatch[1];
    const v = url.searchParams.get("v");
    if (v) return v;
  } catch { /* not a URL */ }
  return input;
}

/**
 * Video list editor — each row has a YouTube URL/ID, title, and optional duration.
 * Shows a thumbnail preview as soon as a valid YouTube ID is detected.
 */
function VideoListField({ draft, set }: { draft: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const videos = (draft.videos as Array<Record<string, string>>) || [];
  const addVideo = () => set("videos", [...videos, { youtube_id: "", title_he: "", duration_he: "" }]);
  const updateVideo = (i: number, key: string, value: string) => {
    const copy = videos.map((v, idx) => idx === i ? { ...v, [key]: value } : v);
    set("videos", copy);
  };
  const removeVideo = (i: number) => set("videos", videos.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">סרטונים</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addVideo} className="h-7 gap-1 text-xs text-[#B8D900] hover:text-[#9AB800]">
          <Plus className="w-3 h-3" /> הוסף סרטון
        </Button>
      </div>
      {videos.length === 0 && (
        <p className="text-[11px] text-[#9A969A] bg-[#F9F9F9] rounded-lg p-3 border border-dashed border-[#E0E0E0]">
          לא נוספו סרטונים. לחצו &quot;הוסף סרטון&quot; ולהדביק קישור YouTube.
        </p>
      )}
      <div className="space-y-3">
        {videos.map((video, i) => {
          const ytId = extractYoutubeIdLocal(video.youtube_id || "");
          const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : "";
          return (
            <div key={i} className="border border-[#E5E5E5] rounded-xl p-3 space-y-2 bg-[#FAFAFA]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#9A969A]">סרטון {i + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeVideo(i)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {/* YouTube thumbnail preview */}
              {thumbUrl && (
                <div className="rounded-lg overflow-hidden border border-[#E5E5E5] aspect-video bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {/* URL / ID input */}
              <div className="space-y-1">
                <Label className="text-[11px] text-[#9A969A]">קישור YouTube או ID</Label>
                <Input
                  value={video.youtube_id || ""}
                  onChange={(e) => updateVideo(i, "youtube_id", e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... או מזהה (11 תווים)"
                  dir="ltr"
                  className="h-8 text-xs font-mono"
                />
                {video.youtube_id && !ytId && (
                  <p className="text-[10px] text-red-500">לא זוהה מזהה YouTube תקין</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[#9A969A]">כותרת סרטון</Label>
                <Input value={video.title_he || ""} onChange={(e) => updateVideo(i, "title_he", e.target.value)} placeholder="שם הסרטון..." dir="rtl" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-[#9A969A]">משך (אופציונלי, למשל 3:45)</Label>
                <Input value={video.duration_he || ""} onChange={(e) => updateVideo(i, "duration_he", e.target.value)} placeholder="3:45" dir="ltr" className="h-7 text-xs w-24" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Faculty member types and editor
// ---------------------------------------------------------------------------

/**
 * Represents a faculty member used in the faculty section editor.
 * library_id links to the faculty_members table; fields without it are draft-only edits.
 */
interface FacultyMemberData {
  library_id?: string;
  name_he: string;
  name_en?: string;
  title_he?: string;
  image_url?: string;
  phone?: string;
  email?: string;
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  website_url?: string;
}

/**
 * Faculty member editor with library picker and inline create/edit form.
 * @param draft - The current section draft content
 * @param set   - Setter function for draft keys
 */
function FacultyMemberEditor({ draft, set }: { draft: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const supabase = createClient();
  const members = (draft.members as FacultyMemberData[]) || [];

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<FacultyMemberData[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{ index: number; data: FacultyMemberData } | null>(null);

  // Form state for new/edit member
  const [form, setForm] = useState<FacultyMemberData>({ name_he: "" });
  const [formSaving, setFormSaving] = useState(false);

  /** Fetch all members from the faculty_members library table */
  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const { data } = await supabase.from("faculty_members").select("*").order("sort_order");
    setLibraryItems(
      (data || []).map((d: Record<string, unknown>) => ({
        library_id: d.id as string,
        name_he: d.name_he as string,
        name_en: d.name_en as string | undefined,
        title_he: d.title_he as string | undefined,
        image_url: d.image_url as string | undefined,
        phone: d.phone as string | undefined,
        email: d.email as string | undefined,
        linkedin_url: d.linkedin_url as string | undefined,
        facebook_url: d.facebook_url as string | undefined,
        instagram_url: d.instagram_url as string | undefined,
        website_url: d.website_url as string | undefined,
      }))
    );
    setLibraryLoading(false);
  }, [supabase]);

  /** Add a library member to the section's members list — skip if already added */
  const addFromLibrary = (member: FacultyMemberData) => {
    if (members.some((m) => m.library_id === member.library_id)) return;
    set("members", [...members, member]);
  };

  /** Remove a member from the section by index */
  const removeMember = (i: number) => set("members", members.filter((_, idx) => idx !== i));

  /** Open the edit form pre-filled with an existing member's data */
  const openEdit = (i: number) => {
    setEditingMember({ index: i, data: { ...members[i] } });
    setForm({ ...members[i] });
    setMemberFormOpen(true);
  };

  /** Open the create form with a blank slate */
  const openCreate = () => {
    setEditingMember(null);
    setForm({ name_he: "" });
    setMemberFormOpen(true);
  };

  /**
   * Save the member form — if editing, update draft only.
   * If creating, insert to the library first then add to draft.
   */
  const handleFormSave = async () => {
    if (!form.name_he.trim()) return;
    setFormSaving(true);
    if (editingMember !== null) {
      // Edit mode: update only within the draft (does not touch the library)
      const updated = [...members];
      updated[editingMember.index] = { ...form };
      set("members", updated);
    } else {
      // Create mode: persist to the library then add to the draft
      const { data } = await supabase
        .from("faculty_members")
        .insert({
          name_he: form.name_he,
          name_en: form.name_en,
          title_he: form.title_he,
          image_url: form.image_url,
          phone: form.phone,
          email: form.email,
          linkedin_url: form.linkedin_url,
          facebook_url: form.facebook_url,
          instagram_url: form.instagram_url,
          website_url: form.website_url,
        })
        .select()
        .single();
      const newMember: FacultyMemberData = { ...form, library_id: (data as { id: string } | null)?.id };
      set("members", [...members, newMember]);
    }
    setFormSaving(false);
    setMemberFormOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Selected members compact card list */}
      {members.map((m, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA]">
          {m.image_url ? (
            <img src={m.image_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#B8D900]/20 flex items-center justify-center shrink-0 text-sm font-bold text-[#8aac00]">
              {m.name_he.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#2A2628] truncate">{m.name_he}</p>
            {m.title_he && <p className="text-[11px] text-[#9A969A] truncate">{m.title_he}</p>}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(i)} className="h-7 w-7 p-0 text-[#9A969A] hover:text-[#2A2628]">
            <Pencil className="w-3 h-3" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => removeMember(i)} className="h-7 w-7 p-0 text-[#9A969A] hover:text-red-500">
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}

      {members.length === 0 && (
        <p className="text-[11px] text-[#9A969A] bg-[#F9F9F9] rounded-lg p-3 border border-dashed border-[#E0E0E0] text-center">
          לא נבחרו מרצים. בחרו מהמאגר או הוסיפו חדש.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { loadLibrary(); setLibraryOpen(true); }}
          className="flex-1 h-8 text-xs gap-1.5"
        >
          <Users className="w-3 h-3" /> בחר מהמאגר
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openCreate}
          className="flex-1 h-8 text-xs gap-1.5 text-[#B8D900] border-[#B8D900]/50 hover:bg-[#B8D900]/5"
        >
          <Plus className="w-3 h-3" /> הוסף מרצה חדש
        </Button>
      </div>

      {/* Library picker dialog */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>בחר מרצים מהמאגר</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2">
            {libraryLoading ? (
              <div className="text-center py-8 text-[#9A969A] text-sm">טוען...</div>
            ) : libraryItems.length === 0 ? (
              <div className="text-center py-8 text-[#9A969A] text-sm">המאגר ריק. הוסיפו מרצים ב&quot;מאגר מרצים&quot;.</div>
            ) : (
              libraryItems.map((m) => {
                const isAdded = members.some((s) => s.library_id === m.library_id);
                return (
                  <button
                    key={m.library_id}
                    type="button"
                    onClick={() => addFromLibrary(m)}
                    disabled={isAdded}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-right transition-all ${
                      isAdded
                        ? "border-[#B8D900]/30 bg-[#B8D900]/5 opacity-60"
                        : "border-[#E5E5E5] hover:border-[#B8D900]/50 hover:bg-[#FAFAFA]"
                    }`}
                  >
                    {m.image_url ? (
                      <img src={m.image_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#B8D900]/15 flex items-center justify-center shrink-0 font-bold text-[#8aac00]">
                        {m.name_he.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-semibold text-[#2A2628]">{m.name_he}</p>
                      {m.title_he && <p className="text-xs text-[#9A969A]">{m.title_he}</p>}
                    </div>
                    {isAdded && <Check className="w-4 h-4 text-[#B8D900] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Member create / edit dialog */}
      <Dialog open={memberFormOpen} onOpenChange={setMemberFormOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingMember !== null ? "עריכת מרצה" : "מרצה חדש"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2 px-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">שם (עברית) *</Label>
              <Input
                value={form.name_he}
                onChange={(e) => setForm((p) => ({ ...p, name_he: e.target.value }))}
                placeholder="פרופ׳ ישראל ישראלי"
                dir="rtl"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">שם (אנגלית)</Label>
              <Input
                value={form.name_en || ""}
                onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                placeholder="Prof. Israel Israeli"
                dir="ltr"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">תפקיד / ביו קצר</Label>
              <Input
                value={form.title_he || ""}
                onChange={(e) => setForm((p) => ({ ...p, title_he: e.target.value }))}
                placeholder="ראש המחלקה למשפטים, PhD"
                dir="rtl"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">תמונה (URL)</Label>
              <Input
                value={form.image_url || ""}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
                dir="ltr"
                className="h-9 text-sm font-mono text-xs"
              />
              {form.image_url && (
                <img src={form.image_url} alt="" className="w-16 h-16 rounded-full object-cover border border-[#E5E5E5]" />
              )}
            </div>

            {/* Contact details section */}
            <div className="pt-1 border-t border-[#F0F0F0]">
              <p className="text-[11px] font-semibold text-[#9A969A] mb-2 uppercase tracking-wide">פרטי קשר</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#9A969A] text-xs w-16 shrink-0">טלפון</span>
                  <Input
                    value={form.phone || ""}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="050-1234567"
                    dir="ltr"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#9A969A] text-xs w-16 shrink-0">אימייל</span>
                  <Input
                    value={form.email || ""}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="name@ono.ac.il"
                    dir="ltr"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#9A969A] text-xs w-16 shrink-0">LinkedIn</span>
                  <Input
                    value={form.linkedin_url || ""}
                    onChange={(e) => setForm((p) => ({ ...p, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                    dir="ltr"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#9A969A] text-xs w-16 shrink-0">Facebook</span>
                  <Input
                    value={form.facebook_url || ""}
                    onChange={(e) => setForm((p) => ({ ...p, facebook_url: e.target.value }))}
                    placeholder="https://facebook.com/..."
                    dir="ltr"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#9A969A] text-xs w-16 shrink-0">Instagram</span>
                  <Input
                    value={form.instagram_url || ""}
                    onChange={(e) => setForm((p) => ({ ...p, instagram_url: e.target.value }))}
                    placeholder="https://instagram.com/..."
                    dir="ltr"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#9A969A] text-xs w-16 shrink-0">אתר</span>
                  <Input
                    value={form.website_url || ""}
                    onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
                    placeholder="https://..."
                    dir="ltr"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#F0F0F0] shrink-0">
            <Button variant="outline" size="sm" onClick={() => setMemberFormOpen(false)}>
              ביטול
            </Button>
            <Button
              size="sm"
              onClick={handleFormSave}
              disabled={formSaving || !form.name_he.trim()}
              className="bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
            >
              {formSaving ? "שומר..." : "שמור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Inline image field for use inside ObjectListField rows — supports URL + file upload */
function ObjectImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `sections/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const supabaseClient = createClient();
      const { error } = await supabaseClient.storage.from("media").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabaseClient.storage.from("media").getPublicUrl(path);
      onChange(urlData.publicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-[#9A969A]">{label} <span className="text-[#C8C4C8]">400×400px</span></Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          dir="ltr"
          className="h-8 text-sm flex-1"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-dashed border-[#C8C4C8] text-[10px] text-[#9A969A] hover:border-[#B8D900] hover:text-[#2A2628] transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
          {uploading ? "..." : "העלה"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>
      {value && (
        <div className="h-16 rounded overflow-hidden border border-[#E5E5E5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}

interface ObjectListFieldProps {
  label: string;
  fieldKey: string;
  fields: Array<{ key: string; label: string; type?: "text" | "textarea" | "image" }>;
  draft: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
}

/** Manages a list of objects, each with the given fields schema */
function ObjectListField({ label, fieldKey, fields, draft, set }: ObjectListFieldProps) {
  const list = (draft[fieldKey] as Record<string, string>[]) || [];
  const emptyItem = Object.fromEntries(fields.map((f) => [f.key, ""]));
  const addItem = () => set(fieldKey, [...list, { ...emptyItem }]);
  const updateField = (i: number, k: string, v: string) => {
    const copy = list.map((item) => ({ ...item }));
    copy[i][k] = v;
    set(fieldKey, copy);
  };
  const removeItem = (i: number) => set(fieldKey, list.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="h-7 gap-1 text-xs text-[#B8D900] hover:text-[#9AB800]"
        >
          <Plus className="w-3 h-3" /> הוסף
        </Button>
      </div>
      <div className="space-y-3">
        {list.map((item, i) => (
          <div
            key={i}
            className="border border-[#E5E5E5] rounded-xl p-3 space-y-2 bg-[#FAFAFA]"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#9A969A]">פריט {i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(i)}
                className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            {fields.map((f) =>
              f.type === "textarea" ? (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[11px] text-[#9A969A]">{f.label}</Label>
                  <Textarea
                    value={item[f.key] || ""}
                    onChange={(e) => updateField(i, f.key, e.target.value)}
                    rows={2}
                    dir="rtl"
                    className="text-sm resize-none"
                  />
                </div>
              ) : f.type === "image" ? (
                <ObjectImageField
                  key={f.key}
                  label={f.label}
                  value={item[f.key] || ""}
                  onChange={(v) => updateField(i, f.key, v)}
                />
              ) : (
                <div key={f.key} className="space-y-1">
                  <Label className="text-[11px] text-[#9A969A]">{f.label}</Label>
                  <Input
                    value={item[f.key] || ""}
                    onChange={(e) => updateField(i, f.key, e.target.value)}
                    dir="rtl"
                    className="h-8 text-sm"
                  />
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Content Edit Modal
// ---------------------------------------------------------------------------

interface SectionEditModalProps {
  section: PageSection | null;
  onClose: () => void;
  onSave: (id: string, content: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

function SectionEditModal({ section, onClose, onSave, saving }: SectionEditModalProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (section) {
      setDraft(section.content ? { ...section.content as Record<string, unknown> } : {});
    }
  }, [section]);

  if (!section) return null;

  const set = (key: string, value: unknown) => setDraft((prev) => ({ ...prev, [key]: value }));

  /** Render the appropriate editor form per section type */
  const renderForm = () => {
    switch (section.section_type) {
      case "hero":
        return (
          <div className="space-y-4">
            <Field label="כותרת ראשית" fieldKey="heading_he" placeholder="כותרת ראשית..." dtrHint draft={draft} set={set} />
            <TextareaField label="כותרת משנה" fieldKey="subheading_he" placeholder="פרטים נוספים..." dtrHint draft={draft} set={set} />
            <Field label="טקסט כפתור" fieldKey="cta_text_he" placeholder="השאירו פרטים" draft={draft} set={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ערך נתון (למשל 50,000+)" fieldKey="stat_value" placeholder="50,000+" dir="ltr" draft={draft} set={set} />
              <Field label="תווית נתון" fieldKey="stat_label_he" placeholder="בוגרים" draft={draft} set={set} />
            </div>
            <ImageField label="תמונת רקע" fieldKey="background_image_url" recommendedSize="1920×1080px" draft={draft} set={set} />
          </div>
        );

      case "program_info_bar":
        return (
          <div className="space-y-4">
            <Field label="משך התוכנית" fieldKey="duration" placeholder="3 שנים" draft={draft} set={set} />
            <Field label="קמפוס" fieldKey="campus" placeholder="קריית אונו, תל אביב..." draft={draft} set={set} />
            <Field label="מסגרת לימודים" fieldKey="format" placeholder="יום / ערב / שבת" draft={draft} set={set} />
            <Field label="תואר" fieldKey="degree" placeholder="B.A., M.A., LL.B..." draft={draft} set={set} />
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אודות התוכנית" draft={draft} set={set} />
            <TextareaField label="תיאור" fieldKey="description_he" rows={4} placeholder="פסקת תיאור..." draft={draft} set={set} />
            <ImageField label="תמונה" fieldKey="image_url" recommendedSize="800×600px" draft={draft} set={set} />
            <StringListField label="נקודות מפתח" fieldKey="bullets" placeholder="נקודה מפתח..." draft={draft} set={set} />
          </div>
        );

      case "benefits":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="למה ללמוד אצלנו" draft={draft} set={set} />
            <ObjectListField
              label="יתרונות"
              fieldKey="items"
              fields={[
                { key: "title_he", label: "כותרת יתרון" },
                { key: "description_he", label: "תיאור", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "curriculum":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="תוכנית הלימודים" draft={draft} set={set} />
            <ObjectListField
              label="שנים / סמסטרים"
              fieldKey="years"
              fields={[
                { key: "title_he", label: "כותרת שנה / סמסטר" },
                { key: "courses", label: "קורסים (מופרדים בפסיק)", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "career":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אפשרויות קריירה" draft={draft} set={set} />
            <StringListField label="תפקידים ומשרות" fieldKey="items" placeholder="יועץ משפטי..." draft={draft} set={set} />
          </div>
        );

      case "testimonials":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מה אומרים הסטודנטים" draft={draft} set={set} />
            <ObjectListField
              label="המלצות"
              fieldKey="items"
              fields={[
                { key: "name", label: "שם" },
                { key: "role", label: "תפקיד / שנה" },
                { key: "quote", label: "ציטוט", type: "textarea" },
                { key: "image_url", label: "תמונה (URL)", type: "image" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "faculty":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="הסגל האקדמי" draft={draft} set={set} />
            <FacultyMemberEditor draft={draft} set={set} />
          </div>
        );

      case "stats":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אנו במספרים" draft={draft} set={set} />
            <ObjectListField
              label="נתונים"
              fieldKey="stats"
              fields={[
                { key: "value", label: "ערך (למשל 50,000+)" },
                { key: "label_he", label: "תווית" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "faq":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="שאלות נפוצות" draft={draft} set={set} />
            <ObjectListField
              label="שאלות ותשובות"
              fieldKey="items"
              fields={[
                { key: "question_he", label: "שאלה" },
                { key: "answer_he", label: "תשובה", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "video":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="צפו בסרטון" draft={draft} set={set} />
            <TextareaField label="תיאור (אופציונלי)" fieldKey="description_he" rows={2} placeholder="תיאור קצר..." draft={draft} set={set} />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">פריסה</Label>
              <div className="flex gap-2">
                {(["featured", "grid"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("layout", v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${(draft.layout || "featured") === v ? "bg-[#B8D900]/10 border-[#B8D900] text-[#2A2628]" : "border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50"}`}
                  >
                    {v === "featured" ? "נגן ראשי + רשימה" : "גריד שווה"}
                  </button>
                ))}
              </div>
            </div>
            <VideoListField draft={draft} set={set} />
          </div>
        );

      case "gallery":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="גלריה" draft={draft} set={set} />
            <ObjectListField
              label="תמונות"
              fieldKey="images"
              fields={[
                { key: "url", label: "URL תמונה", type: "image" },
                { key: "caption_he", label: "כיתוב" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "admission": {
        // Detect multi-track vs single-track and render appropriate editor
        const hasTracks = Array.isArray(draft.tracks) && (draft.tracks as unknown[]).length > 0;
        const tracks = (draft.tracks as Array<Record<string, unknown>>) || [];

        const updateTrack = (ti: number, key: string, value: unknown) => {
          const updated = tracks.map((t, idx) => idx === ti ? { ...t, [key]: value } : t);
          set("tracks", updated);
        };
        const updateTrackReqs = (ti: number, reqs: string[]) => updateTrack(ti, "requirements", reqs);
        const addTrack = () => set("tracks", [...tracks, { title_he: "מסלול חדש", icon: "check", requirements: [] }]);
        const removeTrack = (ti: number) => set("tracks", tracks.filter((_, idx) => idx !== ti));

        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="תנאי קבלה" draft={draft} set={set} />

            {/* Toggle between single/multi track */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F3F4F6] border border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => { set("tracks", undefined); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${!hasTracks ? "bg-white shadow text-[#2A2628]" : "text-[#9A969A] hover:text-[#4A4648]"}`}
              >
                מסלול אחד
              </button>
              <button
                type="button"
                onClick={() => { if (!hasTracks) set("tracks", [{ title_he: "קבלה ישירה", icon: "check", requirements: [] }]); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${hasTracks ? "bg-white shadow text-[#2A2628]" : "text-[#9A969A] hover:text-[#4A4648]"}`}
              >
                מספר מסלולים
              </button>
            </div>

            {hasTracks ? (
              /* Multi-track editor */
              <div className="space-y-3">
                {tracks.map((track, ti) => (
                  <div key={ti} className="border border-[#E5E5E5] rounded-xl p-3 space-y-2 bg-[#FAFAFA]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#9A969A]">מסלול {ti + 1}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTrack(ti)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-[#9A969A]">שם המסלול</Label>
                      <Input value={(track.title_he as string) || ""} onChange={(e) => updateTrack(ti, "title_he", e.target.value)} dir="rtl" className="h-8 text-sm" placeholder="קבלה ישירה..." />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] text-[#9A969A]">דרישות המסלול</Label>
                        <Button type="button" variant="ghost" size="sm"
                          onClick={() => updateTrackReqs(ti, [...((track.requirements as string[]) || []), ""])}
                          className="h-5 gap-1 text-[10px] text-[#B8D900] hover:text-[#9AB800] px-1"
                        >
                          <Plus className="w-2.5 h-2.5" /> הוסף דרישה
                        </Button>
                      </div>
                      <div className="space-y-1.5">
                        {((track.requirements as string[]) || []).map((req, ri) => (
                          <div key={ri} className="flex items-center gap-1.5">
                            <Input
                              value={req}
                              onChange={(e) => {
                                const reqs = [...((track.requirements as string[]) || [])];
                                reqs[ri] = e.target.value;
                                updateTrackReqs(ti, reqs);
                              }}
                              dir="rtl"
                              className="h-7 text-sm flex-1"
                              placeholder="תעודת בגרות..."
                            />
                            <Button type="button" variant="ghost" size="sm"
                              onClick={() => updateTrackReqs(ti, ((track.requirements as string[]) || []).filter((_, idx) => idx !== ri))}
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTrack} className="w-full h-8 gap-1.5 text-xs border-dashed">
                  <Plus className="w-3 h-3" /> הוסף מסלול
                </Button>
              </div>
            ) : (
              /* Single-track: flat requirements list */
              <StringListField label="דרישות קבלה" fieldKey="requirements" placeholder="תעודת בגרות..." draft={draft} set={set} />
            )}
          </div>
        );
      }

      case "countdown": {
        const cdMode = (draft.mode as string) || "evergreen";
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="הרשמה מוקדמת מסתיימת בקרוב" draft={draft} set={set} />
            <Field label="כותרת משנה" fieldKey="subheading_he" placeholder="אל תפספסו את ההזדמנות" draft={draft} set={set} />
            <Field label="תגית (badge)" fieldKey="badge_he" placeholder="⏰ הצעה מוגבלת בזמן" draft={draft} set={set} />
            {/* Mode toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">סוג טיימר</Label>
              <div className="flex gap-2">
                {(["evergreen", "fixed"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => set("mode", v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${cdMode === v ? "bg-[#B8D900]/10 border-[#B8D900] text-[#2A2628]" : "border-[#E5E5E5] text-[#9A969A]"}`}
                  >
                    {v === "evergreen" ? "Evergreen (מתאפס לכל מבקר)" : "תאריך קבוע"}
                  </button>
                ))}
              </div>
            </div>
            {cdMode === "evergreen" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#716C70]">מספר ימים לפני איפוס</Label>
                <Input value={(draft.interval_days as string) || "7"} onChange={(e) => set("interval_days", e.target.value)} dir="ltr" className="h-9 text-sm w-24" type="number" min="1" max="365" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#716C70]">תאריך ושעת סיום</Label>
                <Input value={(draft.target_date as string) || ""} onChange={(e) => set("target_date", e.target.value)} dir="ltr" className="h-9 text-sm" type="datetime-local" />
              </div>
            )}
            <Field label="הודעה בעת פקיעה" fieldKey="expired_text_he" placeholder="ההרשמה הסתיימה..." draft={draft} set={set} />
          </div>
        );
      }

      case "map":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מיקום האירוע" draft={draft} set={set} />
            <Field label="כתובת" fieldKey="address" placeholder="רחוב האוניברסיטה 1, קריית אונו" draft={draft} set={set} />
            <Field label="קישור Google Maps" fieldKey="map_url" placeholder="https://maps.google.com/..." dir="ltr" draft={draft} set={set} />
          </div>
        );

      case "cta":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מוכנים להתחיל?" draft={draft} set={set} />
            <TextareaField label="תיאור" fieldKey="description_he" rows={2} placeholder="הצטרפו לאלפי סטודנטים..." draft={draft} set={set} />
            <Field label="טקסט כפתור" fieldKey="button_text_he" placeholder="להרשמה" draft={draft} set={set} />
            <Field label="מספר טלפון" fieldKey="phone" placeholder="03-123-4567" dir="ltr" draft={draft} set={set} />
          </div>
        );

      case "whatsapp":
        return (
          <div className="space-y-4">
            <Field label="מספר וואטסאפ" fieldKey="phone" placeholder="972501234567" dir="ltr" draft={draft} set={set} />
            <Field label="הודעה ראשונית" fieldKey="message_he" placeholder="היי, אשמח לקבל פרטים" draft={draft} set={set} />
          </div>
        );

      case "event":
        /* Editor for event pages — data stored in custom_styles on the page,
           but exposed here when the section_type is "event". */
        return (
          <div className="space-y-4">
            <Field label="כותרת האירוע" fieldKey="heading_he" placeholder="יום פתוח" draft={draft} set={set} />
            <TextareaField label="תיאור" fieldKey="description_he" placeholder="פרטים על האירוע..." draft={draft} set={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="תאריך (ISO)" fieldKey="event_date" placeholder="2026-04-15T17:00:00" dir="ltr" draft={draft} set={set} />
              <Field label="שעה לתצוגה" fieldKey="event_time" placeholder="17:00" dir="ltr" draft={draft} set={set} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">סוג אירוע</Label>
              <div className="flex gap-2">
                {(["event_physical", "event_zoom"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("event_type", t)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      (draft.event_type || "event_physical") === t
                        ? "bg-[#B8D900]/20 border-[#B8D900] text-[#2A2628]"
                        : "border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50"
                    }`}
                  >
                    {t === "event_physical" ? "פיזי - קמפוס" : "זום - אונליין"}
                  </button>
                ))}
              </div>
            </div>
            <Field label="כתובת מקום (לאירוע פיזי)" fieldKey="venue" placeholder="רחוב האוניברסיטה 2, קריית אונו" draft={draft} set={set} />
            <Field label="קישור Google Maps" fieldKey="google_maps_url" placeholder="https://maps.google.com/..." dir="ltr" draft={draft} set={set} />
            <Field label="קישור Zoom (לאירוע מקוון)" fieldKey="zoom_link" placeholder="https://zoom.us/j/..." dir="ltr" draft={draft} set={set} />
            <Field label="מידע חניה" fieldKey="parking_info" placeholder="חניה חינם בחניון הקמפוס" draft={draft} set={set} />
            <StringListField label="תוכניות מוצגות" fieldKey="programs_featured" placeholder="משפטים, מנהל עסקים..." draft={draft} set={set} />
            <ObjectListField
              label="לוח זמנים"
              fieldKey="schedule"
              fields={[
                { key: "time", label: "שעה (למשל 17:00)" },
                { key: "title", label: "שם הסשן" },
              ]}
              draft={draft}
              set={set}
            />
            <ObjectListField
              label="דוברים"
              fieldKey="speakers"
              fields={[
                { key: "name", label: "שם" },
                { key: "role", label: "תפקיד" },
                { key: "image_url", label: "תמונה", type: "image" },
              ]}
              draft={draft}
              set={set}
            />
            <ObjectListField
              label="שאלות נפוצות"
              fieldKey="faq"
              fields={[
                { key: "question", label: "שאלה" },
                { key: "answer", label: "תשובה", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <p className="text-sm text-[#9A969A]">אין עורך מיוחד לסוג סקציה זה.</p>
            <Label className="text-xs font-medium text-[#716C70]">תוכן (JSON)</Label>
            <Textarea
              value={JSON.stringify(draft, null, 2)}
              onChange={(e) => {
                try {
                  setDraft(JSON.parse(e.target.value));
                } catch {
                  /* ignore parse errors while typing */
                }
              }}
              rows={10}
              className="font-mono text-xs"
              dir="ltr"
            />
          </div>
        );
    }
  };

  const label = SECTION_LABELS[section.section_type] || section.section_type;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
        dir="rtl"
      >
        <DialogHeader className="px-6 py-4 border-b border-[#F0F0F0] shrink-0">
          <DialogTitle className="text-base font-bold text-[#2A2628]">
            עריכת {label}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9A969A]">
            שנה את תוכן הסקציה ולחץ שמור
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-5">{renderForm()}</div>
        </div>

        <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="h-9">
            ביטול
          </Button>
          <Button
            onClick={() => onSave(section.id, draft)}
            disabled={saving}
            className="h-9 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400] gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            שמור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page Settings Dialog
// ---------------------------------------------------------------------------

interface PageSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: PageOverrideSettings;
  onChange: (key: keyof PageOverrideSettings, value: string) => void;
  tySettings: Partial<ThankYouPageSettings>;
  onTyChange: (key: keyof ThankYouPageSettings, value: string | boolean) => void;
  onSave: () => Promise<void>;
  saving: boolean;
}

// ---------------------------------------------------------------------------
// File-scope SettingField for PageSettingsDialog.
// Defined outside the component to avoid remount-on-render focus loss.
// ---------------------------------------------------------------------------

interface SettingFieldProps {
  label: string;
  fieldKey: keyof PageOverrideSettings;
  placeholder?: string;
  hint?: string;
  dir?: "rtl" | "ltr";
  settings: PageOverrideSettings;
  onChange: (key: keyof PageOverrideSettings, value: string) => void;
}

/** A labeled input bound to a PageOverrideSettings key */
function SettingField({ label, fieldKey, placeholder, hint, dir = "ltr", settings, onChange }: SettingFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-[#2A2628]">{label}</Label>
      <Input
        value={settings[fieldKey] || ""}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        placeholder={placeholder || "כברירת מחדל מהגדרות הכלליות"}
        dir={dir}
        className="h-9 text-sm"
      />
      {hint && <p className="text-[11px] text-[#9A969A]">{hint}</p>}
    </div>
  );
}

/**
 * Per-page settings override dialog.
 * Empty fields fall back to the global settings configured in הגדרות.
 * Visual style matches the global settings page: card-style sections with icons.
 */
function PageSettingsDialog({ open, onClose, settings, onChange, tySettings, onTyChange, onSave, saving }: PageSettingsDialogProps) {
  const exitEnabled = settings.exit_intent_enabled === "true";
  const socialEnabled = settings.social_proof_enabled === "true";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 py-4 border-b border-[#F0F0F0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B8D900]/15 flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4 text-[#8aac00]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#2A2628]">הגדרות עמוד</DialogTitle>
              <DialogDescription className="text-xs text-[#9A969A] mt-0.5">
                שדות ריקים יורשו מ<a href="/dashboard/settings" target="_blank" className="text-[#B8D900] hover:underline">הגדרות הכלליות</a>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-4">

            {/* ─── Integrations ─────────────────────────── */}
            <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2A2628]">אינטגרציות</p>
                  <p className="text-[10px] text-[#9A969A]">Webhook, WhatsApp ומספר טלפון</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <SettingField label="כתובת Webhook" fieldKey="webhook_url" placeholder="https://hooks.zapier.com/... (מהגדרות הכלליות)" hint="לשליחת לידים מעמוד זה ל-CRM ספציפי" settings={settings} onChange={onChange} />
                <SettingField label="מספר WhatsApp" fieldKey="whatsapp_number" placeholder="972501234567 (מהגדרות הכלליות)" hint="מספר בפורמט בינלאומי ללא מקף" settings={settings} onChange={onChange} />
                <SettingField label="מספר טלפון לתצוגה" fieldKey="phone_number" placeholder="*2899 (מהגדרות הכלליות)" hint="יוצג בכותרת ובתחתית העמוד" settings={settings} onChange={onChange} />
              </div>
            </div>

            {/* ─── Conversion Features ──────────────────── */}
            <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]">
                <div className="w-7 h-7 rounded-lg bg-[#B8D900]/15 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8aac00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2A2628]">המרות</p>
                  <p className="text-[10px] text-[#9A969A]">כלים להגדלת המרות בעמוד זה</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                {/* Exit Intent Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-xs font-semibold text-[#2A2628] block">פופאפ עזיבה (Exit Intent)</Label>
                    <p className="text-[11px] text-[#9A969A] mt-0.5 leading-relaxed">מוצג פעם אחת כשהמבקר מנסה לעזוב — מעלה המרות ~7%. <span className="text-amber-600 font-medium">כבוי כברירת מחדל.</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange("exit_intent_enabled", exitEnabled ? "false" : "true")}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${exitEnabled ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}
                    role="switch"
                    aria-checked={exitEnabled}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${exitEnabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                {/* Social Proof Toast Toggle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Label className="text-xs font-semibold text-[#2A2628] block">הוכחה חברתית (Social Proof)</Label>
                    <p className="text-[11px] text-[#9A969A] mt-0.5 leading-relaxed">toast קטן: &ldquo;X אנשים נרשמו השבוע&rdquo;. <span className="text-amber-600 font-medium">כבוי כברירת מחדל.</span></p>
                    {socialEnabled && (
                      <div className="flex items-center gap-2 mt-2">
                        <Label className="text-[11px] text-[#716C70] shrink-0">ימים אחורה:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          value={settings.social_proof_days || "7"}
                          onChange={(e) => onChange("social_proof_days", e.target.value)}
                          className="h-7 w-16 text-xs"
                          dir="ltr"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange("social_proof_enabled", socialEnabled ? "false" : "true")}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${socialEnabled ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}
                    role="switch"
                    aria-checked={socialEnabled}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${socialEnabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <SettingField label="טקסט קריאה לפעולה (CTA)" fieldKey="default_cta_text" placeholder="השאירו פרטים ונחזור אליכם (מהגדרות הכלליות)" dir="rtl" hint="הטקסט על כפתורי הרשמה בעמוד" settings={settings} onChange={onChange} />
                <SettingField label="לוגו מותאם (URL)" fieldKey="logo_url" placeholder="https://... (לוגו אונו כברירת מחדל)" hint="להחלפת הלוגו בעמוד זה בלבד" settings={settings} onChange={onChange} />
              </div>
            </div>

            {/* ─── Thank You Page ───────────────────────── */}
            <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2A2628]">עמוד תודה</p>
                    <p className="text-[10px] text-[#9A969A]">מה יראה המבקר אחרי הגשת הטופס</p>
                  </div>
                </div>
                <a href="/ty" target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#B8D900] hover:underline flex items-center gap-1 shrink-0">
                  תצוגה מקדימה ↗
                </a>
              </div>
              <div className="px-4 py-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2A2628]">כותרת</Label>
                  <Input value={tySettings.heading_he || ""} onChange={(e) => onTyChange("heading_he", e.target.value)} placeholder="תודה! קיבלנו את פרטיך" dir="rtl" className="h-9 text-sm" />
                  <p className="text-[11px] text-[#9A969A]">ניתן לכתוב [שם] לפרסונליזציה</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2A2628]">כותרת משנה</Label>
                  <Input value={tySettings.subheading_he || ""} onChange={(e) => onTyChange("subheading_he", e.target.value)} placeholder="יועץ לימודים ייצור איתך קשר תוך 24 שעות" dir="rtl" className="h-9 text-sm" />
                </div>
                {/* WhatsApp */}
                <div className="p-3 rounded-xl border border-[#E5E5E5] space-y-2.5 bg-[#FAFAFA]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#2A2628]">כפתור WhatsApp</Label>
                    <button type="button" onClick={() => onTyChange("show_whatsapp", !tySettings.show_whatsapp)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${tySettings.show_whatsapp ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${tySettings.show_whatsapp ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {tySettings.show_whatsapp !== false && (
                    <>
                      <Input value={tySettings.whatsapp_number || ""} onChange={(e) => onTyChange("whatsapp_number", e.target.value)} placeholder="972501234567 (מהגדרות הכלליות)" dir="ltr" className="h-8 text-xs" />
                      <Input value={tySettings.whatsapp_cta_he || ""} onChange={(e) => onTyChange("whatsapp_cta_he", e.target.value)} placeholder="רוצים לדבר עכשיו? כתבו לנו" dir="rtl" className="h-8 text-xs" />
                    </>
                  )}
                </div>
                {/* Social */}
                <div className="p-3 rounded-xl border border-[#E5E5E5] space-y-2.5 bg-[#FAFAFA]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#2A2628]">עקבו בסושיאל מדיה</Label>
                    <button type="button" onClick={() => onTyChange("show_social", !tySettings.show_social)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${tySettings.show_social ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${tySettings.show_social ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {tySettings.show_social !== false && (
                    <div className="space-y-1.5">
                      {([
                        { key: "facebook_url", label: "Facebook", placeholder: "https://www.facebook.com/OnoAcademic" },
                        { key: "instagram_url", label: "Instagram", placeholder: "https://www.instagram.com/ono_academic/" },
                        { key: "youtube_url", label: "YouTube", placeholder: "https://www.youtube.com/@OnoAcademic" },
                        { key: "linkedin_url", label: "LinkedIn", placeholder: "https://il.linkedin.com/school/ono-academic-college" },
                        { key: "tiktok_url", label: "TikTok", placeholder: "https://www.tiktok.com/@ono_academic" },
                      ] as const).map(({ key, label, placeholder }) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[11px] text-[#9A969A] w-14 shrink-0">{label}</span>
                          <Input value={(tySettings[key] as string) || ""} onChange={(e) => onTyChange(key, e.target.value)} placeholder={placeholder} dir="ltr" className="h-7 text-xs flex-1" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Referral */}
                <div className="p-3 rounded-xl border border-[#E5E5E5] space-y-2.5 bg-[#FAFAFA]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#2A2628]">שיתוף עם חברים</Label>
                    <button type="button" onClick={() => onTyChange("show_referral", !tySettings.show_referral)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${tySettings.show_referral ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${tySettings.show_referral ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {tySettings.show_referral !== false && (
                    <Input value={tySettings.referral_cta_he || ""} onChange={(e) => onTyChange("referral_cta_he", e.target.value)} placeholder="שתפו עם חבר שמחפש תואר" dir="rtl" className="h-8 text-xs" />
                  )}
                </div>
                {/* Calendar */}
                <div className="p-3 rounded-xl border border-[#E5E5E5] space-y-2.5 bg-[#FAFAFA]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#2A2628]">הזמנת פגישה (Calendly)</Label>
                    <button type="button" onClick={() => onTyChange("show_calendar", !tySettings.show_calendar)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${tySettings.show_calendar ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${tySettings.show_calendar ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {tySettings.show_calendar && (
                    <>
                      <Input value={tySettings.calendar_url || ""} onChange={(e) => onTyChange("calendar_url", e.target.value)} placeholder="https://calendly.com/ono/..." dir="ltr" className="h-8 text-xs" />
                      <Input value={tySettings.calendar_cta_he || ""} onChange={(e) => onTyChange("calendar_cta_he", e.target.value)} placeholder="קבעו שיחת ייעוץ עכשיו" dir="rtl" className="h-8 text-xs" />
                    </>
                  )}
                </div>
                {/* Video */}
                <div className="p-3 rounded-xl border border-[#E5E5E5] space-y-2.5 bg-[#FAFAFA]">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#2A2628]">סרטון ברכה / מידע</Label>
                    <button type="button" onClick={() => onTyChange("show_video", !tySettings.show_video)} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${tySettings.show_video ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${tySettings.show_video ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>
                  {tySettings.show_video && (
                    <Input value={tySettings.video_url || ""} onChange={(e) => onTyChange("video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." dir="ltr" className="h-8 text-xs" />
                  )}
                </div>
                {/* Custom redirect */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#2A2628]">הפניה מיוחדת (מדלג על /ty)</Label>
                  <Input value={tySettings.custom_redirect_url || ""} onChange={(e) => onTyChange("custom_redirect_url", e.target.value)} placeholder="https://..." dir="ltr" className="h-9 text-sm" />
                  <p className="text-[11px] text-[#9A969A]">אם מוגדר, המשתמש מועבר לכתובת זו ישירות</p>
                </div>
              </div>
            </div>

            {/* ─── Tracking ─────────────────────────────── */}
            <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-[#FAFAFA] border-b border-[#F0F0F0]">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#2A2628]">מעקב ואנליטיקס</p>
                  <p className="text-[10px] text-[#9A969A]">Google Analytics ו-Facebook Pixel</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-3">
                <SettingField label="Google Analytics ID" fieldKey="google_analytics_id" placeholder="G-XXXXXXXXXX (מהגדרות הכלליות)" hint="לעקוב אחר קמפיינים ספציפיים" settings={settings} onChange={onChange} />
                <SettingField label="Facebook Pixel ID" fieldKey="facebook_pixel_id" placeholder="123456789 (מהגדרות הכלליות)" hint="לפיקסל ספציפי לקמפיין" settings={settings} onChange={onChange} />
              </div>
            </div>

          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#9A969A]">שדות ריקים = ברירת מחדל מההגדרות הכלליות</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="h-9">ביטול</Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="h-9 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400] gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור הגדרות
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <DialogTitle className="text-base font-bold text-[#2A2628]">מחיקת סקציה</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-[#9A969A] pr-13">
            האם אתה בטוח שברצונך למחוק סקציה זו? פעולה זו אינה ניתנת לביטול.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onCancel} className="h-9">
            ביטול
          </Button>
          <Button
            onClick={onConfirm}
            className="h-9 bg-red-500 text-white hover:bg-red-600"
          >
            מחק
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page builder component
// ---------------------------------------------------------------------------

export default function PageBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;
  const supabase = createClient();

  const [page, setPage] = useState<PageData | null>(null);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [pageSettings, setPageSettings] = useState<PageOverrideSettings>({});
  const [tySettings, setTySettings] = useState<Partial<ThankYouPageSettings>>({});
  const [pageSettingsSaving, setPageSettingsSaving] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  // Global sections library panel state
  const [libraryTab, setLibraryTab] = useState<"types" | "global">("types");
  const [globalSections, setGlobalSections] = useState<GlobalSectionItem[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalEditDialogOpen, setGlobalEditDialogOpen] = useState(false);
  const [globalEditSection, setGlobalEditSection] = useState<PageSection | null>(null);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** Show a toast for 3 seconds */
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Load page + sections from Supabase */
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [pageRes, sectionsRes] = await Promise.all([
        supabase.from("pages").select("id, title_he, slug, status, custom_styles").eq("id", pageId).single(),
        supabase.from("page_sections").select("*").eq("page_id", pageId).order("sort_order"),
      ]);
      if (pageRes.data) {
        setPage(pageRes.data as PageData);
        const customStyles = pageRes.data.custom_styles as Record<string, unknown> | null;
        setPageSettings((customStyles?.page_settings as PageOverrideSettings) || {});
        // Pre-populate with Ono defaults when no per-page settings exist yet
        const savedTy = (customStyles?.thank_you_settings as Partial<ThankYouPageSettings>) || {};
        setTySettings(Object.keys(savedTy).length > 0 ? savedTy : { ...ONO_TY_DEFAULTS });
      }
      if (sectionsRes.data) setSections(sectionsRes.data as PageSection[]);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  /** Persist sort order for all sections (debounced) */
  const persistOrder = useCallback(
    (updated: PageSection[]) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        const upserts = updated.map((s, i) => ({
          id: s.id,
          page_id: pageId,
          section_type: s.section_type,
          sort_order: i,
          is_visible: s.is_visible,
          content: s.content,
          styles: s.styles ?? null,
        }));
        const { error } = await supabase.from("page_sections").upsert(upserts);
        if (!error) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
        setSaving(false);
      }, 600);
    },
    [pageId, supabase]
  );

  const updateSections = useCallback(
    (updated: PageSection[]) => {
      setSections(updated);
      persistOrder(updated);
    },
    [persistOrder]
  );

  // ---- Global Sections Library ----

  const loadGlobalSections = useCallback(async () => {
    setGlobalLoading(true);
    const { data } = await supabase
      .from("shared_sections")
      .select("id, name_he, section_type, category, content, styles")
      .order("category", { ascending: true })
      .order("name_he", { ascending: true });
    setGlobalSections((data as GlobalSectionItem[]) || []);
    setGlobalLoading(false);
  }, [supabase]);

  /** Adds a shared section (by reference) to the current page */
  const addSharedSection = useCallback(async (gs: GlobalSectionItem) => {
    const maxSort = sections.reduce((m, s) => Math.max(m, s.sort_order), -1);
    const row = {
      page_id: pageId,
      section_type: gs.section_type,
      sort_order: maxSort + 1,
      is_visible: true,
      content: gs.content,
      styles: gs.styles ?? null,
      shared_section_id: gs.id,
    };
    const { data, error } = await supabase
      .from("page_sections")
      .insert(row)
      .select()
      .single();
    if (!error && data) {
      setSections((prev) => [...prev, data as PageSection]);
      showToast(`סקציה גלובלית "${gs.name_he}" נוספה`);
    } else {
      showToast("שגיאה בהוספת סקציה גלובלית", "error");
    }
  }, [pageId, sections, supabase, showToast]);

  /** Detaches a section from its shared_section, making it locally editable */
  const detachSharedSection = useCallback(async (sectionId: string) => {
    const { error } = await supabase
      .from("page_sections")
      .update({ shared_section_id: null })
      .eq("id", sectionId);
    if (!error) {
      setSections((prev) =>
        prev.map((s) => s.id === sectionId ? { ...s, shared_section_id: null } : s)
      );
    }
  }, [supabase]);

  /** Saves content to the shared_sections table — updates all pages using this section */
  const saveGlobalSection = useCallback(async (sharedId: string, sectionId: string, content: Record<string, unknown>) => {
    setEditSaving(true);
    const { error } = await supabase
      .from("shared_sections")
      .update({ content })
      .eq("id", sharedId);
    if (!error) {
      // Reflect new content locally
      setSections((prev) =>
        prev.map((s) => s.id === sectionId ? { ...s, content } : s)
      );
      setGlobalEditDialogOpen(false);
      setEditingSection(null);
      showToast("הסקציה הגלובלית עודכנה — כל הדפים המשתמשים בה עודכנו");
    } else {
      showToast("שגיאה בשמירה הגלובלית", "error");
    }
    setEditSaving(false);
  }, [supabase, showToast]);

  // ---- Version History ----

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    const { data } = await supabase
      .from("page_versions")
      .select("id, version_num, sections_snapshot, created_at, created_by")
      .eq("page_id", pageId)
      .order("version_num", { ascending: false })
      .limit(20);
    setVersions((data as PageVersion[]) || []);
    setVersionsLoading(false);
  }, [pageId, supabase]);

  const restoreVersion = useCallback(async (version: PageVersion) => {
    if (!confirm(`לשחזר גרסה ${version.version_num}? השינויים הנוכחיים ייאספו לגרסה חדשה תחילה.`)) return;
    setRestoring(true);

    // First snapshot current state
    try {
      const { data: lastVer } = await supabase
        .from("page_versions")
        .select("version_num")
        .eq("page_id", pageId)
        .order("version_num", { ascending: false })
        .limit(1)
        .single();
      const nextNum = ((lastVer as { version_num: number } | null)?.version_num ?? 0) + 1;
      const snapshot = sections.map((s, i) => ({
        section_type: s.section_type,
        sort_order: i,
        is_visible: s.is_visible,
        content: s.content,
        styles: s.styles ?? null,
      }));
      await supabase.from("page_versions").insert({ page_id: pageId, version_num: nextNum, sections_snapshot: snapshot });
    } catch {/* non-blocking */}

    // Delete all existing sections, then re-insert from snapshot
    await supabase.from("page_sections").delete().eq("page_id", pageId);
    const newSections = version.sections_snapshot.map((snap, i) => ({
      id: crypto.randomUUID(),
      page_id: pageId,
      section_type: snap.section_type as string,
      sort_order: i,
      is_visible: snap.is_visible as boolean ?? true,
      content: snap.content ?? {},
      styles: snap.styles ?? null,
    }));
    const { error } = await supabase.from("page_sections").insert(newSections);
    if (!error) {
      setSections(newSections as PageSection[]);
      setVersionHistoryOpen(false);
      showToast(`גרסה ${version.version_num} שוחזרה בהצלחה`);
    } else {
      showToast("שגיאה בשחזור גרסה", "error");
    }
    setRestoring(false);
  }, [pageId, sections, supabase, showToast]);

  // ---- Drag and drop ----

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(sections, oldIdx, newIdx).map((s, i) => ({
        ...s,
        sort_order: i,
      }));
      updateSections(reordered);
    }
  };

  // ---- Move up/down ----

  const moveSection = useCallback(
    (id: string, dir: "up" | "down") => {
      const idx = sections.findIndex((s) => s.id === id);
      if (idx < 0) return;
      if (dir === "up" && idx === 0) return;
      if (dir === "down" && idx === sections.length - 1) return;
      const targetIdx = dir === "up" ? idx - 1 : idx + 1;
      const copy = [...sections];
      [copy[idx], copy[targetIdx]] = [copy[targetIdx], copy[idx]];
      updateSections(copy.map((s, i) => ({ ...s, sort_order: i })));
    },
    [sections, updateSections]
  );

  // ---- Visibility ----

  const toggleVisibility = useCallback(
    async (id: string) => {
      const section = sections.find((s) => s.id === id);
      if (!section) return;
      const newVisible = !section.is_visible;
      const updated = sections.map((s) =>
        s.id === id ? { ...s, is_visible: newVisible } : s
      );
      setSections(updated);
      await supabase
        .from("page_sections")
        .update({ is_visible: newVisible })
        .eq("id", id);
      showToast(newVisible ? "הסקציה מוצגת כעת" : "הסקציה הוסתרה");
    },
    [sections, supabase, showToast]
  );

  // ---- Add section ----

  const addSection = useCallback(
    async (type: string) => {
      setAddingType(type);
      const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.sort_order)) : -1;
      const { data, error } = await supabase
        .from("page_sections")
        .insert({
          page_id: pageId,
          section_type: type,
          sort_order: maxOrder + 1,
          is_visible: true,
          content: getDefaultContent(type),
          styles: {},
        })
        .select()
        .single();

      if (!error && data) {
        setSections((prev) => [...prev, data as PageSection]);
        showToast("סקציה חדשה נוספה");
        /* Auto-open editor for the new section */
        setEditingSection(data as PageSection);
      } else {
        showToast("שגיאה בהוספת סקציה", "error");
      }
      setAddingType(null);
    },
    [pageId, sections, supabase, showToast]
  );

  // ---- Save section content ----

  const saveEditSection = useCallback(
    async (id: string, content: Record<string, unknown>) => {
      setEditSaving(true);
      const section = sections.find((s) => s.id === id);
      // If section references a shared_section, update the shared table (updates all pages)
      if (section?.shared_section_id) {
        await saveGlobalSection(section.shared_section_id, id, content);
        return;
      }
      const { error } = await supabase
        .from("page_sections")
        .update({ content })
        .eq("id", id);

      if (!error) {
        setSections((prev) =>
          prev.map((s) => (s.id === id ? { ...s, content } : s))
        );
        setEditingSection(null);
        showToast("התוכן נשמר בהצלחה");
      } else {
        showToast("שגיאה בשמירה", "error");
      }
      setEditSaving(false);
    },
    [supabase, showToast]
  );

  // ---- Delete section ----

  const deleteSection = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("page_sections").delete().eq("id", id);
      if (!error) {
        setSections((prev) => prev.filter((s) => s.id !== id));
        setDeleteTargetId(null);
        showToast("הסקציה נמחקה");
      } else {
        showToast("שגיאה במחיקה", "error");
      }
    },
    [supabase, showToast]
  );

  // ---- Manual save ----

  const handleSaveAll = async () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaving(true);
    const upserts = sections.map((s, i) => ({
      id: s.id,
      page_id: pageId,
      section_type: s.section_type,
      sort_order: i,
      is_visible: s.is_visible,
      content: s.content,
      styles: s.styles ?? null,
    }));

    // --- Snapshot current state before overwriting ---
    try {
      // Get next version_num
      const { data: lastVer } = await supabase
        .from("page_versions")
        .select("version_num")
        .eq("page_id", pageId)
        .order("version_num", { ascending: false })
        .limit(1)
        .single();
      const nextNum = ((lastVer as { version_num: number } | null)?.version_num ?? 0) + 1;
      const snapshot = sections.map((s, i) => ({
        section_type: s.section_type,
        sort_order: i,
        is_visible: s.is_visible,
        content: s.content,
        styles: s.styles ?? null,
      }));
      await supabase.from("page_versions").insert({
        page_id: pageId,
        version_num: nextNum,
        sections_snapshot: snapshot,
      });
      // Keep only the last 20 versions
      const { data: oldVersions } = await supabase
        .from("page_versions")
        .select("id, version_num")
        .eq("page_id", pageId)
        .order("version_num", { ascending: false })
        .range(20, 200);
      if (oldVersions && oldVersions.length > 0) {
        await supabase
          .from("page_versions")
          .delete()
          .in("id", oldVersions.map((v: { id: string }) => v.id));
      }
    } catch {
      /* snapshot failure is non-blocking */
    }

    const { error } = await supabase.from("page_sections").upsert(upserts);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      showToast("הדף נשמר בהצלחה");
    } else {
      showToast("שגיאה בשמירה", "error");
    }
    setSaving(false);
  };

  // ---- Page settings ----

  const updatePageSetting = useCallback((key: keyof PageOverrideSettings, value: string) => {
    setPageSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateTySetting = useCallback((key: keyof ThankYouPageSettings, value: string | boolean) => {
    setTySettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** Saves both page_settings and thank_you_settings to pages.custom_styles */
  const savePageSettings = useCallback(async () => {
    setPageSettingsSaving(true);
    // Strip empty strings so fallback to global works correctly
    const cleanedPage: PageOverrideSettings = Object.fromEntries(
      Object.entries(pageSettings).filter(([, v]) => v && String(v).trim() !== "")
    ) as PageOverrideSettings;

    // Strip empty strings from TY settings (but keep booleans)
    const cleanedTy: Partial<ThankYouPageSettings> = Object.fromEntries(
      Object.entries(tySettings).filter(([, v]) => v !== undefined && v !== "")
    ) as Partial<ThankYouPageSettings>;

    const existingCustomStyles = (page?.custom_styles as Record<string, unknown>) || {};
    const { error } = await supabase
      .from("pages")
      .update({
        custom_styles: {
          ...existingCustomStyles,
          page_settings: cleanedPage,
          thank_you_settings: cleanedTy,
        },
      })
      .eq("id", pageId);

    if (!error) {
      setPageSettings(cleanedPage);
      setTySettings(cleanedTy);
      setPageSettingsOpen(false);
      showToast("הגדרות העמוד נשמרו");
    } else {
      showToast("שגיאה בשמירת הגדרות", "error");
    }
    setPageSettingsSaving(false);
  }, [page, pageId, pageSettings, tySettings, supabase, showToast]);

  // ---------------------------------------------------------------------------
  // Loading / 404 states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F3F4F6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-[#B8D900] border-t-transparent animate-spin" />
          <p className="text-sm text-[#9A969A]">טוען בונה עמודים...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[#F3F4F6]">
        <p className="text-lg text-[#9A969A]">הדף לא נמצא</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/pages")}>
          <ArrowRight className="w-4 h-4 ml-2" />
          חזרה לדפים
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F3F4F6]" dir="rtl">

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed top-4 right-1/2 translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="shrink-0 bg-white border-b border-[#EBEBEB] px-5 py-3 flex items-center gap-4 shadow-sm z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/pages")}
          className="h-9 w-9 p-0 text-[#9A969A] hover:text-[#4A4648] rounded-xl"
          title="חזרה לדפים"
        >
          <ArrowRight className="w-4 h-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-[#2A2628] truncate">
            {page.title_he || page.slug}
          </h1>
          <p className="text-xs text-[#9A969A] font-mono" dir="ltr">
            /{page.slug}
          </p>
        </div>

        <Badge
          className={`shrink-0 text-[11px] border-0 ${
            page.status === "published"
              ? "bg-green-50 text-green-700"
              : page.status === "archived"
              ? "bg-orange-50 text-orange-600"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {page.status === "published"
            ? "מפורסם"
            : page.status === "archived"
            ? "בארכיון"
            : "טיוטה"}
        </Badge>

        <div className="flex items-center gap-2 shrink-0">
          {/* Auto-save indicator */}
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-[#9A969A]">
              <Loader2 className="w-3 h-3 animate-spin" />
              שומר...
            </span>
          )}
          {saved && !saving && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="w-3 h-3" />
              נשמר
            </span>
          )}

          {/* Version History button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setVersionHistoryOpen(true); loadVersions(); }}
            className="h-9 w-9 p-0 border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900] hover:text-[#4A4648]"
            title="היסטוריית גרסאות"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>

          <a href={`/dashboard/pages/${pageId}/settings`}>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-[#E5E5E5] text-[#4A4648] hover:border-[#B8D900]"
            >
              <Settings2 className="w-3.5 h-3.5" />
              הגדרות עמוד
            </Button>
          </a>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/lp/${page.slug}`, "_blank")}
            className="h-9 gap-2 border-[#E5E5E5] text-[#4A4648] hover:border-[#B8D900]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            צפה בעמוד
          </Button>

          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={saving}
            className="h-9 gap-2 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
          >
            <Save className="w-3.5 h-3.5" />
            שמור סדר
          </Button>
        </div>
      </header>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT PANEL — Section Library ── */}
        <aside className="w-[300px] shrink-0 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] border-l border-[#2a2a42] flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="px-4 pt-3.5 pb-2 border-b border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#B8D900]/20 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-[#B8D900]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">ספריית סקציות</h2>
                <p className="text-[10px] text-white/40 mt-0.5">לחץ להוספה לדף</p>
              </div>
            </div>
            {/* Tab switcher */}
            <div className="flex gap-1 bg-white/[0.05] rounded-lg p-0.5">
              <button
                onClick={() => setLibraryTab("types")}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  libraryTab === "types"
                    ? "bg-[#B8D900] text-[#1a1a2e]"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                סוגי סקציות
              </button>
              <button
                onClick={() => {
                  setLibraryTab("global");
                  if (globalSections.length === 0) loadGlobalSections();
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  libraryTab === "global"
                    ? "bg-[#B8D900] text-[#1a1a2e]"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                ספרייה גלובלית
              </button>
            </div>
          </div>

          {/* ── TAB: Section types ── */}
          {libraryTab === "types" && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-3 space-y-1.5">
              {SECTION_LIBRARY.map((item) => {
                const isAdding = addingType === item.type;
                // Count how many times this section type is already on the page
                const usedCount = sections.filter((s) => s.section_type === item.type).length;
                const isUsed = usedCount > 0;
                return (
                  <button
                    key={item.type}
                    onClick={() => addSection(item.type)}
                    disabled={isAdding}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150 text-right group ${
                      isUsed
                        ? "bg-[#B8D900]/10 border-[#B8D900]/30 hover:bg-[#B8D900]/18"
                        : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.09] hover:border-[#B8D900]/30"
                    }`}
                  >
                    {/* Colored icon */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.color} opacity-90 group-hover:opacity-100 transition-opacity`}
                    >
                      {isAdding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={item.iconPath} />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white/90 leading-tight group-hover:text-white transition-colors">
                          {item.nameHe}
                        </p>
                        {/* "In use" badge */}
                        {isUsed && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#B8D900]/25 text-[#B8D900] text-[10px] font-bold leading-none shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#B8D900] inline-block" />
                            {usedCount > 1 ? `×${usedCount}` : "בשימוש"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/35 leading-tight mt-0.5 truncate">
                        {item.descriptionHe}
                      </p>
                    </div>

                    {/* Add indicator */}
                    <div className="w-6 h-6 rounded-md bg-white/0 group-hover:bg-[#B8D900]/20 flex items-center justify-center transition-colors shrink-0">
                      <Plus className="w-3.5 h-3.5 text-white/30 group-hover:text-[#B8D900] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* ── TAB: Global sections library ── */}
          {libraryTab === "global" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Search box */}
            <div className="px-3 py-2.5 border-b border-white/10">
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="חיפוש לפי שם / קטגוריה..."
                  dir="rtl"
                  className="w-full h-8 bg-white/[0.06] border border-white/10 rounded-lg pl-2 pr-8 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#B8D900]/50"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1.5">
              {globalLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                </div>
              ) : (() => {
                const query = globalSearch.trim().toLowerCase();
                const filtered = globalSections.filter((gs) =>
                  !query ||
                  gs.name_he.toLowerCase().includes(query) ||
                  (gs.category || "").toLowerCase().includes(query) ||
                  gs.section_type.toLowerCase().includes(query)
                );
                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-10">
                      <Globe className="w-8 h-8 mx-auto mb-2 text-white/20" />
                      <p className="text-xs text-white/30">
                        {globalSections.length === 0 ? "אין סקציות בספרייה עדיין" : "לא נמצאו תוצאות"}
                      </p>
                      {globalSections.length === 0 && (
                        <p className="text-[10px] text-white/20 mt-1">
                          הוסיפו מ&ldquo;סקציות גלובליות&rdquo; בסיידבר
                        </p>
                      )}
                    </div>
                  );
                }
                // Group by category
                const grouped: Record<string, GlobalSectionItem[]> = {};
                for (const gs of filtered) {
                  const cat = gs.category || "כללי";
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(gs);
                }
                return Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-bold text-[#B8D900]/60 uppercase tracking-wider px-1 mb-1 mt-2">{cat}</p>
                    {items.map((gs) => {
                      const alreadyUsed = sections.some((s) => s.shared_section_id === gs.id);
                      return (
                        <button
                          key={gs.id}
                          onClick={() => addSharedSection(gs)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.09] hover:border-[#B8D900]/30 transition-all text-right group mb-1"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                            <Globe className="w-3.5 h-3.5 text-blue-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white/90 truncate">{gs.name_he}</p>
                            <p className="text-[10px] text-white/35 mt-0.5">{gs.section_type}</p>
                          </div>
                          {alreadyUsed && (
                            <span className="text-[9px] text-[#B8D900] font-bold shrink-0">✓</span>
                          )}
                          <Plus className="w-3.5 h-3.5 text-white/30 group-hover:text-[#B8D900] transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
          )}

          {/* Bottom hint */}
          <div className="px-4 py-3 border-t border-white/10">
            <p className="text-[10px] text-white/25 text-center">
              {sections.length} סקציות בדף הנוכחי
            </p>
          </div>
        </aside>

        {/* ── RIGHT PANEL — Page Canvas ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Canvas header */}
          <div className="shrink-0 px-6 py-3 bg-white border-b border-[#F0F0F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#2A2628]">סקציות הדף</h2>
              <p className="text-xs text-[#9A969A]">
                {sections.length} סקציות · גרור לשינוי סדר
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#9A969A]">
                {sections.filter((s) => s.is_visible).length} מוצגות
              </span>
              <span className="text-[#E5E5E5]">·</span>
              <span className="text-xs text-[#9A969A]">
                {sections.filter((s) => !s.is_visible).length} מוסתרות
              </span>
            </div>
          </div>

          {/* Scrollable section list */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-[#F8F9FA]">
            <div className="p-6">
              {sections.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-[#E5E5E5] flex items-center justify-center mb-4">
                    <Layers className="w-8 h-8 text-[#C8C4C8]" />
                  </div>
                  <p className="text-base font-semibold text-[#4A4648]">הדף ריק</p>
                  <p className="text-sm text-[#9A969A] mt-1 max-w-xs">
                    בחר סקציה מהפאנל הימני כדי להתחיל לבנות את הדף
                  </p>
                </div>
              ) : (
                /* DnD sortable list */
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sections.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {sections.map((section, idx) => (
                        <SortableSectionRow
                          key={section.id}
                          section={section}
                          index={idx}
                          total={sections.length}
                          onMoveUp={() => moveSection(section.id, "up")}
                          onMoveDown={() => moveSection(section.id, "down")}
                          onToggleVisibility={() => toggleVisibility(section.id)}
                          onEdit={() => {
                            if (section.shared_section_id) {
                              setGlobalEditSection(section);
                              setGlobalEditDialogOpen(true);
                            } else {
                              setEditingSection(section);
                            }
                          }}
                          onDelete={() => setDeleteTargetId(section.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>

                  <DragOverlay>
                    {activeDragId && (() => {
                      const s = sections.find((x) => x.id === activeDragId);
                      if (!s) return null;
                      return (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#B8D900]/50 bg-white shadow-2xl opacity-90">
                          <GripVertical className="w-4 h-4 text-[#B8D900]" />
                          <span className="text-sm font-medium text-[#2A2628]">
                            {SECTION_LABELS[s.section_type] || s.section_type}
                          </span>
                        </div>
                      );
                    })()}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Section Edit Modal ── */}
      <SectionEditModal
        section={editingSection}
        onClose={() => setEditingSection(null)}
        onSave={saveEditSection}
        saving={editSaving}
      />

      {/* ── Delete Confirmation ── */}
      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && deleteSection(deleteTargetId)}
      />

      {/* ── Page Settings Dialog ── */}
      <PageSettingsDialog
        open={pageSettingsOpen}
        onClose={() => setPageSettingsOpen(false)}
        settings={pageSettings}
        onChange={updatePageSetting}
        tySettings={tySettings}
        onTyChange={updateTySetting}
        onSave={savePageSettings}
        saving={pageSettingsSaving}
      />

      {/* ── Version History Drawer ── */}
      {versionHistoryOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setVersionHistoryOpen(false)}
          />
          <aside
            className="fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col"
            dir="rtl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0] shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#2A2628]">היסטוריית גרסאות</h2>
                <p className="text-xs text-[#9A969A] mt-0.5">שחזור לגרסה קודמת</p>
              </div>
              <button
                onClick={() => setVersionHistoryOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
                aria-label="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
              {versionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-[#9A969A]" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 text-[#9A969A] text-sm">
                  <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>אין גרסאות שמורות עדיין</p>
                  <p className="text-xs mt-1 text-[#C0BCC0]">גרסה תישמר בכל לחיצה על שמור</p>
                </div>
              ) : (
                versions.map((v) => {
                  const date = new Date(v.created_at);
                  const relTime = new Intl.RelativeTimeFormat("he", { numeric: "auto" });
                  const diffMs = date.getTime() - Date.now();
                  const diffMins = Math.round(diffMs / 60000);
                  const diffHours = Math.round(diffMs / 3600000);
                  const diffDays = Math.round(diffMs / 86400000);
                  const rel = Math.abs(diffMins) < 60
                    ? relTime.format(diffMins, "minute")
                    : Math.abs(diffHours) < 24
                    ? relTime.format(diffHours, "hour")
                    : relTime.format(diffDays, "day");

                  return (
                    <div key={v.id} className="rounded-xl border border-[#E5E5E5] p-3 bg-[#FAFAFA] hover:border-[#B8D900]/50 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#2A2628]">גרסה {v.version_num}</span>
                        <span className="text-[10px] text-[#9A969A]">{v.sections_snapshot.length} סקציות</span>
                      </div>
                      <p className="text-[11px] text-[#716C70] mb-2">{rel}</p>
                      <button
                        onClick={() => restoreVersion(v)}
                        disabled={restoring}
                        className="w-full py-1.5 rounded-lg bg-[#2a2628] text-white text-xs font-semibold hover:bg-[#3a3638] transition-colors disabled:opacity-50"
                      >
                        {restoring ? "משחזר..." : "שחזר גרסה זו"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      )}

      {/* ── Global Section Edit Dialog ── */}
      {globalEditDialogOpen && globalEditSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] p-6 flex flex-col gap-4" dir="rtl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2A2628]">עריכת סקציה גלובלית</h2>
                <p className="text-xs text-[#9A969A] mt-0.5">סקציה זו משותפת בין מספר עמודים</p>
              </div>
            </div>
            <p className="text-sm text-[#4A4648] leading-relaxed">
              כיצד תרצו לערוך את הסקציה?
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setGlobalEditDialogOpen(false);
                  setEditingSection(globalEditSection);
                }}
                className="w-full px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors text-right"
              >
                <p className="text-sm font-semibold text-blue-700">ערוך גלובלי</p>
                <p className="text-xs text-blue-500 mt-0.5">השינויים יעודכנו בכל הדפים המשתמשים בסקציה זו</p>
              </button>
              <button
                onClick={async () => {
                  await detachSharedSection(globalEditSection.id);
                  setGlobalEditDialogOpen(false);
                  setEditingSection({ ...globalEditSection, shared_section_id: null });
                }}
                className="w-full px-4 py-3 rounded-xl bg-[#F8F9FA] border border-[#E5E5E5] hover:bg-[#F0F0F0] transition-colors text-right"
              >
                <p className="text-sm font-semibold text-[#2A2628]">ניתוק ועריכה מקומית</p>
                <p className="text-xs text-[#9A969A] mt-0.5">הסקציה תנותק מהספרייה ותהיה ייחודית לעמוד זה בלבד</p>
              </button>
            </div>
            <button
              onClick={() => setGlobalEditDialogOpen(false)}
              className="text-xs text-[#9A969A] hover:text-[#4A4648] transition-colors self-center"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
