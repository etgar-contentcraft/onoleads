/**
 * System changelog page — displays recent releases in a card-based Hebrew RTL layout.
 * Mirrors the visual style of the help page (same color scheme, card structure).
 */
"use client";

import Link from "next/link";
import { Sparkles, Shield, Zap, Bug, History } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/** A single change entry within a release */
interface ChangeEntry {
  /** Category icon */
  type: "feature" | "security" | "performance" | "fix";
  /** Short label shown next to the badge */
  label: string;
  /** Full description of the change */
  description: string;
}

/** One version release card */
interface Release {
  version: string;
  date: string;
  /** Headline summary shown in the card header */
  summary: string;
  changes: ChangeEntry[];
}

// ============================================================================
// Data
// ============================================================================

/** Icon + badge color per change type */
const CHANGE_TYPE_META: Record<
  ChangeEntry["type"],
  { Icon: React.ElementType; badge: string; dot: string }
> = {
  feature:     { Icon: Sparkles, badge: "bg-lime-100 text-lime-700",   dot: "bg-lime-500" },
  security:    { Icon: Shield,   badge: "bg-red-100 text-red-700",     dot: "bg-red-500" },
  performance: { Icon: Zap,      badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  fix:         { Icon: Bug,      badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-500" },
};

/** Four most recent releases, newest first */
const RELEASES: Release[] = [
  {
    version: "0.6.0",
    date: "7 באפריל 2026",
    summary: "ניהול לוגואים — לוגו ברירת מחדל לאתר + לוגו לכל עמוד",
    changes: [
      {
        type: "feature",
        label: "מסך ניהול לוגואים",
        description:
          "מסך חדש ב-/dashboard/logos מאפשר העלאה של מספר לוגואים, בחירת ברירת מחדל גלובלית, שינוי שם ומחיקה. הלוגו הראשון שמועלה הופך אוטומטית לברירת המחדל.",
      },
      {
        type: "feature",
        label: "בחירת לוגו לעמוד",
        description:
          "בהגדרות כל עמוד נחיתה אפשר עכשיו לבחור לוגו ייעודי מתוך הספרייה. אם לא נבחר — נטען הלוגו הגלובלי. הבחירה מוצגת באמצעות LogoPicker חזותי.",
      },
      {
        type: "feature",
        label: "שרשרת fallback אחידה",
        description:
          "כל המקומות הציבוריים (דף הבית, דף נחיתה, דפי אירועים, דף התודה) פותרים את הלוגו לפי הסדר: עוקף-עמוד → ברירת מחדל מטבלת logos → fallback קשיח.",
      },
      {
        type: "performance",
        label: "URL-based references",
        description:
          "ההעדפות שומרות מחרוזת URL ולא FK — מחיקה של לוגו מהספרייה לעולם לא שוברת עמוד קיים. הוא פשוט יחזור לברירת המחדל.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "7 באפריל 2026",
    summary: "מפת חום דו-שכבתית, בורר תאריכים מתקדם, וחיזוק אבטחה",
    changes: [
      {
        type: "feature",
        label: "מפת חום ו-Dwell Time",
        description:
          "שכבת לחיצות (dots אדומים) ושכבת Dwell Time (רצועות סגול→זהב) מוצגות על גבי תצוגת הדף המלאה. בחרו בין Desktop ו-Mobile, ועברו בין שלושה מצבי שכבה.",
      },
      {
        type: "feature",
        label: "ViewportTracker",
        description:
          "קומפוננט חדש שמודד זמן שהייה אנונימי לכל חלק של הדף (רצועות 5%). הנתונים נשלחים דרך sendBeacon בסוף הביקור.",
      },
      {
        type: "feature",
        label: "בורר תאריכים מתקדם",
        description:
          "12 טווחי זמן מוגדרים מראש עם גבולות לוח שנה מדויקים (השבוע, שבוע שעבר, החודש, חודש שעבר) + טווח מותאם אישית.",
      },
      {
        type: "security",
        label: "מניעת Open Redirect",
        description:
          "כל יעדי redirect בסמארט-לינקים עוברים ולידציה מול רשימת allowlist. קישור לא חוקי מחזיר שגיאה 400.",
      },
      {
        type: "security",
        label: "CSRF + Singleton Pattern",
        description:
          "ה-CSRF cookie עודכן ל-SameSite=Lax. מודול admin.ts הוגדר כ-server-only עם singleton pattern.",
      },
      {
        type: "performance",
        label: "שיפורי ביצועים באנליטיקס",
        description:
          "הוטל cap של 20,000 שורות על שאילתות אנליטיקס. נוסף debounce לרשתות real-time. cookie_id מחושב פעם אחת עם useMemo.",
      },
      {
        type: "fix",
        label: "7 מיגרציות DB",
        description:
          "תיקוני RLS, אינדקסים חדשים על analytics_events ו-dwell_time_events, וטריגר לגיזום אוטומטי של גרסאות (עד 20 לדף).",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "28 במרץ 2026",
    summary: "מפת חום v4 — טכניקת VH-freeze ותצוגות Desktop/Mobile נפרדות",
    changes: [
      {
        type: "feature",
        label: "VH-Freeze Technique",
        description:
          "הדף נטען בגודל viewport אמיתי, גבהי vh מוקפאים, ואז הדף מתרחב לגובה המלא — פותר את בעיית הגלילה המעגלית.",
      },
      {
        type: "feature",
        label: "Desktop / Mobile נפרדים",
        description:
          "תצוגת Desktop (1200px) ו-Mobile (390px) הופרדו לחלוניות שונות עם viewports מדויקים.",
      },
      {
        type: "fix",
        label: "תיקון גלילת iframe",
        description:
          "גובה ה-iframe נותק מהגובה המזוהה כדי לשבור את התלות המעגלית שמנעה גלילה תקינה.",
      },
      {
        type: "fix",
        label: "גבהי vh בתוך iframe",
        description:
          "סקציות שמשתמשות בגבהי vh (כמו Hero) מוצגות כעת בגובה הנכון בתוך iframe גבוה.",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "10 במרץ 2026",
    summary: "מפת חום ראשונית, לוח אנליטיקס, ויומן ביקורת",
    changes: [
      {
        type: "feature",
        label: "Click Heatmap ראשוני",
        description:
          "שכבת canvas על iframe של הדף החי, עם גרדיאנט מכחול לאדום. כולל רשימת אלמנטים פופולריים.",
      },
      {
        type: "feature",
        label: "לוח אנליטיקס",
        description:
          "צפיות, מבקרים ייחודיים, אחוז המרה, זמן ממוצע, עומק גלילה, גרף יומי, ופירוט UTM — הכל first-party.",
      },
      {
        type: "feature",
        label: "יומן ביקורת",
        description:
          "תיעוד כל פעולות מנהלים עם סינון לפי סוג פעולה, עמוד, משתמש, וטווח תאריכים.",
      },
      {
        type: "performance",
        label: "אגרגציה בצד שרת",
        description:
          "ה-API מחשב אגרגציות server-side, מפחית העברת נתונים ל-client בכ-80%.",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "15 בפברואר 2026",
    summary: "אנליטיקס, UTM Builder, וסמארט-לינקים",
    changes: [
      {
        type: "feature",
        label: "מודול אנליטיקס",
        description:
          "לוח אנליטיקס first-party לכל דף נחיתה — ללא תלות ב-Google Analytics.",
      },
      {
        type: "feature",
        label: "UTM Builder",
        description:
          "יצירת קישורים עם UTM params ישירות מהדשבורד.",
      },
      {
        type: "feature",
        label: "סמארט-לינקים",
        description:
          "קישורים קצרים ומעקב שמפנים לדפי נחיתה.",
      },
      {
        type: "feature",
        label: "UTM Attribution Cookie",
        description:
          "UTM המקורי נשמר ב-cookie ל-90 יום ומשויך לליד גם בביקורים חוזרים.",
      },
    ],
  },
];

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Badge pill showing the change type with icon.
 * @param type - "feature" | "security" | "performance" | "fix"
 */
function ChangeBadge({ type }: { type: ChangeEntry["type"] }) {
  const meta = CHANGE_TYPE_META[type];
  const Icon = meta.Icon;

  const LABELS: Record<ChangeEntry["type"], string> = {
    feature:     "פיצ'ר חדש",
    security:    "אבטחה",
    performance: "ביצועים",
    fix:         "תיקון",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${meta.badge}`}
    >
      <Icon className="w-3 h-3" />
      {LABELS[type]}
    </span>
  );
}

/**
 * Single release card showing version, date, summary, and change list.
 * @param release - The release data to render.
 */
function ReleaseCard({ release }: { release: Release }) {
  return (
    <article className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 bg-[#2A2628]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[#B8D900]/20 text-[#B8D900] font-mono text-sm font-bold">
            v{release.version}
          </span>
          <p className="text-sm font-semibold text-white/80 leading-tight">
            {release.summary}
          </p>
        </div>
        <time className="text-xs text-white/35 shrink-0 mr-4">{release.date}</time>
      </div>

      {/* Change list */}
      <ul className="divide-y divide-[#F0F0F0]">
        {release.changes.map((change, index) => (
          <li key={index} className="flex items-start gap-3 px-5 py-3.5">
            <div className="pt-0.5">
              <ChangeBadge type={change.type} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2A2628] leading-tight">
                {change.label}
              </p>
              <p className="text-xs text-[#716C70] mt-0.5 leading-relaxed">
                {change.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

// ============================================================================
// Page
// ============================================================================

/** Changelog page — shows recent system releases to admin users. */
export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Back link */}
        <Link
          href="/dashboard/help"
          className="inline-flex items-center gap-1.5 text-sm text-[#716C70] hover:text-[#2A2628] transition-colors"
        >
          ← מרכז העזרה
        </Link>

        {/* Page header */}
        <header className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
              <History className="w-5 h-5 text-[#8BA000]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#2A2628] leading-tight">
                עדכוני מערכת
              </h1>
              <p className="text-sm text-[#9A969A]">
                היסטוריית שינויים ופיצ'רים חדשים
              </p>
            </div>
          </div>
        </header>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[#E5E5E5]">
          <span className="text-xs font-semibold text-[#9A969A] ml-1">סוגי שינויים:</span>
          {(["feature", "security", "performance", "fix"] as ChangeEntry["type"][]).map(
            (type) => <ChangeBadge key={type} type={type} />
          )}
        </div>

        {/* Release cards */}
        <section className="space-y-6">
          {RELEASES.map((release) => (
            <ReleaseCard key={release.version} release={release} />
          ))}
        </section>

        {/* Footer note */}
        <p className="text-xs text-center text-[#9A969A] pb-4">
          לגרסאות קודמות עיינו בקובץ{" "}
          <code className="font-mono bg-[#F0F0F0] px-1 rounded">CHANGELOG.md</code>{" "}
          בשורש הפרויקט.
        </p>
      </div>
    </div>
  );
}
