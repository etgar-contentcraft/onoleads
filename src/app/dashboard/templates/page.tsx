"use client";

/**
 * Templates management page — full CRUD for the templates table.
 * Allows admins to create, edit, and delete page templates that define
 * the default section layout applied when a new landing page is created.
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Human-readable labels and Tailwind color classes for each section type */
const SECTION_CONFIG: Record<string, { label: string; color: string }> = {
  hero: { label: "Hero", color: "bg-yellow-100 text-yellow-700" },
  program_info_bar: { label: "פס מידע", color: "bg-gray-100 text-gray-600" },
  about: { label: "אודות", color: "bg-blue-100 text-blue-700" },
  benefits: { label: "יתרונות", color: "bg-green-100 text-green-700" },
  curriculum: { label: "תוכנית לימודים", color: "bg-indigo-100 text-indigo-700" },
  career: { label: "קריירה", color: "bg-orange-100 text-orange-700" },
  faculty: { label: "סגל", color: "bg-purple-100 text-purple-700" },
  stats: { label: "סטטיסטיקות", color: "bg-cyan-100 text-cyan-700" },
  testimonials: { label: "המלצות", color: "bg-pink-100 text-pink-700" },
  video: { label: "וידאו", color: "bg-red-100 text-red-700" },
  faq: { label: "FAQ", color: "bg-teal-100 text-teal-700" },
  cta: { label: "CTA", color: "bg-lime-100 text-lime-700" },
  whatsapp: { label: "WhatsApp", color: "bg-green-100 text-green-600" },
  admission: { label: "קבלה", color: "bg-amber-100 text-amber-700" },
  gallery: { label: "גלריה", color: "bg-violet-100 text-violet-700" },
  map: { label: "מפה", color: "bg-sky-100 text-sky-700" },
  countdown: { label: "ספירה", color: "bg-rose-100 text-rose-700" },
};

/** All available section types in display order */
const ALL_SECTION_TYPES = Object.keys(SECTION_CONFIG);

/** Template type enum values and their Hebrew labels */
const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  degree_program: "תוכנית לימודים",
  event: "אירוע",
  sales_event: "מבצע/מלגה",
  specialization: "התמחות",
};

const TEMPLATE_TYPE_COLORS: Record<string, string> = {
  degree_program: "bg-blue-100 text-blue-700",
  event: "bg-amber-100 text-amber-700",
  sales_event: "bg-rose-100 text-rose-700",
  specialization: "bg-violet-100 text-violet-700",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single entry in the section_schema array stored in the DB */
interface SectionSchemaItem {
  section_type: string;
  sort_order: number;
  is_visible: boolean;
  content: Record<string, unknown>;
}

interface Template {
  id: string;
  name: string;
  type: string;
  description: string | null;
  thumbnail_url: string | null;
  section_schema: SectionSchemaItem[];
  default_styles: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Populated client-side after a join/count query */
  usage_count?: number;
}

/** Shape of the create/edit form (excludes server-generated fields) */
interface TemplateForm {
  name: string;
  type: string;
  description: string;
  thumbnail_url: string;
  is_active: boolean;
  sections: SectionSchemaItem[];
}

const EMPTY_FORM: TemplateForm = {
  name: "",
  type: "degree_program",
  description: "",
  thumbnail_url: "",
  is_active: true,
  sections: [],
};

// ---------------------------------------------------------------------------
// Helper: build a fresh SectionSchemaItem
// ---------------------------------------------------------------------------

/**
 * Creates a new section schema item with default values.
 * @param sectionType - The section type string key
 * @param sortOrder - The position index for this section
 * @returns A SectionSchemaItem ready for insertion
 */
function buildSection(sectionType: string, sortOrder: number): SectionSchemaItem {
  return { section_type: sectionType, sort_order: sortOrder, is_visible: true, content: {} };
}

/**
 * Re-indexes the sort_order of every section to match its array position.
 * @param items - The current sections array
 * @returns A new array with corrected sort_order values
 */
function reindex(items: SectionSchemaItem[]): SectionSchemaItem[] {
  return items.map((item, idx) => ({ ...item, sort_order: idx }));
}

// ---------------------------------------------------------------------------
// Section badge chip component
// ---------------------------------------------------------------------------

/**
 * Renders a small colored badge chip for a given section type.
 * @param sectionType - The section type key from SECTION_CONFIG
 */
function SectionChip({ sectionType }: { sectionType: string }) {
  const config = SECTION_CONFIG[sectionType] ?? { label: sectionType, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section builder row component
// ---------------------------------------------------------------------------

interface SectionRowProps {
  item: SectionSchemaItem;
  index: number;
  total: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onToggleVisible: (index: number) => void;
  onRemove: (index: number) => void;
}

/**
 * Renders one row in the section builder list with reorder + visibility controls.
 */
function SectionRow({ item, index, total, onMoveUp, onMoveDown, onToggleVisible, onRemove }: SectionRowProps) {
  const config = SECTION_CONFIG[item.section_type] ?? { label: item.section_type, color: "bg-gray-100 text-gray-600" };
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${item.is_visible ? "border-[#E5E5E5] bg-white" : "border-dashed border-[#E0E0E0] bg-[#FAFAFA]"}`}>
      {/* Order controls */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className="p-0.5 rounded hover:bg-[#F0F0F0] disabled:opacity-20 transition-colors"
          aria-label="הזז למעלה"
        >
          <ChevronUp className="w-3.5 h-3.5 text-[#9A969A]" />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className="p-0.5 rounded hover:bg-[#F0F0F0] disabled:opacity-20 transition-colors"
          aria-label="הזז למטה"
        >
          <ChevronDown className="w-3.5 h-3.5 text-[#9A969A]" />
        </button>
      </div>

      {/* Sort order badge */}
      <span className="w-6 text-center text-[11px] font-mono text-[#C8C4C8] shrink-0">
        {index + 1}
      </span>

      {/* Section type chip */}
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold flex-1 ${config.color}`}>
        {config.label}
      </span>

      {/* Visibility toggle */}
      <button
        type="button"
        onClick={() => onToggleVisible(index)}
        className="p-1.5 rounded-lg hover:bg-[#F0F0F0] transition-colors"
        aria-label={item.is_visible ? "הסתר סקציה" : "הצג סקציה"}
        title={item.is_visible ? "גלוי — לחץ להסתרה" : "מוסתר — לחץ להצגה"}
      >
        {item.is_visible
          ? <Eye className="w-3.5 h-3.5 text-[#B8D900]" />
          : <EyeOff className="w-3.5 h-3.5 text-[#C8C4C8]" />
        }
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1.5 rounded-lg hover:bg-red-50 text-[#C8C4C8] hover:text-red-500 transition-colors"
        aria-label="הסר סקציה"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const supabase = createClient();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit dialog
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Section type picker visibility inside the dialog
  const [showSectionPicker, setShowSectionPicker] = useState(false);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  /**
   * Fetches all templates ordered by name, then counts how many pages use each.
   */
  const load = useCallback(async () => {
    setLoading(true);

    const { data: templateRows } = await supabase
      .from("templates")
      .select("*")
      .order("name", { ascending: true });

    if (!templateRows) {
      setLoading(false);
      return;
    }

    // Fetch usage counts from the pages table
    const { data: usageRows } = await supabase
      .from("pages")
      .select("template_id")
      .not("template_id", "is", null);

    // Build a map of template_id -> count
    const usageMap: Record<string, number> = {};
    if (usageRows) {
      for (const row of usageRows) {
        const tid = row.template_id as string;
        usageMap[tid] = (usageMap[tid] ?? 0) + 1;
      }
    }

    const enriched = templateRows.map((t) => ({
      ...(t as Template),
      section_schema: Array.isArray(t.section_schema) ? (t.section_schema as SectionSchemaItem[]) : [],
      usage_count: usageMap[t.id] ?? 0,
    }));

    setTemplates(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------------------------
  // Active toggle (inline, without opening dialog)
  // ---------------------------------------------------------------------------

  /**
   * Toggles the is_active flag for a template directly in the DB.
   * @param template - The template whose active state to toggle
   */
  const handleToggleActive = async (template: Template) => {
    const next = !template.is_active;
    const { error } = await supabase
      .from("templates")
      .update({ is_active: next })
      .eq("id", template.id);
    if (!error) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, is_active: next } : t))
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------

  /** Opens the dialog in create mode with a blank form */
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowSectionPicker(false);
    setEditOpen(true);
  };

  /** Opens the dialog in edit mode, pre-filling all fields */
  const openEdit = (template: Template) => {
    setEditTarget(template);
    setForm({
      name: template.name,
      type: template.type,
      description: template.description ?? "",
      thumbnail_url: template.thumbnail_url ?? "",
      is_active: template.is_active,
      sections: template.section_schema ? [...template.section_schema] : [],
    });
    setShowSectionPicker(false);
    setEditOpen(true);
  };

  /**
   * Updates a single scalar field in the form state.
   * @param key - The form field key to update
   * @param value - The new value
   */
  const setField = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ---------------------------------------------------------------------------
  // Section builder actions
  // ---------------------------------------------------------------------------

  /**
   * Appends a new section of the given type to the end of the list.
   * @param sectionType - The section type string to add
   */
  const addSection = (sectionType: string) => {
    setForm((prev) => ({
      ...prev,
      sections: reindex([...prev.sections, buildSection(sectionType, prev.sections.length)]),
    }));
    setShowSectionPicker(false);
  };

  /**
   * Moves a section one position up in the list.
   * @param index - Current index of the section
   */
  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setForm((prev) => {
      const next = [...prev.sections];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return { ...prev, sections: reindex(next) };
    });
  };

  /**
   * Moves a section one position down in the list.
   * @param index - Current index of the section
   */
  const moveSectionDown = (index: number) => {
    setForm((prev) => {
      if (index >= prev.sections.length - 1) return prev;
      const next = [...prev.sections];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return { ...prev, sections: reindex(next) };
    });
  };

  /**
   * Toggles the is_visible flag of a section.
   * @param index - Index of the section to toggle
   */
  const toggleSectionVisible = (index: number) => {
    setForm((prev) => {
      const next = [...prev.sections];
      next[index] = { ...next[index], is_visible: !next[index].is_visible };
      return { ...prev, sections: next };
    });
  };

  /**
   * Removes a section from the list entirely.
   * @param index - Index of the section to remove
   */
  const removeSection = (index: number) => {
    setForm((prev) => ({
      ...prev,
      sections: reindex(prev.sections.filter((_, i) => i !== index)),
    }));
  };

  // ---------------------------------------------------------------------------
  // Save / Delete handlers
  // ---------------------------------------------------------------------------

  /**
   * Saves the form as an insert or update depending on whether editTarget is set.
   */
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      is_active: form.is_active,
      section_schema: form.sections,
    };

    if (editTarget) {
      const { error } = await supabase
        .from("templates")
        .update(payload)
        .eq("id", editTarget.id);
      if (!error) {
        setEditOpen(false);
        load();
      }
    } else {
      const { error } = await supabase.from("templates").insert(payload);
      if (!error) {
        setEditOpen(false);
        load();
      }
    }

    setSaving(false);
  };

  /**
   * Deletes the currently targeted template after confirmation.
   */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("templates").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8 max-w-7xl mx-auto" dir="rtl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-[#8aac00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2A2628]">ניהול תבניות</h1>
            <p className="text-sm text-[#9A969A]">
              הגדרת מבנה סקציות ברירת מחדל עבור סוגי דפי נחיתה שונים
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
        >
          <Plus className="w-4 h-4" />
          תבנית חדשה
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[#9A969A]" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E5E5] rounded-2xl">
          <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-[#C8C4C8]" />
          <p className="text-[#9A969A] font-medium mb-1">אין תבניות עדיין</p>
          <p className="text-sm text-[#C8C4C8] mb-4">
            צרו תבנית ראשונה כדי להגדיר מבנה ברירת מחדל לדפי הנחיתה שלכם
          </p>
          <Button
            onClick={openCreate}
            className="gap-2 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
          >
            <Plus className="w-4 h-4" />
            צור תבנית ראשונה
          </Button>
        </div>
      ) : (
        /* Templates grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Create / Edit Dialog                                                */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-[#8aac00]" />
              {editTarget ? `עריכת תבנית: ${editTarget.name}` : "תבנית חדשה"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                שם תבנית <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="למשל: תואר ראשון סטנדרטי"
                dir="rtl"
              />
            </div>

            {/* Type + Active row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">סוג תבנית</Label>
                <select
                  value={form.type}
                  onChange={(e) => setField("type", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  dir="rtl"
                >
                  {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">סטטוס</Label>
                <button
                  type="button"
                  onClick={() => setField("is_active", !form.is_active)}
                  className={`w-full flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    form.is_active
                      ? "border-[#B8D900]/50 bg-[#B8D900]/10 text-[#6A8000]"
                      : "border-[#E5E5E5] bg-[#F8F9FA] text-[#9A969A]"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${form.is_active ? "bg-[#B8D900]" : "bg-[#C8C4C8]"}`} />
                  {form.is_active ? "פעיל" : "לא פעיל"}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">תיאור (אופציונלי)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="תאר את מטרת התבנית ומתי כדאי להשתמש בה..."
                dir="rtl"
                rows={2}
              />
            </div>

            {/* Thumbnail URL */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">תמונת תצוגה מקדימה (אופציונלי)</Label>
              <Input
                value={form.thumbnail_url}
                onChange={(e) => setField("thumbnail_url", e.target.value)}
                placeholder="https://example.com/thumbnail.png"
                dir="ltr"
              />
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Section Builder                                               */}
            {/* ------------------------------------------------------------ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  מבנה סקציות ({form.sections.length} סקציות)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSectionPicker((v) => !v)}
                  className="gap-1.5 text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5" />
                  הוסף סקציה
                </Button>
              </div>

              {/* Section type picker dropdown */}
              {showSectionPicker && (
                <div className="border border-[#E5E5E5] rounded-xl p-3 bg-[#FAFAFA]">
                  <p className="text-xs text-[#9A969A] mb-2 font-medium">בחר סוג סקציה להוספה:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SECTION_TYPES.map((type) => {
                      const cfg = SECTION_CONFIG[type];
                      const alreadyAdded = form.sections.some((s) => s.section_type === type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => addSection(type)}
                          disabled={alreadyAdded}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                            alreadyAdded
                              ? "opacity-40 cursor-not-allowed " + cfg.color
                              : cfg.color + " hover:opacity-80 hover:shadow-sm"
                          }`}
                          title={alreadyAdded ? "סקציה זו כבר קיימת בתבנית" : `הוסף ${cfg.label}`}
                        >
                          {cfg.label}
                          {alreadyAdded && " ✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ordered section list */}
              {form.sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-[#E5E5E5] rounded-xl text-center">
                  <LayoutTemplate className="w-8 h-8 mb-2 text-[#C8C4C8]" />
                  <p className="text-sm text-[#9A969A]">אין סקציות בתבנית</p>
                  <p className="text-xs text-[#C8C4C8] mt-0.5">
                    לחץ על &quot;הוסף סקציה&quot; כדי להתחיל לבנות
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {form.sections.map((item, idx) => (
                    <SectionRow
                      key={`${item.section_type}-${idx}`}
                      item={item}
                      index={idx}
                      total={form.sections.length}
                      onMoveUp={moveSectionUp}
                      onMoveDown={moveSectionDown}
                      onToggleVisible={toggleSectionVisible}
                      onRemove={removeSection}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-[#9A969A]">
                הסדר שמוגדר כאן יהיה סדר ברירת המחדל בדפי הנחיתה שייוצרו מתבנית זו.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור תבנית"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Delete Confirmation Dialog                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              מחיקת תבנית
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-[#4A4648]">
              האם למחוק את התבנית <strong>{deleteTarget?.name}</strong>?
            </p>

            {/* Warning if pages use this template */}
            {deleteTarget && (deleteTarget.usage_count ?? 0) > 0 ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  תבנית זו משמשת {deleteTarget.usage_count} דף/ים. מחיקתה לא תשפיע על דפים קיימים,
                  אך לא ניתן יהיה לבחור בה בעת יצירת דפים חדשים.
                </span>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-amber-50 text-amber-700 text-xs">
                פעולה זו בלתי הפיכה. התבנית תוסר לצמיתות מהמערכת.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "מחק תבנית"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template card component
// ---------------------------------------------------------------------------

interface TemplateCardProps {
  template: Template;
  onEdit: (t: Template) => void;
  onDelete: (t: Template) => void;
  onToggleActive: (t: Template) => void;
}

/**
 * Renders a single template as a card in the management grid.
 * Shows name, type badge, description, section chips, usage count, and action buttons.
 */
function TemplateCard({ template, onEdit, onDelete, onToggleActive }: TemplateCardProps) {
  const typeColor = TEMPLATE_TYPE_COLORS[template.type] ?? "bg-gray-100 text-gray-600";
  const typeLabel = TEMPLATE_TYPE_LABELS[template.type] ?? template.type;

  return (
    <div className={`group flex flex-col bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${template.is_active ? "border-[#E5E5E5]" : "border-dashed border-[#D8D8D8] opacity-75"}`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeColor}`}>
              {typeLabel}
            </span>
            {!template.is_active && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F0F0F0] text-[#9A969A]">
                לא פעיל
              </span>
            )}
          </div>
          <h3 className="font-bold text-[#2A2628] text-sm leading-snug truncate">
            {template.name}
          </h3>
        </div>
        {/* Thumbnail */}
        {template.thumbnail_url && (
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#F0F0F0] shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Description */}
      {template.description && (
        <p className="px-4 pb-3 text-xs text-[#9A969A] leading-relaxed line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Section chips */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {template.section_schema && template.section_schema.length > 0 ? (
          template.section_schema.map((s, i) => (
            <SectionChip key={i} sectionType={s.section_type} />
          ))
        ) : (
          <span className="text-xs text-[#C8C4C8]">אין סקציות מוגדרות</span>
        )}
      </div>

      {/* Footer: usage + controls */}
      <div className="mt-auto border-t border-[#F5F5F5] px-4 py-3 flex items-center justify-between gap-2">
        {/* Usage count */}
        <span className="text-xs text-[#9A969A]">
          {template.usage_count && template.usage_count > 0
            ? `בשימוש ב-${template.usage_count} דף/ים`
            : "לא בשימוש"}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Active toggle */}
          <button
            type="button"
            onClick={() => onToggleActive(template)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              template.is_active
                ? "bg-[#B8D900]/15 text-[#6A8000] hover:bg-[#B8D900]/25"
                : "bg-[#F0F0F0] text-[#9A969A] hover:bg-[#E5E5E5]"
            }`}
            title={template.is_active ? "לחץ להשבית" : "לחץ להפעיל"}
          >
            {template.is_active ? "פעיל" : "מושבת"}
          </button>

          {/* Edit */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(template)}
            className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#2A2628]"
            title="ערוך תבנית"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(template)}
            className="h-8 w-8 p-0 text-[#9A969A] hover:text-red-500"
            title="מחק תבנית"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
