"use client";

/**
 * Edit a single thank-you-page template.
 *
 * Three-tab editor (he / en / ar) with all fields the layout supports.
 * Visual config (accent_color, bg_style) is editable below the content tabs.
 * Save persists to `thank_you_templates`. System templates can be edited but
 * not deleted.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, ArrowRight, Eye, ExternalLink } from "lucide-react";
import type {
  ThankYouTemplate,
  TyContent,
  TyContentFields,
  TyLang,
} from "@/lib/types/thank-you-templates";

const LANG_LABELS: Record<TyLang, string> = {
  he: "עברית",
  en: "English",
  ar: "العربية",
};

/**
 * Field groups for the editor — same fields exist for every layout but only
 * some are actually consumed by each layout. We show all of them and let the
 * editor decide which ones to fill.
 */
const FIELD_GROUPS: Array<{ label: string; fields: Array<{ key: keyof TyContentFields; label: string; multiline?: boolean }> }> = [
  {
    label: "טקסטים ראשיים",
    fields: [
      { key: "heading", label: "כותרת ראשית (אפשר [שם] להחלפה דינמית)" },
      { key: "subheading", label: "כותרת משנית" },
      { key: "thank_you_word", label: 'מילת ה"תודה" (לאנימציית השם)' },
    ],
  },
  {
    label: "מה קורה עכשיו (טיימליין)",
    fields: [
      { key: "steps_label", label: "כותרת המקטע" },
      { key: "step_1", label: "שלב 1" },
      { key: "step_2", label: "שלב 2" },
      { key: "step_3", label: "שלב 3" },
    ],
  },
  {
    label: "WhatsApp",
    fields: [
      { key: "whatsapp_cta", label: "טקסט הכפתור" },
      { key: "whatsapp_msg", label: "הודעה מוכנה מראש", multiline: true },
    ],
  },
  {
    label: "יומן (קביעת שיחה)",
    fields: [
      { key: "calendar_label", label: "כותרת מקטע היומן" },
      { key: "calendar_cta", label: "טקסט הכפתור" },
      { key: "calendar_url", label: "קישור יומן (Calendly וכד׳) — ברירת מחדל לתבנית" },
    ],
  },
  {
    label: "וידאו",
    fields: [
      { key: "video_label", label: "כותרת מקטע הווידאו" },
      { key: "video_url", label: "קישור וידאו (YouTube / Vimeo / mp4) — ברירת מחדל לתבנית" },
    ],
  },
  {
    label: "רשתות חברתיות",
    fields: [{ key: "social_label", label: "טקסט מעל האייקונים" }],
  },
  {
    label: "שיתוף עם חבר",
    fields: [
      { key: "share_cta", label: "טקסט הכפתור" },
      { key: "share_text", label: "טקסט שיתוף", multiline: true },
      { key: "shared_label", label: "טקסט אישור (אחרי שיתוף)" },
    ],
  },
  {
    label: "כותרת תחתונה",
    fields: [
      { key: "back_link", label: "קישור חזרה" },
      { key: "copyright", label: "טקסט זכויות יוצרים" },
    ],
  },
  {
    label: "יועץ אישי (לתבנית Personal Advisor)",
    fields: [
      { key: "advisor_name", label: "שם היועץ" },
      { key: "advisor_title", label: "תפקיד" },
      { key: "advisor_quote", label: "ציטוט", multiline: true },
      { key: "advisor_photo_url", label: "תמונה (URL)" },
    ],
  },
  {
    label: "ספריית משאבים (לתבנית Resource Library)",
    fields: [
      { key: "brochure_label", label: "תווית חוברת" },
      { key: "brochure_url", label: "קישור חוברת" },
      { key: "faq_label", label: "תווית שאלות נפוצות" },
      { key: "faq_url", label: "קישור שאלות נפוצות" },
    ],
  },
  {
    label: "דחיפות / מחזור (לתבנית Urgency Cohort)",
    fields: [
      { key: "intake_label", label: "תווית פתיחת מחזור" },
      { key: "intake_date_text", label: "תאריך מחזור (טקסט חופשי, או YYYY-MM-DD)" },
      { key: "countdown_label", label: "תווית הספירה לאחור" },
    ],
  },
  {
    label: "הוכחה חברתית (לתבנית Social Proof)",
    fields: [
      { key: "testimonials_label", label: "כותרת מקטע" },
      { key: "testimonial_1_name", label: "סטודנט 1 — שם" },
      { key: "testimonial_1_quote", label: "סטודנט 1 — ציטוט", multiline: true },
      { key: "testimonial_1_photo_url", label: "סטודנט 1 — תמונה" },
      { key: "testimonial_2_name", label: "סטודנט 2 — שם" },
      { key: "testimonial_2_quote", label: "סטודנט 2 — ציטוט", multiline: true },
      { key: "testimonial_2_photo_url", label: "סטודנט 2 — תמונה" },
      { key: "testimonial_3_name", label: "סטודנט 3 — שם" },
      { key: "testimonial_3_quote", label: "סטודנט 3 — ציטוט", multiline: true },
      { key: "testimonial_3_photo_url", label: "סטודנט 3 — תמונה" },
    ],
  },
  {
    label: "רב-ערוצי (לתבנית Multi Channel)",
    fields: [
      { key: "channels_label", label: "כותרת המקטע" },
      { key: "phone_cta", label: "טקסט כפתור טלפון" },
      { key: "phone_number", label: "מספר טלפון (אם ריק – יילקח מספר ה-WhatsApp)" },
      { key: "email_cta", label: "טקסט כפתור אימייל" },
      { key: "email_address", label: "כתובת אימייל" },
    ],
  },
  {
    label: "יום פתוח / אירוע (לתבנית Open Day)",
    fields: [
      { key: "event_title", label: "כותרת האירוע (תופיע גם בתוך הזימון ליומן)" },
      { key: "event_description", label: "תיאור האירוע (ייכנס לגוף הזימון)", multiline: true },
      { key: "event_location", label: "מיקום (כתובת פיזית או 'Online')" },
      { key: "event_location_url", label: "קישור למפה / לינק לאירוע מקוון" },
      { key: "event_start_datetime", label: "מועד התחלה — ISO 8601 (למשל 2026-05-15T18:00:00+03:00)" },
      { key: "event_end_datetime", label: "מועד סיום — ISO 8601 (אופציונלי, ברירת מחדל: התחלה + שעתיים)" },
      { key: "event_organizer_name", label: "שם המארגן (לתוך הזימון)" },
      { key: "event_organizer_email", label: "אימייל מארגן (לתוך הזימון)" },
      { key: "add_to_calendar_label", label: "טקסט כפתור 'הוסיפו ליומן'" },
      { key: "event_reserved_note", label: "הערה תחת הספירה לאחור (למשל 'המקום נשמר לכם')" },
      { key: "countdown_label", label: "תווית מעל הספירה לאחור" },
    ],
  },
];

export default function EditTyTemplate() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const id = params?.id as string;

  const [template, setTemplate] = useState<ThankYouTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<TyLang>("he");
  const [savedFlash, setSavedFlash] = useState(false);

  // Local form state
  const [nameHe, setNameHe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionHe, setDescriptionHe] = useState("");
  const [content, setContent] = useState<TyContent>({});
  const [accentColor, setAccentColor] = useState("#B8D900");
  const [bgStyle, setBgStyle] = useState<"dark" | "light" | "gradient">("dark");

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const { data, error } = await supabase
        .from("thank_you_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        alert("שגיאה בטעינת התבנית");
        router.push("/dashboard/ty-templates");
        return;
      }
      const tpl = data as ThankYouTemplate;
      setTemplate(tpl);
      setNameHe(tpl.name_he || "");
      setNameEn(tpl.name_en || "");
      setNameAr(tpl.name_ar || "");
      setDescriptionHe(tpl.description_he || "");
      setContent(tpl.content || {});
      setAccentColor(tpl.config?.accent_color || "#B8D900");
      setBgStyle((tpl.config?.bg_style as "dark" | "light" | "gradient") || "dark");
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateField(lang: TyLang, key: keyof TyContentFields, value: string) {
    setContent((prev) => ({
      ...prev,
      [lang]: { ...(prev[lang] || {}), [key]: value },
    }));
  }

  async function save() {
    if (!template) return;
    setSaving(true);
    const { error } = await supabase
      .from("thank_you_templates")
      .update({
        name_he: nameHe,
        name_en: nameEn,
        name_ar: nameAr,
        description_he: descriptionHe,
        content,
        config: {
          ...template.config,
          accent_color: accentColor,
          bg_style: bgStyle,
        },
      })
      .eq("id", template.id);

    setSaving(false);
    if (error) {
      alert("שגיאה בשמירה: " + error.message);
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  if (loading || !template) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard/ty-templates")}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{nameHe || "תבנית"}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              ממשק: {template.layout_id} {template.is_system && "· תבנית מערכת"}
              {template.is_default && " · ברירת מחדל"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/ty`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <Eye className="w-4 h-4" /> תצוגה <ExternalLink className="w-3 h-3" />
          </a>
          <Button onClick={save} disabled={saving} className="bg-[#B8D900] hover:bg-[#a5c200] text-black">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savedFlash ? "נשמר!" : "שמור"}
          </Button>
        </div>
      </div>

      {/* Display info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-4">פרטי תצוגה</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>שם בעברית</Label>
            <Input value={nameHe} onChange={(e) => setNameHe(e.target.value)} />
          </div>
          <div>
            <Label>שם באנגלית</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div>
            <Label>שם בערבית</Label>
            <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </div>
        </div>
        <div className="mt-4">
          <Label>תיאור (עברית)</Label>
          <Textarea value={descriptionHe} onChange={(e) => setDescriptionHe(e.target.value)} rows={2} />
        </div>
      </div>

      {/* Visual config */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="font-bold text-gray-900 mb-4">עיצוב חזותי</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>צבע מודגש (Accent)</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-16 rounded border border-gray-200"
              />
              <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>סגנון רקע</Label>
            <select
              value={bgStyle}
              onChange={(e) => setBgStyle(e.target.value as "dark" | "light" | "gradient")}
              className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
            >
              <option value="dark">כהה</option>
              <option value="light">בהיר</option>
              <option value="gradient">גרדיאנט</option>
            </select>
          </div>
        </div>
      </div>

      {/* Language tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(["he", "en", "ar"] as TyLang[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`flex-1 px-5 py-3 text-sm font-semibold transition-colors ${
                activeLang === lang
                  ? "bg-[#B8D900]/10 text-[#5a6900] border-b-2 border-[#B8D900]"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6" dir={activeLang === "en" ? "ltr" : "rtl"}>
          {FIELD_GROUPS.map((group) => (
            <div key={group.label} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
              <h3 className="text-sm font-bold text-gray-800 mb-3">{group.label}</h3>
              <div className="space-y-3">
                {group.fields.map((f) => {
                  const value = (content[activeLang] as TyContentFields | undefined)?.[f.key] || "";
                  return (
                    <div key={f.key}>
                      <Label className="text-xs text-gray-600">{f.label}</Label>
                      {f.multiline ? (
                        <Textarea
                          value={value}
                          onChange={(e) => updateField(activeLang, f.key, e.target.value)}
                          rows={3}
                          dir={activeLang === "en" ? "ltr" : "rtl"}
                        />
                      ) : (
                        <Input
                          value={value}
                          onChange={(e) => updateField(activeLang, f.key, e.target.value)}
                          dir={activeLang === "en" ? "ltr" : "rtl"}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="bg-[#B8D900] hover:bg-[#a5c200] text-black">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {savedFlash ? "נשמר בהצלחה!" : "שמור שינויים"}
        </Button>
      </div>
    </div>
  );
}
