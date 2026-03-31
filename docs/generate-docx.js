/**
 * Generates a professional Hebrew RTL Word document (.docx) for the AI optimization spec.
 * Structure: Business rationale → High-level overview → Technical specification.
 * Follows docx skill best practices: DXA widths, ShadingType.CLEAR, proper numbering,
 * visuallyRightToLeft tables, headers/footers, cell margins.
 * Run with: node docs/generate-docx.js
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType, BorderStyle, ShadingType,
  LevelFormat, Header, Footer, PageNumber, PageBreak
} = require("docx");
const fs = require("fs");

/* ────────── Constants ────────── */

/** A4 page dimensions in DXA (1440 DXA = 1 inch) */
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN_TOP = 1440;
const MARGIN_BOTTOM = 1440;
const MARGIN_LEFT = 1728;
const MARGIN_RIGHT = 1728;

/** Content width = page width minus left and right margins */
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

/** Standard cell padding for readable tables */
const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

/** Standard border style for tables */
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

/** Alternating row colors */
const HEADER_FILL = "D5E8F0";
const ALT_ROW_FILL = "F5F8FA";

/** Font settings */
const FONT_MAIN = "David";
const FONT_CODE = "Consolas";
const FONT_SIZE_BODY = 22;
const FONT_SIZE_TABLE = 20;
const FONT_SIZE_CODE = 18;

/* ────────── Helper Functions ────────── */

/**
 * Creates an RTL heading paragraph with proper Hebrew formatting.
 * @param {string} text - Heading text in Hebrew
 * @param {HeadingLevel} level - Heading level (HEADING_1, HEADING_2, HEADING_3)
 * @returns {Paragraph} Formatted heading paragraph
 */
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, font: FONT_MAIN, rightToLeft: true })],
    spacing: { before: 400, after: 200 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

/**
 * Creates a normal RTL paragraph for Hebrew body text.
 * @param {string|TextRun[]} text - Hebrew text string or array of TextRun objects
 * @param {object} opts - Optional TextRun overrides (bold, color, etc.)
 * @returns {Paragraph} Formatted body paragraph
 */
function para(text, opts = {}) {
  const runs = typeof text === "string"
    ? [new TextRun({ text, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true, ...opts })]
    : text;
  return new Paragraph({
    children: runs,
    spacing: { after: 120 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

/**
 * Creates a bold RTL paragraph for emphasis text.
 * @param {string} text - Hebrew text to display in bold
 * @returns {Paragraph} Bold formatted paragraph
 */
function boldPara(text) {
  return para([new TextRun({ text, bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true })]);
}

/**
 * Creates a bullet list item using proper numbering config.
 * @param {string} text - Bullet item text in Hebrew
 * @param {number} level - Nesting level (0 = top level)
 * @returns {Paragraph} Formatted bullet paragraph
 */
function bullet(text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true })],
    numbering: { reference: "hebrewBullets", level },
    spacing: { after: 60 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

/**
 * Creates a code block paragraph (LTR for code readability).
 * @param {string} text - Code text (LTR)
 * @returns {Paragraph} Formatted code paragraph
 */
function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: FONT_SIZE_CODE, font: FONT_CODE })],
    spacing: { after: 60 },
    shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
  });
}

/**
 * Creates a properly formatted RTL table with DXA widths, cell margins, alternating row shading,
 * and visuallyRightToLeft for proper Hebrew table rendering.
 * @param {string[]} headers - Array of header column texts (rightmost column first in Hebrew)
 * @param {string[][]} rows - Array of row data
 * @returns {Table} Formatted RTL table element
 */
function simpleTable(headers, rows) {
  const colCount = headers.length;
  const colWidth = Math.floor(CONTENT_WIDTH / colCount);
  const columnWidths = Array(colCount).fill(colWidth);
  columnWidths[colCount - 1] = CONTENT_WIDTH - colWidth * (colCount - 1);

  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: FONT_SIZE_TABLE, font: FONT_MAIN, rightToLeft: true })],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
      })],
      shading: { type: ShadingType.CLEAR, fill: HEADER_FILL },
      borders: BORDERS,
      width: { size: columnWidths[i], type: WidthType.DXA },
      margins: CELL_MARGINS,
    })),
    tableHeader: true,
  });

  const dataRows = rows.map((row, rowIdx) => new TableRow({
    children: row.map((cell, colIdx) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: String(cell), size: FONT_SIZE_TABLE, font: FONT_MAIN, rightToLeft: true })],
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
      })],
      borders: BORDERS,
      width: { size: columnWidths[colIdx], type: WidthType.DXA },
      margins: CELL_MARGINS,
      shading: rowIdx % 2 === 1 ? { type: ShadingType.CLEAR, fill: ALT_ROW_FILL } : undefined,
    })),
  }));

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    visuallyRightToLeft: true,
  });
}

/**
 * Creates empty spacing paragraph.
 * @param {number} before - spacing before in DXA
 * @param {number} after - spacing after in DXA
 * @returns {Paragraph}
 */
function spacer(before = 0, after = 0) {
  return new Paragraph({ spacing: { before, after } });
}

/* ────────── Main Document Builder ────────── */

/**
 * Builds the complete Word document.
 * Structure: Business rationale → System overview → Technical specification.
 */
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT_MAIN, size: FONT_SIZE_BODY, rightToLeft: true } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: FONT_MAIN, color: "2A2628" },
          paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: FONT_MAIN, color: "2A2628" },
          paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: FONT_MAIN, color: "4A4648" },
          paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 2 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "hebrewBullets",
          levels: [
            {
              level: 0, format: LevelFormat.BULLET, text: "\u2022",
              alignment: AlignmentType.RIGHT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1, format: LevelFormat.BULLET, text: "\u25E6",
              alignment: AlignmentType.RIGHT,
              style: { paragraph: { indent: { left: 1440, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
        },
        bidi: true,
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: "הקריה האקדמית אונו — מסמך איפיון טכני", size: 16, font: FONT_MAIN, color: "999999", rightToLeft: true })],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "עמוד ", size: 16, font: FONT_MAIN, rightToLeft: true }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT_MAIN }),
            ],
            alignment: AlignmentType.CENTER,
            bidirectional: true,
          })],
        }),
      },
      children: [

        // ═══════════════════════════════════════════════════════════
        //                      TITLE PAGE
        // ═══════════════════════════════════════════════════════════

        spacer(3000),
        new Paragraph({
          children: [new TextRun({ text: "מערכת אופטימיזציה מבוססת AI", size: 52, bold: true, font: FONT_MAIN, rightToLeft: true, color: "2A2628" })],
          alignment: AlignmentType.CENTER, bidirectional: true,
        }),
        new Paragraph({
          children: [new TextRun({ text: "לעמודי נחיתה — איפיון טכני מפורט", size: 40, font: FONT_MAIN, rightToLeft: true, color: "4A4648" })],
          alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 800 },
        }),

        simpleTable(
          ["שדה", "ערך"],
          [
            ["גרסת מסמך", "1.0"],
            ["תאריך", "29.03.2026"],
            ["מוכן עבור", "מחלקת מערכות מידע, הקריה האקדמית אונו"],
            ["מערכת", "OnoLeads (Next.js 14 + Supabase + Vercel)"],
            ["סטטוס", "ממתין לאישור מערכות מידע"],
          ]
        ),

        spacer(600),
        para("מסמך זה נכתב עבור מחלקת מערכות המידע בהקריה האקדמית אונו. הוא מתאר מערכת לאופטימיזציה אוטומטית של עמודי נחיתה באמצעות בינה מלאכותית ובדיקות A/B. המסמך פותח בהסבר העסקי ובסקירה כללית, וממשיך לאיפיון טכני מפורט."),

        // ═══════════════════════════════════════════════════════════
        //                    TABLE OF CONTENTS
        // ═══════════════════════════════════════════════════════════

        new Paragraph({ children: [new PageBreak()] }),
        heading("תוכן עניינים"),
        spacer(100),

        // Part A
        boldPara("חלק א' — רקע עסקי וסקירה כללית"),
        bullet("1. הבעיה העסקית"),
        bullet("2. הפתרון המוצע — סקירה כללית"),
        bullet("3. תהליך העבודה המתוכנן"),
        bullet("4. הערכת עלויות ולוחות זמנים"),
        spacer(100),

        // Part B
        boldPara("חלק ב' — איפיון טכני מפורט"),
        bullet("5. ארכיטקטורה טכנית"),
        bullet("6. שינויים בסכמת בסיס הנתונים"),
        bullet("7. נקודות אינטגרציה עם AI"),
        bullet("8. מעקב התנהגותי בצד הלקוח"),
        bullet("9. אלגוריתם עץ ההחלטות (Decision Tree)"),
        bullet("10. היררכיית מעורבות והתקדמות מטרות"),
        bullet("11. תהליך חישוב מחדש — טריגרים ותזמון"),
        bullet("12. ממשק ניהול בדשבורד"),
        bullet("13. נקודות קצה API"),
        bullet("14. ניהול סיכונים"),
        spacer(100),

        boldPara("נספחים"),
        bullet("נספח א' — סוגי סקשנים ואלמנטים שניתנים לבדיקה"),
        bullet("נספח ב' — מילון מונחים"),

        // ═══════════════════════════════════════════════════════════
        //         PART A: BUSINESS RATIONALE & HIGH-LEVEL
        // ═══════════════════════════════════════════════════════════

        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          children: [new TextRun({ text: "חלק א' — רקע עסקי וסקירה כללית", size: 36, bold: true, font: FONT_MAIN, rightToLeft: true, color: "2A2628" })],
          alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 600 },
        }),

        // ── Section 1: The Business Problem ──
        heading("1. הבעיה העסקית"),

        heading("1.1 מצב קיים", HeadingLevel.HEADING_2),
        para("הקריה האקדמית אונו מפעילה מערכת עמודי נחיתה (OnoLeads) המשרתת כ-62 תוכניות לימוד עם 10 עמודי נחיתה פעילים. העמודים מניבים לידים (פניות של מועמדים ללימודים) — המטרה המרכזית של המערכת."),
        para("כיום, כל עמוד נחיתה מוצג בגרסה אחת בלבד לכל המבקרים, ללא קשר למקור ההגעה, סוג המכשיר, או פרופיל המבקר. אין דרך לדעת אם כותרת אחרת, תמונה שונה, או ניסוח CTA אחר היו מניבים יותר פניות."),

        heading("1.2 מה אנחנו מפסידים?", HeadingLevel.HEADING_2),
        bullet("מבקר שהגיע מפייסבוק רואה את אותו העמוד בדיוק כמו מבקר שהגיע מגוגל — למרות שהמוטיבציה שלהם עשויה להיות שונה לחלוטין"),
        bullet("אין מנגנון לבדוק אילו ניסוחים, תמונות או מבנים עובדים טוב יותר"),
        bullet("שיפור העמודים נעשה על בסיס תחושת בטן ולא על בסיס נתונים"),
        bullet("כל שינוי דורש עבודה ידנית של צוות השיווק"),

        heading("1.3 מה אנחנו רוצים להשיג?", HeadingLevel.HEADING_2),
        bullet("יצירת גרסאות חלופיות לתוכן העמודים באמצעות AI — במקום לכתוב הכל ידנית"),
        bullet("בדיקה אוטומטית של איזו גרסה עובדת טוב יותר (A/B Testing)"),
        bullet("התאמת העמוד אוטומטית לכל מבקר על בסיס מאפייניו — פרסונליזציה"),
        bullet("הגדלת שיעור ההמרה (כמות הלידים ביחס למבקרים) ללא תוספת תקציב פרסום"),

        // ── Section 2: The Proposed Solution ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("2. הפתרון המוצע — סקירה כללית"),

        heading("2.1 הרעיון בקצרה", HeadingLevel.HEADING_2),
        para("המערכת המוצעת מאפשרת ליצור עד 3 גרסאות חלופיות לכל חלק (סקשן) בעמוד נחיתה. הגרסאות נוצרות באמצעות AI או נכתבות ידנית, עוברות אישור של אדמין, ואז המערכת בודקת אוטומטית איזו גרסה עובדת הכי טוב עבור כל סוג מבקר."),

        heading("2.2 ארבעת המרכיבים", HeadingLevel.HEADING_2),
        boldPara("מרכיב 1 — יצירת חלופות"),
        para("AI מייצר גרסאות חלופיות של טקסטים ותמונות בעמוד. האדמין בוחן, מתקן במידת הצורך, ומאשר. ניתן גם ליצור חלופות ידנית."),
        boldPara("מרכיב 2 — בדיקות A/B"),
        para("המערכת מציגה למבקרים שונים גרסאות שונות, ועוקבת אחרי התנהגותם: כמה זמן שהו בעמוד, אם גללו, אם לחצו, ואם שלחו פנייה."),
        boldPara("מרכיב 3 — עץ החלטות"),
        para("אלגוריתם סטטיסטי (Decision Tree) מנתח את הנתונים ומגלה דפוסים: למשל, שמבקרים ממובייל שהגיעו מפייסבוק מגיבים טוב יותר לכותרת A, בעוד מבקרים מדסקטופ מגוגל מעדיפים כותרת B."),
        boldPara("מרכיב 4 — פרסונליזציה אוטומטית"),
        para("ברגע שיש מספיק נתונים, המערכת מציגה אוטומטית את הגרסה המנצחת לכל סוג מבקר. 95% מהטראפיק רואה את הגרסה הטובה ביותר, 5% ממשיכים לבדוק חלופות חדשות."),

        heading("2.3 מה המערכת לא עושה", HeadingLevel.HEADING_2),
        bullet("לא משנה את העיצוב או המבנה הכללי של העמוד — רק את התוכן בתוך סקשנים קיימים"),
        bullet("לא פועלת בזמן אמת עם AI — ה-AI משמש רק ליצירת התוכן, לא להגשתו"),
        bullet("לא שולחת מידע אישי של מבקרים לשום שירות חיצוני"),
        bullet("לא מבצעת שינויים ללא אישור אדמין — כל חלופה חייבת לעבור בדיקה ואישור"),

        // ── Section 3: Planned Workflow ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("3. תהליך העבודה המתוכנן"),

        heading("3.1 שלב ההכנה (חד-פעמי)", HeadingLevel.HEADING_2),
        bullet("העלאת מסמכי רקע לכל תוכנית לימוד (ידיעון, מידע על הפקולטה, תוצאות קריירה)"),
        bullet("העלאת הנחיות מותג (brand guidelines) — כדי שה-AI ישמור על שפה אחידה"),
        bullet("הגדרת ניסוי A/B לכל עמוד נחיתה"),

        heading("3.2 שלב יצירת החלופות", HeadingLevel.HEADING_2),
        bullet("האדמין בוחר עמוד ולוחץ 'צור חלופות עם AI'"),
        bullet("המערכת מייצרת גרסאות חלופיות לטקסטים ולתמונות בכל סקשן"),
        bullet("האדמין בוחן כל חלופה, מתקן במידת הצורך, ומאשר או דוחה"),

        heading("3.3 שלב הבדיקה (אוטומטי)", HeadingLevel.HEADING_2),
        bullet("המערכת מתחילה להציג את החלופות למבקרים בצורה אקראית"),
        bullet("מעקב אוטומטי אחרי התנהגות: זמן בעמוד, גלילה, לחיצות, מילוי טופס, שליחת פנייה"),
        bullet("המערכת מתחילה מסיגנלים פשוטים (זמן, גלילה) ומתקדמת אוטומטית לסיגנלים חזקים (שליחת ליד) ככל שמצטבר מספיק מידע"),

        heading("3.4 שלב האופטימיזציה (אוטומטי)", HeadingLevel.HEADING_2),
        bullet("עץ ההחלטות נבנה ומתעדכן אוטומטית — לפחות פעם ביום ובכל פעם שמצטבר מספיק טראפיק"),
        bullet("המערכת מזהה אילו גרסאות עובדות הכי טוב לכל פרופיל מבקר"),
        bullet("מנגנוני בטיחות עוצרים אוטומטית ניסויים שפוגעים בביצועים"),

        // ── Section 4: Costs & Timeline ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("4. הערכת עלויות ולוחות זמנים"),

        heading("4.1 עלות יצירת חלופות (חד-פעמית, 10 עמודים)", HeadingLevel.HEADING_2),
        para("עלות יצירת החלופות היא חד-פעמית — המערכת לא קוראת ל-AI בכל ביקור של גולש, אלא רק כשאדמין מבקש ליצור תוכן חדש."),

        simpleTable(
          ["שילוב ספקים", "עלות טקסט", "עלות תמונות", "סך הכל"],
          [
            ["GPT-4o + DALL-E 3 (HD)", "$2.40", "$2.40", "$4.80"],
            ["Claude Sonnet 4 + DALL-E 3", "$3.24", "$2.40", "$5.64"],
            ["Gemini 2.5 Pro + Imagen 3", "$1.80", "$1.20", "$3.00"],
          ]
        ),

        heading("4.2 עלויות שוטפות חודשיות", HeadingLevel.HEADING_2),
        simpleTable(
          ["רכיב", "עלות חודשית"],
          [
            ["יצירת AI מחדש (אם נדרש)", "$0-5"],
            ["Supabase Pro", "$25 (קיים, לא משתנה)"],
            ["Vercel Pro", "$20 (קיים, לא משתנה)"],
            ["סך הכל עלות נוספת", "$0-5 בחודש"],
          ]
        ),

        boldPara("מסקנה: העלות הנוספת היא $3-6 חד-פעמית ליצירת חלופות, ו-$0-5 בחודש להפעלה שוטפת. התשתית הקיימת (Supabase + Vercel) מספיקה ואין צורך ברכישת תשתית חדשה."),

        heading("4.3 לוח זמנים ליישום", HeadingLevel.HEADING_2),
        simpleTable(
          ["שלב", "שבועות", "תוכן", "תלויות"],
          [
            ["1: תשתית", "1-3", "סכמת בסיס נתונים, מסמכי רקע, הנחיות מותג, מודל חלופות ותהליך אישור", "אין"],
            ["2: יצירת AI", "4-5", "שכבת הפשטה AI, פרומפטים ליצירת תוכן, יצירת תמונות, ממשק בדשבורד", "שלב 1"],
            ["3: מעקב + A/B", "6-8", "מעקב התנהגותי, הקצאת חלופות למבקרים, דשבורד ניסויים", "שלב 1"],
            ["4: עץ החלטות", "9-11", "אלגוריתם אופטימיזציה, חישוב יומי, התקדמות מטרות, ויזואליזציה", "שלב 3"],
            ["5: הקשחה", "12", "ניטור, מנגנוני בטיחות, ארכוב נתונים, תיעוד", "שלב 4"],
          ]
        ),

        heading("4.4 סיכום ביניים", HeadingLevel.HEADING_2),
        para("המערכת המוצעת מספקת יכולת אופטימיזציה אוטומטית של עמודי נחיתה בעלות שולית, תוך שימוש בתשתית הקיימת. היא לא דורשת שינוי ארכיטקטוני משמעותי ולא חושפת מידע אישי. כל שינוי עובר אישור אדמין לפני שהוא מוצג למבקרים."),
        para("החלק הבא מפרט את האיפיון הטכני המלא ליישום המערכת."),

        // ═══════════════════════════════════════════════════════════
        //         PART B: TECHNICAL SPECIFICATION
        // ═══════════════════════════════════════════════════════════

        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({
          children: [new TextRun({ text: "חלק ב' — איפיון טכני מפורט", size: 36, bold: true, font: FONT_MAIN, rightToLeft: true, color: "2A2628" })],
          alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 600 },
        }),

        // ── Section 5: Architecture ──
        heading("5. ארכיטקטורה טכנית"),

        heading("5.1 מצב נוכחי", HeadingLevel.HEADING_2),
        para("OnoLeads היא אפליקציית Next.js 14 המאוחסנת ב-Vercel עם בסיס נתונים Supabase (PostgreSQL). עמודים נבנים סטטית בזמן build (SSG) עם רענון ISR לפי דרישה. המערכת כבר עוקבת אחרי מבקרים באמצעות cookie בשם onoleads_id (365 ימים), אוספת פרמטרי UTM, סוג מכשיר ו-referrer בזמן שליחת ליד."),
        boldPara("אין כרגע: A/B testing, אינטגרציית AI, או אופטימיזציה אוטומטית."),

        heading("5.2 ארכיטקטורה מוצעת — ארבע שכבות", HeadingLevel.HEADING_2),
        para("המערכת מוסיפה ארבע שכבות מעל הארכיטקטורה הקיימת:"),
        boldPara("שכבה 1 — מודל נתוני חלופות"),
        para("טבלת section_variants שומרת עד 3 חלופות (A, B, C) לכל סקשן בעמוד. כל חלופה עוברת תהליך אישור (טיוטה > ממתין > מאושר/נדחה). האדמין יכול ליצור חלופות ידנית או לבקש מה-AI."),
        boldPara("שכבה 2 — יצירת תוכן AI"),
        para("יצירת טקסט באמצעות מודלי שפה (LLM) ויצירת תמונות באמצעות מודלי תמונות. ה-AI מקבל הקשר מלא: מסמכי רקע של התוכנית, הנחיות מותג, ותוכן הסקשן הנוכחי. העלות היא חד-פעמית לכל חלופה — לא עלות לכל ביקור."),
        boldPara("שכבה 3 — מערכת A/B Testing"),
        para("הקצאה אקראית של חלופות למבקרים, מעקב אחר אירועי מעורבות, והערכה סטטיסטית של ביצועי כל חלופה."),
        boldPara("שכבה 4 — מנוע פרסונליזציה"),
        para("עץ החלטות (Decision Tree) שמחלק את המבקרים לסגמנטים ומקצה לכל סגמנט את שילוב החלופות האופטימלי. 95% מהטראפיק מקבל את השילוב המנצח, 5% תמיד נשאר לחקירה."),

        heading("5.3 החלטה ארכיטקטונית מרכזית — מודל היברידי", HeadingLevel.HEADING_2),
        para("עמודי נחיתה עוברים ממודל SSG טהור למודל היברידי. ה-HTML הסטטי משרת את הגרסה המקורית (control). סקריפט קליל בצד הלקוח קורא את שילוב החלופות שהוקצה למבקר מ-Edge Function (בזמן תגובה של כ-30 אלפיות שנייה) ומחליף אלמנטי תוכן לפני שהמשתמש מספיק לקרוא. זה שומר על יתרון הביצועים של SSG תוך אפשור פרסונליזציה."),

        heading("5.4 המלצת תשתית", HeadingLevel.HEADING_2),
        para("להישאר על Vercel + Supabase. אין צורך בתשתית נוספת."),

        simpleTable(
          ["רכיב", "פלטפורמה", "נימוק"],
          [
            ["API הקצאת חלופות", "Vercel Edge Functions", "תגובה מתחת ל-50ms; קורא מ-Supabase Edge cache"],
            ["API מעקב אירועים", "Vercel Serverless", "Fire-and-forget inserts; batched מהלקוח"],
            ["יצירת תוכן AI", "API חיצוני (OpenAI/Anthropic/Google)", "עלות חד-פעמית, לא לכל ביקור"],
            ["חישוב עץ החלטות", "Supabase pg_cron + Edge Function", "batch יומי + חישוב כשיש מספיק טראפיק"],
            ["אחסון מסמכי רקע", "Supabase Storage", "PDF/DOCX שהועלו על ידי אדמין"],
            ["אחסון תמונות מיוצרות", "Supabase Storage", "תוצרי DALL-E/Imagen נשמרים לאחר יצירה"],
          ]
        ),

        // ── Section 6: Database ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("6. שינויים בסכמת בסיס הנתונים"),

        heading("6.1 טבלאות חדשות (8 טבלאות)", HeadingLevel.HEADING_2),
        para("המערכת דורשת 8 טבלאות חדשות בבסיס הנתונים:"),

        simpleTable(
          ["שם טבלה", "מטרה", "שדות מרכזיים"],
          [
            ["section_variants", "חלופות תוכן לכל סקשן (עד 3)", "section_id, variant_key (A/B/C), content (JSONB), source, status, ai_model, generation_cost"],
            ["ab_experiments", "ניסויי A/B לכל עמוד", "page_id, status, traffic_split, target_goal (1-5), confidence_threshold (0.85)"],
            ["visitor_assignments", "הקצאת חלופות למבקרים", "experiment_id, cookie_id, variant_combo (JSONB), utm_source/medium, device_category, assignment_type"],
            ["engagement_events", "מעקב התנהגותי פרטני", "assignment_id, page_id, cookie_id, event_type, event_data (JSONB), engagement_level (0-5)"],
            ["decision_tree_models", "מודלי עץ החלטות מסודרים", "experiment_id, tree_json (JSONB), goal_level, sample_size, accuracy, is_active"],
            ["program_reference_docs", "מסמכי רקע לתוכניות לימוד", "program_id, doc_type (pdf/docx/url), title, storage_path, extracted_text"],
            ["brand_guidelines", "הנחיות מותג גלובליות", "title, storage_path, extracted_text, is_active"],
            ["tree_rebuild_log", "לוג בניית עץ מחדש", "experiment_id, trigger_type, previous/new_goal_level, visitors_since_last"],
          ]
        ),

        heading("6.2 מבנה טבלת section_variants — פירוט", HeadingLevel.HEADING_3),
        para("כל חלופה שומרת: תוכן (JSONB באותו פורמט של הסקשן המקורי), מקור היצירה (ידני/AI טקסט/AI תמונה), מודל ה-AI ששימש, עלות היצירה, וסטטוס אישור."),
        para("תהליך אישור: טיוטה (draft) > ממתין לבדיקה (pending_review) > מאושר (approved) / נדחה (rejected). רק חלופות מאושרות מוצגות למבקרים."),
        para("אילוץ ייחודיות: UNIQUE(section_id, variant_key) — סקשן אחד יכול לקבל חלופה A, B, ו-C בלבד."),

        heading("6.3 שינויים בטבלאות קיימות", HeadingLevel.HEADING_2),
        para("טבלת page_sections — תוספת עמודה active_variant שמאפשרת לקבוע חלופה מנצחת קבועה (NULL = תוכן מקורי, A/B/C = חלופה מנצחת)."),

        heading("6.4 מדיניות אבטחה (RLS)", HeadingLevel.HEADING_2),
        para("כל הטבלאות החדשות מוגנות ב-Row Level Security:"),
        bullet("section_variants: אדמין — גישה מלאה. אנונימי — קריאה רק לחלופות מאושרות"),
        bullet("visitor_assignments: אנונימי — הוספה בלבד (להקצאה). אדמין — קריאה"),
        bullet("engagement_events: אנונימי — הוספה בלבד. אדמין — קריאה"),
        bullet("ab_experiments: אדמין — גישה מלאה. אנונימי — קריאה רק לניסויים פעילים"),
        bullet("decision_tree_models: אדמין — גישה מלאה. אנונימי — קריאה רק למודל פעיל"),
        bullet("program_reference_docs + brand_guidelines: אדמין בלבד"),

        // ── Section 7: AI Integration ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("7. נקודות אינטגרציה עם AI"),

        heading("7.1 עקרון מפתח: AI רק ביצירת תוכן", HeadingLevel.HEADING_2),
        para("AI נקרא רק במהלך יצירת תוכן בדשבורד הניהול — לעולם לא בזמן הגשת העמוד למבקר. זו עלות חד-פעמית לכל חלופה. חישוב עץ ההחלטות מתבצע ב-SQL מקומי ללא AI."),

        heading("7.2 שלוש רמות יצירה", HeadingLevel.HEADING_2),
        boldPara("רמה 1 — יצירה פר אלמנט"),
        para("האדמין בוחר סקשן ספציפי ולוחץ 'צור חלופה עם AI'. המערכת מייצרת חלופה אחת לסקשן הנבחר בלבד — טקסט, תמונה, או שניהם."),
        boldPara("רמה 2 — יצירת חלופות לעמוד שלם"),
        para("האדמין לוחץ 'צור חלופות לכל העמוד'. המערכת עוברת על כל הסקשנים ומייצרת חלופה אחת לכל סקשן. כל החלופות דורשות אישור פרטני."),
        boldPara("רמה 3 — עריכה ידנית"),
        para("האדמין יכול תמיד ליצור חלופות ידנית או לערוך חלופות שנוצרו ב-AI לפני אישורן."),

        heading("7.3 הרכבת הקשר ליצירת טקסט", HeadingLevel.HEADING_2),
        para("לכל בקשת יצירה, ה-AI מקבל את ההקשר הבא:"),
        bullet("הנחיות מותג — טקסט שחולץ ממסמך ה-brand guidelines"),
        bullet("מסמכי רקע לתוכנית — טקסט שחולץ מ-PDF/DOCX"),
        bullet("תוכן הסקשן הנוכחי — גרסת ה-control"),
        bullet("סכמת סוג הסקשן — אילו שדות הסקשן משתמש"),
        bullet("תוכן סקשנים סמוכים — לקוהרנטיות עם שאר העמוד"),
        bullet("מטאדאטה של התוכנית — שם, סוג תואר, תיאור, תוצאות קריירה"),

        heading("7.4 דוגמת פרומפט ליצירת טקסט", HeadingLevel.HEADING_2),
        para("להלן דוגמה מייצגת לפרומפט שנשלח למודל שפה עבור סקשן Hero:"),
        code("אתה קופירייטר שיווקי בעברית עבור הקריה האקדמית אונו."),
        code(""),
        code("קול המותג: {טקסט הנחיות מותג שחולץ}"),
        code("מידע על התוכנית: {שם, תואר, תיאור, USPs ממסמכי רקע}"),
        code("תוכן HERO נוכחי: {כותרת, תת-כותרת, טקסט CTA}"),
        code(""),
        code("משימה: צור גרסה חלופית שלוקחת זווית רגשית שונה"),
        code("(שאיפת קריירה / יוקרה אקדמית / שייכות לקהילה),"),
        code("שומרת על קול המותג, כתובה בעברית טבעית ומשכנעת."),
        code("החזר JSON עם: heading_he, subheading_he, cta_text_he"),

        heading("7.5 יצירת תמונות", HeadingLevel.HEADING_2),
        para("תמונות נוצרות באמצעות DALL-E 3 או Imagen 3. הפרומפט כולל: סוג התוכנית, סגנון (מודרני, מקצועי), צבעי מותג, מצב רוח, ויחס מסך. התמונות נשמרות ב-Supabase Storage ומקושרות לחלופה."),

        heading("7.6 חילוץ טקסט ממסמכי רקע", HeadingLevel.HEADING_2),
        para("כשאדמין מעלה PDF או DOCX למערכת:"),
        bullet("הקובץ נשמר ב-Supabase Storage"),
        bullet("Edge Function מחלץ טקסט (pdf-parse לקבצי PDF, mammoth לקבצי DOCX)"),
        bullet("הטקסט נשמר בבסיס הנתונים ומשמש כהקשר לכל יצירת AI עבור אותה תוכנית"),
        bullet("אם הטקסט ארוך מ-8,000 טוקנים, מסוכם אוטומטית באמצעות מודל זול"),

        heading("7.7 שכבת הפשטה של ספק AI", HeadingLevel.HEADING_2),
        para("המערכת בנויה עם ממשק גנרי שמאפשר החלפה קלה בין ספקי AI (OpenAI, Anthropic, Google). ההחלפה היא שינוי הגדרה בלבד — לא דורשת שינוי קוד."),

        // ── Section 8: Tracking ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("8. מעקב התנהגותי בצד הלקוח"),

        heading("8.1 סיגנלים נעקבים", HeadingLevel.HEADING_2),
        simpleTable(
          ["סיגנל", "שיטת זיהוי", "רמת מעורבות"],
          [
            ["צפייה בעמוד", "אוטומטי בטעינה", "1 (אם מעל 3 שניות)"],
            ["זמן בעמוד", "setInterval כל 5 שניות", "1"],
            ["עומק גלילה", "IntersectionObserver ב-25%, 50%, 75%, 100%", "2 (ב-50%)"],
            ["לחיצה על אלמנט", "addEventListener('click') על כפתורים ולינקים", "3"],
            ["פוקוס על שדה טופס", "addEventListener('focus') על שדות טופס", "4"],
            ["מילוי שדה טופס", "addEventListener('input') על שדות טופס", "4"],
            ["שליחת ליד", "חיבור לזרימת שליחת טופס קיימת", "5"],
          ]
        ),

        heading("8.2 זרימת הקצאת חלופות", HeadingLevel.HEADING_2),
        para("כשמבקר נכנס לעמוד נחיתה:"),
        bullet("בדיקת cookie onoleads_id (כבר קיים במערכת)"),
        bullet("קריאה ל-Edge Function שמחזירה את שילוב החלופות (כ-30 אלפיות שנייה)"),
        bullet("אם המבקר כבר הוקצה בעבר — החזרת ההקצאה הקיימת"),
        bullet("אם מבקר חדש: 95% מקבלים את השילוב של עץ ההחלטות, 5% הקצאה אקראית"),
        bullet("סקריפט בצד הלקוח מחליף תוכן סקשנים לפי ההקצאה"),

        heading("8.3 מניעת הבהוב תוכן", HeadingLevel.HEADING_2),
        para("כדי למנוע מצב שבו המבקר רואה את תוכן ה-control לרגע לפני ההחלפה:"),
        bullet("Edge Function עם latency נמוך (כ-30 אלפיות שנייה)"),
        bullet("Cache הקצאה ב-cookie למבקרים חוזרים (אפס latency)"),
        bullet("לעמודים עם מנצח ברור — אפייה של המנצח ל-build הסטטי"),
        bullet("CSS opacity:0 על סקשנים שניתנים לחלופה עד שההקצאה נטענת, עם timeout כ-fallback"),

        // ── Section 9: Decision Tree ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("9. אלגוריתם עץ ההחלטות (Decision Tree)"),

        heading("9.1 מה זה עץ החלטות?", HeadingLevel.HEADING_2),
        para("עץ החלטות הוא מודל סטטיסטי שמחלק את המבקרים לקבוצות (סגמנטים) על בסיס מאפיינים כמו מקור הטראפיק, סוג המכשיר, יום בשבוע ועוד. לכל קבוצה, המודל מזהה את שילוב החלופות שמניב את הביצועים הטובים ביותר."),
        para("העץ מחושב לגמרי בצד השרת באמצעות שאילתות SQL בבסיס הנתונים — לא נדרש שירות ML חיצוני ולא נשלח מידע אישי לשום שירות חיצוני."),

        heading("9.2 פרמטרים לסגמנטציה", HeadingLevel.HEADING_2),
        simpleTable(
          ["פרמטר", "סוג", "ערכים לדוגמה", "מקור"],
          [
            ["utm_source", "קטגוריאלי", "facebook, google, instagram, direct", "פרמטרי URL"],
            ["utm_medium", "קטגוריאלי", "cpc, organic, social, email", "פרמטרי URL"],
            ["device_category", "קטגוריאלי", "mobile, desktop, tablet", "User agent"],
            ["day_of_week", "קטגוריאלי", "ראשון עד שבת", "זמן שרת"],
            ["hour_bucket", "קטגוריאלי", "בוקר, צהריים, ערב, לילה", "זמן שרת"],
            ["visit_number", "קטגוריאלי", "ביקור ראשון, שני, 3+", "היסטוריית cookie"],
            ["referrer_domain", "קטגוריאלי", "facebook.com, google.com, direct", "כותרת Referrer"],
          ]
        ),

        heading("9.3 אלגוריתם CHAID", HeadingLevel.HEADING_2),
        para("העץ משתמש בגישת CHAID (Chi-Squared Automatic Interaction Detection) — שיטה סטטיסטית שמחפשת את הפרמטר הכי משמעותי לפיצול בכל שלב:"),
        bullet("בכל צומת בעץ, בודקים כל פרמטר אפשרי ומחשבים Chi-Squared score"),
        bullet("בוחרים את הפרמטר עם ההבדל הסטטיסטי המשמעותי ביותר (p-value < 0.15)"),
        bullet("מפצלים את המבקרים לקבוצות לפי הפרמטר הנבחר"),
        bullet("חוזרים על התהליך רקורסיבית עד שאין פיצול משמעותי נוסף"),

        boldPara("פרמטרים קריטיים:"),
        bullet("עומק מקסימלי: מתחיל ב-1, עולה ל-2 אחרי 1,000 דגימות, ל-3 אחרי 5,000 דגימות"),
        bullet("מינימום דגימות בעלה: 30 מבקרים"),
        bullet("סף ודאות סטטיסטית: 85%"),

        heading("9.4 ניקוד חלופות — משקלות דינמיים", HeadingLevel.HEADING_2),
        para("לכל עלה בעץ, מחושב ציון ממושקל לכל שילוב חלופות. המשקלות משתנים בהתאם לכמות הנתונים:"),

        simpleTable(
          ["כמות מבקרים", "רמה 1 (זמן)", "רמה 2 (גלילה)", "רמה 3 (לחיצות)", "רמה 4 (טופס)", "רמה 5 (ליד)"],
          [
            ["פחות מ-100", "40%", "30%", "20%", "8%", "2%"],
            ["100 עד 500", "15%", "25%", "25%", "20%", "15%"],
            ["מעל 500", "5%", "10%", "15%", "25%", "45%"],
          ]
        ),
        para("ככל שיש יותר נתונים — המערכת נותנת משקל גבוה יותר להמרות קשות (שליחת ליד) ופחות לסיגנלים רכים (זמן בעמוד)."),

        heading("9.5 גיזום (Pruning)", HeadingLevel.HEADING_2),
        para("לאחר בניית העץ, נגזמים צמתים שלא תורמים מספיק:"),
        bullet("השיפור מעל השילוב הטוב ביותר של ההורה נמוך מ-5%"),
        bullet("עלה עם פחות מ-30 דגימות"),
        bullet("p-value של Chi-squared חורג מ-0.15"),

        // ── Section 10: Engagement Hierarchy ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("10. היררכיית מעורבות והתקדמות מטרות"),

        heading("10.1 הרעיון המרכזי", HeadingLevel.HEADING_2),
        para("לא תמיד יהיה מספיק לידים (המרות קשות) כדי לבצע אופטימיזציה סטטיסטית. הפתרון: מדרג של 5 רמות מעורבות, מהקלה ביותר (זמן בעמוד) לקשה ביותר (שליחת ליד). המערכת מתחילה לאפטם לרמות הנמוכות ומתקדמת אוטומטית לרמות גבוהות ככל שהנתונים מצטברים."),

        heading("10.2 חמש הרמות", HeadingLevel.HEADING_2),
        simpleTable(
          ["רמה", "סיגנל", "סף נתונים לאופטימיזציה", "הסבר"],
          [
            ["1", "זמן בעמוד מעל 3 שניות", "50 מבקרים לכל חלופה", "הסיגנל הנגיש ביותר"],
            ["2", "גלילה מעל 50% מהעמוד", "50 מבקרים לכל חלופה", "מראה עניין ממשי"],
            ["3", "לחיצה על אלמנט אינטראקטיבי", "100 מבקרים לכל חלופה", "אינטראקציה פעילה"],
            ["4", "פוקוס על שדה טופס", "200 מבקרים לכל חלופה", "כמעט המרה"],
            ["5", "שליחת ליד", "500 מבקרים לכל חלופה", "המטרה הסופית"],
          ]
        ),

        heading("10.3 לוגיקת התקדמות אוטומטית", HeadingLevel.HEADING_2),
        para("המערכת בודקת בכל חישוב: האם יש מספיק נתונים כדי להתקדם לרמה גבוהה יותר? אם כן — היא מתקדמת אוטומטית ובונה את העץ מחדש."),
        para("דוגמה מעשית:"),
        bullet("שבוע 1: מאפטמים לזמן בעמוד (רמה 1)"),
        bullet("שבוע 3: מתקדמים לגלילה (רמה 2)"),
        bullet("חודש 2: מתקדמים ללחיצות (רמה 3)"),
        bullet("חודש 3 ואילך: מאפטמים ישירות להמרות (רמה 5)"),

        // ── Section 11: Rebuild Triggers ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("11. תהליך חישוב מחדש — טריגרים ותזמון"),

        heading("11.1 שלושה טריגרים לבניית העץ מחדש", HeadingLevel.HEADING_2),
        para("העץ אינו נבנה רק פעם ביום. ישנם שלושה טריגרים:"),

        simpleTable(
          ["טריגר", "תנאי", "תזמון"],
          [
            ["מתוזמן (Scheduled)", "ריצה יומית קבועה", "כל יום ב-03:00 שעון ישראל"],
            ["סף טראפיק (Traffic Threshold)", "כמות מבקרים חדשים עוברת סף", "בדיקה כל שעה"],
            ["שינוי מטרה (Goal Change)", "רמת המטרה התקדמה", "מזוהה בבדיקה השעתית — מיידי"],
          ]
        ),

        heading("11.2 טריגר סף טראפיק", HeadingLevel.HEADING_2),
        para("כל שעה, המערכת בודקת כמה מבקרים חדשים הגיעו מאז בניית העץ האחרונה. הסף הוא: 20% גידול מעל הדגימה של העץ הנוכחי, מינימום 50 מבקרים חדשים."),

        heading("11.3 טריגר שינוי מטרה", HeadingLevel.HEADING_2),
        para("כשהמערכת מזהה שיש מספיק נתונים כדי להתקדם לרמת מטרה גבוהה יותר, היא בונה את העץ מחדש מיד. עץ שאופטם לגלילה לא בהכרח אופטימלי ללחיצות."),

        heading("11.4 מנגנוני בטיחות", HeadingLevel.HEADING_2),
        bullet("מינימום 20 מבקרים יומיים — עמודים עם פחות טראפיק מדולגים"),
        bullet("ולידציית holdout — בדיקה על 20% נתונים שלא נראו לפני פריסה"),
        bullet("שמירת 5 גרסאות עץ אחרונות — אפשרות חזרה ידנית"),
        bullet("Circuit breaker — עצירה אוטומטית אם ביצועים יורדים מעל 15% במשך 3 ימים"),
        bullet("5% מהטראפיק תמיד מקבל הקצאה אקראית"),
        bullet("מקסימום 3 בניות מחדש ביום לכל ניסוי"),

        // ── Section 12: Dashboard ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("12. ממשק ניהול בדשבורד"),

        heading("12.1 דפים חדשים", HeadingLevel.HEADING_2),
        simpleTable(
          ["נתיב", "מטרה"],
          [
            ["/dashboard/optimization", "סקירה כללית של כל הניסויים"],
            ["/dashboard/pages/[id]/variants", "ניהול חלופות לעמוד ספציפי"],
            ["/dashboard/pages/[id]/experiment", "הגדרה וניטור ניסוי A/B + עץ"],
            ["/dashboard/settings/ai", "הגדרת ספק AI ומגבלות עלות"],
            ["/dashboard/settings/brand", "העלאה/ניהול הנחיות מותג"],
            ["/dashboard/programs/[id]/docs", "העלאת מסמכי רקע לכל תוכנית"],
          ]
        ),

        heading("12.2 ממשק ניהול חלופות", HeadingLevel.HEADING_2),
        para("לכל סקשן בעמוד:"),
        bullet("סרגל טאבים: 'מקורי | A | B | C' — לחיצה מציגה תצוגה מקדימה"),
        bullet("כפתור 'צור עם AI' — בחירת סוג (טקסט/תמונה/שניהם) ובחירת ספק"),
        bullet("תצוגה מקדימה side-by-side של מקורי מול חלופה"),
        bullet("תג סטטוס עם כפתורי אישור/דחייה"),
        bullet("עריכה ידנית — תמיד אפשרית לפני אישור"),

        heading("12.3 דשבורד ניסויים", HeadingLevel.HEADING_2),
        bullet("סטטוס ניסוי (טיוטה / פעיל / מושהה / הושלם)"),
        bullet("רמת מטרה נוכחית + היסטוריית התקדמות"),
        bullet("גרף ביצועי חלופות"),
        bullet("ויזואליזציית עץ החלטות"),
        bullet("לוג בניות מחדש"),

        // ── Section 13: API ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("13. נקודות קצה API"),

        simpleTable(
          ["שיטה", "נתיב", "מטרה", "הרשאה"],
          [
            ["GET", "/api/variant-assignment", "קבלת שילוב חלופות למבקר", "ציבורי (Edge)"],
            ["POST", "/api/track", "שליחת אירועי מעורבות", "ציבורי"],
            ["POST", "/api/admin/variants/generate", "יצירת חלופה ב-AI", "אדמין"],
            ["GET/PUT", "/api/admin/variants/[id]", "קריאה/עדכון חלופה", "אדמין"],
            ["POST", "/api/admin/variants/[id]/approve", "אישור חלופה", "אדמין"],
            ["POST", "/api/admin/variants/[id]/reject", "דחיית חלופה", "אדמין"],
            ["GET/POST/PUT", "/api/admin/experiments/[id]", "CRUD לניסויים", "אדמין"],
            ["POST", "/api/admin/experiments/[id]/start", "התחלת ניסוי", "אדמין"],
            ["GET", "/api/admin/experiments/[id]/results", "תוצאות + עץ", "אדמין"],
            ["POST", "/api/admin/reference-docs/upload", "העלאת מסמך רקע", "אדמין"],
            ["POST", "/api/admin/brand-guidelines/upload", "העלאת הנחיות מותג", "אדמין"],
            ["POST", "/api/cron/recalculate-trees", "חישוב עצים יומי", "Cron secret"],
            ["POST", "/api/cron/check-rebuild-triggers", "בדיקת טריגרים שעתית", "Cron secret"],
          ]
        ),

        // ── Section 14: Risks ──
        new Paragraph({ children: [new PageBreak()] }),
        heading("14. ניהול סיכונים"),

        simpleTable(
          ["סיכון", "סבירות", "השפעה", "הקלה"],
          [
            ["אין מספיק נתונים", "גבוהה", "בינונית", "התחלה מסיגנלים רכים, fallback ל-A/B אקראי, איחוד נתונים מתוכניות דומות"],
            ["הבהוב תוכן בטעינה", "בינונית", "נמוכה", "Edge Function מהיר, cache ב-cookie, אפיית מנצח ב-ISR"],
            ["השפעה שלילית על המרות", "נמוכה", "גבוהה", "אישור אדמין חובה, 5% exploration, circuit breaker, rollback מיידי"],
            ["איכות עברית AI", "בינונית", "בינונית", "אדמין עורך ומאשר, הנחיות מותג כהקשר, 3 חלופות לבחירה"],
            ["גידול בסיס נתונים", "נמוכה", "נמוכה", "כ-2GB בשנה, partition לפי חודש, ארכוב מעל 90 ימים"],
            ["פרטיות", "נמוכה", "בינונית", "רק cookie_id (ללא מידע אישי) באירועים, עדכון מדיניות פרטיות"],
          ]
        ),

        // ═══════════════════════════════════════════════════════════
        //                    APPENDICES
        // ═══════════════════════════════════════════════════════════

        new Paragraph({ children: [new PageBreak()] }),
        heading("נספח א': סוגי סקשנים ואלמנטים שניתנים לבדיקה"),

        simpleTable(
          ["סוג סקשן", "שדות טקסט", "שדות תמונה"],
          [
            ["hero", "כותרת, תת-כותרת, CTA, תווית סטטיסטיקה", "תמונת רקע"],
            ["about", "כותרת, תיאור, נקודות", "תמונה"],
            ["benefits", "כותרת, כותרות + תיאורי פריטים", "אייקונים"],
            ["curriculum", "כותרת, פריטים", "—"],
            ["career", "כותרת, פריטים", "—"],
            ["faculty", "כותרת, תיאורי חברי סגל", "—"],
            ["stats", "ערכים + תוויות", "—"],
            ["testimonials", "כותרת, ציטוטים", "תמונות עדויות"],
            ["video", "כותרת, תיאור", "thumbnail"],
            ["faq", "כותרת, שאלות + תשובות", "—"],
            ["cta", "כותרת, תיאור, טקסט כפתור", "תמונת רקע"],
            ["admission", "כותרת, טקסט דרישות", "—"],
            ["gallery", "כותרת, כיתובים", "תמונות גלריה"],
            ["map", "כותרת, תיאור", "—"],
            ["countdown", "כותרת, תיאור", "—"],
            ["whatsapp", "טקסט הודעה", "—"],
            ["program_info_bar", "טקסטי תוויות", "—"],
            ["form", "כותרת, תת-כותרת, טקסט שליחה", "—"],
          ]
        ),

        new Paragraph({ children: [new PageBreak()] }),
        heading("נספח ב': מילון מונחים"),

        simpleTable(
          ["מונח", "הגדרה"],
          [
            ["Control", "תוכן הסקשן המקורי (ללא חלופה)"],
            ["Variant (חלופה)", "גרסה חלופית של תוכן סקשן (A, B, או C)"],
            ["Combo (שילוב)", "שילוב ספציפי של חלופות בכל סקשני העמוד"],
            ["Experiment (ניסוי)", "בדיקת A/B הרצה על עמוד ספציפי"],
            ["Engagement Level (רמת מעורבות)", "אחד מ-5 סיגנלים התנהגותיים היררכיים"],
            ["Goal Level (רמת מטרה)", "רמת המעורבות שמאפטמים לה כעת"],
            ["Exploration (חקירה)", "הצגת חלופות אקראיות לאיסוף נתונים (5% מהטראפיק)"],
            ["Exploitation (ניצול)", "הצגת השילוב המומלץ של עץ ההחלטות (95%)"],
            ["Decision Tree (עץ החלטות)", "מודל היררכי שממפה מאפייני מבקר לשילובי חלופות"],
            ["CHAID", "Chi-Squared Automatic Interaction Detection — שיטת בניית עץ"],
            ["Circuit Breaker", "מנגנון בטיחות שמשהה ניסוי כשביצועים יורדים"],
            ["ISR", "Incremental Static Regeneration — בנייה מחדש לפי דרישה"],
            ["SSG", "Static Site Generation — בניית עמודים סטטיים מראש"],
            ["Edge Function", "פונקציה שרצה קרוב למשתמש עם latency נמוך מאוד"],
          ]
        ),

        spacer(800),
        new Paragraph({
          children: [new TextRun({ text: "— סוף מסמך —", bold: true, size: 24, font: FONT_MAIN, rightToLeft: true, color: "9A969A" })],
          alignment: AlignmentType.CENTER, bidirectional: true,
        }),
        spacer(0, 200),
        para("מסמך זה ממתין לאישור מחלקת מערכות מידע לפני תחילת יישום."),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = "C:/code/onoleads/docs/ai-optimization-spec.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Word document created:", outPath);
}

main().catch(console.error);
