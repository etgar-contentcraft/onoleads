/**
 * Generates the IT Handover Word document (.docx) for Ono Academic College.
 * Formal Hebrew RTL document with step-by-step instructions for the IT department
 * to set up GitHub, Supabase, and Vercel infrastructure for OnoLeads.
 *
 * Run with: node docs/generate-it-handover.js
 * Output:   docs/onoleads-it-handover.docx
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, HeadingLevel, AlignmentType, BorderStyle, ShadingType,
  LevelFormat, Header, Footer, PageNumber, PageBreak
} = require("docx");
const fs = require("fs");

/* ────────── Constants ────────── */

const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const MARGIN_TOP = 1440;
const MARGIN_BOTTOM = 1440;
const MARGIN_LEFT = 1728;
const MARGIN_RIGHT = 1728;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const HEADER_FILL = "D5E8F0";
const ALT_ROW_FILL = "F5F8FA";
const ACCENT_FILL = "E8F5E9";

const FONT_MAIN = "David";
const FONT_CODE = "Consolas";
const FONT_SIZE_BODY = 22;
const FONT_SIZE_TABLE = 20;
const FONT_SIZE_CODE = 18;

/* ────────── Helpers ────────── */

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    children: [new TextRun({ text, font: FONT_MAIN, rightToLeft: true })],
    spacing: { before: 400, after: 200 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

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

function boldPara(text) {
  return para([new TextRun({ text, bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true })]);
}

function mixedPara(segments) {
  const runs = segments.map(seg => {
    if (typeof seg === "string") {
      return new TextRun({ text: seg, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true });
    }
    return new TextRun({ size: FONT_SIZE_BODY, font: seg.code ? FONT_CODE : FONT_MAIN, rightToLeft: !seg.code, ...seg });
  });
  return new Paragraph({
    children: runs,
    spacing: { after: 120 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    children: typeof text === "string"
      ? [new TextRun({ text, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true })]
      : text,
    numbering: { reference: "hebrewBullets", level },
    spacing: { after: 60 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

function numberedItem(text, level = 0) {
  return new Paragraph({
    children: typeof text === "string"
      ? [new TextRun({ text, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true })]
      : text,
    numbering: { reference: "hebrewNumbers", level },
    spacing: { after: 80 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
  });
}

function code(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: FONT_SIZE_CODE, font: FONT_CODE })],
    spacing: { after: 60 },
    shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
  });
}

function simpleTable(headers, rows, customWidths) {
  const colCount = headers.length;
  let columnWidths;
  if (customWidths) {
    columnWidths = customWidths;
  } else {
    const colWidth = Math.floor(CONTENT_WIDTH / colCount);
    columnWidths = Array(colCount).fill(colWidth);
    columnWidths[colCount - 1] = CONTENT_WIDTH - colWidth * (colCount - 1);
  }

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
    children: row.map((cell, colIdx) => {
      const cellContent = typeof cell === "string" ? cell : cell.text;
      const cellOpts = typeof cell === "string" ? {} : cell;
      const isCode = cellOpts.code;
      return new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: String(cellContent),
            size: isCode ? FONT_SIZE_CODE : FONT_SIZE_TABLE,
            font: isCode ? FONT_CODE : FONT_MAIN,
            rightToLeft: !isCode,
            bold: cellOpts.bold || false,
          })],
          alignment: isCode ? AlignmentType.LEFT : AlignmentType.RIGHT,
          bidirectional: !isCode,
        })],
        borders: BORDERS,
        width: { size: columnWidths[colIdx], type: WidthType.DXA },
        margins: CELL_MARGINS,
        shading: cellOpts.fill
          ? { type: ShadingType.CLEAR, fill: cellOpts.fill }
          : rowIdx % 2 === 1 ? { type: ShadingType.CLEAR, fill: ALT_ROW_FILL } : undefined,
      });
    }),
  }));

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths,
    visuallyRightToLeft: true,
  });
}

function spacer(before = 0, after = 200) {
  return new Paragraph({ spacing: { before, after } });
}

function separator() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
  });
}

function checkboxItem(text) {
  return new Paragraph({
    children: [new TextRun({ text: "\u2610  " + text, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true })],
    spacing: { after: 80 },
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    indent: { left: 360 },
  });
}

/* ────────── Document Content ────────── */

async function main() {
  const today = new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT_MAIN, size: FONT_SIZE_BODY, rightToLeft: true } },
      },
      paragraphStyles: [
        {
          id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 34, bold: true, font: FONT_MAIN, color: "1A237E" },
          paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 },
        },
        {
          id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: FONT_MAIN, color: "283593" },
          paragraph: { spacing: { before: 280, after: 180 }, outlineLevel: 1 },
        },
        {
          id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: FONT_MAIN, color: "4A4648" },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 },
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
        {
          reference: "hebrewNumbers",
          levels: [
            {
              level: 0, format: LevelFormat.DECIMAL, text: "%1.",
              alignment: AlignmentType.RIGHT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
            {
              level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.",
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
            children: [new TextRun({
              text: "המכללה האקדמית אונו  \u2014  הנחיות טכניות להקמת תשתית OnoLeads",
              size: 16, font: FONT_MAIN, color: "888888", rightToLeft: true,
            })],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 4 } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "עמוד ", size: 16, font: FONT_MAIN, rightToLeft: true, color: "888888" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT_MAIN, color: "888888" }),
            ],
            alignment: AlignmentType.CENTER,
            bidirectional: true,
          })],
        }),
      },
      children: [

        /* ═══════════════════════════════════════════════
           1. TITLE PAGE
           ═══════════════════════════════════════════════ */

        spacer(1200, 0),

        new Paragraph({
          children: [new TextRun({
            text: "המכללה האקדמית אונו",
            size: 44, bold: true, font: FONT_MAIN, rightToLeft: true, color: "1A237E",
          })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [new TextRun({
            text: "מחלקת מחשוב ומערכות מידע",
            size: 28, font: FONT_MAIN, rightToLeft: true, color: "555555",
          })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 600 },
        }),

        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1A237E", space: 4 } },
          spacing: { after: 600 },
        }),

        new Paragraph({
          children: [new TextRun({
            text: "הנחיות טכניות להקמת תשתית מערכת OnoLeads",
            size: 38, bold: true, font: FONT_MAIN, rightToLeft: true, color: "2A2628",
          })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 200 },
        }),

        new Paragraph({
          children: [new TextRun({
            text: "מערכת דפי נחיתה לקמפיינים אקדמיים",
            size: 26, font: FONT_MAIN, rightToLeft: true, color: "666666",
          })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { after: 800 },
        }),

        simpleTable(
          ["ערך", "שדה"],
          [
            [today, "תאריך"],
            ["אתגר, יועץ חיצוני", "מחבר"],
            ["שלומי, מנהל מחלקת המחשוב", "נמען"],
            ["1.0", "גרסה"],
            ["סודי \u2014 לשימוש פנימי בלבד", "סיווג"],
          ],
          [Math.floor(CONTENT_WIDTH * 0.65), Math.floor(CONTENT_WIDTH * 0.35)]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        /* ═══════════════════════════════════════════════
           2. INTRODUCTION
           ═══════════════════════════════════════════════ */

        heading("1. מבוא", HeadingLevel.HEADING_1),

        para("מסמך זה מפרט את ההנחיות הטכניות להקמת התשתית הנדרשת להפעלת מערכת OnoLeads \u2014 מערכת ליצירה וניהול של דפי נחיתה לקמפיינים שיווקיים של המכללה האקדמית אונו."),

        para("המערכת מאפשרת לצוות השיווק ליצור דפי נחיתה מותאמים אישית עבור תוכניות לימוד, אירועים וקמפיינים, בשלוש שפות (עברית, ערבית ואנגלית), כולל טפסי לידים, מעקב אנליטי, ומסכי תודה."),

        spacer(100, 100),

        heading("מה כולל המסמך", HeadingLevel.HEADING_2),
        bullet("סקירת ארכיטקטורת המערכת ושלושת שירותי הענן"),
        bullet("פירוט החבילות הנדרשות ועלויות חודשיות"),
        bullet("הנחיות מפורטות להגדרת חשבונות ותשתית"),
        bullet("הגדרת תת-דומיין (DNS) עבור pages.ono.ac.il"),
        bullet("פירוט ההרשאות הנדרשות ליועץ החיצוני"),
        bullet("משימות באחריות היועץ החיצוני (אתגר)"),
        bullet("הנחיות אבטחה ותחזוקה שוטפת"),

        spacer(200, 0),

        /* ═══════════════════════════════════════════════
           3. ARCHITECTURE OVERVIEW
           ═══════════════════════════════════════════════ */

        heading("2. סקירת ארכיטקטורה", HeadingLevel.HEADING_1),

        para("המערכת מבוססת על שלושה שירותי ענן שעובדים יחד:"),

        spacer(100, 0),

        simpleTable(
          ["תפקיד", "תיאור", "שירות"],
          [
            ["מאגר קוד", "מאחסן את קוד המערכת, מאפשר ניהול גרסאות ושיתוף פעולה", "GitHub"],
            ["אירוח ופריסה", "מארח את אתר האינטרנט ומפרסם אותו לציבור. פריסה אוטומטית מ-GitHub", "Vercel"],
            ["בסיס נתונים", "מאחסן תוכן דפים, הגדרות ונתוני אנליטיקס אנונימיים (ללא פרטים אישיים)", "Supabase"],
          ]
        ),

        spacer(200, 0),

        heading("זרימת המערכת", HeadingLevel.HEADING_2),
        para("כאשר משתמש גולש לכתובת pages.ono.ac.il:"),
        numberedItem("הבקשה מגיעה לשרת Vercel (דרך תת-הדומיין שהוגדר ב-DNS)"),
        numberedItem("Vercel מפעיל את אפליקציית Next.js ומגיש את דף הנחיתה"),
        numberedItem("הדף שולף נתונים מ-Supabase (תוכן, הגדרות, קמפיינים)"),
        numberedItem("כשמבקר ממלא טופס \u2014 הפרטים נשלחים ל-CRM חיצוני בלבד (webhook). פרטים אישיים לא נשמרים במערכת."),
        spacer(100, 0),
        para("כאשר מנהל עורך דף בממשק הניהול:"),
        numberedItem("השינויים נשמרים ישירות ב-Supabase"),
        numberedItem("המערכת שולחת בקשת רענון ל-Vercel לעדכון הדף הסטטי"),
        numberedItem("תוך שניות, הדף המעודכן זמין לציבור"),
        spacer(100, 0),
        para("כאשר מעדכנים קוד:"),
        numberedItem("הקוד נדחף (push) ל-GitHub"),
        numberedItem("Vercel מזהה את השינוי ומפרסם גרסה חדשה אוטומטית"),

        spacer(200, 0),

        /* ═══════════════════════════════════════════════
           4. PRICING
           ═══════════════════════════════════════════════ */

        heading("3. שירותים נדרשים ותמחור", HeadingLevel.HEADING_1),

        para("להלן פירוט החבילות הנדרשות בכל שירות:"),
        spacer(100, 0),

        simpleTable(
          ["כתובת", "עלות חודשית", "חבילה", "שירות"],
          [
            ["github.com", "חינם (Free) / $4 למשתמש (Team)", "Free / Team", "GitHub"],
            ["supabase.com", "$25 לחודש", "Pro", "Supabase"],
            ["vercel.com", "$20 לחודש", "Pro", "Vercel"],
          ],
          [Math.floor(CONTENT_WIDTH * 0.25), Math.floor(CONTENT_WIDTH * 0.28), Math.floor(CONTENT_WIDTH * 0.17), Math.floor(CONTENT_WIDTH * 0.30)]
        ),

        spacer(100, 0),

        para([
          new TextRun({ text: "עלות חודשית כוללת: ", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true, bold: true }),
          new TextRun({ text: "כ-$45 עד $50 לחודש", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true, bold: true, color: "1A237E" }),
        ]),

        spacer(100, 0),

        heading("הערות על החבילות", HeadingLevel.HEADING_3),
        bullet("GitHub \u2014 חבילת Free מספיקה לחלוטין. חבילת Team ($4/משתמש) מומלצת אם רוצים branch protection ותכונות ניהול צוות."),
        bullet("Supabase Pro \u2014 כולל 8GB בסיס נתונים, גיבויים יומיים אוטומטיים, ותמיכה מורחבת. החבילה הזו הכרחית לסביבת ייצור."),
        bullet("Vercel Pro \u2014 כולל bandwidth מוגבר, SSL אוטומטי, פריסה אוטומטית מ-GitHub, ותמיכה בדומיין מותאם אישית."),

        new Paragraph({ children: [new PageBreak()] }),

        /* ═══════════════════════════════════════════════
           5. IT DEPARTMENT RESPONSIBILITIES
           ═══════════════════════════════════════════════ */

        heading("4. באחריות מחלקת המחשוב \u2014 הגדרת חשבונות", HeadingLevel.HEADING_1),

        para("סעיף זה מפרט את כל הפעולות שעל מחלקת המחשוב לבצע. מומלץ לבצע את הפעולות לפי הסדר המוצג."),

        spacer(150, 0),

        /* ── 4.1 GitHub ── */

        heading("4.1 GitHub \u2014 מאגר קוד", HeadingLevel.HEADING_2),

        para("GitHub הוא שירות לניהול קוד מקור. יש להגדיר ארגון וריפוזיטורי (מאגר קוד) עבור המערכת."),
        spacer(100, 0),

        boldPara("שלבי הגדרה:"),
        numberedItem("גלשו ל-github.com והירשמו עם כתובת מוסדית (או השתמשו בחשבון קיים)"),
        numberedItem("צרו ארגון (Organization) חדש, לדוגמה: ono-academic"),
        numberedItem("בתוך הארגון, צרו ריפוזיטורי (Repository) חדש בשם: onoleads"),
        numberedItem([
          new TextRun({ text: "הגדירו את הריפוזיטורי כ-", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "Private", size: FONT_SIZE_BODY, font: FONT_MAIN, bold: true, rightToLeft: true }),
          new TextRun({ text: " (פרטי)", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),
        numberedItem([
          new TextRun({ text: "הזמינו את אתגר כ-Collaborator עם הרשאת ", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "Write", size: FONT_SIZE_BODY, font: FONT_MAIN, bold: true, rightToLeft: true }),
        ]),
        bullet([
          new TextRun({ text: "שם המשתמש של אתגר ב-GitHub: ", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "EtgarShpivak", size: FONT_SIZE_BODY, font: FONT_CODE, bold: true }),
        ], 1),

        spacer(200, 0),

        /* ── 4.2 Supabase ── */

        heading("4.2 Supabase \u2014 בסיס נתונים", HeadingLevel.HEADING_2),

        para("Supabase הוא שירות בסיס נתונים בענן (מבוסס PostgreSQL) הכולל אימות משתמשים, אחסון קבצים, ו-API אוטומטי."),
        spacer(100, 0),

        boldPara("שלבי הגדרה:"),
        numberedItem("גלשו ל-supabase.com והירשמו עם כתובת מוסדית"),
        numberedItem("צרו פרויקט חדש (New Project):"),
        bullet("שם: OnoLeads", 1),
        bullet("אזור (Region): eu-central-1 או האזור הקרוב ביותר לישראל", 1),
        bullet("צרו סיסמה חזקה לבסיס הנתונים ושמרו אותה במקום בטוח", 1),
        numberedItem("בחרו בחבילת Pro ($25 לחודש)"),
        numberedItem([
          new TextRun({ text: "לאחר יצירת הפרויקט, היכנסו ל-", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "Settings > API", size: FONT_SIZE_CODE, font: FONT_CODE }),
          new TextRun({ text: " ושמרו את הפרטים הבאים:", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(80, 0),

        simpleTable(
          ["הערות", "דוגמה", "שדה"],
          [
            ["כתובת ייחודית לפרויקט", "https://xxxxx.supabase.co", "Project URL"],
            ["מפתח ציבורי \u2014 ניתן לשים בקוד", "eyJhbGciOiJIUzI1NiIs...", "Anon Key"],
            ["מפתח סודי \u2014 אסור לחשוף!", "eyJhbGciOiJIUzI1NiIs...", "Service Role Key"],
          ]
        ),

        spacer(100, 0),

        para([
          new TextRun({ text: "\u26A0 חשוב: ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true, color: "CC0000" }),
          new TextRun({ text: "אין להעביר את ה-Service Role Key לגורם חיצוני. מפתח זה יוזן ישירות על ידי מחלקת המחשוב במשתני הסביבה של Vercel (ראו סעיף 4.5 להלן).", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(80, 0),

        numberedItem("הזמינו את אתגר כחבר צוות (Team Member) עם הרשאת Editor"),
        bullet("כניסה: Settings > Team > Invite Member", 1),

        spacer(200, 0),

        /* ── 4.3 Vercel ── */

        heading("4.3 Vercel \u2014 אירוח ופריסה", HeadingLevel.HEADING_2),

        para("Vercel הוא שירות אירוח אתרים מתקדם המתמחה באפליקציות Next.js. הוא מפרסם את האתר אוטומטית בכל עדכון קוד ב-GitHub."),
        spacer(100, 0),

        boldPara("שלבי הגדרה:"),
        numberedItem("גלשו ל-vercel.com והירשמו עם כתובת מוסדית"),
        numberedItem("צרו צוות (Team) חדש, לדוגמה: Ono Academic"),
        numberedItem("בחרו בחבילת Pro ($20 לחודש)"),
        numberedItem("חברו את חשבון GitHub:"),
        bullet("לחצו על \"Add GitHub Account\" ואשרו גישה לארגון שנוצר", 1),
        bullet("בחרו את הריפוזיטורי onoleads", 1),
        numberedItem("הזמינו את אתגר כחבר צוות (Team Member)"),
        numberedItem([
          new TextRun({ text: "(מומלץ) הפעילו ", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "Deployment Protection", size: FONT_SIZE_BODY, font: FONT_MAIN, bold: true, rightToLeft: true }),
          new TextRun({ text: ":", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),
        bullet("כניסה: Project Settings > Deployment Protection", 1),
        bullet("הגדרה: Vercel Authentication \u2014 רק חברי צוות יוכלו לצפות בטיוטות (Preview Deployments)", 1),

        spacer(100, 0),

        para([
          new TextRun({ text: "\u26A0 חשוב: ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true, color: "CC0000" }),
          new TextRun({ text: "אין לבצע Deploy (פריסה) בשלב זה. ראשית יש להזין את משתני הסביבה (ראו סעיף 4.5), ורק לאחר מכן אתגר יפעיל את הפריסה הראשונה.", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(100, 0),

        heading("תכונות אבטחה בחבילת Pro", HeadingLevel.HEADING_3),
        bullet("הגנת DDoS אוטומטית (כלולה)"),
        bullet("SSL/TLS אוטומטי (כלול)"),
        bullet("משתני סביבה מוצפנים \u2014 לאחר הזנה, הערך אינו גלוי לאף משתמש"),
        bullet("Deployment Protection \u2014 הגבלת גישה לטיוטות"),

        spacer(200, 0),

        /* ── 4.4 DNS ── */

        heading("4.4 DNS \u2014 הגדרת תת-דומיין pages.ono.ac.il", HeadingLevel.HEADING_2),

        para("יש לחבר את תת-הדומיין pages.ono.ac.il לשירות Vercel כדי שדפי הנחיתה יהיו נגישים בכתובת מוסדית."),
        spacer(100, 0),

        boldPara("שלבי הגדרה:"),
        numberedItem("בממשק Vercel, היכנסו להגדרות הפרויקט (Project Settings)"),
        numberedItem("בתפריט Domains, הוסיפו את הדומיין: pages.ono.ac.il"),
        numberedItem("Vercel יציג את רשומות ה-DNS הנדרשות. יש שתי אפשרויות:"),

        spacer(80, 0),

        simpleTable(
          ["ערך (Value)", "שם (Name)", "סוג", "אפשרות"],
          [
            ["cname.vercel-dns.com", "pages", "CNAME", "אפשרות א' (מומלצת)"],
            ["76.76.21.21", "pages", "A", "אפשרות ב'"],
          ]
        ),

        spacer(100, 0),

        numberedItem("הוסיפו את הרשומה המתאימה במערכת ניהול ה-DNS של ono.ac.il"),
        numberedItem("המתינו להפצת DNS (בדרך כלל 5-30 דקות)"),
        numberedItem("חזרו לממשק Vercel ווודאו שמופיע סימון ירוק ליד הדומיין"),

        spacer(100, 0),

        para([
          new TextRun({ text: "\u2713 ", size: FONT_SIZE_BODY, font: FONT_MAIN, color: "2E7D32" }),
          new TextRun({ text: "תעודת SSL (HTTPS): ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "Vercel מנפיק תעודת SSL אוטומטית ובחינם דרך Let's Encrypt. אין צורך לרכוש או להגדיר תעודה בנפרד.", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(200, 0),

        /* ── 4.5 Environment Variables ── */

        heading("4.5 הזנת משתני סביבה ב-Vercel (מפתחות)", HeadingLevel.HEADING_2),

        para([
          new TextRun({ text: "שלב זה קריטי לאבטחת המערכת. ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "מחלקת המחשוב תזין את מפתחות ה-Supabase ישירות בממשק Vercel, כך שהמפתחות הסודיים לעולם לא יעברו לגורם חיצוני.", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(80, 0),

        boldPara("שלבי הגדרה:"),
        numberedItem([
          new TextRun({ text: "בממשק Vercel, היכנסו ל-", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "Project Settings > Environment Variables", size: FONT_SIZE_CODE, font: FONT_CODE }),
        ]),
        numberedItem("הזינו את שלושת המשתנים הבאים (הערכים נלקחים מ-Supabase, סעיף 4.2):"),
        spacer(60, 0),

        simpleTable(
          ["מאיפה לקחת את הערך", "שם המשתנה"],
          [
            ["Settings > API > Project URL ב-Supabase", "NEXT_PUBLIC_SUPABASE_URL"],
            ["Settings > API > anon public ב-Supabase", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
            ["Settings > API > service_role secret ב-Supabase", "SUPABASE_SERVICE_ROLE_KEY"],
          ],
          [Math.floor(CONTENT_WIDTH * 0.55), Math.floor(CONTENT_WIDTH * 0.45)]
        ),

        spacer(80, 0),

        numberedItem([
          new TextRun({ text: "הזינו משתנה נוסף: ", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "NEXT_PUBLIC_SITE_URL", size: FONT_SIZE_CODE, font: FONT_CODE }),
          new TextRun({ text: " = ", size: FONT_SIZE_BODY, font: FONT_MAIN }),
          new TextRun({ text: "https://pages.ono.ac.il", size: FONT_SIZE_CODE, font: FONT_CODE }),
        ]),
        numberedItem([
          new TextRun({ text: "ודאו שכל משתנה מוגדר לכל הסביבות (Production, Preview, Development)", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(80, 0),

        para([
          new TextRun({ text: "\u2713 ", size: FONT_SIZE_BODY, font: FONT_MAIN, color: "2E7D32" }),
          new TextRun({ text: "יתרון אבטחתי: ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "לאחר הזנת הערכים, Vercel מצפין אותם. הערכים לא יהיו גלויים לאף משתמש (כולל אתגר) \u2014 ניתן רק לעדכן או למחוק.", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(80, 0),

        para([
          new TextRun({ text: "הערה: ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "משתנה נוסף (TOKEN_ENCRYPTION_KEY) ייווצר ויוזן על ידי אתגר. זהו מפתח ייחודי למערכת שאינו קשור ל-Supabase.", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        new Paragraph({ children: [new PageBreak()] }),

        /* ═══════════════════════════════════════════════
           6. PERMISSIONS
           ══════════════════════════════��════════════════ */

        heading("5. הרשאות גישה ליועץ החיצוני", HeadingLevel.HEADING_1),

        para("להלן פירוט ההרשאות שיש להעניק לאתגר בכל פלטפורמה, כולל ההסבר מדוע הרשאה זו נדרשת:"),
        spacer(100, 0),

        simpleTable(
          ["מטרה", "רמת גישה", "פלטפורמה"],
          [
            ["דחיפת קוד, ניהול ענפים, תחזוקה שוטפת", "Collaborator (Write)", "GitHub"],
            ["הרצת migrations, ניהול סכמה, מעקב אחר ביצועים", "Editor (חבר צוות)", "Supabase"],
            ["פריסה, הגדרת משתני סביבה, צפייה בלוגים", "Member (חבר צוות)", "Vercel"],
            ["ניהול דפי נחיתה, משתמשים, הגדרות מערכת", "Super Admin", "OnoLeads (דשבורד)"],
          ]
        ),

        spacer(100, 0),

        heading("אופן אימות הכניסה של אתגר", HeadingLevel.HEADING_2),
        para("הכניסה לדשבורד הניהול של OnoLeads תתבצע ללא סיסמה, באחד משני אופנים:"),
        spacer(60, 0),
        boldPara("אפשרות א' \u2014 קישור חד-פעמי (Magic Link):"),
        para("אתגר מזין את כתובת הדוא\"ל המוסדית שלו (ono.ac.il@), המערכת שולחת באופן אוטומטי קישור חד-פעמי למייל, ובלחיצה עליו הכניסה מתבצעת. התהליך אוטומטי לחלוטין ואינו דורש אישור מאף גורם."),
        spacer(60, 0),
        boldPara("אפשרות ב' \u2014 כניסה עם Microsoft (לעתיד):"),
        para("ניתן לחבר את מערכת האימות לחשבון Microsoft 365 המוסדי (Microsoft Entra ID). כך אתגר יוכל להיכנס בלחיצה על \"היכנס עם Microsoft\" \u2014 כמו הכניסה ל-Teams או Outlook. הגדרה זו דורשת רישום אפליקציה ב-Azure Portal וקבלת Client ID ו-Client Secret. ניתן להגדיר זאת בשלב מאוחר יותר."),
        spacer(60, 0),
        para([
          new TextRun({ text: "הערה: ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "משתמש המנהל של אתגר ייווצר פעם אחת בלבד על ידי אתגר עצמו במהלך ההפעלה הראשונית. מרגע זה הכניסה עצמאית לחלוטין ואינה דורשת התערבות או אישור ממחלקת המחשוב.", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(200, 0),

        /* ═══════════════════════════════════════════════
           7. ETGAR'S RESPONSIBILITIES
           ═══════════════════════════════════════════════ */

        heading("6. באחריות אתגר \u2014 העברה והפעלה", HeadingLevel.HEADING_1),

        para("לאחר שמחלקת המחשוב תשלים את הגדרת החשבונות והתשתית, אתגר יבצע את הפעולות הבאות:"),
        spacer(100, 0),

        heading("6.1 העברת קוד", HeadingLevel.HEADING_2),
        numberedItem("העלאת (Push) מלוא קוד המערכת לריפוזיטורי החדש ב-GitHub"),
        numberedItem("הגדרת בדיקות אוטומטיות (CI/CD) \u2014 בכל עדכון קוד, המערכת תריץ בדיקות אוטומטיות ותחסום פריסה אם נמצאו שגיאות"),

        heading("6.2 הגדרת בסיס נתונים", HeadingLevel.HEADING_2),
        numberedItem("הרצת קובץ SQL מאוחד שמכיל את מלוא מבנה בסיס הנתונים (טבלאות, פונקציות, מדיניות אבטחה, ונתונים התחלתיים)"),
        numberedItem("אימות שכל הטבלאות והפונקציות נוצרו כנדרש"),
        numberedItem([
          new TextRun({ text: "הגדרת כתובות מאושרות לאימות (Redirect URLs): ", bold: true, size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
          new TextRun({ text: "כשמשתמש לוחץ על קישור הכניסה במייל, הוא מועבר חזרה לאתר. יש להגדיר ב-Supabase שהכתובת pages.ono.ac.il מאושרת לקבלת העברות אלו (מנגנון אבטחה למניעת הפניות לאתרים זדוניים).", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        heading("6.3 השלמת הגדרות ב-Vercel", HeadingLevel.HEADING_2),
        para("מחלקת המחשוב תזין את מפתחות Supabase ב-Vercel (ראו סעיף 4.5). אתגר ישלים את ההגדרה עם משתנה נוסף:"),
        bullet([
          new TextRun({ text: "TOKEN_ENCRYPTION_KEY", size: FONT_SIZE_CODE, font: FONT_CODE }),
          new TextRun({ text: " \u2014 מפתח הצפנה ייחודי (64 תווים hex) להצפנת טוקני פיקסלים. אתגר ייצור ויזין משתנה זה.", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),

        spacer(100, 0),

        heading("6.4 פריסה ראשונה ובדיקות", HeadingLevel.HEADING_2),
        numberedItem("עדכון כותרות CSP בקוד המקור עם הדומיין החדש"),
        numberedItem("הפעלת פריסה ראשונה (First Deploy) ב-Vercel"),
        numberedItem("יצירת משתמש מנהל ראשון עם כתובת דוא\"ל מוסדית של אתגר"),
        numberedItem("יצירת משתמשים נוספים לפי דרישת מחלקת המחשוב"),
        numberedItem([
          new TextRun({ text: "ביצוע QA מלא: ", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true, bold: true }),
          new TextRun({ text: "בדיקת כל 27 סוגי הסקציות, טפסי לידים, פיקסלי אנליטיקס, פופאפים ומסכי תודה", size: FONT_SIZE_BODY, font: FONT_MAIN, rightToLeft: true }),
        ]),
        numberedItem("הדרכה לעורכי תוכן (אם נדרש)"),

        spacer(200, 0),

        /* ═══════════════════════════════════════════════
           8. SECURITY & MAINTENANCE
           ═══════════════════════════════════════════════ */

        heading("7. אבטחה ותחזוקה", HeadingLevel.HEADING_1),

        para("המערכת תוכננה בגישת פרטיות-ראשונה (Privacy-First): פרטים אישיים של מבקרים (שם, טלפון, מייל) לא נשמרים בבסיס הנתונים אלא נשלחים ישירות ל-CRM חיצוני בלבד. במערכת נשמרים רק נתוני אנליטיקס אנונימיים."),
        spacer(100, 0),
        para("שכבות אבטחה נוספות:"),
        spacer(100, 0),

        simpleTable(
          ["מימוש", "שכבת אבטחה"],
          [
            ["מפתחות מוזנים ישירות ע\"י IT ב-Vercel. מוצפנים ולא גלויים לאף משתמש. לעולם לא בקוד.", "ניהול סודות"],
            ["מדיניות Row Level Security (RLS) על כל הטבלאות ב-Supabase", "הרשאות בסיס נתונים"],
            ["HTTPS מאולץ עם HSTS, תעודת SSL אוטומטית", "הצפנת תעבורה"],
            ["30 דקות ללא פעילות = ניתוק אוטומטי", "timeout לסשן"],
            ["Content Security Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy", "כותרות אבטחה (Headers)"],
            ["לוג אוטומטי של כל פעולות הניהול", "יומן ביקורת (Audit Log)"],
            ["גיבוי יומי אוטומטי בחבילת Pro", "גיבויים (Supabase)"],
            ["4 שכבות: טוקן מוצפן, ניתוח התנהגות, Honeypot, השהיית סשן", "הגנה מפני בוטים"],
          ],
          [Math.floor(CONTENT_WIDTH * 0.65), Math.floor(CONTENT_WIDTH * 0.35)]
        ),

        spacer(200, 0),

        /* ═══════════════════════════════════════════════
           9. SUMMARY & CHECKLIST
           ═══════════════════════════════════════════════ */

        heading("8. סיכום ולוח זמנים", HeadingLevel.HEADING_1),

        heading("זמנים משוערים", HeadingLevel.HEADING_2),

        simpleTable(
          ["זמן משוער", "גורם"],
          [
            ["1-2 שעות", "מחלקת המחשוב (הגדרת חשבונות + DNS)"],
            ["2-3 שעות", "אתגר (העברת קוד + מיגרציות + QA)"],
          ]
        ),

        spacer(150, 0),

        heading("רשימת תיוג (Checklist) \u2014 מחלקת מחשוב", HeadingLevel.HEADING_2),

        checkboxItem("GitHub: יצירת ארגון וריפוזיטורי פרטי"),
        checkboxItem("GitHub: הזמנת אתגר כ-Collaborator"),
        checkboxItem("Supabase: פתיחת חשבון ופרויקט (חבילת Pro)"),
        checkboxItem("Supabase: שמירת Project URL, Anon Key, Service Role Key"),
        checkboxItem("Supabase: הזמנת אתגר כ-Editor"),
        checkboxItem("Vercel: פתיחת חשבון וצוות (חבילת Pro)"),
        checkboxItem("Vercel: חיבור GitHub ובחירת ריפוזיטורי"),
        checkboxItem("Vercel: הזמנת אתגר כחבר צוות"),
        checkboxItem("Vercel: הפעלת Deployment Protection"),
        checkboxItem("Vercel: הזנת 4 משתני סביבה (מפתחות Supabase + כתובת אתר)"),
        checkboxItem("DNS: הוספת רשומת CNAME/A עבור pages.ono.ac.il"),
        checkboxItem("DNS: אימות סימון ירוק ב-Vercel"),

        spacer(200, 0),

        heading("רשימת תיוג (Checklist) \u2014 אתגר", HeadingLevel.HEADING_2),

        checkboxItem("העלאת קוד ל-GitHub"),
        checkboxItem("הגדרת CI/CD (בדיקות אוטומטיות)"),
        checkboxItem("הרצת קובץ SQL מאוחד ב-Supabase"),
        checkboxItem("הגדרת כתובות מאושרות לאימות (Redirect URLs)"),
        checkboxItem("הגדרת משתני סביבה ב-Vercel"),
        checkboxItem("עדכון CSP בקוד המקור"),
        checkboxItem("פריסה ראשונה"),
        checkboxItem("יצירת משתמש מנהל"),
        checkboxItem("QA מלא"),
        checkboxItem("הדרכה"),

        spacer(300, 0),

        separator(),

        spacer(100, 0),

        new Paragraph({
          children: [new TextRun({
            text: "מסמך זה הופק אוטומטית. לשאלות או הבהרות, נא לפנות לאתגר.",
            size: 18, font: FONT_MAIN, rightToLeft: true, color: "888888", italics: true,
          })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
        }),

      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = "docs/onoleads-it-handover.docx";
  fs.writeFileSync(outPath, buffer);
  console.log(`\u2713 Generated ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
