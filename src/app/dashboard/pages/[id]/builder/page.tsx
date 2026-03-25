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
  thank_you_message?: string;
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
    case "cta":
      return { heading_he: "מוכנים להתחיל?", description_he: "", button_text_he: "להרשמה", phone: "" };
    case "whatsapp":
      return { phone: "", message_he: "היי, אשמח לקבל פרטים" };
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

  /** Helper — renders a text input field */
  const Field = ({
    label,
    fieldKey,
    placeholder = "",
    dir = "rtl",
  }: {
    label: string;
    fieldKey: string;
    placeholder?: string;
    dir?: "rtl" | "ltr";
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Input
        value={(draft[fieldKey] as string) || ""}
        onChange={(e) => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="h-9 text-sm"
      />
    </div>
  );

  /** Helper — renders a textarea field */
  const TextareaField = ({
    label,
    fieldKey,
    placeholder = "",
    rows = 3,
    dir = "rtl",
  }: {
    label: string;
    fieldKey: string;
    placeholder?: string;
    rows?: number;
    dir?: "rtl" | "ltr";
  }) => (
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
    </div>
  );

  /** Helper — image URL field with preview */
  const ImageField = ({ label, fieldKey }: { label: string; fieldKey: string }) => {
    const url = (draft[fieldKey] as string) || "";
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        <Input
          value={url}
          onChange={(e) => set(fieldKey, e.target.value)}
          placeholder="https://..."
          dir="ltr"
          className="h-9 text-sm font-mono"
        />
        {url && (
          <div className="rounded-lg overflow-hidden border border-[#E5E5E5] h-28 bg-[#F3F4F6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  };

  /** Helper — manage a simple string list */
  const StringListField = ({
    label,
    fieldKey,
    placeholder = "",
  }: {
    label: string;
    fieldKey: string;
    placeholder?: string;
  }) => {
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
  };

  /** Helper — manage a list of objects with name+description */
  const ObjectListField = ({
    label,
    fieldKey,
    fields,
  }: {
    label: string;
    fieldKey: string;
    fields: Array<{ key: string; label: string; type?: "text" | "textarea" | "image" }>;
  }) => {
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
                  <div key={f.key} className="space-y-1">
                    <Label className="text-[11px] text-[#9A969A]">{f.label}</Label>
                    <Input
                      value={item[f.key] || ""}
                      onChange={(e) => updateField(i, f.key, e.target.value)}
                      placeholder="https://..."
                      dir="ltr"
                      className="h-8 text-sm"
                    />
                    {item[f.key] && (
                      <div className="h-16 rounded overflow-hidden border border-[#E5E5E5]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item[f.key]} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
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
  };

  /** Render the appropriate editor form per section type */
  const renderForm = () => {
    switch (section.section_type) {
      case "hero":
        return (
          <div className="space-y-4">
            <Field label="כותרת ראשית" fieldKey="heading_he" placeholder="כותרת ראשית..." />
            <TextareaField label="כותרת משנה" fieldKey="subheading_he" placeholder="פרטים נוספים..." />
            <Field label="טקסט כפתור" fieldKey="cta_text_he" placeholder="השאירו פרטים" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ערך נתון (למשל 50,000+)" fieldKey="stat_value" placeholder="50,000+" dir="ltr" />
              <Field label="תווית נתון" fieldKey="stat_label_he" placeholder="בוגרים" />
            </div>
            <ImageField label="תמונת רקע (URL)" fieldKey="background_image_url" />
          </div>
        );

      case "program_info_bar":
        return (
          <div className="space-y-4">
            <Field label="משך התוכנית" fieldKey="duration" placeholder="3 שנים" />
            <Field label="קמפוס" fieldKey="campus" placeholder="קריית אונו, תל אביב..." />
            <Field label="מסגרת לימודים" fieldKey="format" placeholder="יום / ערב / שבת" />
            <Field label="תואר" fieldKey="degree" placeholder="B.A., M.A., LL.B..." />
          </div>
        );

      case "about":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אודות התוכנית" />
            <TextareaField label="תיאור" fieldKey="description_he" rows={4} placeholder="פסקת תיאור..." />
            <ImageField label="תמונה (URL)" fieldKey="image_url" />
            <StringListField label="נקודות מפתח" fieldKey="bullets" placeholder="נקודה מפתח..." />
          </div>
        );

      case "benefits":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="למה ללמוד אצלנו" />
            <ObjectListField
              label="יתרונות"
              fieldKey="items"
              fields={[
                { key: "title_he", label: "כותרת יתרון" },
                { key: "description_he", label: "תיאור", type: "textarea" },
              ]}
            />
          </div>
        );

      case "curriculum":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="תוכנית הלימודים" />
            <ObjectListField
              label="שנים / סמסטרים"
              fieldKey="years"
              fields={[
                { key: "title_he", label: "כותרת שנה / סמסטר" },
                { key: "courses", label: "קורסים (מופרדים בפסיק)", type: "textarea" },
              ]}
            />
          </div>
        );

      case "career":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אפשרויות קריירה" />
            <StringListField label="תפקידים ומשרות" fieldKey="items" placeholder="יועץ משפטי..." />
          </div>
        );

      case "testimonials":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מה אומרים הסטודנטים" />
            <ObjectListField
              label="המלצות"
              fieldKey="items"
              fields={[
                { key: "name", label: "שם" },
                { key: "role", label: "תפקיד / שנה" },
                { key: "quote", label: "ציטוט", type: "textarea" },
                { key: "image_url", label: "תמונה (URL)", type: "image" },
              ]}
            />
          </div>
        );

      case "faculty":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="הסגל האקדמי" />
            <ObjectListField
              label="חברי סגל"
              fieldKey="members"
              fields={[
                { key: "name", label: "שם" },
                { key: "role", label: "תפקיד / תואר" },
                { key: "image_url", label: "תמונה (URL)", type: "image" },
              ]}
            />
          </div>
        );

      case "stats":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="אנו במספרים" />
            <ObjectListField
              label="נתונים"
              fieldKey="stats"
              fields={[
                { key: "value", label: "ערך (למשל 50,000+)" },
                { key: "label_he", label: "תווית" },
              ]}
            />
          </div>
        );

      case "faq":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="שאלות נפוצות" />
            <ObjectListField
              label="שאלות ותשובות"
              fieldKey="items"
              fields={[
                { key: "question_he", label: "שאלה" },
                { key: "answer_he", label: "תשובה", type: "textarea" },
              ]}
            />
          </div>
        );

      case "video":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="צפו בסרטון" />
            <ObjectListField
              label="סרטונים"
              fieldKey="videos"
              fields={[
                { key: "youtube_id", label: "מזהה YouTube (ID)" },
                { key: "title_he", label: "כותרת סרטון" },
              ]}
            />
          </div>
        );

      case "gallery":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="גלריה" />
            <ObjectListField
              label="תמונות"
              fieldKey="images"
              fields={[
                { key: "url", label: "URL תמונה", type: "image" },
                { key: "caption_he", label: "כיתוב" },
              ]}
            />
          </div>
        );

      case "admission":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="תנאי קבלה" />
            <StringListField label="דרישות" fieldKey="requirements" placeholder="תעודת בגרות..." />
          </div>
        );

      case "map":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מיקום האירוע" />
            <Field label="כתובת" fieldKey="address" placeholder="רחוב האוניברסיטה 1, קריית אונו" />
            <Field label="קישור Google Maps" fieldKey="map_url" placeholder="https://maps.google.com/..." dir="ltr" />
          </div>
        );

      case "cta":
        return (
          <div className="space-y-4">
            <Field label="כותרת" fieldKey="heading_he" placeholder="מוכנים להתחיל?" />
            <TextareaField label="תיאור" fieldKey="description_he" rows={2} placeholder="הצטרפו לאלפי סטודנטים..." />
            <Field label="טקסט כפתור" fieldKey="button_text_he" placeholder="להרשמה" />
            <Field label="מספר טלפון" fieldKey="phone" placeholder="03-123-4567" dir="ltr" />
          </div>
        );

      case "whatsapp":
        return (
          <div className="space-y-4">
            <Field label="מספר וואטסאפ" fieldKey="phone" placeholder="972501234567" dir="ltr" />
            <Field label="הודעה ראשונית" fieldKey="message_he" placeholder="היי, אשמח לקבל פרטים" />
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

        <ScrollArea className="flex-1">
          <div className="px-6 py-5">{renderForm()}</div>
        </ScrollArea>

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
  onSave: () => Promise<void>;
  saving: boolean;
}

/**
 * Per-page settings override dialog.
 * Empty fields fall back to the global settings configured in הגדרות.
 */
function PageSettingsDialog({ open, onClose, settings, onChange, onSave, saving }: PageSettingsDialogProps) {
  /** A labeled input field with placeholder showing the fallback */
  const SettingField = ({
    label,
    fieldKey,
    placeholder,
    hint,
    dir = "ltr",
  }: {
    label: string;
    fieldKey: keyof PageOverrideSettings;
    placeholder?: string;
    hint?: string;
    dir?: "rtl" | "ltr";
  }) => (
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
          <div className="px-6 py-5 space-y-5">
            {/* Integrations */}
            <div>
              <h3 className="text-xs font-bold text-[#9A969A] uppercase tracking-wider mb-3">אינטגרציות</h3>
              <div className="space-y-3">
                <SettingField
                  label="כתובת Webhook"
                  fieldKey="webhook_url"
                  placeholder="https://hooks.zapier.com/... (מהגדרות הכלליות)"
                  hint="לשליחת לידים מעמוד זה ל-CRM ספציפי"
                />
                <SettingField
                  label="מספר WhatsApp"
                  fieldKey="whatsapp_number"
                  placeholder="972501234567 (מהגדרות הכלליות)"
                  hint="מספר בפורמט בינלאומי ללא מקף"
                />
                <SettingField
                  label="מספר טלפון לתצוגה"
                  fieldKey="phone_number"
                  placeholder="*2899 (מהגדרות הכלליות)"
                  hint="יוצג בכותרת ובתחתית העמוד"
                />
              </div>
            </div>

            <div className="border-t border-[#F0F0F0]" />

            {/* Content */}
            <div>
              <h3 className="text-xs font-bold text-[#9A969A] uppercase tracking-wider mb-3">תוכן</h3>
              <div className="space-y-3">
                <SettingField
                  label="טקסט קריאה לפעולה (CTA)"
                  fieldKey="default_cta_text"
                  placeholder="השאירו פרטים ונחזור אליכם (מהגדרות הכלליות)"
                  dir="rtl"
                  hint="הטקסט על כפתורי הרשמה בעמוד"
                />
                <SettingField
                  label="הודעת תודה לאחר הרשמה"
                  fieldKey="thank_you_message"
                  placeholder="תודה! פנייתך התקבלה. ניצור איתך קשר בהקדם. (מהגדרות הכלליות)"
                  dir="rtl"
                  hint="הטקסט שיוצג לאחר שליחת הטופס"
                />
                <SettingField
                  label="לוגו מותאם (URL)"
                  fieldKey="logo_url"
                  placeholder="https://... (לוגו אונו כברירת מחדל)"
                  hint="להחלפת הלוגו בעמוד זה בלבד"
                />
              </div>
            </div>

            <div className="border-t border-[#F0F0F0]" />

            {/* Tracking */}
            <div>
              <h3 className="text-xs font-bold text-[#9A969A] uppercase tracking-wider mb-3">מעקב ואנליטיקס</h3>
              <div className="space-y-3">
                <SettingField
                  label="Google Analytics ID"
                  fieldKey="google_analytics_id"
                  placeholder="G-XXXXXXXXXX (מהגדרות הכלליות)"
                  hint="לעקוב אחר קמפיינים ספציפיים"
                />
                <SettingField
                  label="Facebook Pixel ID"
                  fieldKey="facebook_pixel_id"
                  placeholder="123456789 (מהגדרות הכלליות)"
                  hint="לפיקסל ספציפי לקמפיין"
                />
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
  const [pageSettingsSaving, setPageSettingsSaving] = useState(false);

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
        // Extract per-page settings stored under custom_styles.page_settings
        const customStyles = pageRes.data.custom_styles as Record<string, unknown> | null;
        const saved = (customStyles?.page_settings as PageOverrideSettings) || {};
        setPageSettings(saved);
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

  /** Saves per-page override settings to pages.custom_styles.page_settings */
  const savePageSettings = useCallback(async () => {
    setPageSettingsSaving(true);
    // Strip empty strings so fallback to global works correctly
    const cleaned: PageOverrideSettings = Object.fromEntries(
      Object.entries(pageSettings).filter(([, v]) => v && String(v).trim() !== "")
    ) as PageOverrideSettings;

    const existingCustomStyles = (page?.custom_styles as Record<string, unknown>) || {};
    const { error } = await supabase
      .from("pages")
      .update({ custom_styles: { ...existingCustomStyles, page_settings: cleaned } })
      .eq("id", pageId);

    if (!error) {
      setPageSettings(cleaned);
      setPageSettingsOpen(false);
      showToast("הגדרות העמוד נשמרו");
    } else {
      showToast("שגיאה בשמירת הגדרות", "error");
    }
    setPageSettingsSaving(false);
  }, [page, pageId, pageSettings, supabase, showToast]);

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
    <div className="flex flex-col h-screen overflow-hidden bg-[#F3F4F6]" dir="rtl">

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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageSettingsOpen(true)}
            className="h-9 gap-2 border-[#E5E5E5] text-[#4A4648] hover:border-[#B8D900]"
          >
            <Settings2 className="w-3.5 h-3.5" />
            הגדרות עמוד
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
          <div className="px-4 py-3.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#B8D900]/20 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-[#B8D900]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">ספריית סקציות</h2>
                <p className="text-[10px] text-white/40 mt-0.5">לחץ להוספה לדף</p>
              </div>
            </div>
          </div>

          {/* Section type cards */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1.5">
              {SECTION_LIBRARY.map((item) => {
                const isAdding = addingType === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => addSection(item.type)}
                    disabled={isAdding}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.06] hover:border-[#B8D900]/30 transition-all duration-150 text-right group"
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
                      <p className="text-sm font-semibold text-white/90 leading-tight group-hover:text-white transition-colors">
                        {item.nameHe}
                      </p>
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
          </ScrollArea>

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
          <ScrollArea className="flex-1 bg-[#F8F9FA]">
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
                          onEdit={() => setEditingSection(section)}
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
          </ScrollArea>
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
        onSave={savePageSettings}
        saving={pageSettingsSaving}
      />
    </div>
  );
}
