/**
 * Premium Visual Page Builder
 * Two-panel layout: left = section library, right = current page sections.
 * Features: add sections, drag-to-reorder, up/down controls, visibility toggle,
 * per-section content edit modal, delete with confirmation, auto-save to Supabase.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DtrGuideModal } from "@/components/builder/dtr-guide-modal";
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
  Rocket,
  Link2,
  Zap,
} from "lucide-react";
import { sanitizeSlug } from "@/lib/utils/slug";
import { extractYoutubeId } from "@/lib/utils/youtube";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------


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
  language?: "he" | "en" | "ar";
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
    type: "single_image",
    nameHe: "תמונה בודדת",
    descriptionHe: "תמונה אחת ברוחב מלא עם כיתוב אופציונאלי",
    color: "bg-violet-100 text-violet-600",
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

/** Default content per section type — includes Hebrew CTA best practices */
function getDefaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case "hero":
      return {
        heading_he: "כותרת ראשית",
        heading_en: "Main Heading",
        subheading_he: "כותרת משנה",
        subheading_en: "Subheading",
        cta_text_he: "השאירו פרטים",
        cta_text_en: "Get Info",
        cta_enabled: true,
        cta_icon: "none",
        stat_value: "",
        stat_label_he: "",
        background_image_url: "",
        background_video_url: "",
      };
    case "program_info_bar":
      return { duration: "", campus: "", format: "", degree: "" };
    case "about":
      return {
        heading_he: "אודות התוכנית",
        heading_en: "About the Program",
        description_he: "",
        description_en: "",
        image_url: "",
        bullets: [],
        cta_text_he: "גלו עוד",
        cta_text_en: "Learn More",
        cta_enabled: true,
        cta_icon: "arrow",
      };
    case "benefits":
      return {
        heading_he: "למה ללמוד אצלנו",
        heading_en: "Why Study With Us",
        items: [],
        cta_text_he: "בואו נתחיל",
        cta_text_en: "Let's Start",
        cta_enabled: true,
        cta_icon: "none",
      };
    case "curriculum":
      return {
        heading_he: "תוכנית הלימודים",
        heading_en: "Curriculum",
        years: [],
        cta_text_he: "",
        cta_enabled: false,
      };
    case "career":
      return {
        heading_he: "אפשרויות קריירה",
        heading_en: "Career Outcomes",
        items: [],
        cta_text_he: "",
        cta_enabled: false,
      };
    case "testimonials":
      return {
        heading_he: "מה אומרים הסטודנטים",
        heading_en: "Student Testimonials",
        items: [],
        cta_text_he: "הצטרפו גם אתם",
        cta_text_en: "Join Us Too",
        cta_enabled: true,
        cta_icon: "none",
      };
    case "faculty":
      return {
        heading_he: "הסגל האקדמי",
        heading_en: "Faculty",
        members: [],
        cta_text_he: "",
        cta_enabled: false,
      };
    case "stats":
      return {
        heading_he: "אנו במספרים",
        heading_en: "By the Numbers",
        stats: [],
        cta_text_he: "",
        cta_enabled: false,
      };
    case "faq":
      return {
        heading_he: "שאלות נפוצות",
        heading_en: "FAQ",
        items: [],
        cta_text_he: "לא מצאתם תשובה? דברו איתנו",
        cta_text_en: "Didn't find an answer? Contact us",
        cta_enabled: true,
        cta_icon: "chat",
      };
    case "video":
      return {
        heading_he: "צפו בסרטון",
        heading_en: "Watch Video",
        videos: [],
        cta_text_he: "",
        cta_enabled: false,
      };
    case "gallery":
      return {
        heading_he: "גלריה",
        heading_en: "Gallery",
        images: [],
        cta_text_he: "",
        cta_enabled: false,
      };
    case "single_image":
      return {
        image_url: "",
        alt_text: "",
        caption_he: "",
        caption_en: "",
        caption_ar: "",
        max_width: 1100,
        rounded: true,
        shadow: true,
        padding_y: 48,
      };
    case "admission":
      return {
        heading_he: "תנאי קבלה",
        heading_en: "Admission Requirements",
        requirements: [],
        cta_text_he: "בדקו התאמה",
        cta_text_en: "Check Eligibility",
        cta_enabled: true,
        cta_icon: "none",
      };
    case "map":
      return {
        heading_he: "מיקום",
        heading_en: "Location",
        address: "",
        map_url: "",
        cta_text_he: "",
        cta_enabled: false,
      };
    case "countdown":
      return {
        heading_he: "הרשמה מוקדמת מסתיימת בקרוב",
        heading_en: "Early Registration Ending Soon",
        subheading_he: "אל תפספסו את ההזדמנות",
        badge_he: "⏰ הצעה מוגבלת בזמן",
        mode: "evergreen",
        interval_days: "7",
        target_date: "",
        expired_text_he: "ההרשמה הסתיימה. צרו קשר לבדיקת מקומות",
        cta_text_he: "",
        cta_enabled: false,
      };
    case "cta":
      return {
        heading_he: "מוכנים להתחיל?",
        heading_en: "Ready to Start?",
        description_he: "השאירו פרטים ויועץ לימודים יחזור אליכם",
        description_en: "Leave your details and a counselor will contact you",
        button_text_he: "השאירו פרטים",
        button_text_en: "Get Info",
        cta_enabled: true,
        cta_icon: "none",
        phone: "",
      };
    case "whatsapp":
      return { phone: "", message_he: "היי, אשמח לקבל פרטים", message_en: "Hi, I'd like more info" };
    case "event":
      return {
        heading_he: "יום פתוח",
        heading_en: "Open Day",
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
    case "program_outcomes":
      return {
        heading_he: "מה תוכלו לעשות בסיום התוכנית",
        heading_en: "What You'll Be Able to Do",
        subheading_he: "",
        items: [
          { title_he: "ידע אקדמי עמוק בתחום", description_he: "תרכשו ידע מקיף ועדכני מהמובילים בתעשייה ובאקדמיה." },
          { title_he: "כלים מעשיים לעולם העבודה", description_he: "סדנאות, פרויקטים ולמידה מבוססת מקרה." },
          { title_he: "רשת קשרים מקצועית", description_he: "תוכלו להתחבר אל בוגרים, מרצים ומעסיקים." },
        ],
        cta_text_he: "",
        cta_enabled: true,
      };
    case "accordion":
      return {
        heading_he: "מידע נוסף",
        heading_en: "More Information",
        items: [
          { title_he: "סעיף ראשון", body_he: "תוכן הסעיף..." },
          { title_he: "סעיף שני", body_he: "תוכן הסעיף..." },
        ],
        cta_text_he: "",
        cta_enabled: true,
      };
    case "contact_info":
      return {
        heading_he: "צרו איתנו קשר",
        heading_en: "Contact Us",
        subheading_he: "",
        phone: "",
        email: "",
        address_he: "",
        hours_he: "ימים א'-ה' 9:00-17:00",
        map_url: "",
        cta_text_he: "",
        cta_enabled: true,
      };
    case "custom_html":
      return {
        html_he: "<div class=\"text-center\"><h2 class=\"text-3xl font-bold\">תוכן מותאם אישית</h2><p class=\"mt-4\">ערכו את ה-HTML כאן.</p></div>",
        html_en: "",
        padding_y: 48,
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
  single_image: "תמונה בודדת",
  admission: "תנאי קבלה",
  map: "מפה ומיקום",
  cta: "קריאה לפעולה",
  whatsapp: "וואטסאפ",
  event: "אירוע / יום פתוח",
  countdown: "ספירה לאחור",
  program_outcomes: "תוצאות התוכנית",
  accordion: "אקורדיון",
  contact_info: "פרטי יצירת קשר",
  custom_html: "HTML מותאם",
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
  onSaveAsGlobal,
}: {
  section: PageSection;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveAsGlobal?: () => void;
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
        className="cursor-grab active:cursor-grabbing text-[#B0ACB0] hover:text-[#716C70] transition-colors shrink-0"
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
        {/* Edit — prominent primary action, always visible */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="h-8 px-2.5 gap-1.5 text-xs font-semibold text-white bg-[#B8D900] hover:bg-[#9AB800] rounded-lg transition-colors"
          title="ערוך תוכן"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">ערוך</span>
        </Button>

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

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-[#C8C4C8] hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all"
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

/** Tooltip hint showing supported DTR variables + link to full guide */
function DtrHint() {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 mt-0.5">
      <p className="text-[10px] text-[#B8D900]/80 font-mono leading-relaxed" dir="ltr">
        {"ⓘ"} {"{{utm_source}}"} {"{{utm_campaign}}"} {"{{utm_medium}}"} {"{{utm_term}}"} {"{{utm_content}}"} {"{{referrer}}"} &#8203;| fallback: {"{{utm_source|Google}}"}
      </p>
      <button
        type="button"
        onClick={() => setGuideOpen(true)}
        className="shrink-0 text-[10px] text-[#B8D900] hover:text-[#9AB800] transition-colors font-medium whitespace-nowrap"
      >
        {"📖"} מדריך מפורט
      </button>
      <DtrGuideModal open={guideOpen} onOpenChange={setGuideOpen} />
    </div>
  );
}

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
      {dtrHint && <DtrHint />}
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
      {dtrHint && <DtrHint />}
    </div>
  );
}

/**
 * Per-section CTA button text override.
 * When left empty, the renderer falls back to a sensible default
 * (the value passed in `placeholder` mirrors that default so editors
 * see exactly what will be shown).
 *
 * Visually distinct from regular text fields with a lime accent strip
 * + hint text — signals "this is the call-to-action button label".
 */
interface CtaTextFieldProps {
  fieldKey: string;
  draft: Record<string, unknown>;
  set: (key: string, value: unknown) => void;
  isEn: boolean;
  /** Default text the renderer will use when this field is empty */
  placeholder: string;
}
function CtaTextField({ fieldKey, draft, set, isEn, placeholder }: CtaTextFieldProps) {
  return (
    <div className="space-y-1.5 mt-4 pt-4 border-t border-dashed border-[#E5E5E5]">
      <div className="flex items-center gap-2">
        <div className="w-1 h-3.5 rounded-full bg-[#B8D900]" />
        <Label className="text-xs font-semibold text-[#716C70]">
          {isEn ? "CTA Button Text (override)" : "טקסט כפתור קריאה לפעולה (עוקף ברירת מחדל)"}
        </Label>
      </div>
      <Input
        value={(draft[fieldKey] as string) || ""}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        dir={isEn ? "ltr" : "rtl"}
        className="h-9 text-sm border-[#B8D900]/30 focus-visible:ring-[#B8D900]/30"
      />
      <p className="text-[10px] text-[#9A969A] leading-relaxed">
        {isEn
          ? `Leave empty to use the default: "${placeholder}"`
          : `השאירו ריק כדי להשתמש בברירת המחדל: "${placeholder}"`}
      </p>
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

/** Maximum upload size in bytes (10MB) */
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/** Image field with URL input + file upload to Supabase Storage */
function ImageField({ label, fieldKey, recommendedSize, draft, set }: ImageFieldProps) {
  const url = (draft[fieldKey] as string) || "";
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadError("הקובץ גדול מדי — מקסימום 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `sections/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const supabaseClient = createClient();
      const { error } = await supabaseClient.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        if (error.message.includes("not found") || error.message.includes("Bucket")) {
          setUploadError("שגיאה: מאגר קבצים לא קיים. יש להריץ את המיגרציה 20260402_storage_bucket.sql");
        } else if (error.message.includes("security") || error.message.includes("policy")) {
          setUploadError("שגיאה: אין הרשאה להעלאה. בדקו הגדרות RLS ב-Supabase Storage.");
        } else {
          setUploadError(`שגיאה בהעלאה: ${error.message}`);
        }
        setUploading(false);
        return;
      }
      const { data: urlData } = supabaseClient.storage.from("media").getPublicUrl(path);
      set(fieldKey, urlData.publicUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      setUploadError(`שגיאה בהעלאה: ${msg}`);
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
      {/* Upload button + error */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setUploadError(""); inputRef.current?.click(); }}
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
      {uploadError && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" /> {uploadError}
        </p>
      )}
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
          const ytId = extractYoutubeId(video.youtube_id || "");
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
        <DialogContent className="max-w-4xl w-[95vw] h-[80vh] max-h-[80vh] flex flex-col" dir="rtl">
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
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[85vh] flex flex-col" dir="rtl">
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
/** Single draggable item inside an ObjectListField */
function SortableObjectItem({
  id,
  index,
  item,
  fields,
  onUpdate,
  onRemove,
}: {
  id: string;
  index: number;
  item: Record<string, string>;
  fields: { key: string; label: string; type?: string }[];
  onUpdate: (k: string, v: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-[#E5E5E5] rounded-xl p-3 space-y-2 bg-[#FAFAFA]"
    >
      <div className="flex items-center justify-between mb-1">
        {/* Drag handle + item label */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-[#C8C4C8] hover:text-[#716C70] transition-colors"
            title="גרור לשינוי סדר"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-semibold text-[#9A969A]">פריט {index + 1}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
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
              onChange={(e) => onUpdate(f.key, e.target.value)}
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
            onChange={(v) => onUpdate(f.key, v)}
          />
        ) : (
          <div key={f.key} className="space-y-1">
            <Label className="text-[11px] text-[#9A969A]">{f.label}</Label>
            <Input
              value={item[f.key] || ""}
              onChange={(e) => onUpdate(f.key, e.target.value)}
              dir="rtl"
              className="h-8 text-sm"
            />
          </div>
        )
      )}
    </div>
  );
}

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

  // Stable IDs for dnd-kit — use index-based since items have no unique key
  const itemIds = list.map((_, i) => `ol-${fieldKey}-${i}`);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = itemIds.indexOf(active.id as string);
    const newIndex = itemIds.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      set(fieldKey, arrayMove(list, oldIndex, newIndex));
    }
  };

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {list.map((item, i) => (
              <SortableObjectItem
                key={itemIds[i]}
                id={itemIds[i]}
                index={i}
                item={item}
                fields={fields}
                onUpdate={(k, v) => updateField(i, k, v)}
                onRemove={() => removeItem(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
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
  /** Page language — determines which field suffix to edit (_he vs _en vs _ar) */
  pageLanguage?: "he" | "en" | "ar";
  /** Called when user wants to save this section as a global (shared) section */
  onSaveAsGlobal?: () => void;
}

function SectionEditModal({ section, onClose, onSave, saving, pageLanguage = "he", onSaveAsGlobal }: SectionEditModalProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (section) {
      setDraft(section.content ? { ...section.content as Record<string, unknown> } : {});
    }
  }, [section]);

  if (!section) return null;

  const set = (key: string, value: unknown) => setDraft((prev) => ({ ...prev, [key]: value }));

  /** Language-aware field key — returns "heading_en" for English pages, "heading_he" for Hebrew */
  const lang = pageLanguage || "he";
  const lk = (base: string) => `${base}_${lang}`;
  const isEn = lang === "en";

  /** Render the appropriate editor form per section type */
  const renderForm = () => {
    switch (section.section_type) {
      case "hero":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Faculty / Program Name" : "שם הפקולטה / תוכנית"} fieldKey={lk("faculty_name")} placeholder={isEn ? "Faculty of Law – International Program" : "פקולטה למשפטים – תוכנית בינלאומית"} draft={draft} set={set} />
            <Field label={isEn ? "Degree Badge (e.g. LL.B.)" : "תג תואר (למשל LL.B.)"} fieldKey="degree_type" placeholder="LL.B." dir="ltr" draft={draft} set={set} />
            <Field label={isEn ? "Main Heading" : "כותרת ראשית"} fieldKey={lk("heading")} placeholder={isEn ? "Main heading..." : "כותרת ראשית..."} dtrHint draft={draft} set={set} />
            <TextareaField label={isEn ? "Subheading" : "כותרת משנה"} fieldKey={lk("subheading")} placeholder={isEn ? "Additional details..." : "פרטים נוספים..."} dtrHint draft={draft} set={set} />
            <Field label={isEn ? "Button Text" : "טקסט כפתור"} fieldKey={lk("cta_text")} placeholder={isEn ? "Get Info" : "השאירו פרטים"} draft={draft} set={set} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={isEn ? "Stat Value (e.g. 50,000+)" : "ערך נתון (למשל 50,000+)"} fieldKey="stat_value" placeholder="50,000+" dir="ltr" draft={draft} set={set} />
              <Field label={isEn ? "Stat Label" : "תווית נתון"} fieldKey={lk("stat_label")} placeholder={isEn ? "Graduates" : "בוגרים"} draft={draft} set={set} />
            </div>
            <ImageField label={isEn ? "Background Image" : "תמונת רקע"} fieldKey="background_image_url" recommendedSize="1920×1080px" draft={draft} set={set} />
            <Field label={isEn ? "Background Video (optional)" : "סרטון רקע (אופציונלי)"} fieldKey="background_video_url" placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX" dir="ltr" draft={draft} set={set} />
            <div className="space-y-1 -mt-1">
              <p className="text-[10px] text-[#9A969A]">
                <span className="font-semibold text-[#716C70]">{isEn ? "Supported format:" : "פורמט נתמך:"}</span>{" "}
                {isEn ? "Regular YouTube link — example:" : "לינק YouTube רגיל — לדוגמה:"}
              </p>
              <code className="block text-[10px] bg-[#F3F4F6] rounded px-2 py-1 font-mono text-[#716C70]" dir="ltr">
                https://www.youtube.com/watch?v=dQw4w9WgXcQ
              </code>
              <p className="text-[10px] text-[#9A969A]">
                {isEn ? "Video will autoplay muted in a loop. Image serves as poster." : "הסרטון יוטמע ברקע ללא שליטות, מושתק ובלולאה אינסופית. התמונה תשמש כפוסטר."}
              </p>
            </div>
            {/* Overlay opacity slider */}
            {((draft.background_image_url as string) || (draft.background_video_url as string)) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#716C70]">
                  {isEn ? `Overlay Opacity: ${(draft.background_overlay_opacity as number) ?? 60}%` : `שקיפות שכבת הכהיה: ${(draft.background_overlay_opacity as number) ?? 60}%`}
                </Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={(draft.background_overlay_opacity as number) ?? 60}
                  onChange={(e) => set("background_overlay_opacity", parseInt(e.target.value, 10))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#B8D900]"
                />
                <div className="flex justify-between text-[10px] text-[#9A969A]">
                  <span>{isEn ? "Transparent" : "שקוף"}</span>
                  <span>{isEn ? "Dark" : "כהה"}</span>
                </div>
              </div>
            )}
          </div>
        );

      case "program_info_bar":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Duration" : "משך התוכנית"} fieldKey="duration" placeholder={isEn ? "3 Years" : "3 שנים"} draft={draft} set={set} />
            <Field label={isEn ? "Campus" : "קמפוס"} fieldKey="campus" placeholder={isEn ? "Kiryat Ono, Tel Aviv..." : "קריית אונו, תל אביב..."} draft={draft} set={set} />
            <Field label={isEn ? "Study Format" : "מסגרת לימודים"} fieldKey="format" placeholder={isEn ? "Day / Evening / Saturday" : "יום / ערב / שבת"} draft={draft} set={set} />
            <Field label={isEn ? "Degree" : "תואר"} fieldKey="degree" placeholder="B.A., M.A., LL.B..." draft={draft} set={set} />
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "About the Program" : "אודות התוכנית"} draft={draft} set={set} />
            <TextareaField label={isEn ? "Description" : "תיאור"} fieldKey={lk("description")} rows={4} placeholder={isEn ? "Program description..." : "פסקת תיאור..."} draft={draft} set={set} />
            <ImageField label={isEn ? "Image" : "תמונה"} fieldKey="image_url" recommendedSize="800×600px" draft={draft} set={set} />
            <StringListField label={isEn ? "Key Points" : "נקודות מפתח"} fieldKey="bullets" placeholder={isEn ? "Key point..." : "נקודה מפתח..."} draft={draft} set={set} />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Learn More" : "לפרטים נוספים"} />
          </div>
        );

      case "benefits":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Why Study With Us" : "למה ללמוד אצלנו"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Benefits" : "יתרונות"}
              fieldKey="items"
              fields={[
                { key: lk("title"), label: isEn ? "Benefit Title" : "כותרת יתרון" },
                { key: lk("description"), label: isEn ? "Description" : "תיאור", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "I Want to Learn More" : "אני רוצה לדעת עוד"} />
          </div>
        );

      case "curriculum":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Curriculum" : "תוכנית הלימודים"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Years / Semesters" : "שנים / סמסטרים"}
              fieldKey="years"
              fields={[
                { key: lk("title"), label: isEn ? "Year / Semester Title" : "כותרת שנה / סמסטר" },
                { key: "courses", label: isEn ? "Courses (comma-separated)" : "קורסים (מופרדים בפסיק)", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Want to learn more about the curriculum?" : "רוצה לדעת עוד על תוכנית הלימודים?"} />
          </div>
        );

      case "career":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Career Outcomes" : "אפשרויות קריירה"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Job Titles" : "תפקידים ומשרות"}
              fieldKey="items"
              fields={[
                { key: lk("title"), label: isEn ? "Title" : "תפקיד" },
              ]}
              draft={draft}
              set={set}
            />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Want to learn more?" : "רוצים לשמוע עוד?"} />
          </div>
        );

      case "testimonials":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "What Students Say" : "מה אומרים הסטודנטים"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Testimonials" : "המלצות"}
              fieldKey="items"
              fields={[
                { key: "name", label: isEn ? "Name" : "שם" },
                { key: lk("role"), label: isEn ? "Role / Year" : "תפקיד / שנה" },
                { key: lk("quote"), label: isEn ? "Quote" : "ציטוט", type: "textarea" },
                { key: "image_url", label: isEn ? "Photo (URL)" : "תמונה (URL)", type: "image" },
              ]}
              draft={draft}
              set={set}
            />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Join Our Students" : "הצטרפו אל הסטודנטים שלנו"} />
          </div>
        );

      case "faculty":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Faculty" : "הסגל האקדמי"} draft={draft} set={set} />
            <FacultyMemberEditor draft={draft} set={set} />
          </div>
        );

      case "stats":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "By the Numbers" : "אנו במספרים"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Statistics" : "נתונים"}
              fieldKey="stats"
              fields={[
                { key: "value", label: isEn ? "Value (e.g. 50,000+)" : "ערך (למשל 50,000+)" },
                { key: lk("label"), label: isEn ? "Label" : "תווית" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "faq":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "FAQ" : "שאלות נפוצות"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Questions & Answers" : "שאלות ותשובות"}
              fieldKey="items"
              fields={[
                { key: lk("question"), label: isEn ? "Question" : "שאלה" },
                { key: lk("answer"), label: isEn ? "Answer" : "תשובה", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Have More Questions? Contact Us" : "יש לכם עוד שאלה? דברו איתנו"} />
          </div>
        );

      case "video":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Watch Video" : "צפו בסרטון"} draft={draft} set={set} />
            <TextareaField label={isEn ? "Description (optional)" : "תיאור (אופציונלי)"} fieldKey={lk("description")} rows={2} placeholder={isEn ? "Short description..." : "תיאור קצר..."} draft={draft} set={set} />
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
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Gallery" : "גלריה"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Images" : "תמונות"}
              fieldKey="images"
              fields={[
                { key: "url", label: isEn ? "Image URL" : "URL תמונה", type: "image" },
                { key: lk("caption"), label: isEn ? "Caption" : "כיתוב" },
              ]}
              draft={draft}
              set={set}
            />
          </div>
        );

      case "single_image":
        /* Minimal editor: one image URL, an alt text, optional per-language
           caption, and three layout knobs. No heading/CTA by design. */
        return (
          <div className="space-y-4">
            <ImageField
              label={isEn ? "Image" : "תמונה"}
              fieldKey="image_url"
              recommendedSize={isEn ? "Recommended: 1600×900 or larger" : "מומלץ: 1600×900 ומעלה"}
              draft={draft}
              set={set}
            />
            <Field
              label={isEn ? "Alt text (accessibility)" : "טקסט חלופי (נגישות)"}
              fieldKey="alt_text"
              placeholder={isEn ? "Describe the image for screen readers" : "תיאור התמונה לקוראי מסך"}
              draft={draft}
              set={set}
            />
            <Field
              label={isEn ? "Caption (optional)" : "כיתוב (אופציונלי)"}
              fieldKey={lk("caption")}
              placeholder={isEn ? "A short caption below the image" : "כיתוב קצר מתחת לתמונה"}
              draft={draft}
              set={set}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#716C70]">{isEn ? "Max width (px)" : "רוחב מקסימלי (פיקסלים)"}</Label>
                <Input
                  type="number"
                  min={400}
                  max={2000}
                  step={50}
                  value={(draft.max_width as number) ?? 1100}
                  onChange={(e) => set("max_width", Number(e.target.value) || 1100)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#716C70]">{isEn ? "Vertical padding (px)" : "מרווח אנכי (פיקסלים)"}</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={4}
                  value={(draft.padding_y as number) ?? 48}
                  onChange={(e) => set("padding_y", Number(e.target.value) || 48)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-[#4A4648] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.rounded !== false}
                  onChange={(e) => set("rounded", e.target.checked)}
                  className="h-4 w-4 rounded border-[#E5E5E5] text-[#B8D900] focus:ring-[#B8D900]"
                />
                {isEn ? "Rounded corners" : "פינות מעוגלות"}
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-[#4A4648] cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.shadow !== false}
                  onChange={(e) => set("shadow", e.target.checked)}
                  className="h-4 w-4 rounded border-[#E5E5E5] text-[#B8D900] focus:ring-[#B8D900]"
                />
                {isEn ? "Drop shadow" : "צל"}
              </label>
            </div>
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
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Admission Requirements" : "תנאי קבלה"} draft={draft} set={set} />

            {/* Toggle between single/multi track */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F3F4F6] border border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => { set("tracks", undefined); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${!hasTracks ? "bg-white shadow text-[#2A2628]" : "text-[#9A969A] hover:text-[#4A4648]"}`}
              >
                {isEn ? "Single Track" : "מסלול אחד"}
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
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Check Eligibility" : "בדקו זכאות"} />
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

      case "program_outcomes":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "What You'll Be Able to Do" : "מה תוכלו לעשות בסיום התוכנית"} draft={draft} set={set} />
            <TextareaField label={isEn ? "Subheading (optional)" : "כותרת משנה (אופציונלי)"} fieldKey={lk("subheading")} rows={2} placeholder={isEn ? "Short paragraph..." : "פסקה קצרה..."} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Outcomes" : "תוצרי למידה"}
              fieldKey="items"
              fields={[
                { key: lk("title"), label: isEn ? "Title" : "כותרת" },
                { key: lk("description"), label: isEn ? "Description (optional)" : "תיאור (אופציונלי)", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "I'm Ready to Start" : "אני מוכן להתחיל"} />
          </div>
        );

      case "accordion":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "More Information" : "מידע נוסף"} draft={draft} set={set} />
            <ObjectListField
              label={isEn ? "Accordion Items" : "פריטי האקורדיון"}
              fieldKey="items"
              fields={[
                { key: lk("title"), label: isEn ? "Title" : "כותרת הפריט" },
                { key: lk("body"), label: isEn ? "Body Text" : "תוכן", type: "textarea" },
              ]}
              draft={draft}
              set={set}
            />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Get Info" : "השאירו פרטים"} />
          </div>
        );

      case "contact_info":
        return (
          <div className="space-y-4">
            <Field label={isEn ? "Heading" : "כותרת"} fieldKey={lk("heading")} placeholder={isEn ? "Contact Us" : "צרו איתנו קשר"} draft={draft} set={set} />
            <TextareaField label={isEn ? "Subheading (optional)" : "כותרת משנה (אופציונלי)"} fieldKey={lk("subheading")} rows={2} placeholder={isEn ? "Short paragraph..." : "פסקה קצרה..."} draft={draft} set={set} />
            <Field label={isEn ? "Phone" : "טלפון"} fieldKey="phone" placeholder="03-123-4567" dir="ltr" draft={draft} set={set} />
            <Field label={isEn ? "Email" : "אימייל"} fieldKey="email" placeholder="info@example.com" dir="ltr" draft={draft} set={set} />
            <Field label={isEn ? "Address" : "כתובת"} fieldKey={lk("address")} placeholder={isEn ? "123 Street, City" : "רחוב הראשי 1, קריית אונו"} draft={draft} set={set} />
            <Field label={isEn ? "Hours" : "שעות פעילות"} fieldKey={lk("hours")} placeholder={isEn ? "Sun-Thu 9:00-17:00" : "ימים א'-ה' 9:00-17:00"} draft={draft} set={set} />
            <Field label={isEn ? "Google Maps URL (optional)" : "קישור Google Maps (אופציונלי)"} fieldKey="map_url" placeholder="https://maps.google.com/..." dir="ltr" draft={draft} set={set} />
            <CtaTextField fieldKey={lk("cta_text")} draft={draft} set={set} isEn={isEn} placeholder={isEn ? "Leave Details — We'll Call You Back" : "השאירו פרטים ונחזור אליכם"} />
          </div>
        );

      case "custom_html":
        return (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-amber-600 text-lg leading-none">⚠️</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {isEn
                  ? "HTML is rendered directly. <script> tags are stripped automatically for safety. Use this only for trusted markup."
                  : "ה-HTML מוצג ישירות בעמוד. תגיות <script> מוסרות אוטומטית מטעמי אבטחה. השתמשו בכלי זה רק לתוכן בטוח."}
              </p>
            </div>
            <TextareaField
              label={isEn ? "HTML Content (Hebrew)" : "תוכן HTML (עברית)"}
              fieldKey="html_he"
              rows={10}
              placeholder='<div class="text-center">...</div>'
              dir="ltr"
              draft={draft}
              set={set}
            />
            <TextareaField
              label={isEn ? "HTML Content (English, optional)" : "תוכן HTML (אנגלית, אופציונלי)"}
              fieldKey="html_en"
              rows={6}
              placeholder='<div class="text-center">...</div>'
              dir="ltr"
              draft={draft}
              set={set}
            />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-[#716C70]">
                {isEn ? `Vertical Padding: ${(draft.padding_y as number) ?? 48}px` : `ריווח אנכי: ${(draft.padding_y as number) ?? 48}px`}
              </Label>
              <input
                type="range"
                min={0}
                max={160}
                step={4}
                value={(draft.padding_y as number) ?? 48}
                onChange={(e) => set("padding_y", parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#B8D900]"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <p className="text-sm text-[#9A969A]">אין עורך מיוחד לסוג מקטע זה.</p>
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
        className="max-w-4xl w-[95vw] h-[90vh] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden"
        dir="rtl"
      >
        <DialogHeader className="px-6 py-4 border-b border-[#F0F0F0] shrink-0">
          <DialogTitle className="text-base font-bold text-[#2A2628]">
            עריכת מקטע — {label}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#9A969A]">
            שנה את תוכן המקטע ולחץ שמור
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-5">{renderForm()}</div>
        </div>

        <div className="px-6 py-4 border-t border-[#F0F0F0] flex items-center justify-between gap-3 shrink-0">
          {/* Save as Global — left side, only for non-shared sections */}
          {onSaveAsGlobal && !section.shared_section_id ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { onClose(); onSaveAsGlobal(); }}
              className="h-8 gap-1.5 text-xs text-[#9A969A] hover:text-blue-600 hover:bg-blue-50"
            >
              <Globe className="w-3.5 h-3.5" />
              שמור כמקטע משותף
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page Settings Dialog
// ---------------------------------------------------------------------------



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
      <DialogContent className="max-w-lg w-[90vw]" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <DialogTitle className="text-base font-bold text-[#2A2628]">מחיקת מקטע</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-[#9A969A] pr-13">
            האם אתה בטוח שברצונך למחוק מקטע זה? פעולה זו אינה ניתנת לביטול.
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
  /** Always-fresh ref to sections — prevents stale closure bugs in useCallback */
  const sectionsRef = useRef<PageSection[]>([]);
  useEffect(() => { sectionsRef.current = sections; }, [sections]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  // Global sections library panel state
  const [libraryTab, setLibraryTab] = useState<"types" | "global">("types");
  const [globalSections, setGlobalSections] = useState<GlobalSectionItem[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalEditDialogOpen, setGlobalEditDialogOpen] = useState(false);
  const [globalEditSection, setGlobalEditSection] = useState<PageSection | null>(null);
  const [saveAsGlobalSection, setSaveAsGlobalSection] = useState<PageSection | null>(null);
  const [saveAsGlobalName, setSaveAsGlobalName] = useState("");
  const [saveAsGlobalCategory, setSaveAsGlobalCategory] = useState("");
  const [saveAsGlobalSaving, setSaveAsGlobalSaving] = useState(false);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  /** Editable slug state for page settings dialog */
  const [publishing, setPublishing] = useState(false);

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
        supabase.from("pages").select("id, title_he, slug, status, language, custom_styles").eq("id", pageId).single(),
        supabase.from("page_sections").select("*").eq("page_id", pageId).order("sort_order"),
      ]);
      if (pageRes.data) {
        setPage(pageRes.data as PageData);
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
          shared_section_id: s.shared_section_id ?? null,
        }));
        const { error } = await supabase.from("page_sections").upsert(upserts);
        if (!error) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin_page_updated", resource_type: "page_sections", resource_id: pageId, metadata: { sections_count: upserts.length } }) }).catch(() => {});
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
      showToast(`מקטע משותף "${gs.name_he}" נוספה`);
    } else {
      showToast("שגיאה בהוספת מקטע משותף", "error");
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
      showToast("המקטע המשותף עודכנה — כל הדפים המשתמשים בה עודכנו");
    } else {
      showToast("שגיאה בשמירה הגלובלית", "error");
    }
    setEditSaving(false);
  }, [supabase, showToast]);

  /** Saves a local section as a new global (shared) section and links it */
  const handleSaveAsGlobal = useCallback(async () => {
    if (!saveAsGlobalSection || !saveAsGlobalName.trim()) return;
    setSaveAsGlobalSaving(true);
    const { data, error } = await supabase
      .from("shared_sections")
      .insert({
        name_he: saveAsGlobalName.trim(),
        section_type: saveAsGlobalSection.section_type,
        category: saveAsGlobalCategory.trim() || null,
        content: saveAsGlobalSection.content,
        styles: saveAsGlobalSection.styles ?? null,
      })
      .select("id")
      .single();
    if (!error && data) {
      // Link this page section to the new global section
      await supabase
        .from("page_sections")
        .update({ shared_section_id: data.id })
        .eq("id", saveAsGlobalSection.id);
      setSections((prev) =>
        prev.map((s) => s.id === saveAsGlobalSection.id ? { ...s, shared_section_id: data.id } : s)
      );
      showToast(`המקטע נשמר כגלובלית: "${saveAsGlobalName.trim()}"`);
      setSaveAsGlobalSection(null);
      setSaveAsGlobalName("");
      setSaveAsGlobalCategory("");
    } else {
      showToast("שגיאה בשמירת המקטע המשותף", "error");
    }
    setSaveAsGlobalSaving(false);
  }, [saveAsGlobalSection, saveAsGlobalName, saveAsGlobalCategory, supabase, showToast]);

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
      showToast(newVisible ? "המקטע מוצג כעת" : "המקטע הוסתר");
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
        showToast("מקטע חדש נוסף");
        /* Auto-open editor for the new section */
        setEditingSection(data as PageSection);
      } else {
        console.error("[addSection] insert error:", JSON.stringify(error));
        showToast(`שגיאה בהוספת מקטע: ${error?.message || error?.code || "unknown"}`, "error");
      }
      setAddingType(null);
    },
    [pageId, sections, supabase, showToast]
  );

  // ---- Save section content ----

  const saveEditSection = useCallback(
    async (id: string, content: Record<string, unknown>) => {
      // Cancel any pending debounced persistOrder — prevents it from overwriting our save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      setEditSaving(true);
      // Use sectionsRef for always-fresh sections (avoids stale closure bug)
      const section = sectionsRef.current.find((s) => s.id === id);
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
        console.error("[saveEditSection] error:", JSON.stringify(error));
        showToast(`שגיאה בשמירה: ${error.message || error.code || "unknown"}`, "error");
      }
      setEditSaving(false);
    },
    [supabase, showToast, saveGlobalSection]
  );

  // ---- Delete section ----

  const deleteSection = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("page_sections").delete().eq("id", id);
      if (!error) {
        setSections((prev) => prev.filter((s) => s.id !== id));
        setDeleteTargetId(null);
        showToast("המקטע נמחק");
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
      // Preserve shared_section_id so global-section links are not lost on save
      shared_section_id: s.shared_section_id ?? null,
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
      // Trigger on-demand ISR so the static LP HTML is regenerated
      if (page?.slug) {
        fetch("/api/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: page.slug }),
        }).catch(() => {/* non-blocking */});
      }
      fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin_page_updated", resource_type: "page", resource_id: pageId, metadata: { slug: page?.slug, sections_count: upserts.length } }) }).catch(() => {});
    } else {
      // Log full error for debugging, show brief message in UI
      console.error("[handleSaveAll] upsert error:", JSON.stringify(error));
      showToast(`שגיאה בשמירה: ${error.message || error.code || "unknown"}`, "error");
    }
    setSaving(false);
  };

  /** Publishes (or unpublishes) the current page */
  const handlePublish = useCallback(async () => {
    if (!page) return;
    setPublishing(true);
    const isPublished = page.status === "published";

    /* Validate before publishing: at least one interest area must be assigned */
    if (!isPublished) {
      const { data: areas } = await supabase
        .from("page_interest_areas")
        .select("interest_area_id")
        .eq("page_id", pageId)
        .limit(1);

      if (!areas || areas.length === 0) {
        showToast("לא ניתן לפרסם ללא תחום עניין משויך. הגדירו תחום עניין בהגדרות העמוד.", "error");
        setPublishing(false);
        return;
      }
    }

    const newStatus = isPublished ? "draft" : "published";
    const updateData: Record<string, unknown> = { status: newStatus };
    if (!isPublished) updateData.published_at = new Date().toISOString();
    const { error } = await supabase.from("pages").update(updateData).eq("id", pageId);
    if (!error) {
      setPage((prev) => prev ? { ...prev, status: newStatus } : prev);
      showToast(isPublished ? "העמוד הוחזר לטיוטה" : "העמוד פורסם בהצלחה!");
      fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: isPublished ? "admin_page_unpublished" : "admin_page_published", resource_type: "page", resource_id: pageId, metadata: { slug: page.slug } }) }).catch(() => {});
    } else {
      showToast("שגיאה בעדכון סטטוס", "error");
    }
    setPublishing(false);
  }, [page, pageId, supabase, showToast]);

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/pages/${params.id}/analytics`)}
            className="h-9 w-9 p-0 border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900] hover:text-[#4A4648]"
            title="אנליטיקס עמוד"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2v8H3zm6-4h2v12H9zm6-6h2v18h-2zm6 10h2v8h-2z" />
            </svg>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/pages/${pageId}/settings`)}
            className="h-9 gap-2 border-[#E5E5E5] text-[#4A4648] hover:border-[#B8D900]"
          >
            <Settings2 className="w-3.5 h-3.5" />
            הגדרות עמוד
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/pages/${pageId}/utm-builder`)}
            className="h-9 gap-2 border-[#E5E5E5] text-[#4A4648] hover:border-[#B8D900]"
          >
            <Link2 className="w-3.5 h-3.5" />
            UTM
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/pages/${pageId}/smart-links`)}
            className="h-9 gap-2 border-[#E5E5E5] text-[#4A4648] hover:border-[#B8D900]"
          >
            <Zap className="w-3.5 h-3.5" />
            Smart Links
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/lp/${page.slug}`, "_blank")}
            className="h-9 gap-2 border-[#E5E5E5] text-[#4A4648] hover:border-[#B8D900]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            צפה בעמוד
          </Button>

          {/* Publish / Unpublish button */}
          {page.status === "published" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
              className="h-9 gap-2 border-green-200 text-green-700 hover:bg-green-50"
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              מפורסם
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={publishing}
              className="h-9 gap-2 bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
              פרסם עמוד
            </Button>
          )}

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
                <h2 className="text-sm font-bold text-white">ספריית מקטעים</h2>
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
                סוגי מקטעים
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
                        {globalSections.length === 0 ? "אין מקטעים בספרייה עדיין" : "לא נמצאו תוצאות"}
                      </p>
                      {globalSections.length === 0 && (
                        <p className="text-[10px] text-white/20 mt-1">
                          הוסיפו מ&ldquo;מקטעים משותפים&rdquo; בסיידבר
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
              {sections.length} מקטעים בדף הנוכחי
            </p>
          </div>
        </aside>

        {/* ── RIGHT PANEL — Page Canvas ── */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Canvas header */}
          <div className="shrink-0 px-6 py-3 bg-white border-b border-[#F0F0F0] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#2A2628]">מקטעי הדף</h2>
              <p className="text-xs text-[#9A969A]">
                {sections.length} מקטעים · גרור לשינוי סדר
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
                    בחר מקטע מהפאנל הימני כדי להתחיל לבנות את הדף
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
                          onSaveAsGlobal={() => {
                            setSaveAsGlobalSection(section);
                            const label = SECTION_LABELS[section.section_type] || section.section_type;
                            const heading = (section.content as Record<string, unknown>)?.heading_he;
                            setSaveAsGlobalName(typeof heading === "string" && heading ? heading : label);
                          }}
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
        pageLanguage={page?.language || "he"}
        onSaveAsGlobal={editingSection ? () => {
          const label = SECTION_LABELS[editingSection.section_type] || editingSection.section_type;
          const heading = (editingSection.content as Record<string, unknown>)?.heading_he;
          setSaveAsGlobalSection(editingSection);
          setSaveAsGlobalName(typeof heading === "string" && heading ? heading : label);
        } : undefined}
      />

      {/* ── Delete Confirmation ── */}
      <DeleteConfirmDialog
        open={!!deleteTargetId}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && deleteSection(deleteTargetId)}
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
                        <span className="text-[10px] text-[#9A969A]">{v.sections_snapshot.length} מקטעים</span>
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
                <h2 className="text-sm font-bold text-[#2A2628]">עריכת מקטע משותף</h2>
                <p className="text-xs text-[#9A969A] mt-0.5">מקטע זה משותף בין מספר עמודים</p>
              </div>
            </div>
            <p className="text-sm text-[#4A4648] leading-relaxed">
              כיצד תרצו לערוך את המקטע?
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
                <p className="text-xs text-blue-500 mt-0.5">השינויים יעודכנו בכל הדפים המשתמשים במקטע זה</p>
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
                <p className="text-xs text-[#9A969A] mt-0.5">המקטע ינותק מהספרייה ותהיה ייחודית לעמוד זה בלבד</p>
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

      {/* ── Save as Global Section Dialog ── */}
      {saveAsGlobalSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] p-6 flex flex-col gap-4" dir="rtl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#2A2628]">שמירה כמקטע משותף</h2>
                <p className="text-[11px] text-[#9A969A]">המקטע יהיה זמינה לשימוש בכל העמודים</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#4A4648] mb-1">שם המקטע</label>
                <input
                  type="text"
                  value={saveAsGlobalName}
                  onChange={(e) => setSaveAsGlobalName(e.target.value)}
                  placeholder="לדוגמה: Hero משפטים"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4A4648] mb-1">קטגוריה (אופציונלי)</label>
                <input
                  type="text"
                  value={saveAsGlobalCategory}
                  onChange={(e) => setSaveAsGlobalCategory(e.target.value)}
                  placeholder="לדוגמה: מנהל עסקים, משפטים"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20"
                />
              </div>
            </div>
            <button
              onClick={handleSaveAsGlobal}
              disabled={!saveAsGlobalName.trim() || saveAsGlobalSaving}
              className="w-full py-2.5 rounded-xl bg-[#B8D900] text-[#2a2628] font-bold text-sm hover:bg-[#c8e920] transition-colors disabled:opacity-50"
            >
              {saveAsGlobalSaving ? "שומר..." : "שמור כגלובלית"}
            </button>
            <button
              onClick={() => { setSaveAsGlobalSection(null); setSaveAsGlobalName(""); setSaveAsGlobalCategory(""); }}
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
