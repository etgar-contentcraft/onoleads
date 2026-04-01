/**
 * Help & Documentation page — full reference of all system capabilities.
 * Designed for marketing team members who are new to the admin panel.
 */
"use client";

import { useState } from "react";
import {
  FileText, Users, BarChart3, Settings, Globe, ShieldCheck,
  Search, ImageIcon, BookOpen, ChevronDown, ChevronUp,
  Zap, Target, Eye, Edit3, Layers, TrendingUp, Code2, Copy, Check
} from "lucide-react";

interface HelpSection {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  features: {
    name: string;
    description: string;
    tip?: string;
  }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "builder",
    icon: Edit3,
    title: "בילדר דפי נחיתה",
    description: "כלי הליבה לבניית ועריכת עמודי נחיתה. גרירה, שינוי סדר, הסתרה — הכל ב-UI ויזואלי.",
    color: "bg-lime-50 text-lime-700 border-lime-200",
    features: [
      {
        name: "הוספת סקציות",
        description: "לחצו על כל סוג סקציה בלוח הצד הימני כדי להוסיפה לתחתית הדף. ניתן להוסיף אותה כמה פעמים.",
      },
      {
        name: "שינוי סדר",
        description: "גרור את ידית ה-⠿ (שמאל לכל שורה) כדי לשנות את סדר הסקציות בדף.",
      },
      {
        name: "הסתרת סקציה",
        description: "לחצו על אייקון העין בכרטיס הסקציה כדי להסתירה מהמבקרים — הסקציה נשמרת אך לא מוצגת.",
      },
      {
        name: "עריכת תוכן",
        description: "לחצו על אייקון העיפרון כדי לפתוח את עורך התוכן של הסקציה. כל שדה ניתן לעריכה.",
      },
      {
        name: "שכפול סקציה",
        description: "לחצו על אייקון הקופיה כדי לשכפל סקציה קיימת עם כל התוכן שלה.",
      },
      {
        name: "Dynamic Text (DTR)",
        description: "השתמשו ב-{{utm_source}}, {{utm_campaign}} וכו' בכותרות ותיאורים — הטקסט יוחלף אוטומטית לפי UTM params של המבקר.",
        tip: "דוגמה: כותרת \"קורס מ-{{utm_source|Google}}\" תוצג כ-\"קורס מ-Facebook\" למבקר עם utm_source=Facebook",
      },
      {
        name: "היסטוריית גרסאות",
        description: "לחצו על אייקון השעון בטופבר לצפות ב-20 הגרסאות האחרונות של הדף ולשחזר כל אחת מהן.",
        tip: "גרסה נשמרת אוטומטית לפני כל שמירה — אין צורך בפעולה ידנית",
      },
      {
        name: "הגדרות עמוד",
        description: "לחצו 'הגדרות עמוד' לפתח אפשרויות ייחודיות לכל עמוד: exit intent popup, social proof toast, webhook, מספר טלפון, לוגו מותאם, ועמוד תודה.",
      },
      {
        name: "כותרות וקריאה לפעולה מותאמות",
        description: "כל סקשן מאפשר עריכת כותרת וטקסט כפתור CTA בעברית ובאנגלית. ניתן להסתיר את הכפתור לחלוטין או לבחור אייקון מתאים.",
      },
      {
        name: "סרטון רקע",
        description: "ניתן להוסיף סרטון MP4 כרקע לסקשן Hero. הסרטון מופעל אוטומטית ללא סאונד בלופ.",
      },
      {
        name: "כותרת סרגל עליון",
        description: "ניתן להגדיר כותרת מקוצרת שתוצג בסרגל העליון הנעוץ. אם לא מוגדרת — שם העמוד המלא יוצג.",
      },
    ],
  },
  {
    id: "sections",
    icon: Layers,
    title: "סוגי סקציות",
    description: "18 סוגי סקציות שניתן לשלב בכל דף נחיתה.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    features: [
      { name: "Hero", description: "כותרת ראשית עם רקע, כותרת משנה, CTA, וסטטיסטיקה מונפשת." },
      { name: "אודות", description: "שני עמודות: טקסט + תמונה, עם נקודות USP ב-checkmarks." },
      { name: "יתרונות", description: "כרטיסיות יתרונות מונפשות — מה מבדל את התוכנית." },
      { name: "סטטיסטיקות", description: "מספרים גדולים עם הנפשת ספירה — אחוזי תעסוקה, מספר בוגרים וכו'." },
      { name: "תוכנית לימודים", description: "אקורדיון לפי שנים/סמסטרים — מצוין ל-SEO." },
      { name: "קריירה", description: "תפקידים נפוצים של בוגרים + ציטוטים." },
      { name: "סגל", description: "רשת כרטיסיות אנשי סגל עם תמונה, תואר, ומוסד." },
      { name: "המלצות", description: "ציטוטים מסטודנטים בוגרים עם שם, תוכנית, ותמונה." },
      { name: "שאלות נפוצות", description: "אקורדיון FAQ עם JSON-LD schema אוטומטי לגוגל ו-AI." },
      { name: "וידאו", description: "נגן YouTube — ראשי + רשת סרטונים נוספים." },
      { name: "גלריה", description: "פסיפס תמונות לקמפוס, אירועים, חיי סטודנטים." },
      { name: "ספירה לאחור", description: "טיימר evergreen (מתאפס לכל מבקר) או קבוע לתאריך — יוצר דחיפות." },
      { name: "קריאה לפעולה", description: "CTA גדול ומרשים לתחתית הדף." },
      { name: "מפה", description: "כתובת + embed של Google Maps." },
    ],
  },
  {
    id: "conversions",
    icon: Target,
    title: "כלי המרות",
    description: "פיצ'רים לבניית אמון ודחיפת המבקר להשאיר פרטים.",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    features: [
      {
        name: "Exit Intent Popup",
        description: "פופאפ שמופיע כשהמבקר מנסה לעזוב (עכבר עוזב המסך למעלה), או אחרי גלילה חזרה למעלה במובייל.",
        tip: "כבוי כברירת מחדל — הפעל בהגדרות עמוד תחת 'המרות'",
      },
      {
        name: "Social Proof Toast",
        description: "toast בתחתית המסך: \"23 אנשים נרשמו לתוכנית זו השבוע\" — מביא נתונים בזמן אמת מה-DB.",
        tip: "כבוי כברירת מחדל — הפעל בהגדרות עמוד, ניתן לשנות את חלון הימים",
      },
      {
        name: "Sticky Mobile Header",
        description: "כותרת נצמדת עם כפתור CTA ומספר טלפון שמופיעה בזמן גלילה — מעלה המרות במובייל.",
      },
      {
        name: "WhatsApp Floating Button",
        description: "כפתור WhatsApp צף עם הודעה מותאמת אישית — הוסיפו סקציית WhatsApp לדף.",
      },
      {
        name: "טופס לידים (CTA Modal)",
        description: "טופס 3 שדות (שם, טלפון, אימייל) שנפתח בלחיצה על כל כפתור CTA בדף. שולח ל-webhook ול-Supabase.",
      },
      {
        name: "ספירה לאחור (Countdown)",
        description: "טיימר evergreen: מתאפס ל-X ימים לכל מבקר חדש (מבוסס sessionStorage). טיימר קבוע: קובעים תאריך.",
      },
    ],
  },
  {
    id: "leads",
    icon: Users,
    title: "לידים",
    description: "כל ליד שנשמר דרך הטפסים — עם פרטים מלאים ו-UTM attribution.",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    features: [
      {
        name: "רשימת לידים",
        description: "כל הלידים מכל הדפים — עם שם, טלפון, אימייל, תוכנית, עמוד מקור, ומקור UTM.",
      },
      {
        name: "UTM Attribution",
        description: "כל ליד מתועד עם utm_source, utm_medium, utm_campaign, utm_content, utm_term ו-referrer.",
      },
      {
        name: "ייצוא CSV",
        description: "לחצו 'ייצוא CSV' לקבלת קובץ Excel עם כל הלידים.",
      },
      {
        name: "Webhook ל-CRM",
        description: "הגדירו webhook URL בהגדרות (גלובלי או לכל עמוד בנפרד) — כל ליד נשלח ב-real-time ל-Make.com / Zapier.",
      },
      {
        name: "עמוד תודה",
        description: "לאחר שליחת הטופס המבקר מנותב לעמוד תודה מותאם אישית — הגדרות בבילדר תחת 'הגדרות עמוד'.",
      },
    ],
  },
  {
    id: "global-sections",
    icon: Globe,
    title: "סקציות גלובליות",
    description: "בלוקים משותפים שמופיעים בכמה עמודים — ערוך פעם אחת ויתעדכן בכולם.",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    features: [
      {
        name: "יצירת סקציה גלובלית",
        description: "עברו לסקציות גלובליות > לחצו 'סקציה גלובלית חדשה' > בחרו סוג ותוכן.",
      },
      {
        name: "שימוש בדף",
        description: "כרגע ניתן לקשר סקציה גלובלית דרך הDB. עדכון עתידי יוסיף טאב 'גלובלי' לבילדר.",
      },
      {
        name: "עריכה גלובלית",
        description: "שינוי בסקציה גלובלית מתעדכן מיידית בכל הדפים שמשתמשים בה.",
      },
      {
        name: "ניתוק",
        description: "ניתן למחוק את הסקציה הגלובלית — הדפים שהשתמשו בה ישמרו עם התוכן האחרון שלה.",
      },
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "אנליטיקס",
    description: "נתוני ביצועים ראשוניים (first-party) — ללא תלות ב-Google Analytics.",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    features: [
      {
        name: "צפיות בעמוד",
        description: "מספר כניסות לכל עמוד נחיתה, לפי יום.",
      },
      {
        name: "התחלות טופס",
        description: "כמה מבקרים לחצו על כפתור CTA (פתחו את הטופס).",
      },
      {
        name: "שליחות טופס",
        description: "כמה מבקרים השלימו שליחת ליד — שיעור המרה לפי עמוד.",
      },
      {
        name: "Google Analytics + Facebook Pixel",
        description: "הגדירו ID בהגדרות הכלליות — יופעל אוטומטית על כל עמוד. ניתן גם להגדיר per-page.",
      },
    ],
  },
  {
    id: "seo",
    icon: Search,
    title: "SEO ו-AI Visibility",
    description: "כל דף נחיתה מגיע עם אופטימיזציה מובנית לגוגל ולמנועי AI.",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    features: [
      {
        name: "JSON-LD Schemas",
        description: "כל דף מייצר Course schema, FAQPage schema, ו-Organization schema אוטומטית.",
      },
      {
        name: "Open Graph & Twitter Cards",
        description: "תגי OG לשיתוף ב-social — כותרת, תיאור, ותמונה.",
      },
      {
        name: "SEO Title & Description",
        description: "הגדירו כותרת SEO ותיאור מותאמים בהגדרות הדף.",
      },
      {
        name: "FAQ Section = AI Citations",
        description: "סקציית FAQ מגדילה פי 3.2 את הסיכוי שמנועי AI (ChatGPT, Gemini) יציינו את הדף.",
      },
    ],
  },
  {
    id: "dtr",
    icon: Zap,
    title: "טקסט דינמי (DTR)",
    description: "הטמעת משתני UTM ישירות בתוכן הדף — לפרסונליזציה לפי מקור תנועה.",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    features: [
      {
        name: "טקסט דינמי (DTR) — מדריך מלא",
        description: "התאמת תוכן אוטומטית לפי UTM parameters. השתמשו ב-{{utm_source}}, {{utm_campaign}} וכו' בכל שדה טקסט. הוסיפו fallback עם תו |, למשל: {{utm_source|Google}}. לחצו על 'מדריך מפורט' ליד כל שדה טקסט דינמי לקבלת הנחיות מפורטות.",
        tip: "משתנים זמינים: utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer. דוגמה: כותרת 'קורס מ-{{utm_source|אונו}}' תוצג כ-'קורס מ-Facebook' למבקר עם utm_source=Facebook",
      },
      {
        name: "שימוש",
        description: "כתבו {{utm_source}} בכל שדה טקסט בבילדר — יוחלף אוטומטית.",
      },
      {
        name: "Fallback",
        description: "{{utm_source|Google}} → אם אין UTM, יוצג 'Google' כברירת מחדל.",
      },
      {
        name: "משתנים נתמכים",
        description: "utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer",
      },
      {
        name: "דוגמה",
        description: "כותרת: \"לימוד {{utm_campaign|מנהל עסקים}} באונו\" → לבקור מ-utm_campaign=MBA יוצג: \"לימוד MBA באונו\"",
        tip: "DTR פועל בכל שדה טקסט — כותרות, תיאורים, טקסט כפתורים, bullets וכו'",
      },
    ],
  },
  {
    id: "versions",
    icon: Eye,
    title: "גרסאות ו-Rollback",
    description: "כל שמירה בבילדר נשמרת כגרסה — ניתן לשחזר כל גרסה מ-20 האחרונות.",
    color: "bg-slate-50 text-slate-700 border-slate-200",
    features: [
      {
        name: "שמירה אוטומטית",
        description: "לפני כל לחיצה על שמור — הגרסה הנוכחית נשמרת אוטומטית. אין צורך בפעולה ידנית.",
      },
      {
        name: "צפייה בהיסטוריה",
        description: "לחצו על אייקון השעון בטופבר הבילדר — תראו רשימה של עד 20 גרסאות אחרונות.",
      },
      {
        name: "שחזור גרסה",
        description: "לחצו 'שחזר גרסה זו' ← הגרסה הנוכחית תישמר ← ואז התוכן ישוחזר לגרסה שנבחרה.",
      },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "הגדרות מערכת",
    description: "הגדרות גלובליות שמשפיעות על כל הדפים — אלא אם עמוד ספציפי מגדיר override.",
    color: "bg-gray-50 text-gray-700 border-gray-200",
    features: [
      {
        name: "Webhook כללי",
        description: "URL לשליחת לידים ל-Make.com / Zapier / CRM — פועל על כל הדפים.",
      },
      {
        name: "מספר WhatsApp & טלפון",
        description: "מספרי ברירת מחדל לכפתורי WhatsApp ו-Sticky Header.",
      },
      {
        name: "Google Analytics ID",
        description: "מזהה GA4 שיוטען על כל הדפים. ניתן לדרוס per-page.",
      },
      {
        name: "Facebook Pixel",
        description: "Pixel ID שיוטען על כל הדפים. ניתן לדרוס per-page.",
      },
    ],
  },
  {
    id: "audit",
    icon: ShieldCheck,
    title: "יומן ביקורת",
    description: "תיעוד מלא של כל פעולות המנהלים במערכת.",
    color: "bg-red-50 text-red-700 border-red-200",
    features: [
      {
        name: "תיעוד פעולות",
        description: "כל פעולה — יצירת דף, מחיקה, עריכת תוכן, שינוי הגדרות — מתועדת עם תאריך ומשתמש.",
      },
      {
        name: "סינון",
        description: "ניתן לסנן לפי סוג פעולה, עמוד ספציפי, או טווח תאריכים.",
      },
    ],
  },
  {
    id: "media",
    icon: ImageIcon,
    title: "ספריית מדיה",
    description: "ניהול כל קבצי המדיה — תמונות, לוגואים, תמונות רקע.",
    color: "bg-pink-50 text-pink-700 border-pink-200",
    features: [
      {
        name: "העלאת תמונות",
        description: "גרור ושחרר או לחץ להעלאה — שמירה ב-Supabase Storage.",
      },
      {
        name: "שימוש בבילדר",
        description: "בכל שדה תמונה בעורכי הסקציות — ניתן להשתמש ב-URL ישיר מהספרייה.",
      },
    ],
  },
  {
    id: "cta-best-practices",
    icon: Target,
    title: "שיטות עבודה מומלצות — קריאה לפעולה",
    description: "טיפים ליצירת כפתורי CTA אפקטיביים בעברית.",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    features: [
      {
        name: "כיוון חץ בעברית",
        description: "בממשק עברי, חצים מצביעים שמאלה (← כיוון ההתקדמות). המערכת מטפלת בזה אוטומטית.",
      },
      {
        name: "טקסט קצר וישיר",
        description: "2-4 מילים מספיקות. השתמשו בפועל ציווי: 'השאירו פרטים', 'הצטרפו', 'גלו עוד'.",
      },
      {
        name: "אייקון מתאים",
        description: "בחרו אייקון שמתאים לפעולה: חץ ל'גלו עוד', טלפון ל'התקשרו', מנעול ל'הרשמה מאובטחת'. או השאירו ללא אייקון.",
      },
      {
        name: "לא כל סקשן צריך כפתור",
        description: "ניתן לכבות את כפתור ה-CTA בסקשנים מסוימים (כמו גלריה, סטטיסטיקות) כדי לא להעמיס. השתמשו במתג 'הצג כפתור קריאה לפעולה'.",
      },
      {
        name: "בדיקה בנייד",
        description: "כפתורי CTA צריכים להיות גדולים מספיק ללחיצה בנייד (מינימום 48x48px). המערכת מטפלת בזה אוטומטית.",
      },
    ],
  },
  {
    id: "languages",
    icon: Globe,
    title: "שפות וכיוון טקסט",
    description: "תמיכה בעברית (RTL), אנגלית (LTR) וערבית (RTL).",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    features: [
      {
        name: "עברית וערבית — RTL",
        description: "בשפות אלו כל הממשק והעמוד מוצגים מימין לשמאל. חצי CTA מצביעים שמאלה.",
      },
      {
        name: "אנגלית — LTR",
        description: "כשהעמוד מוגדר כאנגלית, כל הטקסטים מיושרים שמאלה וחצים מצביעים ימינה.",
      },
      {
        name: "שדות כפולים",
        description: "כל שדה טקסט (כותרת, תיאור, CTA) ניתן להזנה בעברית ובאנגלית. השפה שנבחרה בהגדרות העמוד קובעת מה מוצג.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// JSON Guide section
// ---------------------------------------------------------------------------

const JSON_EXAMPLES = [
  {
    id: "benefits",
    title: "יתרונות (benefits)",
    description: "כרטיסיות יתרון — כותרת + תיאור + אייקון",
    prompt: `צור JSON של 5 יתרונות ללימודי משפטים באוניברסיטה.
הפורמט הוא:
[{"title_he": "כותרת", "description_he": "תיאור קצר של 1-2 משפטים", "icon": "⚖️"}, ...]`,
    example: `[
  {
    "title_he": "מסלולים גמישים",
    "description_he": "לימוד בימים ובשעות שמתאימים לך — גם בשעות הערב.",
    "icon": "🕐"
  },
  {
    "title_he": "הכרה מהמשפחה המשפטית",
    "description_he": "בוגרי הפקולטה מובילים בבתי משפט, חברות הייטק ומשרדי ממשלה.",
    "icon": "⚖️"
  }
]`,
  },
  {
    id: "stats",
    title: "סטטיסטיקות (stats)",
    description: "מספרים בולטים עם תווית",
    prompt: `צור JSON של 4 נתונים סטטיסטיים מרשימים ללימודי [שם תוכנית].
הפורמט: [{"value": "95%", "label_he": "שיעור תעסוקה", "icon": "📈"}, ...]`,
    example: `[
  {"value": "95%", "label_he": "שיעור תעסוקה בתוך שנה", "icon": "📈"},
  {"value": "3,500+", "label_he": "בוגרים פעילים", "icon": "👩‍💼"},
  {"value": "20+", "label_he": "שנות ניסיון", "icon": "🏆"},
  {"value": "#1", "label_he": "מכללה מומלצת בישראל", "icon": "⭐"}
]`,
  },
  {
    id: "faq",
    title: "שאלות נפוצות (faq)",
    description: "FAQ — שאלה + תשובה",
    prompt: `צור JSON של 6 שאלות נפוצות ללימודי [שם תוכנית].
הפורמט: [{"question_he": "שאלה?", "answer_he": "תשובה מפורטת של 2-3 משפטים."}, ...]`,
    example: `[
  {
    "question_he": "מהי משך הלימודים?",
    "answer_he": "התוכנית נמשכת 4 שנים (8 סמסטרים). ניתן ללמוד בקצב מוגבר ולסיים ב-3.5 שנים."
  },
  {
    "question_he": "האם ניתן ללמוד בערב?",
    "answer_he": "כן — כל הקורסים מתקיימים גם בשעות הערב. ניתן לשלב עם עבודה מלאה."
  }
]`,
  },
  {
    id: "testimonials",
    title: "המלצות (testimonials)",
    description: "ציטוטים מסטודנטים — שם + ציטוט + תפקיד + תמונה",
    prompt: `צור JSON של 3 המלצות מסטודנטים בוגרי [שם תוכנית].
הפורמט: [{"name_he": "שם", "quote_he": "ציטוט", "title_he": "תפקיד/תוכנית", "image_url": ""}, ...]`,
    example: `[
  {
    "name_he": "מיכל כהן",
    "quote_he": "הלימודים פתחו לי דלתות שלא ידעתי שקיימות. היום אני עורכת דין בחברה ציבורית.",
    "title_he": "בוגרת המחלקה למשפטים, 2022",
    "image_url": ""
  }
]`,
  },
  {
    id: "curriculum",
    title: "תוכנית לימודים (curriculum)",
    description: "מבנה שנתי עם רשימת קורסים",
    prompt: `צור JSON לתוכנית לימודים של 4 שנים בנושא [שם תוכנית].
הפורמט הוא מערך של שנות לימוד:
[{"year": "שנה א", "courses": ["קורס 1", "קורס 2", ...]}, ...]
תכין 4 שנים, 8-10 קורסים לכל שנה. השתמש בשמות קורסים אקדמיים ריאליסטיים.`,
    example: `[
  {
    "year": "שנה א",
    "courses": ["מבוא למשפט", "משפט חוקתי", "משפט פלילי א", "חוזים א", "נזיקין א"]
  },
  {
    "year": "שנה ב",
    "courses": ["דיני קניין", "משפט מסחרי", "דיני עבודה", "משפט אזרחי", "דיני חוזים ב"]
  }
]`,
  },
  {
    id: "career",
    title: "קריירה / תפקידים (career)",
    description: "תפקידים נפוצים של בוגרים עם שכר",
    prompt: `צור JSON של 4 תפקידים נפוצים של בוגרי [שם תוכנית].
הפורמט: [{"title_he": "תפקיד", "description_he": "תיאור", "salary_he": "15,000-25,000 ₪"}, ...]`,
    example: `[
  {
    "title_he": "עורך/ת דין",
    "description_he": "ייצוג לקוחות בבתי משפט, ניסוח חוזים, ייעוץ משפטי שוטף.",
    "salary_he": "15,000–30,000 ₪"
  },
  {
    "title_he": "יועץ/ת משפטי/ת בחברה",
    "description_he": "עבודה פנים-ארגונית בחברות הייטק, בנקים וחברות ממשלתיות.",
    "salary_he": "20,000–45,000 ₪"
  }
]`,
  },
  {
    id: "faculty",
    title: "סגל אקדמי (faculty)",
    description: "חברי סגל — שם + תואר + תיאור + תמונה",
    prompt: `צור JSON של 4 חברי סגל אקדמי בתחום [שם תוכנית].
הפורמט: [{"name_he": "שם", "title_he": "תואר/מוסד", "bio_he": "תיאור קצר", "image_url": ""}, ...]`,
    example: `[
  {
    "name_he": "פרופ' ישראל ישראלי",
    "title_he": "ראש החוג, דוקטורט מהרווארד",
    "bio_he": "מומחה בדיני חוזים בינלאומיים, בעל 20 שנות ניסיון בפסיקה ובמחקר.",
    "image_url": "https://..."
  }
]`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-[11px] font-semibold text-[#716C70] hover:text-[#B8D900] transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "הועתק!" : "העתק פרומפט"}
    </button>
  );
}

function JsonGuideSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div id="json-guide" className="rounded-2xl border border-[#E5E5E5] overflow-hidden">
      {/* Header */}
      <div className="bg-[#2A2628] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-[#B8D900]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">מדריך JSON — יצירה עם AI</h3>
            <p className="text-xs text-white/50 mt-0.5">
              לכל סוג סקציה — פרומפט מוכן ל-ChatGPT/Claude + דוגמה מלאה
            </p>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-[#B8D900]/5 border-b border-[#E5E5E5] px-5 py-3">
        <p className="text-xs text-[#4A4648] leading-relaxed">
          <strong>איך עובד:</strong> העתק את הפרומפט לתוך ChatGPT, Claude, או כל AI אחר. החלף את{" "}
          <code className="font-mono bg-white px-1 rounded">[שם תוכנית]</code> בשם התוכנית שלך. הדבק את הJSON שתקבל בשדה הרלוונטי בעורך.
        </p>
      </div>

      {/* Section examples */}
      <div className="divide-y divide-[#F0F0F0]">
        {JSON_EXAMPLES.map((ex) => (
          <div key={ex.id} className="overflow-hidden">
            <button
              onClick={() => setActiveId(activeId === ex.id ? null : ex.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-right hover:bg-[#FAFAFA] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#2A2628] text-[#B8D900] font-mono text-[10px] font-bold">
                  {ex.id}
                </span>
                <div>
                  <span className="text-sm font-semibold text-[#2A2628]">{ex.title}</span>
                  <span className="text-xs text-[#9A969A] mr-2">{ex.description}</span>
                </div>
              </div>
              {activeId === ex.id ? (
                <ChevronUp className="w-4 h-4 text-[#9A969A] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#9A969A] shrink-0" />
              )}
            </button>

            {activeId === ex.id && (
              <div className="px-5 pb-4 space-y-4 bg-[#FAFAFA]">
                {/* Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">פרומפט לAI</span>
                    <CopyButton text={ex.prompt} />
                  </div>
                  <pre className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 font-mono whitespace-pre-wrap leading-relaxed">
                    {ex.prompt}
                  </pre>
                </div>
                {/* Example output */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">דוגמה לפלט</span>
                    <CopyButton text={ex.example} />
                  </div>
                  <pre className="bg-[#2A2628] rounded-xl p-3 text-[11px] text-[#B8D900] font-mono overflow-x-auto whitespace-pre leading-relaxed">
                    {ex.example}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HelpCard({ section }: { section: HelpSection }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <div className={`rounded-2xl border ${section.color} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-right hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/50 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">{section.title}</h3>
            <p className="text-xs opacity-70 mt-0.5 font-normal">{section.description}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 shrink-0 opacity-50" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        )}
      </button>

      {open && (
        <div className="bg-white/60 border-t border-current/10 px-5 py-4 space-y-3">
          {section.features.map((feature, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-current mt-2 shrink-0 opacity-50" />
              <div>
                <p className="text-sm font-semibold">{feature.name}</p>
                <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{feature.description}</p>
                {feature.tip && (
                  <p className="text-xs mt-1.5 px-2.5 py-1.5 rounded-lg bg-white/70 border border-current/10 opacity-80 font-mono">
                    💡 {feature.tip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState("");

  const filtered = HELP_SECTIONS.filter(
    (s) =>
      !search ||
      s.title.includes(search) ||
      s.description.includes(search) ||
      s.features.some((f) => f.name.includes(search) || f.description.includes(search))
  );

  return (
    <div className="p-8 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#8aac00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2A2628]">מרכז העזרה</h1>
            <p className="text-sm text-[#9A969A]">כל יכולות המערכת במקום אחד</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש..."
            className="w-full h-10 pr-10 pl-4 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B8D900]/50"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "סוגי סקציות", value: "18+", icon: Layers },
          { label: "כלי המרות", value: "6", icon: Target },
          { label: "גרסאות שמורות", value: "20", icon: Eye },
          { label: "משתני DTR", value: "6", icon: Zap },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-[#E5E5E5] p-4 text-center">
              <StatIcon className="w-5 h-5 mx-auto mb-1.5 text-[#B8D900]" />
              <div className="text-xl font-bold text-[#2A2628]">{stat.value}</div>
              <div className="text-xs text-[#9A969A]">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Help Cards */}
      <div className="space-y-3">
        {filtered.map((section) => (
          <HelpCard key={section.id} section={section} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#9A969A]">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>לא נמצאו תוצאות עבור &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </div>

      {/* JSON Guide */}
      <div className="mt-8">
        <JsonGuideSection />
      </div>
    </div>
  );
}
