/**
 * SectionContentEditor — visual form editor for a landing page section's content.
 * Renders type-specific fields based on sectionType. Arrays use a visual
 * add/remove item editor instead of raw JSON.
 * JSON toggle at the bottom is available as advanced fallback.
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ExternalLink } from "lucide-react";

export interface SectionContentEditorProps {
  sectionType: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

// ---------------------------------------------------------------------------
// Item field definitions — one config object per array type
// ---------------------------------------------------------------------------

interface ItemField {
  key: string;
  label: string;
  textarea?: boolean;
  url?: boolean;
  placeholder?: string;
}

const ITEM_FIELDS: Record<string, ItemField[]> = {
  benefits: [
    { key: "title_he", label: "כותרת" },
    { key: "description_he", label: "תיאור", textarea: true },
    { key: "icon", label: "אייקון (אופציונלי, למשל ⚖️)" },
  ],
  stats: [
    { key: "value", label: "ערך (למשל: 95%)" },
    { key: "label_he", label: "תווית" },
    { key: "icon", label: "אייקון (אופציונלי)" },
  ],
  testimonials: [
    { key: "name_he", label: "שם" },
    { key: "quote_he", label: "ציטוט", textarea: true },
    { key: "title_he", label: "תפקיד / תוכנית" },
    { key: "image_url", label: "תמונה (URL)", url: true, placeholder: "https://..." },
  ],
  faq: [
    { key: "question_he", label: "שאלה" },
    { key: "answer_he", label: "תשובה", textarea: true },
  ],
  outcomes: [
    { key: "title_he", label: "תפקיד" },
    { key: "description_he", label: "תיאור", textarea: true },
    { key: "salary_he", label: "שכר ממוצע (אופציונלי)" },
  ],
  members: [
    { key: "name_he", label: "שם" },
    { key: "title_he", label: "תואר / מוסד" },
    { key: "bio_he", label: "תיאור קצר", textarea: true },
    { key: "image_url", label: "תמונה (URL)", url: true, placeholder: "https://..." },
  ],
};

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  ltr = false,
  url = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ltr?: boolean;
  url?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-[#716C70]">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label + "..."}
        dir={ltr || url ? "ltr" : "rtl"}
        className={`h-8 text-sm${ltr || url ? " font-mono text-xs" : ""}`}
      />
    </div>
  );
}

function TextareaF({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-[#716C70]">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label + "..."}
        dir="rtl"
        rows={rows}
        className="text-sm resize-none"
      />
    </div>
  );
}

/** Visual add/remove editor for an array field (benefits, FAQ, stats, etc.) */
function ArrayItemEditor({
  label,
  field,
  fields,
  defaultItem,
  content,
  onChange,
}: {
  label: string;
  field: string;
  fields: ItemField[];
  defaultItem: Record<string, string>;
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const items: Record<string, string>[] = (() => {
    const raw = content[field];
    if (Array.isArray(raw)) return raw as Record<string, string>[];
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return []; }
    }
    return [];
  })();

  const setItems = (next: Record<string, string>[]) =>
    onChange({ ...content, [field]: next });

  const updateItem = (i: number, key: string, value: string) => {
    const next = items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it));
    setItems(next);
  };

  const addItem = () => setItems([...items, { ...defaultItem }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
        <a
          href="/dashboard/help#json-guide"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[10px] text-[#9A969A] hover:text-[#B8D900] transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          מדריך JSON
        </a>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="bg-[#FAFAFA] rounded-xl border border-[#E5E5E5] p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-[#9A969A]">פריט {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#C8C4C8] hover:text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            {fields.map((f) =>
              f.textarea ? (
                <TextareaF
                  key={f.key}
                  label={f.label}
                  value={(item[f.key] as string) || ""}
                  onChange={(v) => updateItem(i, f.key, v)}
                  rows={2}
                />
              ) : (
                <Field
                  key={f.key}
                  label={f.label}
                  value={(item[f.key] as string) || ""}
                  onChange={(v) => updateItem(i, f.key, v)}
                  placeholder={f.placeholder}
                  url={f.url}
                />
              )
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full h-8 text-xs gap-1.5 border-dashed border-[#D0D0D0] hover:border-[#B8D900] hover:bg-[#B8D900]/5 text-[#9A969A] hover:text-[#4A4648]"
      >
        <Plus className="w-3 h-3" />
        הוסף פריט
      </Button>
    </div>
  );
}

/** AI-ready JSON editor for curriculum years (complex nested structure) */
function CurriculumYearsEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const [copied, setCopied] = useState(false);

  const aiPrompt = `צור JSON עבור תוכנית לימודים. הפורמט הוא מערך של שנים:
[{"year": "שנה א", "courses": ["קורס 1", "קורס 2", ...]}, ...]
תכין 4 שנים עם 8-10 קורסים לכל שנה.`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const raw = content.years;
  const value = raw === undefined ? "[]" : typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-[#716C70]">שנים ותכנים</Label>
        <a
          href="/dashboard/help#json-guide"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[10px] text-[#9A969A] hover:text-[#B8D900] transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          מדריך JSON
        </a>
      </div>

      {/* AI Prompt helper */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-amber-800">💡 יצירה עם AI</p>
        <p className="text-[10px] text-amber-700 leading-relaxed">
          העתק את הפרומפט הזה ל-ChatGPT / Claude, הוסף שם התוכנית, ותקבל JSON מוכן:
        </p>
        <pre className="text-[10px] text-amber-900 font-mono bg-white/70 rounded-lg p-2 whitespace-pre-wrap leading-relaxed">{aiPrompt}</pre>
        <button
          type="button"
          onClick={copyPrompt}
          className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
        >
          {copied ? "✓ הועתק!" : "העתק פרומפט"}
        </button>
      </div>

      <textarea
        value={value}
        onChange={(e) => {
          try {
            onChange({ ...content, years: JSON.parse(e.target.value) });
          } catch {
            onChange({ ...content, years: e.target.value });
          }
        }}
        rows={8}
        dir="ltr"
        spellCheck={false}
        placeholder={`[\n  {"year": "שנה א", "courses": ["קורס 1", "קורס 2"]}\n]`}
        className="w-full font-mono text-xs p-3 rounded-lg border border-input bg-[#FAFAFA] resize-y focus:outline-none focus:ring-1 focus:ring-[#B8D900]"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SectionContentEditor({ sectionType, content, onChange }: SectionContentEditorProps) {
  const [showJson, setShowJson] = useState(false);

  const set = (key: string, value: unknown) => onChange({ ...content, [key]: value });
  const str = (key: string): string => (content[key] as string) ?? "";

  const SimpleField = ({ label, field, placeholder = "", ltr = false }: { label: string; field: string; placeholder?: string; ltr?: boolean }) => (
    <Field label={label} value={str(field)} onChange={(v) => set(field, v)} placeholder={placeholder} ltr={ltr} />
  );

  const SimpleTextarea = ({ label, field, rows = 3, placeholder = "" }: { label: string; field: string; rows?: number; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Textarea
        value={str(field)}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder || label + "..."}
        dir="rtl"
        rows={rows}
        className="text-sm resize-none"
      />
    </div>
  );

  const renderFields = () => {
    switch (sectionType) {
      case "hero":
        return (
          <>
            <SimpleField label="כותרת ראשית" field="heading_he" />
            <SimpleTextarea label="כותרת משנה" field="subheading_he" rows={2} />
            <SimpleField label="טקסט כפתור" field="cta_text_he" placeholder="השאירו פרטים" />
            <div className="grid grid-cols-2 gap-3">
              <SimpleField label="ערך סטטיסטיקה (50,000+)" field="stat_value" />
              <SimpleField label="תווית סטטיסטיקה" field="stat_label" />
            </div>
            <SimpleField label="תמונת רקע (URL)" field="background_image_url" ltr placeholder="https://..." />
          </>
        );

      case "about":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <SimpleTextarea label="תיאור" field="description_he" rows={4} />
            <SimpleField label="תמונה (URL)" field="image_url" ltr placeholder="https://..." />
          </>
        );

      case "benefits":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <ArrayItemEditor
              label="יתרונות"
              field="items"
              fields={ITEM_FIELDS.benefits}
              defaultItem={{ title_he: "", description_he: "", icon: "" }}
              content={content}
              onChange={onChange}
            />
          </>
        );

      case "stats":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <ArrayItemEditor
              label="נתונים סטטיסטיים"
              field="items"
              fields={ITEM_FIELDS.stats}
              defaultItem={{ value: "", label_he: "", icon: "" }}
              content={content}
              onChange={onChange}
            />
          </>
        );

      case "testimonials":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <ArrayItemEditor
              label="המלצות"
              field="items"
              fields={ITEM_FIELDS.testimonials}
              defaultItem={{ name_he: "", quote_he: "", title_he: "", image_url: "" }}
              content={content}
              onChange={onChange}
            />
          </>
        );

      case "faq":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <ArrayItemEditor
              label="שאלות ותשובות"
              field="items"
              fields={ITEM_FIELDS.faq}
              defaultItem={{ question_he: "", answer_he: "" }}
              content={content}
              onChange={onChange}
            />
          </>
        );

      case "cta":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <SimpleField label="כותרת משנה" field="subheading_he" />
            <SimpleField label="טקסט כפתור" field="cta_text_he" />
            <SimpleField label="צבע רקע (CSS)" field="background_color" ltr placeholder="#1A1A2E" />
          </>
        );

      case "curriculum":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <CurriculumYearsEditor content={content} onChange={onChange} />
          </>
        );

      case "career":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <SimpleTextarea label="תיאור" field="description_he" rows={3} />
            <ArrayItemEditor
              label="תפקידים / תוצאות קריירה"
              field="outcomes"
              fields={ITEM_FIELDS.outcomes}
              defaultItem={{ title_he: "", description_he: "", salary_he: "" }}
              content={content}
              onChange={onChange}
            />
          </>
        );

      case "faculty":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <ArrayItemEditor
              label="חברי סגל"
              field="members"
              fields={ITEM_FIELDS.members}
              defaultItem={{ name_he: "", title_he: "", bio_he: "", image_url: "" }}
              content={content}
              onChange={onChange}
            />
          </>
        );

      case "video":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <SimpleField label="קישור וידאו (URL)" field="video_url" ltr placeholder="https://www.youtube.com/watch?v=..." />
            <SimpleField label="תמונת תצוגה מקדימה (URL)" field="thumbnail_url" ltr placeholder="https://..." />
          </>
        );

      case "countdown":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <SimpleField label="כותרת משנה" field="subheading_he" />
            <SimpleField label="תאריך יעד (ISO)" field="target_date" ltr placeholder="2025-09-01T00:00:00" />
          </>
        );

      case "map":
        return (
          <>
            <SimpleField label="כותרת" field="heading_he" />
            <SimpleField label="כתובת" field="address_he" />
            <SimpleField label="קישור iframe למפה" field="embed_url" ltr placeholder="https://www.google.com/maps/embed?..." />
          </>
        );

      default:
        return (
          <>
            {Object.entries(content).map(([key, val]) =>
              typeof val === "string" ? (
                <SimpleField key={key} label={key} field={key} />
              ) : null
            )}
            {Object.keys(content).length === 0 && (
              <p className="text-xs text-[#9A969A] text-center py-4">
                אין שדות מוגדרים. השתמשו ב-JSON למטה.
              </p>
            )}
          </>
        );
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      {renderFields()}

      {/* JSON toggle — always available as advanced fallback */}
      <div className="pt-2 border-t border-[#F0F0F0]">
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-xs text-[#9A969A] hover:text-[#4A4648] transition-colors"
        >
          {showJson ? "הסתר JSON" : "⚙ ערוך JSON מלא (מתקדם)"}
        </button>
        {showJson && (
          <textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try { onChange(JSON.parse(e.target.value)); } catch {/* ignore */}
            }}
            rows={14}
            dir="ltr"
            spellCheck={false}
            className="mt-2 w-full font-mono text-xs p-3 rounded-lg border border-input bg-[#FAFAFA] resize-y focus:outline-none focus:ring-1 focus:ring-[#B8D900]"
          />
        )}
      </div>
    </div>
  );
}
