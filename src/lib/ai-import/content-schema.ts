/**
 * AI Import — Content Schema Definitions
 * Defines every section type, its exact field keys (matching the React components),
 * and generates precise AI prompts with complete JSON templates.
 */

export interface FieldDef {
  key: string;
  type: "string" | "number" | "boolean" | "array" | "url";
  label_he: string;
  label_en: string;
  required: boolean;
  hint?: string;
  maxLength?: number;
  /** For array fields: the shape of each item */
  itemFields?: FieldDef[];
}

export interface SectionSchema {
  type: string;
  label_he: string;
  label_en: string;
  description_he: string;
  description_en: string;
  suggestedOrder: number;
  recommended: boolean;
  fields: FieldDef[];
  /**
   * A complete JSON example of the `content` object for this section.
   * Uses `_he` suffixes — the prompt generator localizes them per language.
   */
  jsonExample: Record<string, unknown>;
}

/* ────────────────────────────────────────────────────────────
 * SECTION SCHEMAS — field keys MUST match the React components
 * in src/components/landing/sections/*.tsx exactly.
 * ──────────────────────────────────────────────────────────── */

export const SECTION_SCHEMAS: SectionSchema[] = [
  // ── 1. Hero ──
  {
    type: "hero",
    label_he: "באנר ראשי",
    label_en: "Hero Banner",
    description_he: "הסקשן הראשון — כותרת, משפט משנה, כפתור CTA ונתון סטטיסטי",
    description_en: "First section — heading, subheading, CTA button, and optional stat",
    suggestedOrder: 1,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת ראשית", label_en: "Main heading", required: true, maxLength: 35 },
      { key: "subheading_he", type: "string", label_he: "כותרת משנה", label_en: "Subheading", required: true, maxLength: 120 },
      { key: "cta_text_he", type: "string", label_he: "טקסט כפתור CTA", label_en: "CTA button text", required: true, maxLength: 22 },
      { key: "stat_value", type: "string", label_he: "ערך נתון", label_en: "Stat value", required: false, maxLength: 10 },
      { key: "stat_label_he", type: "string", label_he: "תווית נתון", label_en: "Stat label", required: false, maxLength: 30 },
      { key: "faculty_name_he", type: "string", label_he: "שם הפקולטה", label_en: "Faculty name", required: false },
      { key: "degree_type", type: "string", label_he: "סוג תואר", label_en: "Degree type", required: false },
    ],
    jsonExample: {
      heading_he: "לימודי משפטים באונו",
      subheading_he: "בית הספר הגדול בישראל למשפטים — גמישות, מעשיות, והשמה מובטחת",
      cta_text_he: "קבלו מידע מלא",
      stat_value: "90%",
      stat_label_he: "הצלחה בבחינת הלשכה",
      faculty_name_he: "הפקולטה למשפטים",
      degree_type: "LL.B.",
    },
  },

  // ── 2. Program Info Bar ──
  {
    type: "program_info_bar",
    label_he: "בר מידע תוכנית",
    label_en: "Program Info Bar",
    description_he: "פס אופקי עם 3-5 פריטי מידע מהירים. שימו לב: שדות הפריטים הם label ו-value ללא סיומת שפה",
    description_en: "Horizontal bar with 3-5 quick facts. Note: item fields are 'label' and 'value' WITHOUT language suffix",
    suggestedOrder: 2,
    recommended: true,
    fields: [
      {
        key: "items",
        type: "array",
        label_he: "פריטי מידע",
        label_en: "Info items",
        required: true,
        hint: "3-5 items",
        itemFields: [
          { key: "icon", type: "string", label_he: "אייקון", label_en: "Icon", required: true, hint: "clock | globe | building | award | users | calendar" },
          { key: "label", type: "string", label_he: "תווית", label_en: "Label", required: true },
          { key: "value", type: "string", label_he: "ערך", label_en: "Value", required: true },
        ],
      },
    ],
    jsonExample: {
      items: [
        { icon: "clock", label: "משך לימודים", value: "3 שנים" },
        { icon: "globe", label: "שפת הוראה", value: "עברית" },
        { icon: "building", label: "קמפוס", value: "קריית אונו" },
        { icon: "award", label: "תואר", value: "LL.B." },
      ],
    },
  },

  // ── 3. About ──
  {
    type: "about",
    label_he: "אודות התוכנית",
    label_en: "About the Program",
    description_he: "תיאור התוכנית עם נקודות מפתח (bullets הוא מערך של מחרוזות פשוטות)",
    description_en: "Program description with key bullet points (bullets is an array of plain strings)",
    suggestedOrder: 3,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: true, maxLength: 50 },
      { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: true, maxLength: 300 },
      { key: "bullets", type: "array", label_he: "נקודות מפתח", label_en: "Key points", required: true, hint: "3-6 strings" },
    ],
    jsonExample: {
      heading_he: "אודות התוכנית",
      description_he: "התוכנית למשפטים באונו מכשירה את בוגריה לקריירה מעשית ומוצלחת בעולם המשפט. שילוב ייחודי של תיאוריה ופרקטיקה עם סגל מהשורה הראשונה.",
      bullets: [
        "סגל אקדמי מוביל מהתעשייה",
        "קליניקות משפטיות מעשיות מהשנה הראשונה",
        "שיעור הצלחה גבוה בבחינת הלשכה",
        "מגוון התמחויות: מסחרי, פלילי, היי-טק",
      ],
    },
  },

  // ── 4. Benefits ──
  {
    type: "benefits",
    label_he: "יתרונות",
    label_en: "Benefits",
    description_he: "כרטיסי יתרונות עם אייקונים (4-8 פריטים)",
    description_en: "Benefit cards with icons (4-8 items)",
    suggestedOrder: 4,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      {
        key: "items",
        type: "array",
        label_he: "יתרונות",
        label_en: "Benefits",
        required: true,
        hint: "4-8 items",
        itemFields: [
          { key: "icon", type: "string", label_he: "אייקון", label_en: "Icon", required: true, hint: "briefcase | trophy | users | clock | globe | shield | trending-up | star | faculty | practical | placement | campuses | scholarship | career" },
          { key: "title_he", type: "string", label_he: "כותרת", label_en: "Title", required: true, maxLength: 30 },
          { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: true, maxLength: 80 },
        ],
      },
    ],
    jsonExample: {
      heading_he: "למה ללמוד באונו?",
      items: [
        { icon: "faculty", title_he: "סגל אקדמי מוביל", description_he: "מרצים מהשורה הראשונה בתעשייה ובאקדמיה" },
        { icon: "practical", title_he: "הכשרה מעשית", description_he: "שילוב תיאוריה ופרקטיקה מהיום הראשון" },
        { icon: "placement", title_he: "שיעור השמה גבוה", description_he: "הבוגרים שלנו מועסקים בחברות המובילות" },
        { icon: "scholarship", title_he: "מלגות והנחות", description_he: "מגוון מסלולי מימון ומלגות הצטיינות" },
      ],
    },
  },

  // ── 5. Curriculum ──
  {
    type: "curriculum",
    label_he: "תוכנית לימודים",
    label_en: "Curriculum",
    description_he: "תוכנית לימודים מחולקת לשנים. כל שנה כוללת year_label ו-courses (מערך מחרוזות פשוטות)",
    description_en: "Curriculum divided by years. Each year has year_label and courses (array of plain strings)",
    suggestedOrder: 5,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      {
        key: "years",
        type: "array",
        label_he: "שנים",
        label_en: "Years",
        required: true,
        itemFields: [
          { key: "year_label", type: "string", label_he: "תווית שנה", label_en: "Year label", required: true },
          { key: "courses", type: "array", label_he: "קורסים", label_en: "Courses (string array)", required: true },
        ],
      },
    ],
    jsonExample: {
      heading_he: "תוכנית הלימודים",
      years: [
        { year_label: "שנה א׳", courses: ["מבוא למשפט", "משפט חוקתי", "דיני חוזים", "משפט פלילי", "דיני נזיקין"] },
        { year_label: "שנה ב׳", courses: ["דיני עבודה", "משפט מנהלי", "דיני תאגידים", "סדר דין אזרחי", "דיני ראיות"] },
        { year_label: "שנה ג׳", courses: ["קליניקה משפטית", "סמינריון", "התמחות בחירה", "משפט בינלאומי", "אתיקה מקצועית"] },
      ],
    },
  },

  // ── 6. Career ──
  {
    type: "career",
    label_he: "קריירה",
    label_en: "Career Outcomes",
    description_he: "תפקידים ומסלולי קריירה (4-8 פריטים). כל פריט חייב לכלול title_he",
    description_en: "Career paths and roles (4-8 items). Each item must have title_he",
    suggestedOrder: 6,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      {
        key: "items",
        type: "array",
        label_he: "תפקידים",
        label_en: "Career items",
        required: true,
        hint: "4-8 items",
        itemFields: [
          { key: "title_he", type: "string", label_he: "תפקיד", label_en: "Job title", required: true },
        ],
      },
    ],
    jsonExample: {
      heading_he: "לאן תגיעו אחרי התואר?",
      items: [
        { title_he: "עורך/ת דין בתחום המסחרי" },
        { title_he: "יועץ/ת משפטי/ת בהיי-טק" },
        { title_he: "תובע/ת פלילי/ת" },
        { title_he: "שופט/ת בבית משפט" },
        { title_he: "נוטריון/ית" },
        { title_he: "מגשר/ת ובורר/ת" },
      ],
    },
  },

  // ── 7. Testimonials ──
  {
    type: "testimonials",
    label_he: "המלצות",
    label_en: "Testimonials",
    description_he: "ציטוטים מסטודנטים ובוגרים (3-5). שדות: name, role_he, quote_he, rating (1-5)",
    description_en: "Student and alumni quotes (3-5). Fields: name, role_he, quote_he, rating (1-5)",
    suggestedOrder: 7,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      {
        key: "items",
        type: "array",
        label_he: "המלצות",
        label_en: "Testimonials",
        required: true,
        hint: "3-5 items",
        itemFields: [
          { key: "name", type: "string", label_he: "שם", label_en: "Name", required: true },
          { key: "role_he", type: "string", label_he: "תפקיד/מעמד", label_en: "Role", required: true },
          { key: "quote_he", type: "string", label_he: "ציטוט", label_en: "Quote", required: true, maxLength: 150 },
          { key: "rating", type: "number", label_he: "דירוג", label_en: "Rating", required: false, hint: "1-5" },
        ],
      },
    ],
    jsonExample: {
      heading_he: "מה אומרים הסטודנטים שלנו",
      items: [
        { name: "דנה כהן", role_he: "בוגרת 2024", quote_he: "הלימודים באונו שינו לי את החיים. הגישה המעשית הכינה אותי לעבודה מהיום הראשון.", rating: 5 },
        { name: "יוסי לוי", role_he: "סטודנט שנה ג׳", quote_he: "המרצים זמינים, הקמפוס מרשים, והאווירה תומכת. ממליץ בחום!", rating: 5 },
        { name: "מיכל אברהם", role_he: "בוגרת 2023, עו״ד", quote_he: "בזכות ההכשרה המעשית ורשת הבוגרים, מצאתי עבודה תוך חודשיים מסיום התואר.", rating: 4 },
      ],
    },
  },

  // ── 8. FAQ ──
  {
    type: "faq",
    label_he: "שאלות נפוצות",
    label_en: "FAQ",
    description_he: "שאלות ותשובות (5-8). חשוב: שדות הם question_he ו-answer_he (עם סיומת _he)",
    description_en: "Questions and answers (5-8). Important: fields are question_he and answer_he (with _he suffix)",
    suggestedOrder: 8,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      {
        key: "items",
        type: "array",
        label_he: "שאלות",
        label_en: "Questions",
        required: true,
        hint: "5-8 items",
        itemFields: [
          { key: "question_he", type: "string", label_he: "שאלה", label_en: "Question", required: true },
          { key: "answer_he", type: "string", label_he: "תשובה", label_en: "Answer", required: true },
        ],
      },
    ],
    jsonExample: {
      heading_he: "שאלות נפוצות",
      items: [
        { question_he: "מהם תנאי הקבלה?", answer_he: "נדרשת תעודת בגרות מלאה ופסיכומטרי. ניתן להתקבל גם על בסיס מבחן יע\"ל או SAT." },
        { question_he: "האם יש לימודים בערב?", answer_he: "כן, התוכנית מציעה מסלולי ערב ובוקר לנוחיות הסטודנטים העובדים." },
        { question_he: "מהי עלות שכר הלימוד?", answer_he: "שכר הלימוד תחרותי ביותר. ניתן לקבל מלגות הצטיינות והנחות מיוחדות." },
        { question_he: "האם יש סיוע בהשמה?", answer_he: "מרכז הקריירה שלנו מלווה את הסטודנטים עם סדנאות, נטוורקינג וחיבור למעסיקים." },
        { question_he: "כמה זמן נמשכים הלימודים?", answer_he: "התוכנית נמשכת 3 שנים בלימודי בוקר, או 3.5 שנים בלימודי ערב." },
      ],
    },
  },

  // ── 9. Stats ──
  {
    type: "stats",
    label_he: "נתונים",
    label_en: "Stats",
    description_he: "מספרים מרשימים (3-4). כל פריט: value (מחרוזת), label_he, suffix (אופציונלי)",
    description_en: "Impressive numbers (3-4). Each item: value (string), label_he, suffix (optional)",
    suggestedOrder: 9,
    recommended: false,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      {
        key: "items",
        type: "array",
        label_he: "נתונים",
        label_en: "Stats",
        required: true,
        hint: "3-4 items",
        itemFields: [
          { key: "value", type: "string", label_he: "ערך", label_en: "Value", required: true, hint: "'90', '50000', '12'" },
          { key: "label_he", type: "string", label_he: "תווית", label_en: "Label", required: true },
          { key: "suffix", type: "string", label_he: "סיומת", label_en: "Suffix", required: false, hint: "'%', '+', 'K'" },
        ],
      },
    ],
    jsonExample: {
      items: [
        { value: "90", label_he: "אחוז הצלחה בבחינת הלשכה", suffix: "%" },
        { value: "15000", label_he: "בוגרים בשוק העבודה", suffix: "+" },
        { value: "30", label_he: "שנות ניסיון", suffix: "+" },
      ],
    },
  },

  // ── 10. Admission ──
  {
    type: "admission",
    label_he: "תנאי קבלה",
    label_en: "Admission Requirements",
    description_he: "דרישות קבלה. requirements הוא מערך של מחרוזות פשוטות (לא אובייקטים!)",
    description_en: "Admission requirements. 'requirements' is a plain string array (NOT objects!)",
    suggestedOrder: 10,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: false },
      {
        key: "requirements",
        type: "array",
        label_he: "דרישות",
        label_en: "Requirements (string array)",
        required: true,
        hint: "3-6 plain strings",
      },
    ],
    jsonExample: {
      heading_he: "תנאי קבלה",
      description_he: "ההרשמה פתוחה — מספר המקומות מוגבל",
      requirements: [
        "תעודת בגרות מלאה",
        "ציון פסיכומטרי 520 ומעלה (או SAT/יע״ל מקביל)",
        "ראיון קבלה אישי",
        "אין דרישת ניסיון מקצועי קודם",
      ],
    },
  },

  // ── 11. Video ──
  {
    type: "video",
    label_he: "וידאו",
    label_en: "Video Section",
    description_he: "סרטוני YouTube. שדה youtube_id מקבל URL מלא או ID בלבד",
    description_en: "YouTube videos. youtube_id accepts full URL or just the video ID",
    suggestedOrder: 11,
    recommended: false,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      { key: "layout", type: "string", label_he: "תצוגה", label_en: "Layout", required: false, hint: "'featured' or 'grid'" },
      {
        key: "videos",
        type: "array",
        label_he: "סרטונים",
        label_en: "Videos",
        required: true,
        itemFields: [
          { key: "youtube_id", type: "string", label_he: "YouTube URL/ID", label_en: "YouTube URL/ID", required: true },
          { key: "title_he", type: "string", label_he: "כותרת", label_en: "Title", required: true },
          { key: "duration_he", type: "string", label_he: "משך", label_en: "Duration", required: false },
        ],
      },
    ],
    jsonExample: {
      heading_he: "סרטונים",
      layout: "featured",
      videos: [
        { youtube_id: "https://www.youtube.com/watch?v=XXXXX", title_he: "סיור וירטואלי בקמפוס", duration_he: "3:45" },
      ],
    },
  },

  // ── 12. Gallery ──
  {
    type: "gallery",
    label_he: "גלריה",
    label_en: "Gallery",
    description_he: "גלריית תמונות",
    description_en: "Image gallery",
    suggestedOrder: 12,
    recommended: false,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      {
        key: "images",
        type: "array",
        label_he: "תמונות",
        label_en: "Images",
        required: true,
        itemFields: [
          { key: "url", type: "url", label_he: "URL", label_en: "URL", required: true },
          { key: "alt", type: "string", label_he: "טקסט חלופי", label_en: "Alt text", required: false },
          { key: "caption_he", type: "string", label_he: "כיתוב", label_en: "Caption", required: false },
        ],
      },
    ],
    jsonExample: {
      heading_he: "גלריית הקמפוס",
      images: [
        { url: "https://example.com/campus1.jpg", alt: "קמפוס קריית אונו", caption_he: "הבניין הראשי" },
      ],
    },
  },

  // ── 13. CTA ──
  {
    type: "cta",
    label_he: "קריאה לפעולה",
    label_en: "CTA Banner",
    description_he: "באנר CTA. חשוב: שדה הכפתור הוא button_text_he (לא cta_text_he!)",
    description_en: "CTA banner. Important: button field is button_text_he (NOT cta_text_he!)",
    suggestedOrder: 13,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: true },
      { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: false },
      { key: "button_text_he", type: "string", label_he: "טקסט כפתור", label_en: "Button text", required: true },
    ],
    jsonExample: {
      heading_he: "מוכנים להתחיל?",
      description_he: "השאירו פרטים ויועץ לימודים יחזור אליכם תוך 24 שעות",
      button_text_he: "לפרטים נוספים",
    },
  },

  // ── 14. Form ──
  {
    type: "form",
    label_he: "טופס לידים",
    label_en: "Lead Form",
    description_he: "טופס השארת פרטים",
    description_en: "Lead capture form",
    suggestedOrder: 14,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: false },
    ],
    jsonExample: {
      heading_he: "רוצים לשמוע עוד?",
      description_he: "השאירו פרטים ונחזור אליכם עם כל המידע",
    },
  },
];

/* ────────────────────────────────────────────────────────────
 * Helper: localize field keys and example values
 * ──────────────────────────────────────────────────────────── */

/** Replace `_he` suffix in a key with the target language suffix. */
function localizeKey(key: string, lang: string): string {
  if (lang === "he") return key;
  return key.replace(/_he$/, `_${lang}`);
}

/**
 * Deep-clone a JSON example and rename all `_he` keys to `_${lang}`.
 * String values that look Hebrew are replaced with a placeholder.
 */
function localizeExample(obj: Record<string, unknown>, lang: string): Record<string, unknown> {
  if (lang === "he") return obj;
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    const newKey = localizeKey(key, lang);
    if (Array.isArray(val)) {
      result[newKey] = val.map((item) =>
        typeof item === "object" && item !== null
          ? localizeExample(item as Record<string, unknown>, lang)
          : item,
      );
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

/* ────────────────────────────────────────────────────────────
 * PROMPT GENERATOR — produces the sharpest possible prompt
 * ──────────────────────────────────────────────────────────── */

export function generateAiPrompt(
  programInfo: {
    programName: string;
    degreeType: string;
    faculty: string;
    campuses?: string;
    duration?: string;
    language?: string;
    additionalInfo?: string;
  },
  referenceUrls: string[],
  selectedSections?: string[],
): string {
  const lang = programInfo.language || "he";
  const isHe = lang === "he";

  const sections = selectedSections
    ? SECTION_SCHEMAS.filter((s) => selectedSections.includes(s.type))
    : SECTION_SCHEMAS.filter((s) => s.recommended);

  const langSuffix = `_${lang}`;
  const writingLang = isHe ? "Hebrew (עברית)" : lang === "ar" ? "Arabic (العربية)" : "English";

  const urlList = referenceUrls.length > 0
    ? referenceUrls.map((u) => `- ${u}`).join("\n")
    : isHe
      ? "(לא סופקו קישורים — כתוב תוכן שיווקי כללי)"
      : "(No reference URLs — write general marketing content)";

  // ── Build section templates ──
  const sectionTemplates = sections.map((s) => {
    const example = localizeExample(s.jsonExample, lang);
    const exampleJson = JSON.stringify(example, null, 2)
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n");

    return `### ${s.type} (sort_order: ${s.suggestedOrder})
${isHe ? s.description_he : s.description_en}
\`\`\`json
{
  "section_type": "${s.type}",
  "sort_order": ${s.suggestedOrder},
  "content":
${exampleJson}
}
\`\`\``;
  }).join("\n\n");

  // ── Build complete output template ──
  const sectionsArrayPreview = sections.map((s) =>
    `    { "section_type": "${s.type}", "sort_order": ${s.suggestedOrder}, "content": { ... } }`,
  ).join(",\n");

  // ── PROMPT ──
  if (isHe) {
    return `אתה כותב תוכן שיווקי לעמוד נחיתה באתר OnoLeads (קמפוס אונו האקדמית).
עליך להחזיר **JSON בלבד** — ללא טקסט, ללא הסברים, ללא markdown מסביב.

═══════════════════════════════════════
פרטי התוכנית
═══════════════════════════════════════
- שם: ${programInfo.programName}
- תואר: ${programInfo.degreeType}
- פקולטה: ${programInfo.faculty}
${programInfo.campuses ? `- קמפוסים: ${programInfo.campuses}` : ""}${programInfo.duration ? `\n- משך: ${programInfo.duration}` : ""}
${programInfo.additionalInfo ? `- מידע נוסף: ${programInfo.additionalInfo}` : ""}

קישורים לעיון:
${urlList}

═══════════════════════════════════════
כללי כתיבה
═══════════════════════════════════════
1. כתוב בעברית שיווקית — ברורה, ישירה, משכנעת
2. פנייה בגוף שני רבים ("הצטרפו", "גלו", "קבלו")
3. דגש על יתרונות אונו: גמישות, מעשיות, רלוונטיות לשוק העבודה
4. שמור על אורכי שדות (maxLength מצוין בדוגמאות)
5. שמות סטודנטים — שמות ישראליים אמינים
6. אל תמציא נתונים — אם לא בטוח, כתוב "מהמובילים", "מהגדולים"
7. כל שדות הטקסט מסתיימים ב-${langSuffix}

═══════════════════════════════════════
מבנה JSON נדרש (בדיוק!)
═══════════════════════════════════════
\`\`\`json
{
  "page": {
    "title_he": "כותרת העמוד",
    "seo_title": "כותרת SEO — עד 60 תווים",
    "seo_description": "תיאור SEO — עד 155 תווים",
    "language": "he"
  },
  "sections": [
${sectionsArrayPreview}
  ]
}
\`\`\`

═══════════════════════════════════════
${sections.length} סקשנים לייצר — דוגמאות מדויקות
═══════════════════════════════════════
להלן הדוגמה המדויקת לכל סקשן. **העתק את מבנה ה-content בדיוק** — אותם שמות שדות, אותם טיפוסים.
החלף רק את הערכים בתוכן רלוונטי לתוכנית "${programInfo.programName}".

${sectionTemplates}

═══════════════════════════════════════
תזכורת סופית — חשוב מאוד!
═══════════════════════════════════════
1. החזר JSON חוקי בלבד. ללא טקסט לפני או אחרי ה-JSON. ללא markdown. ללא הסברים.
2. אל תעטוף ב-\`\`\`json — החזר את ה-JSON ישירות.
3. ודא שאין פסיקים מיותרים (trailing commas) לפני } או ].
4. כל מחרוזת חייבת להיות בתוך גרשיים כפולים " ולא גרשיים בודדים '.
5. שמות שדות חייבים להיות זהים לדוגמאות למעלה (כולל _he).
6. אסור להוסיף שדות שלא מופיעים בדוגמאות.
7. אסור לשנות שמות שדות (למשל: button_text_he ולא cta_text_he).
8. items/bullets/requirements/years/courses — מערכים, לא אובייקט בודד.
9. section_type חייב להיות בדיוק אחד מ: ${sections.map((s) => s.type).join(", ")}
10. בדוק שוב שה-JSON תקין לפני שאתה מחזיר אותו.`;
  }

  // ── ENGLISH / ARABIC PROMPT ──
  return `You are a marketing copywriter for OnoLeads (Ono Academic Campus landing pages).
Return **valid JSON only** — no text, no explanations, no markdown around it.

═══════════════════════════════════════
Program Details
═══════════════════════════════════════
- Name: ${programInfo.programName}
- Degree: ${programInfo.degreeType}
- Faculty: ${programInfo.faculty}
${programInfo.campuses ? `- Campuses: ${programInfo.campuses}` : ""}${programInfo.duration ? `\n- Duration: ${programInfo.duration}` : ""}
${programInfo.additionalInfo ? `- Additional info: ${programInfo.additionalInfo}` : ""}

Reference URLs:
${urlList}

═══════════════════════════════════════
Writing Rules
═══════════════════════════════════════
1. Write ALL text content in ${writingLang}
2. Use second person plural ("Join", "Discover", "Get your info")
3. Emphasize Ono's advantages: flexibility, practical education, job market readiness
4. Respect field length limits (maxLength noted in examples)
5. Use realistic ${lang === "ar" ? "Arabic" : "international"} names for testimonials
6. Do NOT invent statistics — if unsure, write "one of the leading", "among the largest"
7. CRITICAL — All text field keys MUST use the \`${langSuffix}\` suffix, NOT \`_he\`
   Example: \`heading${langSuffix}\`, \`subheading${langSuffix}\`, \`button_text${langSuffix}\`, \`question${langSuffix}\`, \`answer${langSuffix}\`
   Exception: keys without language suffix stay as-is: \`stat_value\`, \`icon\`, \`rating\`, \`layout\`, \`name\`, \`url\`, \`year_label\`, \`label\`, \`value\`

═══════════════════════════════════════
Required JSON Structure (exact format!)
═══════════════════════════════════════
\`\`\`json
{
  "page": {
    "title_he": "Page title (internal, can be in ${writingLang})",
    "seo_title": "SEO title — max 60 chars, in ${writingLang}",
    "seo_description": "SEO description — max 155 chars, in ${writingLang}",
    "language": "${lang}"
  },
  "sections": [
${sectionsArrayPreview}
  ]
}
\`\`\`

═══════════════════════════════════════
${sections.length} Sections — Exact Templates
═══════════════════════════════════════
Below is the exact content structure for each section. **Copy the field names exactly** — same keys, same types.
Replace only the values with content relevant to "${programInfo.programName}".
Remember: every \`_he\` suffix below becomes \`${langSuffix}\` in your output.

${sectionTemplates}

═══════════════════════════════════════
Final Reminders — VERY IMPORTANT!
═══════════════════════════════════════
1. Return valid JSON ONLY. No text before or after the JSON. No markdown. No explanations.
2. Do NOT wrap in \`\`\`json — return the raw JSON directly.
3. Ensure no trailing commas before } or ].
4. All strings MUST use double quotes ", never single quotes '.
5. Field names MUST match the templates above exactly (with \`${langSuffix}\` instead of \`_he\`).
6. Do NOT add fields that don't appear in the templates.
7. Do NOT rename fields (e.g. use button_text${langSuffix}, NOT cta_text${langSuffix}).
8. items/bullets/requirements/years/courses must be arrays, never single objects.
9. section_type must be exactly one of: ${sections.map((s) => s.type).join(", ")}
10. Double-check that your JSON is valid before returning it.`;
}

/* ────────────────────────────────────────────────────────────
 * VALIDATION — checks imported JSON against section schemas
 * ──────────────────────────────────────────────────────────── */

export function validateImportedContent(data: unknown): string[] {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("הקובץ אינו JSON חוקי");
    return errors;
  }

  const obj = data as Record<string, unknown>;

  if (!obj.page || typeof obj.page !== "object") {
    errors.push("חסר שדה 'page' עם פרטי העמוד");
  }

  if (!Array.isArray(obj.sections)) {
    errors.push("חסר שדה 'sections' (מערך סקשנים)");
    return errors;
  }

  const sections = obj.sections as Record<string, unknown>[];
  if (sections.length === 0) {
    errors.push("מערך sections ריק — נדרש לפחות סקשן אחד");
  }

  const validTypes = new Set(SECTION_SCHEMAS.map((s) => s.type));
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section.section_type || typeof section.section_type !== "string") {
      errors.push(`סקשן ${i + 1}: חסר שדה section_type`);
    } else if (!validTypes.has(section.section_type as string)) {
      errors.push(`סקשן ${i + 1}: סוג "${section.section_type}" לא מוכר. סוגים חוקיים: ${Array.from(validTypes).join(", ")}`);
    }
    if (!section.content || typeof section.content !== "object") {
      errors.push(`סקשן ${i + 1}: חסר שדה content`);
    }
  }

  return errors;
}
