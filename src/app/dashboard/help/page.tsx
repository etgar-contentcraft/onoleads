/**
 * Help & Documentation page — full reference of all system capabilities.
 * Designed for marketing team members who are new to the admin panel.
 */
"use client";

import { useState } from "react";
import {
  FileText, Users, BarChart3, Settings, Globe, ShieldCheck,
  Search, ImageIcon, BookOpen, ChevronDown, ChevronUp,
  Zap, Target, Eye, Edit3, Layers, TrendingUp
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
    ],
  },
  {
    id: "sections",
    icon: Layers,
    title: "סוגי סקציות",
    description: "13 סוגי סקציות שניתן לשלב בכל דף נחיתה.",
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
];

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
          { label: "סוגי סקציות", value: "13+", icon: Layers },
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
    </div>
  );
}
