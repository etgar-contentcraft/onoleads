"use client";

/**
 * HeroEditor — editing panel for the hero section.
 * Shows live character counters and tooltips for every field.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharCount } from "../char-count";

/** Recommended character limits per field */
const LIMITS = {
  heading: 35,
  subheading: 120,
  cta_text: 22,
  stat_label: 30,
  stat_value: 10,
};

interface HeroContent {
  heading_he?: string;
  heading_en?: string;
  heading_ar?: string;
  subheading_he?: string;
  subheading_en?: string;
  subheading_ar?: string;
  background_image_url?: string;
  background_video_url?: string;
  background_video_type?: "mp4" | "youtube";
  stat_value?: string;
  stat_label_he?: string;
  stat_label_en?: string;
  stat_label_ar?: string;
  cta_text_he?: string;
  cta_text_en?: string;
  cta_text_ar?: string;
  cta_url?: string;
  background_overlay_opacity?: number;
}

interface HeroEditorProps {
  content: HeroContent;
  onChange: (content: HeroContent) => void;
}

/** Labeled input with live char count and tooltip */
function Field({
  label,
  tooltip,
  children,
  count,
  max,
}: {
  label: string;
  tooltip: string;
  children: React.ReactNode;
  count?: string;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label title={tooltip} className="cursor-help text-xs font-semibold leading-none" aria-label={label}>
          {label}
          <span className="mr-1 text-[#9A969A] text-[10px]" title={tooltip}>ℹ</span>
        </Label>
        {count !== undefined && max !== undefined && (
          <CharCount value={count} max={max} />
        )}
      </div>
      {children}
    </div>
  );
}

export function HeroEditor({ content, onChange }: HeroEditorProps) {
  const update = (key: keyof HeroContent, value: string) => {
    onChange({ ...content, [key]: value });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="he" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="he">עברית</TabsTrigger>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">عربي</TabsTrigger>
        </TabsList>

        <TabsContent value="he" className="space-y-4 mt-4">
          <Field
            label="כותרת ראשית"
            tooltip="הכותרת הגדולה שרואים ראשונה. עצרו בין 25-35 תווים לתוצאה הטובה ביותר בשורה אחת."
            count={content.heading_he || ""}
            max={LIMITS.heading}
          >
            <Input
              value={content.heading_he || ""}
              onChange={(e) => update("heading_he", e.target.value)}
              placeholder="תואר ראשון במשפטים"
              dir="rtl"
            />
          </Field>

          <Field
            label="כותרת משנה"
            tooltip="תיאור קצר מתחת לכותרת. שתי שורות מקסימום. מעל 120 תווים עלול לגרום לגלישה בטלפון."
            count={content.subheading_he || ""}
            max={LIMITS.subheading}
          >
            <Textarea
              value={content.subheading_he || ""}
              onChange={(e) => update("subheading_he", e.target.value)}
              placeholder="תכנית המשפטים הגדולה בישראל — לימודים גמישים שמתאימים לחיים שלך"
              dir="rtl"
              rows={3}
            />
          </Field>

          <Field
            label="טקסט כפתור CTA"
            tooltip="הטקסט על כפתור ההרשמה. כדאי להשתמש בפועל פעיל — 'קבלו מידע', 'להרשמה' וכד'. עד 22 תווים."
            count={content.cta_text_he || ""}
            max={LIMITS.cta_text}
          >
            <Input
              value={content.cta_text_he || ""}
              onChange={(e) => update("cta_text_he", e.target.value)}
              placeholder="קבלו מידע מלא"
              dir="rtl"
            />
          </Field>

          <Field
            label="תווית נתון"
            tooltip="הטקסט שמופיע ליד הנתון הסטטיסטי (לדוגמה '90%'). שמרו קצר — עד 30 תווים."
            count={content.stat_label_he || ""}
            max={LIMITS.stat_label}
          >
            <Input
              value={content.stat_label_he || ""}
              onChange={(e) => update("stat_label_he", e.target.value)}
              placeholder="שיעור הצלחה בבחינת הלשכה"
              dir="rtl"
            />
          </Field>
        </TabsContent>

        <TabsContent value="en" className="space-y-4 mt-4">
          <Field
            label="Heading"
            tooltip="Main display heading. Keep under 35 characters for best single-line display."
            count={content.heading_en || ""}
            max={LIMITS.heading}
          >
            <Input
              value={content.heading_en || ""}
              onChange={(e) => update("heading_en", e.target.value)}
              placeholder="Law School at Ono"
            />
          </Field>

          <Field
            label="Subheading"
            tooltip="Short descriptor below the heading. Max 2 lines recommended. Over 120 chars may overflow on mobile."
            count={content.subheading_en || ""}
            max={LIMITS.subheading}
          >
            <Textarea
              value={content.subheading_en || ""}
              onChange={(e) => update("subheading_en", e.target.value)}
              placeholder="Israel's largest law program — flexible study that fits your life"
              rows={3}
            />
          </Field>

          <Field
            label="CTA Button Text"
            tooltip="Text on the registration button. Use an action verb. Keep under 22 characters."
            count={content.cta_text_en || ""}
            max={LIMITS.cta_text}
          >
            <Input
              value={content.cta_text_en || ""}
              onChange={(e) => update("cta_text_en", e.target.value)}
              placeholder="Get Full Info"
            />
          </Field>

          <Field
            label="Stat Label"
            tooltip="Label next to the stat number (e.g. '90%'). Keep short — under 30 chars."
            count={content.stat_label_en || ""}
            max={LIMITS.stat_label}
          >
            <Input
              value={content.stat_label_en || ""}
              onChange={(e) => update("stat_label_en", e.target.value)}
              placeholder="Bar exam pass rate"
            />
          </Field>
        </TabsContent>

        <TabsContent value="ar" className="space-y-4 mt-4">
          <Field
            label="العنوان"
            tooltip="العنوان الرئيسي. حافظ على 35 حرفاً كحد أقصى لأفضل عرض."
            count={content.heading_ar || ""}
            max={LIMITS.heading}
          >
            <Input
              value={content.heading_ar || ""}
              onChange={(e) => update("heading_ar", e.target.value)}
              placeholder="كلية الحقوق في أونو"
              dir="rtl"
            />
          </Field>

          <Field
            label="العنوان الفرعي"
            tooltip="وصف قصير أسفل العنوان. سطرين كحد أقصى."
            count={content.subheading_ar || ""}
            max={LIMITS.subheading}
          >
            <Textarea
              value={content.subheading_ar || ""}
              onChange={(e) => update("subheading_ar", e.target.value)}
              dir="rtl"
              rows={3}
            />
          </Field>

          <Field
            label="نص زر CTA"
            tooltip="نص زر التسجيل. استخدم فعلاً نشطاً. حتى 22 حرفاً."
            count={content.cta_text_ar || ""}
            max={LIMITS.cta_text}
          >
            <Input
              value={content.cta_text_ar || ""}
              onChange={(e) => update("cta_text_ar", e.target.value)}
              dir="rtl"
            />
          </Field>

          <Field
            label="تسمية الإحصاء"
            tooltip="النص بجانب الرقم الإحصائي. حافظ على الإيجاز."
            count={content.stat_label_ar || ""}
            max={LIMITS.stat_label}
          >
            <Input
              value={content.stat_label_ar || ""}
              onChange={(e) => update("stat_label_ar", e.target.value)}
              dir="rtl"
            />
          </Field>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-4 space-y-4">
        <h3 className="text-xs font-semibold text-[#9A969A] uppercase tracking-wider">הגדרות משותפות</h3>

        <Field
          label="תמונת רקע (URL)"
          tooltip="תמונה שתכסה את כל הרקע של ה-Hero. מידות מומלצות: 1920×1080px לפחות. פורמט JPG/WebP."
        >
          <Input
            value={content.background_image_url || ""}
            onChange={(e) => update("background_image_url", e.target.value)}
            placeholder="https://..."
            type="url"
          />
          {content.background_image_url && (
            <div className="mt-2 rounded-md overflow-hidden border h-24 bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.background_image_url}
                alt="Background preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </Field>

        <Field
          label="סרטון רקע (אופציונלי)"
          tooltip="קישור לסרטון YouTube שיופעל ברקע ה-Hero. הסרטון מתנגן אוטומטית, ללא קול, בלולאה."
        >
          <Input
            value={content.background_video_url || ""}
            onChange={(e) => update("background_video_url", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"
            type="url"
          />
          <div className="mt-1.5 space-y-1">
            <p className="text-[10px] text-[#9A969A]">
              <span className="font-semibold text-[#716C70]">פורמט נתמך:</span>{" "}
              לינק YouTube רגיל — לדוגמה:
            </p>
            <code className="block text-[10px] bg-[#F3F4F6] rounded px-2 py-1 font-mono text-[#716C70]" dir="ltr">
              https://www.youtube.com/watch?v=dQw4w9WgXcQ
            </code>
            <p className="text-[10px] text-[#9A969A]">
              הסרטון יוטמע ברקע ללא שליטות, מושתק ובלולאה אינסופית. תמונת הרקע תשמש כפוסטר עד שהסרטון נטען.
            </p>
          </div>
          {content.background_video_url && (
            <button
              type="button"
              onClick={() => onChange({ ...content, background_video_url: "", background_video_type: undefined })}
              className="mt-1 text-xs text-red-500 hover:text-red-700"
            >
              ✕ הסר סרטון
            </button>
          )}
        </Field>

        {/* Overlay opacity — visible when image or video is set */}
        {(content.background_image_url || content.background_video_url) && (
          <Field
            label={`שקיפות שכבת הכהיה: ${content.background_overlay_opacity ?? 60}%`}
            tooltip="קובע כמה כהה השכבה מעל הרקע. 0% = שקוף לגמרי, 100% = שחור מלא. ברירת מחדל: 60%."
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={content.background_overlay_opacity ?? 60}
              onChange={(e) => onChange({ ...content, background_overlay_opacity: parseInt(e.target.value, 10) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#B8D900]"
            />
            <div className="flex justify-between text-[10px] text-[#9A969A]">
              <span>שקוף</span>
              <span>כהה</span>
            </div>
          </Field>
        )}

        <Field
          label="ערך סטטיסטי"
          tooltip="המספר הגדול שמוצג לצד ה-CTA. לדוגמה: '90%', '50,000+', '97'. עד 10 תווים."
          count={content.stat_value || ""}
          max={LIMITS.stat_value}
        >
          <Input
            value={content.stat_value || ""}
            onChange={(e) => update("stat_value", e.target.value)}
            placeholder="90%"
          />
        </Field>

        <Field
          label="כתובת URL לכפתור"
          tooltip="לאן יגיע המשתמש לאחר לחיצה על כפתור ה-CTA. השתמשו ב-'#form' כדי לגלול לטופס בעמוד."
        >
          <Input
            value={content.cta_url || ""}
            onChange={(e) => update("cta_url", e.target.value)}
            placeholder="#form"
          />
        </Field>
      </div>
    </div>
  );
}
