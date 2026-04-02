/**
 * AI Import — Content Schema Definitions
 * Documents all section types, their fields, and expected values.
 * Used to generate AI prompts and validate imported content.
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
  /** Suggested sort_order position (1 = top, higher = lower) */
  suggestedOrder: number;
  /** Whether this section is typically required for a good landing page */
  recommended: boolean;
  fields: FieldDef[];
}

/**
 * Complete schema of every landing page section type and its content fields.
 * This schema drives both the AI prompt generation and the import validation.
 */
export const SECTION_SCHEMAS: SectionSchema[] = [
  {
    type: "hero",
    label_he: "באנר ראשי",
    label_en: "Hero Banner",
    description_he: "הסקשן הראשון — תמונת רקע, כותרת, משפט משנה וכפתור CTA",
    description_en: "Full-screen hero with background image, heading, subheading, and CTA button",
    suggestedOrder: 1,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת ראשית", label_en: "Main heading", required: true, maxLength: 35, hint: "כותרת קצרה ושיווקית — עד 35 תווים" },
      { key: "subheading_he", type: "string", label_he: "כותרת משנה", label_en: "Subheading", required: true, maxLength: 120, hint: "משפט שמסביר את הערך — עד 120 תווים" },
      { key: "cta_text_he", type: "string", label_he: "טקסט כפתור", label_en: "CTA button text", required: true, maxLength: 22, hint: "פועל פעיל: 'קבלו מידע', 'להרשמה'" },
      { key: "background_image_url", type: "url", label_he: "תמונת רקע", label_en: "Background image URL", required: false },
      { key: "stat_value", type: "string", label_he: "נתון סטטיסטי", label_en: "Stat value", required: false, maxLength: 10, hint: "מספר מרשים: '90%', '50,000+'" },
      { key: "stat_label_he", type: "string", label_he: "תווית הנתון", label_en: "Stat label", required: false, maxLength: 30 },
      { key: "faculty_name_he", type: "string", label_he: "שם הפקולטה", label_en: "Faculty name", required: false },
      { key: "degree_type", type: "string", label_he: "סוג תואר", label_en: "Degree type", required: false, hint: "B.A., M.A., B.Sc. וכד'" },
    ],
  },
  {
    type: "program_info_bar",
    label_he: "בר מידע תוכנית",
    label_en: "Program Info Bar",
    description_he: "פס אופקי עם נתונים מהירים: משך, שפה, קמפוס, מלגה",
    description_en: "Horizontal bar with quick facts: duration, language, campus, scholarship",
    suggestedOrder: 2,
    recommended: true,
    fields: [
      {
        key: "items",
        type: "array",
        label_he: "פריטי מידע",
        label_en: "Info items",
        required: true,
        itemFields: [
          { key: "icon", type: "string", label_he: "אייקון", label_en: "Icon", required: true, hint: "clock, globe, building, award, users, calendar" },
          { key: "label_he", type: "string", label_he: "תווית", label_en: "Label", required: true },
          { key: "value_he", type: "string", label_he: "ערך", label_en: "Value", required: true },
        ],
      },
    ],
  },
  {
    type: "about",
    label_he: "אודות התוכנית",
    label_en: "About the Program",
    description_he: "תיאור התוכנית עם תמונה/סרטון ונקודות מפתח",
    description_en: "Program description with image/video and key bullet points",
    suggestedOrder: 3,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: true, maxLength: 50 },
      { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: true, maxLength: 300, hint: "פסקה שיווקית שמסבירה למה התוכנית מיוחדת" },
      { key: "image_url", type: "url", label_he: "תמונה", label_en: "Image URL", required: false },
      { key: "video_url", type: "url", label_he: "סרטון YouTube", label_en: "YouTube video URL", required: false },
      { key: "bullets", type: "array", label_he: "נקודות מפתח", label_en: "Key points", required: true, hint: "3-6 יתרונות מרכזיים" },
    ],
  },
  {
    type: "benefits",
    label_he: "יתרונות",
    label_en: "Benefits",
    description_he: "כרטיסי יתרונות עם אייקונים",
    description_en: "Benefit cards with icons",
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
        hint: "4-8 יתרונות",
        itemFields: [
          { key: "icon", type: "string", label_he: "אייקון", label_en: "Icon", required: true, hint: "briefcase, trophy, users, clock, globe, shield, trending-up, star" },
          { key: "title_he", type: "string", label_he: "כותרת", label_en: "Title", required: true, maxLength: 30 },
          { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: true, maxLength: 80 },
        ],
      },
    ],
  },
  {
    type: "curriculum",
    label_he: "תוכנית לימודים",
    label_en: "Curriculum",
    description_he: "טבלת תוכנית לימודים מחולקת לשנים/סמסטרים",
    description_en: "Curriculum table divided by years/semesters",
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
          { key: "year_label", type: "string", label_he: "תווית שנה", label_en: "Year label", required: true, hint: "שנה א', סמסטר א'" },
          { key: "courses", type: "array", label_he: "קורסים", label_en: "Courses", required: true },
        ],
      },
    ],
  },
  {
    type: "career",
    label_he: "קריירה",
    label_en: "Career Outcomes",
    description_he: "תפקידים ומסלולי קריירה לאחר סיום הלימודים",
    description_en: "Career paths and job roles after graduation",
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
        hint: "4-8 תפקידים/תחומים",
        itemFields: [
          { key: "title_he", type: "string", label_he: "תפקיד", label_en: "Job title", required: true },
          { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: false },
        ],
      },
    ],
  },
  {
    type: "testimonials",
    label_he: "המלצות",
    label_en: "Testimonials",
    description_he: "ציטוטים מסטודנטים ובוגרים",
    description_en: "Student and alumni quotes",
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
        hint: "3-5 המלצות",
        itemFields: [
          { key: "name", type: "string", label_he: "שם", label_en: "Name", required: true },
          { key: "role_he", type: "string", label_he: "תפקיד", label_en: "Role", required: true, hint: "בוגר/ת 2024, סטודנט/ית שנה ג'" },
          { key: "quote_he", type: "string", label_he: "ציטוט", label_en: "Quote", required: true, maxLength: 150 },
          { key: "rating", type: "number", label_he: "דירוג", label_en: "Rating", required: false, hint: "1-5 כוכבים" },
          { key: "video_url", type: "url", label_he: "סרטון YouTube", label_en: "Video URL", required: false },
        ],
      },
    ],
  },
  {
    type: "faq",
    label_he: "שאלות נפוצות",
    label_en: "FAQ",
    description_he: "שאלות ותשובות נפוצות",
    description_en: "Frequently asked questions",
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
        hint: "5-8 שאלות",
        itemFields: [
          { key: "question", type: "string", label_he: "שאלה", label_en: "Question", required: true },
          { key: "answer", type: "string", label_he: "תשובה", label_en: "Answer", required: true },
        ],
      },
    ],
  },
  {
    type: "stats",
    label_he: "נתונים",
    label_en: "Stats",
    description_he: "מספרים מרשימים באנימציה",
    description_en: "Animated stat counters",
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
        hint: "3-4 נתונים",
        itemFields: [
          { key: "value", type: "string", label_he: "ערך", label_en: "Value", required: true, hint: "'90%', '50+', '12K'" },
          { key: "label_he", type: "string", label_he: "תווית", label_en: "Label", required: true },
          { key: "suffix", type: "string", label_he: "סיומת", label_en: "Suffix", required: false, hint: "'%', '+', 'K'" },
        ],
      },
    ],
  },
  {
    type: "admission",
    label_he: "תנאי קבלה",
    label_en: "Admission",
    description_he: "תנאי קבלה ותהליך הרשמה",
    description_en: "Admission requirements and enrollment process",
    suggestedOrder: 10,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: false },
      { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: false },
      {
        key: "requirements",
        type: "array",
        label_he: "דרישות",
        label_en: "Requirements",
        required: true,
        hint: "3-6 דרישות",
      },
      {
        key: "steps",
        type: "array",
        label_he: "שלבי הרשמה",
        label_en: "Enrollment steps",
        required: false,
      },
    ],
  },
  {
    type: "video",
    label_he: "וידאו",
    label_en: "Video Section",
    description_he: "סרטוני YouTube — פלייליסט או גריד",
    description_en: "YouTube videos — playlist or grid layout",
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
          { key: "duration_he", type: "string", label_he: "משך", label_en: "Duration", required: false, hint: "'3:45'" },
        ],
      },
    ],
  },
  {
    type: "gallery",
    label_he: "גלריה",
    label_en: "Gallery",
    description_he: "גלריית תמונות",
    description_en: "Image gallery/carousel",
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
  },
  {
    type: "cta",
    label_he: "קריאה לפעולה",
    label_en: "CTA Banner",
    description_he: "באנר עם כותרת וכפתור הנעה לפעולה",
    description_en: "Banner with heading and call-to-action button",
    suggestedOrder: 13,
    recommended: true,
    fields: [
      { key: "heading_he", type: "string", label_he: "כותרת", label_en: "Heading", required: true },
      { key: "description_he", type: "string", label_he: "תיאור", label_en: "Description", required: false },
      { key: "cta_text_he", type: "string", label_he: "טקסט כפתור", label_en: "CTA text", required: true },
    ],
  },
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
  },
];

/**
 * Generates a comprehensive AI prompt for creating landing page content.
 * @param programInfo - Basic info about the program (name, degree, faculty, etc.)
 * @param referenceUrls - URLs to reference for content (e.g., ono.ac.il pages)
 * @param selectedSections - Which section types to include (defaults to all recommended)
 */
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
  const sections = selectedSections
    ? SECTION_SCHEMAS.filter((s) => selectedSections.includes(s.type))
    : SECTION_SCHEMAS.filter((s) => s.recommended);

  const sectionInstructions = sections
    .map((s) => {
      const fieldList = s.fields
        .map((f) => {
          let line = `    - "${f.key}": (${f.type}) ${f.label_he}`;
          if (f.required) line += " [חובה]";
          if (f.hint) line += ` — ${f.hint}`;
          if (f.maxLength) line += ` (מקסימום ${f.maxLength} תווים)`;
          if (f.type === "array" && f.itemFields) {
            const items = f.itemFields.map((if_) => `      - "${if_.key}": ${if_.label_he}${if_.hint ? ` (${if_.hint})` : ""}`).join("\n");
            line += `\n    כל פריט במערך:\n${items}`;
          }
          return line;
        })
        .join("\n");

      return `  ## ${s.type} — ${s.label_he}\n  ${s.description_he}\n  שדות:\n${fieldList}`;
    })
    .join("\n\n");

  const urlList = referenceUrls.length > 0
    ? referenceUrls.map((u) => `  - ${u}`).join("\n")
    : "  (לא סופקו קישורים — כתוב תוכן שיווקי כללי)";

  return `# הנחיות ליצירת תוכן עמוד נחיתה — OnoLeads

## פרטי התוכנית
- שם התוכנית: ${programInfo.programName}
- סוג תואר: ${programInfo.degreeType}
- פקולטה: ${programInfo.faculty}
${programInfo.campuses ? `- קמפוסים: ${programInfo.campuses}` : ""}
${programInfo.duration ? `- משך לימודים: ${programInfo.duration}` : ""}
${programInfo.language ? `- שפת עמוד: ${programInfo.language}` : "- שפת עמוד: עברית"}
${programInfo.additionalInfo ? `- מידע נוסף: ${programInfo.additionalInfo}` : ""}

## קישורים לעיון
${urlList}

## הנחיות כתיבה
1. כתוב בעברית שיווקית — ברורה, ישירה, משכנעת
2. פנייה בגוף שני רבים ("הצטרפו", "גלו", "קבלו")
3. דגש על יתרונות ייחודיים של אונו: גמישות, מעשיות, רלוונטיות לשוק העבודה
4. נתונים ספציפיים (אחוזי הצלחה, שנות ותק, מספר בוגרים) — אם יש מידע, השתמש בו
5. שמור על אורכים מומלצים לכל שדה (ציינתי מקסימום תווים)
6. שמות אמיתיים של סטודנטים/בוגרים — המצא שמות ישראליים אמינים
7. אל תמציא נתונים סטטיסטיים — אם לא בטוח, השתמש בניסוחים כמו "מהמובילים", "מהגדולים"

## פורמט פלט
החזר JSON חוקי בפורמט הבא:
\`\`\`json
{
  "page": {
    "title_he": "כותרת העמוד (SEO)",
    "seo_title": "כותרת SEO — עד 60 תווים",
    "seo_description": "תיאור SEO — עד 155 תווים",
    "language": "${programInfo.language || "he"}"
  },
  "sections": [
    {
      "section_type": "...",
      "sort_order": 1,
      "content": { ... }
    }
  ]
}
\`\`\`

## סקשנים לייצר (${sections.length} סקשנים)

${sectionInstructions}

## דוגמה לשדה content ב-hero:
\`\`\`json
{
  "heading_he": "לימודי משפטים באונו",
  "subheading_he": "התוכנית הגדולה בישראל — גמישות שמתאימה לחיים שלך",
  "cta_text_he": "קבלו מידע מלא",
  "stat_value": "90%",
  "stat_label_he": "הצלחה בבחינת הלשכה",
  "faculty_name_he": "הפקולטה למשפטים",
  "degree_type": "LL.B."
}
\`\`\`

חשוב: החזר JSON בלבד, ללא טקסט נוסף מסביב.`;
}

/**
 * Validates imported JSON content against the section schemas.
 * @returns Array of validation errors, empty if valid
 */
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
      errors.push(`סקשן ${i + 1}: סוג "${section.section_type}" לא מוכר`);
    }
    if (!section.content || typeof section.content !== "object") {
      errors.push(`סקשן ${i + 1}: חסר שדה content`);
    }
  }

  return errors;
}
