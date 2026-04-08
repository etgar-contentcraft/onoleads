/**
 * Layout field map — describes what each thank-you layout actually renders.
 *
 * This is used by the per-page settings UI to dynamically show only the
 * override fields relevant to the selected template. Without this map,
 * the settings page shows generic "heading/subheading/whatsapp/social"
 * fields regardless of which template the page uses — which is confusing
 * when the chosen template is, say, Personal Advisor (which needs
 * advisor_name / advisor_quote / advisor_photo, not whatsapp).
 *
 * How to read an entry:
 *   - `description` — one-line Hebrew summary shown in the banner
 *   - `coreFields`  — list of human-readable field names the template uses
 *   - `sections`    — which override sections the settings UI should render
 *                     for this layout (heading/subheading are always shown)
 *   - `editTip`     — guidance directing users to edit template content
 */

import type { TyLayoutId } from "@/lib/types/thank-you-templates";

/** Which override sections to render on the per-page settings form */
export type OverrideSection =
  | "heading"
  | "subheading"
  | "social"
  | "whatsapp"
  | "calendar"
  | "video";

export interface LayoutFieldInfo {
  /** Short Hebrew description shown above the override fields */
  description: string;
  /** Human-readable list of fields this layout actually renders */
  coreFields: string[];
  /** Which override sections to show on the per-page settings form */
  sections: OverrideSection[];
  /** Extra guidance shown below the description (in Hebrew) */
  editTip?: string;
}

/**
 * Per-layout field metadata. Used by the settings UI.
 */
export const LAYOUT_FIELD_MAP: Record<TyLayoutId, LayoutFieldInfo> = {
  classic_dark: {
    description: "עיצוב כהה קלאסי עם צ'קליסט של הצעדים הבאים, כפתור וואטסאפ וקישורים חברתיים.",
    coreFields: [
      "כותרת ראשית",
      "כותרת משנה",
      "שלושה צעדים ('מה קורה עכשיו')",
      "כפתור וואטסאפ",
      "קישורים לרשתות חברתיות",
      "קישור שיתוף",
    ],
    sections: ["heading", "subheading", "whatsapp", "social"],
  },
  minimal_light: {
    description: "עיצוב נקי על רקע לבן — כותרת, טקסט הסבר קצר וכפתור חזרה.",
    coreFields: ["כותרת ראשית", "כותרת משנה", "כפתור וואטסאפ (אופציונלי)", "קישורי רשתות חברתיות"],
    sections: ["heading", "subheading", "whatsapp", "social"],
  },
  celebration: {
    description: "עמוד חגיגי עם קונפטי, גרדיאנט בוהק וכפתור שיתוף.",
    coreFields: ["כותרת ראשית", "כותרת משנה", "טקסט שיתוף", "רשתות חברתיות"],
    sections: ["heading", "subheading", "social"],
  },
  personal_advisor: {
    description: "כרטיס יועץ אישי עם שם, תמונה וציטוט אישי. בונה אמון מיידי.",
    coreFields: [
      "כותרת ראשית",
      "כותרת משנה",
      "שם היועץ",
      "תפקיד היועץ",
      "ציטוט מהיועץ",
      "תמונת היועץ",
      "כפתור וואטסאפ",
    ],
    sections: ["heading", "subheading", "whatsapp"],
    editTip:
      "שדות היועץ (שם, תפקיד, ציטוט, תמונה) נערכים בניהול תבניות עמוד תודה — לחצו על 'ניהול תבניות עמוד תודה' מתחת לבוחר התבנית.",
  },
  calendar_focus: {
    description: "עמוד שמקדם קביעת פגישה מיידית. מציג קישור Calendly או דומה.",
    coreFields: ["כותרת ראשית", "כותרת משנה", "כפתור קביעת שיחה", "קישור יומן"],
    sections: ["heading", "subheading", "calendar"],
    editTip:
      "קישור היומן ברירת המחדל נערך בניהול תבניות עמוד תודה. ניתן להחליף אותו לעמוד הזה דרך השדה 'קישור יומן' למטה.",
  },
  video_welcome: {
    description: "עמוד ברכת וידאו — וידאו אמבד מראש מכללה או חבר סגל.",
    coreFields: ["כותרת ראשית", "כותרת משנה", "קישור וידאו (YouTube/Vimeo/mp4)"],
    sections: ["heading", "subheading", "video"],
    editTip:
      "קישור הווידאו ברירת המחדל נערך בניהול תבניות עמוד תודה. ניתן להחליף אותו לעמוד הזה דרך השדה 'קישור וידאו' למטה.",
  },
  resource_library: {
    description: "ספריית משאבים להורדה — חוברות, שאלות נפוצות וסרטונים.",
    coreFields: ["כותרת ראשית", "כותרת משנה", "קישור להורדת חוברת", "קישור לשאלות נפוצות"],
    sections: ["heading", "subheading"],
    editTip:
      "קישורי חוברת / שאלות נפוצות נערכים בניהול תבניות עמוד תודה.",
  },
  social_proof: {
    description: "המלצות בוגרים בולטות — עד שלושה סטודנטים עם תמונה וציטוט.",
    coreFields: [
      "כותרת ראשית",
      "כותרת משנה",
      "שלוש המלצות (שם, ציטוט, תמונה)",
      "קישורי רשתות חברתיות",
    ],
    sections: ["heading", "subheading", "social"],
    editTip:
      "פרטי ההמלצות (שם, ציטוט, תמונה) נערכים בניהול תבניות עמוד תודה.",
  },
  urgency_cohort: {
    description: "עמוד דחיפות — ספירה לאחור למועד פתיחת המחזור הקרוב. יוצר FOMO.",
    coreFields: ["כותרת ראשית", "כותרת משנה", "תאריך פתיחת המחזור", "טקסט הספירה לאחור"],
    sections: ["heading", "subheading"],
    editTip:
      "תאריך המחזור וטקסט הספירה לאחור נערכים בניהול תבניות עמוד תודה.",
  },
  multi_channel: {
    description: "תצוגת כל ערוצי הקשר במקביל — וואטסאפ, טלפון, אימייל ויומן.",
    coreFields: [
      "כותרת ראשית",
      "כותרת משנה",
      "כפתור וואטסאפ",
      "מספר טלפון + טקסט כפתור",
      "כתובת אימייל + טקסט כפתור",
      "כפתור קביעת שיחה",
    ],
    sections: ["heading", "subheading", "whatsapp", "calendar"],
    editTip:
      "מספר הטלפון וכתובת האימייל נערכים בניהול תבניות עמוד תודה. אם לא מוגדרים — מספר הטלפון יילקח מוואטסאפ, והאימייל יהיה info@ono.ac.il.",
  },
  simple_thanks: {
    description: "העיצוב הפשוט ביותר — תודה קצרה, אישור קבלה וכפתור חזרה. ללא הסחות דעת.",
    coreFields: ["כותרת ראשית", "כותרת משנה", "טקסט כפתור חזרה"],
    sections: ["heading", "subheading"],
  },
  open_day: {
    description:
      "תבנית ייעודית לעמוד תודה ליום פתוח / אירוע — ספירה לאחור מדויקת, פרטי האירוע, וכפתור 'הוסיפו ליומן' עם אפשרויות Google / Outlook / Apple.",
    coreFields: [
      "כותרת ראשית",
      "כותרת משנה",
      "כותרת האירוע",
      "תיאור האירוע",
      "מיקום + קישור מפה",
      "מועד התחלה + מועד סיום",
      "מארגן + אימייל מארגן",
      "תווית כפתור הוספה ליומן",
    ],
    sections: ["heading", "subheading", "whatsapp"],
    editTip:
      "כל פרטי האירוע (כותרת, תאריך, מיקום, תיאור, מארגן) נערכים בניהול תבניות עמוד תודה תחת הקבוצה 'יום פתוח / אירוע'. השדות האלה משפיעים גם על הקובץ שמוכן להורדה ליומן.",
  },
};

/**
 * Returns the field info for a given layout_id, falling back to classic_dark
 * if the id is unknown (shouldn't happen, but keeps the UI safe).
 */
export function getLayoutFieldInfo(layoutId: string): LayoutFieldInfo {
  return (
    LAYOUT_FIELD_MAP[layoutId as TyLayoutId] || LAYOUT_FIELD_MAP.classic_dark
  );
}
