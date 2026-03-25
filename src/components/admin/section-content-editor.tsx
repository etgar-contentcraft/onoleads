/**
 * SectionContentEditor — visual form editor for a landing page section's content.
 * Renders type-specific fields based on sectionType, replacing the raw JSON textarea
 * in the shared sections dashboard.
 */
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface SectionContentEditorProps {
  sectionType: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

/** Format hints shown below array JSON textareas */
const ARRAY_HINTS: Record<string, string> = {
  items_benefits: '[{"title_he": "כותרת", "description_he": "תיאור"}, ...]',
  items_stats: '[{"value": "90%", "label_he": "תווית"}, ...]',
  items_testimonials: '[{"name_he": "שם", "quote_he": "ציטוט", "title_he": "תפקיד"}, ...]',
  items_faq: '[{"question_he": "שאלה?", "answer_he": "תשובה"}, ...]',
  years: '[{"year": "שנה א", "courses": ["קורס א", "קורס ב"]}, ...]',
  outcomes: '[{"title_he": "תפקיד", "description_he": "תיאור"}, ...]',
  members: '[{"name_he": "שם", "title_he": "תפקיד", "image_url": "https://..."}, ...]',
};

export function SectionContentEditor({ sectionType, content, onChange }: SectionContentEditorProps) {
  const [showJson, setShowJson] = useState(false);

  /** Update a single key in the content object */
  const set = (key: string, value: unknown) => onChange({ ...content, [key]: value });

  /** Get a string value safely */
  const str = (key: string): string => (content[key] as string) ?? "";

  /** Parse an array field to JSON string for editing */
  const arrStr = (key: string): string => {
    const val = content[key];
    if (val === undefined || val === null) return "[]";
    if (typeof val === "string") return val;
    return JSON.stringify(val, null, 2);
  };

  /** Update an array field — attempt to parse JSON, store raw string on failure */
  const setArr = (key: string, raw: string) => {
    try {
      onChange({ ...content, [key]: JSON.parse(raw) });
    } catch {
      onChange({ ...content, [key]: raw });
    }
  };

  // ---------------------------------------------------------------------------
  // Reusable field helpers (defined outside render to avoid re-mount on keystroke)
  // ---------------------------------------------------------------------------

  /** Single-line text input */
  const Field = ({ label, field, placeholder = "", ltr = false }: { label: string; field: string; placeholder?: string; ltr?: boolean }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Input
        value={str(field)}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        dir={ltr ? "ltr" : "rtl"}
        className={`h-9 text-sm${ltr ? " font-mono" : ""}`}
      />
    </div>
  );

  /** Multi-line textarea */
  const TextareaF = ({ label, field, rows = 3, placeholder = "" }: { label: string; field: string; rows?: number; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <Textarea
        value={str(field)}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        dir="rtl"
        rows={rows}
        className="text-sm resize-none"
      />
    </div>
  );

  /** JSON textarea for an array field, with a format hint */
  const ArrayField = ({ label, field, hintKey }: { label: string; field: string; hintKey: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[#716C70]">{label}</Label>
      <textarea
        value={arrStr(field)}
        onChange={(e) => setArr(field, e.target.value)}
        rows={6}
        dir="ltr"
        spellCheck={false}
        className="w-full font-mono text-xs p-3 rounded-lg border border-input bg-[#FAFAFA] resize-y focus:outline-none focus:ring-1 focus:ring-[#B8D900]"
      />
      {ARRAY_HINTS[hintKey] && (
        <p className="text-[10px] text-[#9A969A] font-mono leading-relaxed">
          פורמט: {ARRAY_HINTS[hintKey]}
        </p>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Type-specific field layouts
  // ---------------------------------------------------------------------------

  const renderFields = () => {
    switch (sectionType) {
      case "hero":
        return (
          <>
            <Field label="כותרת ראשית" field="heading_he" />
            <Field label="כותרת משנה" field="subheading_he" />
            <Field label="טקסט כפתור" field="cta_text_he" />
            <Field label="ערך סטטיסטיקה (למשל: 3,000+)" field="stat_value" />
            <Field label="תווית סטטיסטיקה" field="stat_label" />
            <Field label="תמונת רקע (URL)" field="background_image_url" ltr placeholder="https://..." />
          </>
        );

      case "about":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <TextareaF label="תיאור" field="description_he" rows={4} />
            <Field label="תמונה (URL)" field="image_url" ltr placeholder="https://..." />
          </>
        );

      case "benefits":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <ArrayField label="פריטים (מערך JSON)" field="items" hintKey="items_benefits" />
          </>
        );

      case "stats":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <ArrayField label="נתונים (מערך JSON)" field="items" hintKey="items_stats" />
          </>
        );

      case "testimonials":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <ArrayField label="המלצות (מערך JSON)" field="items" hintKey="items_testimonials" />
          </>
        );

      case "faq":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <ArrayField label="שאלות ותשובות (מערך JSON)" field="items" hintKey="items_faq" />
          </>
        );

      case "cta":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <Field label="כותרת משנה" field="subheading_he" />
            <Field label="טקסט כפתור" field="cta_text_he" />
            <Field label="צבע רקע (CSS)" field="background_color" ltr placeholder="#1A1A2E" />
          </>
        );

      case "curriculum":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <ArrayField label="שנים ותכנים (מערך JSON)" field="years" hintKey="years" />
          </>
        );

      case "career":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <TextareaF label="תיאור" field="description_he" rows={3} />
            <ArrayField label="תוצאות קריירה (מערך JSON)" field="outcomes" hintKey="outcomes" />
          </>
        );

      case "faculty":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <ArrayField label="חברי סגל (מערך JSON)" field="members" hintKey="members" />
          </>
        );

      case "video":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <Field label="קישור וידאו (URL)" field="video_url" ltr placeholder="https://www.youtube.com/watch?v=..." />
            <Field label="תמונת תצוגה מקדימה (URL)" field="thumbnail_url" ltr placeholder="https://..." />
          </>
        );

      case "countdown":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <Field label="כותרת משנה" field="subheading_he" />
            <Field label="תאריך יעד (ISO)" field="target_date" ltr placeholder="2025-09-01T00:00:00" />
          </>
        );

      case "map":
        return (
          <>
            <Field label="כותרת" field="heading_he" />
            <Field label="כתובת" field="address_he" />
            <Field label="קישור iframe למפה (URL)" field="embed_url" ltr placeholder="https://www.google.com/maps/embed?..." />
          </>
        );

      default:
        // Fallback: render all string-valued keys as text inputs
        return (
          <>
            {Object.entries(content).map(([key, val]) =>
              typeof val === "string" ? (
                <Field key={key} label={key} field={key} />
              ) : null
            )}
            {Object.keys(content).length === 0 && (
              <p className="text-xs text-[#9A969A] text-center py-4">
                אין שדות מוגדרים לסוג סקציה זה. השתמשו ב-JSON למטה.
              </p>
            )}
          </>
        );
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      {renderFields()}

      {/* JSON toggle — always available as fallback */}
      <div className="pt-2 border-t border-[#F0F0F0]">
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-xs text-[#9A969A] hover:text-[#4A4648] transition-colors"
        >
          {showJson ? "הסתר JSON" : "הצג / ערוך JSON מלא"}
        </button>
        {showJson && (
          <textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // ignore parse errors while typing
              }
            }}
            rows={12}
            dir="ltr"
            spellCheck={false}
            className="mt-2 w-full font-mono text-xs p-3 rounded-lg border border-input bg-[#FAFAFA] resize-y focus:outline-none focus:ring-1 focus:ring-[#B8D900]"
          />
        )}
      </div>
    </div>
  );
}
