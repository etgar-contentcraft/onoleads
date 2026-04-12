/**
 * Help & Documentation page — comprehensive reference of all system capabilities.
 * Includes a general help center, role-specific sub-pages (IT, Security, Privacy),
 * and JSON guide for AI-assisted content creation.
 */
"use client";

import { useState } from "react";
import {
  FileText, Users, BarChart3, Settings, Globe, ShieldCheck,
  Search, ImageIcon, BookOpen, ChevronDown, ChevronUp,
  Zap, Target, Eye, Edit3, Layers, TrendingUp, Code2, Copy, Check,
  Server, Lock, UserCheck, AlertTriangle, Shield, Monitor,
  Network, Activity, CalendarDays
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface HelpFeature {
  name: string;
  description: string;
  tip?: string;
  codeExample?: string;
}

interface HelpSection {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  features: HelpFeature[];
}

/** Tab definition for the main help area */
type HelpTab = "general" | "it-admin" | "security" | "privacy";

// ============================================================================
// General Help Sections (expanded)
// ============================================================================

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "builder",
    icon: Edit3,
    title: "בילדר דפי נחיתה",
    description: "כלי הליבה לבניית ועריכת עמודי נחיתה. גרירה, שינוי סדר, הסתרה, הכל ב-UI ויזואלי.",
    color: "bg-lime-50 text-lime-700 border-lime-200",
    features: [
      {
        name: "הוספת סקציות",
        description: "לחצו על כל סוג סקציה בלוח הצד הימני כדי להוסיפה לתחתית הדף. ניתן להוסיף אותה כמה פעמים. 18 סוגי סקציות זמינות (Hero, יתרונות, FAQ, סגל, גלריה ועוד). כל סקציה מגיעה עם תוכן ברירת מחדל שניתן לשנות.",
        tip: "ניתן להוסיף מספר סקציות מאותו סוג — למשל שני בלוקי יתרונות עם תוכן שונה.",
      },
      {
        name: "שינוי סדר (Drag & Drop)",
        description: "גררו את ידית ה-⠿ (בצד שמאל של כל שורה) כדי לשנות את סדר הסקציות בדף. השינוי נשמר אוטומטית. סדר הסקציות קובע את סדר הופעתן בדף הנחיתה הסופי.",
        tip: "סדר מומלץ: Hero > יתרונות > סטטיסטיקות > תוכנית לימודים > סגל > המלצות > FAQ > CTA",
      },
      {
        name: "הסתרת סקציה",
        description: "לחצו על אייקון העין בכרטיס הסקציה כדי להסתירה מהמבקרים. הסקציה נשמרת במערכת אך לא מוצגת בדף. שימושי לסקציות עונתיות (כמו ספירה לאחור לפני מועד רישום) שרוצים לשמור אך לא להציג.",
        tip: "סקציה מוסתרת מסומנת באפור בבילדר. לחצו שוב על העין להצגה חוזרת.",
      },
      {
        name: "עריכת תוכן",
        description: "לחצו על אייקון העיפרון כדי לפתוח את עורך התוכן של הסקציה. כל שדה ניתן לעריכה — כותרות, תיאורים, תמונות, סרטונים ועוד. העורך תומך בשדות בעברית ובאנגלית. שינויים נשמרים בלחיצה על 'שמור'.",
        tip: "ניתן להדביק JSON מלא (שנוצר עם ChatGPT/Claude) לעדכון מהיר של סקציה שלמה. ראו מדריך JSON למטה.",
      },
      {
        name: "שכפול סקציה",
        description: "לחצו על אייקון הקופיה כדי לשכפל סקציה קיימת עם כל התוכן שלה. שימושי כשרוצים ליצור וריאציה של סקציה קיימת עם שינויים קלים.",
      },
      {
        name: "מחיקת סקציה",
        description: "לחצו על אייקון הפח כדי למחוק סקציה מהדף. פעולה זו היא סופית — אך תמיד ניתן לשחזר דרך היסטוריית גרסאות אם שמרתם לפני המחיקה.",
        tip: "לפני מחיקה, שקלו להסתיר את הסקציה במקום למחוק — כך תוכלו להחזיר אותה בקלות.",
      },
      {
        name: "Dynamic Text (DTR)",
        description: "השתמשו ב-{{utm_source}}, {{utm_campaign}} וכו' בכותרות ותיאורים. הטקסט יוחלף אוטומטית לפי UTM params של המבקר. אם אין UTM, מוצג הfallback. תומך ב-6 משתנים: utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer.",
        tip: "דוגמה: כותרת \"קורס מ-{{utm_source|Google}}\" תוצג כ-\"קורס מ-Facebook\" למבקר עם utm_source=Facebook. אם אין UTM — יוצג \"קורס מ-Google\".",
      },
      {
        name: "היסטוריית גרסאות (Rollback)",
        description: "לחצו על אייקון השעון בטופבר לצפות ב-20 הגרסאות האחרונות של הדף ולשחזר כל אחת מהן. גרסה נשמרת אוטומטית לפני כל שמירה — אין צורך בפעולה ידנית. כל גרסה כוללת תאריך ושעה מדויקים.",
        tip: "שחזור גרסה יוצר גרסה חדשה מהגרסה הנוכחית לפני שהוא מחליף — כלומר גם אחרי שחזור ניתן לחזור אחורה.",
      },
      {
        name: "הגדרות עמוד",
        description: "לחצו 'הגדרות עמוד' כדי לגשת לאפשרויות ייחודיות לכל עמוד: exit intent popup, social proof toast, webhook ייעודי, מספר טלפון, לוגו מותאם, עמוד תודה, ודריסת פיקסלים. ההגדרות מחולקות לכרטיסיות: כללי, המרות, אינטגרציות, מעקב.",
      },
      {
        name: "כותרות וקריאה לפעולה מותאמות",
        description: "כל סקשן מאפשר עריכת כותרת וטקסט כפתור CTA בעברית ובאנגלית. ניתן להסתיר את הכפתור לחלוטין (מתג 'הצג כפתור קריאה לפעולה') או לבחור אייקון מתאים מ-5 אפשרויות.",
      },
      {
        name: "סרטון רקע (Hero Video)",
        description: "ניתן להוסיף סרטון MP4 כרקע לסקשן Hero. הסרטון מופעל אוטומטית ללא סאונד בלופ. משקל מקסימלי מומלץ: 5MB. יש להשתמש בסרטון קצר (5-15 שניות) בלופ חלק.",
        tip: "סרטון רקע מעלה משמעותית את זמן הטעינה. השתמשו בקבצים דחוסים (H.264, 720p) ובדקו מהירות בנייד.",
      },
      {
        name: "שכפול עמוד שלם",
        description: "בדף ניהול העמודים, לחצו על 'שכפל' ליצירת עותק מלא של עמוד כולל כל הסקציות, ההגדרות, דריסות הפיקסלים, סגנונות מותאמים, ו-SEO. העמוד החדש מקבל slug חדש עם סיומת -copy.",
        tip: "שכפול הוא הדרך המהירה ביותר ליצור עמוד חדש — שכפלו עמוד דומה ושנו את התוכן.",
      },
    ],
  },
  {
    id: "sections",
    icon: Layers,
    title: "סוגי סקציות",
    description: "18 סוגי סקציות שניתן לשלב בכל דף נחיתה. כל סקציה מותאמת ל-RTL, רספונסיבית, ותומכת בהנפשות.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    features: [
      { name: "Hero", description: "הסקציה הראשונה בדף. כותרת ראשית עם רקע (תמונה או סרטון), כותרת משנה, כפתור CTA בולט, וסטטיסטיקה מונפשת. זו הסקציה הכי חשובה — המבקר מחליט תוך 3 שניות אם להישאר.", tip: "כתבו כותרת Hero קצרה (5-8 מילים) שמסבירה את הערך — למשל 'תואר MBA שיקדם את הקריירה שלך'." },
      { name: "אודות", description: "שני עמודות: טקסט + תמונה, עם נקודות USP ב-checkmarks ירוקים. מתאים להסבר על התוכנית, הפקולטה או המוסד. התמונה מונפשת (fade-in) בגלילה." },
      { name: "יתרונות (Benefits)", description: "כרטיסיות יתרונות מונפשות עם אייקונים. כל כרטיסיה כוללת כותרת, תיאור קצר, ואייקון אמוג'י. מציגות מה מבדל את התוכנית מהמתחרים.", tip: "3-6 יתרונות הם המספר האידיאלי. יותר מ-6 מתחילים להיראות עמוסים." },
      { name: "סטטיסטיקות (Stats)", description: "מספרים גדולים עם הנפשת ספירה (count-up), למשל: '95% תעסוקה', '3,500+ בוגרים', '20+ שנות ניסיון'. ההנפשה מופעלת כשהסקציה נכנסת לתצוגה." },
      { name: "תוכנית לימודים (Curriculum)", description: "אקורדיון לפי שנים/סמסטרים עם רשימת קורסים. כל שנה נפתחת בלחיצה. מצוין ל-SEO כי גוגל (ומנועי AI) אוהבים תוכן מובנה.", tip: "השתמשו בשמות קורסים מדויקים ורלוונטיים — זה גם SEO וגם אמינות." },
      { name: "קריירה (Career)", description: "תפקידים נפוצים של בוגרים עם טווח שכר, תיאור קצר, וציטוטים. מראה למבקר לאן הלימודים יובילו אותו." },
      { name: "סגל (Faculty)", description: "רשת כרטיסיות אנשי סגל עם תמונה, שם, תואר, ומוסד. כולל הנפשת hover. בנייד מוצג כרשימה אנכית." },
      { name: "המלצות (Testimonials)", description: "ציטוטים מסטודנטים בוגרים עם שם, תוכנית, ותמונה. קרוסלה אוטומטית עם חצים לניווט. אחד הגורמים החזקים ביותר לשכנוע.", tip: "3-5 המלצות הן מספיק. כתבו ציטוטים ספציפיים ('קיבלתי עבודה 3 חודשים אחרי סיום') ולא כלליים ('מוסד מצוין')." },
      { name: "שאלות נפוצות (FAQ)", description: "אקורדיון FAQ עם JSON-LD schema אוטומטי. גוגל מציג את השאלות ישירות בתוצאות החיפוש (Rich Results), ומנועי AI (ChatGPT, Gemini, Perplexity) משתמשים בתוכן לתשובות.", tip: "כתבו 5-8 שאלות שאנשים באמת שואלים. השאלה הראשונה צריכה להיות 'כמה זמן נמשכים הלימודים?' או 'מהם תנאי הקבלה?'." },
      { name: "וידאו (Video)", description: "נגן YouTube עם סרטון ראשי + רשת סרטונים נוספים (אופציונלי). הסרטון נטען ב-lazy loading כדי לא לפגוע במהירות הדף." },
      { name: "גלריה (Gallery)", description: "פסיפס תמונות לקמפוס, אירועים, חיי סטודנטים. 4-8 תמונות ברשת רספונסיבית עם lightbox (הגדלה בלחיצה)." },
      { name: "ספירה לאחור (Countdown)", description: "שני מצבי עבודה: (1) Evergreen — מתאפס לכל מבקר חדש, יוצר דחיפות אישית. (2) Fixed — ספירה לתאריך קבוע (כמו מועד רישום אחרון). כשהטיימר מגיע לאפס, ניתן להציג הודעה מותאמת.", tip: "Evergreen מומלץ לקמפיינים שוטפים. Fixed מומלץ כשיש מועד אמיתי." },
      { name: "קריאה לפעולה (CTA)", description: "CTA גדול ומרשים לתחתית הדף — כותרת שכנועית, תיאור קצר, וכפתור בולט. מומלץ להוסיף בתחתית הדף כ-'רשת ביטחון' אחרונה." },
      { name: "מפה (Map)", description: "כתובת טקסטואלית + embed של Google Maps. מציג את מיקום הקמפוס/המוסד. נטען ב-lazy loading." },
      { name: "WhatsApp", description: "סקציה עם כפתור WhatsApp צף + הודעה מותאמת אישית. מופיעה גם ככפתור צף בפינת המסך." },
    ],
  },
  {
    id: "conversions",
    icon: Target,
    title: "כלי המרות",
    description: "פיצ'רים לבניית אמון ודחיפת המבקר להשאיר פרטים. כל הכלים ניתנים להפעלה/כיבוי ברמת עמוד.",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    features: [
      {
        name: "Exit Intent Popup",
        description: "פופאפ שמופיע כשהמבקר מנסה לעזוב — עכבר עוזב המסך למעלה (דסקטופ) או גלילה מהירה חזרה למעלה (מובייל). מציג כותרת שכנועית, תיאור, וכפתור CTA. מופיע פעם אחת בלבד לכל ביקור.",
        tip: "כבוי כברירת מחדל. הפעל בהגדרות עמוד ← 'המרות'. כותרת מומלצת: 'רגע! לפני שעוזבים...'",
      },
      {
        name: "Social Proof Toast",
        description: "toast בתחתית המסך: '23 אנשים נרשמו לתוכנית זו השבוע'. מביא נתונים בזמן אמת מה-DB (ספירת לידים בטווח הימים שהוגדר). מופיע אחרי 3 שניות, נעלם אחרי 5 שניות.",
        tip: "כבוי כברירת מחדל. הפעל בהגדרות עמוד. ניתן לשנות את חלון הימים (7 ימים ברירת מחדל).",
      },
      {
        name: "Sticky Mobile Header",
        description: "כותרת נצמדת בראש המסך שמופיעה בזמן גלילה מטה. מכילה: שם התוכנית (מקוצר), כפתור CTA, ומספר טלפון ללחיצה. מעלה המרות במובייל כי כפתור ה-CTA תמיד נגיש.",
      },
      {
        name: "WhatsApp Floating Button",
        description: "כפתור WhatsApp ירוק צף בפינה השמאלית-תחתונה של המסך. לחיצה פותחת שיחה עם הודעה מותאמת אישית שכוללת את שם העמוד.",
      },
      {
        name: "טופס לידים (CTA Modal)",
        description: "טופס 3 שדות (שם מלא, טלפון, אימייל) שנפתח בלחיצה על כל כפתור CTA בדף. כולל: (1) ולידציה בזמן אמת (טלפון ישראלי, פורמט אימייל). (2) שליחה ל-webhook בלבד (פרטים אישיים לא נשמרים במערכת). (3) הפעלת פיקסלים על כל 8 הפלטפורמות. (4) ניתוב לעמוד תודה מותאם.",
        tip: "הטופס כולל טקסט הסכמה לפרטיות + לינק למדיניות פרטיות. טלפון חייב להתחיל ב-05 (10 ספרות).",
      },
      {
        name: "עמוד תודה מותאם (Thank You Page)",
        description: "לאחר שליחת טופס, המבקר מנותב לעמוד תודה. ניתן להגדיר: כותרת, תיאור, כפתור להמשך. עמוד התודה גם טוען את פיקסלי ההמרה בצד הלקוח — חיוני למדידה תקינה.",
      },
    ],
  },
  {
    id: "leads",
    icon: Users,
    title: "ניהול לידים ופרטיות",
    description: "המערכת לא שומרת פרטים אישיים (שם, טלפון, מייל). לידים נשלחים ישירות ל-CRM חיצוני דרך webhook בלבד.",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    features: [
      {
        name: "מדיניות פרטיות",
        description: "פרטים אישיים (שם מלא, טלפון, אימייל) לא נשמרים במערכת. הם נשלחים בזמן אמת ל-webhook חיצוני בלבד (Make.com / Zapier / n8n) ולא נשמרים בבסיס הנתונים. במערכת נשמר רק מידע אנונימי לצורכי אנליטיקס.",
      },
      {
        name: "מידע אנונימי שנשמר",
        description: "לכל שליחת טופס נשמר: מזהה עמוד, פרמטרי UTM (source, medium, campaign, content, term), סוג מכשיר, דומיין מפנה, מדינה/אזור/עיר (ללא IP), סטטוס webhook, וחותמת זמן.",
      },
      {
        name: "Webhook ל-CRM (Make.com / Zapier)",
        description: "כל ליד נשלח ב-real-time ל-webhook URL. ניתן להגדיר: (1) Webhook גלובלי — בהגדרות המערכת. (2) Webhook ייעודי לעמוד — בהגדרות העמוד ← 'אינטגרציות'. אם מוגדר webhook ייעודי — הוא בלבד ישלח.",
        tip: "ב-Make.com: צרו Webhook Custom, הדביקו את ה-URL. ראו סקציית 'מבנה Payload' למטה.",
      },
      {
        name: "סטטוס Webhook",
        description: "לכל שליחת טופס מוצג סטטוס: sent (נשלח בהצלחה), failed (נכשל), pending (ממתין). בדף האנליטיקס מוצג סיכום של sent/failed/pending.",
      },
    ],
  },
  {
    id: "webhook-payload",
    icon: Zap,
    title: "Webhook — מבנה ה-Payload",
    description: "כל ליד שנשלח ל-Make.com / Zapier / n8n מכיל את השדות הבאים בפורמט JSON.",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    features: [
      {
        name: "שדות הליד — רשימה מלאה",
        description: "כל שדה תמיד נשלח — גם אם ריק (מחרוזת ריקה). כך ניתן לבנות מבנה קבוע בלי הפתעות. השדות: full_name, phone, email, interest_area, program_interest, page_slug, page_id, device_type, referrer_domain, utm_source, utm_medium, utm_campaign, utm_content, utm_term, created_at, gclid, fbclid, obclid, tblclid, twclid.",
        codeExample: `{
  "full_name":       "ישראל ישראלי",
  "phone":           "0521234567",
  "email":           "israel@example.com",
  "interest_area":   "MBA",
  "program_interest":"הפקולטה למנהל עסקים — MBA",
  "page_slug":       "mba-ono",
  "page_id":         "de9ff543-120a-4a92-...",
  "device_type":     "mobile",
  "referrer_domain": "google.com",
  "utm_source":      "google",
  "utm_medium":      "cpc",
  "utm_campaign":    "mba-spring-2026",
  "utm_content":     "",
  "utm_term":        "",
  "gclid":           "CjwKCAjw...",
  "fbclid":          "",
  "obclid":          "",
  "tblclid":         "",
  "twclid":          "",
  "created_at":      "2026-04-05T17:01:33.000Z"
}`,
      },
      {
        name: "Click IDs — זיהוי מערכות פרסום",
        description: "כל ליד כולל את ה-click IDs של כל מערכות הפרסום — gclid (Google Ads), fbclid (Meta/Facebook), obclid (Outbrain), tblclid (Taboola), twclid (Twitter/X). רק אחד מהם יהיה מלא — בהתאם למקור התנועה.",
      },
      {
        name: "לוגיקת Webhook — גלובלי מול per-page",
        description: "המערכת בודקת קודם אם לעמוד יש webhook ייעודי. אם כן — שולח רק אליו. אם לא — שולח לגלובלי. לעולם לא נשלח לשניהם. אם אף webhook לא מוגדר — הליד נשמר רק ב-Supabase.",
        tip: "הגדרת webhook ייעודי לעמוד: הגדרות העמוד ← 'אינטגרציות' ← שדה 'Webhook URL'. ריק = נופל לגלובלי.",
      },
      {
        name: "UTM Cookie — attribution חכם",
        description: "אם גולש הגיע בביקורו הראשון עם UTM params (קמפיין), הערכים נשמרים ב-cookie ל-90 יום. בביקור חוזר — הליד יישא את ה-UTM המקורי גם אם הגיע ישיר.",
        tip: "דוגמה: גולש הגיע מ-facebook ב-1 לינואר, חזר ישיר ב-5 לינואר ומילא טופס. utm_source = 'facebook'.",
      },
    ],
  },
  {
    id: "heatmap-dwell",
    icon: Activity,
    title: "מפת חום ו-Dwell Time",
    description: "הצגה ויזואלית של איפה גולשים לחצו ואיפה הם התעכבו על העמוד.",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    features: [
      {
        name: "שכבת לחיצות",
        description: "dots אדומים על גבי תצוגת העמוד המלאה. כל נקודה מייצגת לחיצה של גולש. ריכוז גבוה של נקודות = אזור עניין חזק.",
        tip: "לחיצות נאספות אוטומטית מכל גולש — אין צורך בהגדרה. נתונים מופיעים תוך שעות.",
      },
      {
        name: "שכבת Dwell Time",
        description: "רצועות צבעוניות (סגול→זהב) המציגות כמה זמן גולשים שהו בכל חלק של הדף. סגול = זמן קצר, זהב = זמן ממושך. מאפשר לזהות איזה תוכן מעסיק.",
        tip: "Dwell Time נמדד לפי רצועות של 5% מגובה הדף. הזמן מועבר בצורה אנונימית דרך sendBeacon.",
      },
      {
        name: "מיתוג לפי מכשיר",
        description: "בחרו בין Desktop (רוחב 1200px) ו-Mobile (רוחב 390px) בחלוניות נפרדות. כל מכשיר מציג תצוגה ונתונים נפרדים — כי התנהגות הגולשים שונה.",
        tip: "60-70% מהתנועה היא ממובייל. בדקו תמיד את שתי התצוגות לפני קבלת החלטות.",
      },
      {
        name: "בורר שכבות",
        description: "שלושה מצבי תצוגה: 'לחיצות' (click dots בלבד), 'שהייה' (Dwell Time bands בלבד), 'שניהם' (שכבת לחיצות ושהייה בו-זמנית). עוברים בין המצבים בלחיצה.",
      },
      {
        name: "גלילה מלאה של הדף",
        description: "תצוגת הדף מוצגת בגובה המלא שלה — ניתן לגלול ולראות את כל הסקציות עם שכבת הנתונים. טכניקת VH-freeze מבטיחה שהגובה יישאר קבוע בזמן הגלילה.",
      },
    ],
  },
  {
    id: "date-picker",
    icon: CalendarDays,
    title: "סינון לפי טווח תאריכים",
    description: "בורר תאריכים מתקדם לסינון נתוני אנליטיקס לפי כל טווח זמן.",
    color: "bg-sky-50 text-sky-700 border-sky-200",
    features: [
      {
        name: "12 טווחי זמן מוגדרים מראש",
        description: "היום, אתמול, 7 ימים אחרונים, 14 ימים, 28 ימים, 30 ימים, 90 ימים, השבוע, שבוע שעבר, החודש הנוכחי, חודש שעבר, וטווח מותאם אישית.",
      },
      {
        name: "גבולות לוח שנה מדויקים",
        description: "'השבוע' = ראשון–שבת של השבוע הנוכחי. 'שבוע שעבר' = ראשון–שבת של השבוע הקודם. 'החודש' ו'חודש שעבר' = מהיום הראשון ועד האחרון של החודש.",
        tip: "השתמשו ב'השבוע' לבדיקת ביצועי קמפיין שוטף, ו'חודש שעבר' לדוחות חודשיים.",
      },
      {
        name: "טווח מותאם אישית",
        description: "בחרו 'מותאם אישית' לפתיחת בורר תאריכים ידני. בחרו תאריך התחלה ותאריך סיום בלחיצה.",
      },
      {
        name: "הפעלה מלוח האנליטיקס",
        description: "בורר התאריכים מופיע בראש לוח האנליטיקס ומשפיע על כל הגרפים, טבלאות הנתונים, ומפת החום בו-זמנית.",
      },
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "אנליטיקס (First-Party)",
    description: "נתוני ביצועים ראשוניים (first-party) שנאספים ישירות — ללא תלות ב-Google Analytics.",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    features: [
      { name: "צפיות בעמוד (Page Views)", description: "מספר כניסות לכל עמוד. כולל השוואה לתקופה קודמת (אחוז שינוי). ניתן לסנן: 7 ימים, 14 ימים, 30 ימים, 90 ימים, או טווח מותאם." },
      { name: "מבקרים ייחודיים", description: "מספר מבקרים שונים לפי cookie_id. מבקר שנכנס פעמיים ביום נספר פעם אחת. ה-cookie נשמר ל-90 יום." },
      { name: "אחוז המרה", description: "שליחות טופס חלקי מבקרים ייחודיים, באחוזים. אחוז המרה טוב: 3-8%. מעל 10% מצוין. מתחת ל-2% — צריך לשפר.", tip: "המדד הכי חשוב — מראה כמה אחוז מהמבקרים הפכו ללידים." },
      { name: "זמן ממוצע בדף", description: "כמה זמן בממוצע מבקרים שוהים בדף. מוצג בדקות ושניות." },
      { name: "מפת חום — לחיצות ו-Dwell Time", description: "תצוגה ויזואלית דו-שכבתית: שכבת לחיצות (dots אדומים) ושכבת Dwell Time (רצועות סגול→זהב לפי זמן שהייה). סינון לפי מכשיר (desktop/mobile), מיתוג שכבות. ראו סעיף 'מפת חום ו-Dwell Time' לפרטים.", tip: "Dwell Time נאסף אנונימית דרך ViewportTracker ומשודר בצורת sendBeacon בסוף הביקור." },
      { name: "פילוח UTM", description: "פירוט תנועה לפי source, medium, campaign. כמה צפיות מכל מקור/קמפיין, עם גרף אחוזים." },
      { name: "עומק גלילה (Scroll Depth)", description: "כמה מבקרים הגיעו ל-25%, 50%, 75%, 90% מהדף.", tip: "אם רוב המבקרים לא מגיעים ל-75% — שקלו לקצר את הדף או להעביר את ה-CTA למעלה." },
      { name: "גרף יומי", description: "גרף קו שמציג צפיות ושליחות טופס לפי יום. מאפשר לזהות מגמות וימים חזקים." },
    ],
  },
  {
    id: "tracking-events",
    icon: TrendingUp,
    title: "מעקב ומדידה — אירועים לפי פלטפורמה",
    description: "מפת האירועים המלאה: מה נשלח, לאן, ומתי. כולל צד לקוח וצד שרת.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    features: [
      {
        name: "GA4 — Google Analytics 4",
        description: "צד לקוח: page_view (אוטומטי), scroll (75% גלילה), engaged_session (60 שניות), form_start (פוקוס ראשון בטופס), lead_form_submit (שליחת טופס — אות מעורבות). צד שרת (Measurement Protocol): generate_lead — ההמרה הרשמית.",
        tip: "GA4 נטען מיידית גם ללא הסכמת עוגיות (Consent Mode v2 שולח cookieless pings).",
      },
      {
        name: "Meta (Facebook) Pixel + CAPI",
        description: "צד לקוח: PageView (טעינת דף), Lead (בעמוד תודה, עם eventID לdedup). צד שרת (Conversions API): Lead — עם אותו eventID. כולל: email hash, phone hash, fbc, fbp.",
        tip: "Meta מסיר כפילויות לפי eventID. חובה שהדפדפן והשרת ישלחו אותו ID.",
      },
      {
        name: "Google Ads — Enhanced Conversions",
        description: "צד לקוח: conversion (עם transaction_id). צד שרת: uploadClickConversions — רק כשיש gclid. כולל: hashed email, phone, name. זמן בשעון ישראל.",
        tip: "Google Ads CAPI דורש gclid. אם המבקר לא הגיע מגוגל — רק אירוע הדפדפן יישלח.",
      },
      { name: "TikTok Pixel + Events API", description: "צד לקוח: page(), CompleteRegistration (עם event_id בארגומנט שלישי). צד שרת: CompleteRegistration — עם אותו event_id." },
      { name: "LinkedIn Insight + CAPI", description: "צד לקוח: Insight Tag (צפיות אוטומטיות). צד שרת: Lead conversion — עם SHA256_EMAIL ו/או li_fat_id." },
      { name: "Outbrain", description: "צד לקוח: PAGE_VIEW, CONVERSION. צד שרת: Lead — רק כשיש obclid." },
      { name: "Taboola", description: "צד לקוח: page_view, complete_registration. צד שרת: lead — עם tblclid." },
      { name: "Twitter / X", description: "צד לקוח: tw-lead (עם conversion_id). צד שרת: LEAD conversion — עם twclid." },
      {
        name: "תהליך שליחת ליד — שלב אחרי שלב",
        description: "1) המבקר שולח טופס. 2) נוצר event_id דטרמיניסטי (hash). 3) POST /api/leads. 4) השרת שומר ליד + webhook + CAPI. 5) ניתוב לעמוד תודה. 6) עמוד התודה שולח Lead events בצד לקוח. 7) כל הפלטפורמות מסירות כפילויות לפי event_id.",
      },
      {
        name: "דריסת פיקסלים ברמת דף",
        description: "בהגדרות כל עמוד ← 'מעקב ואנליטיקס': הזינו pixel ID חלופי, כבו פלטפורמה, או השאירו ריק לשימוש בגלובלי.",
        tip: "שימושי כשיש כמה חשבונות פרסום (Meta Pixel שונה לכל קמפיין).",
      },
      {
        name: "Consent Mode v2",
        description: "ברירת מחדל: denied. GA4 שולח cookieless pings. שאר הפיקסלים רק אחרי הסכמה. שליחת טופס = הסכמה שיווקית.",
      },
    ],
  },
  {
    id: "seo",
    icon: Search,
    title: "SEO ו-AI Visibility",
    description: "אופטימיזציה מובנית לגוגל, למנועי AI, ולרשתות חברתיות.",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    features: [
      { name: "JSON-LD Schemas", description: "כל דף מייצר אוטומטית: Course, FAQPage, Organization schemas. גוגל משתמש בהם להצגת Rich Results.", tip: "FAQPage schema מגדיל פי 2-3 את הסיכוי להופיע בתוצאות חיפוש מורחבות." },
      { name: "Open Graph & Twitter Cards", description: "תגי OG אוטומטיים: og:title, og:description, og:image. שיתוף יפה בפייסבוק/לינקדאין." },
      { name: "SEO Title & Description", description: "הגדירו seo_title ו-seo_description בהגדרות הדף. אם לא מוגדרים — המערכת משתמשת בכותרת העמוד." },
      { name: "FAQ = AI Citations", description: "סקציית FAQ מגדילה פי 3.2 את הסיכוי שמנועי AI (ChatGPT, Gemini) יציינו את הדף.", tip: "כתבו תשובות מפורטות (2-3 משפטים) עם מידע ייחודי." },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    title: "הגדרות מערכת",
    description: "הגדרות גלובליות שמשפיעות על כל הדפים.",
    color: "bg-gray-50 text-gray-700 border-gray-200",
    features: [
      { name: "Webhook כללי", description: "URL לשליחת לידים. פועל על כל הדפים שלא הגדירו webhook ייעודי." },
      { name: "מספרי WhatsApp וטלפון", description: "ברירת מחדל לכפתורי WhatsApp ו-Sticky Header. ניתן לדרוס ברמת עמוד." },
      { name: "צבעי מותג", description: "3 צבעים גלובליים: primary, dark, gray. כל הכפתורים, כותרות, ומרכיבים משתמשים בהם. ניתן לדרוס ברמת עמוד." },
      { name: "פונט ולוגו", description: "פונט ברירת מחדל (Rubik) ולוגו שיוצג בכל הדפים. ניתן לדרוס ברמת עמוד." },
    ],
  },
  {
    id: "pixels",
    icon: Monitor,
    title: "ניהול פיקסלים",
    description: "הגדרה ובקרה של מזהי מעקב ל-8 מערכות פרסום ומדידה.",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    features: [
      { name: "8 פלטפורמות נתמכות", description: "GA4, Meta, Google Ads, TikTok, LinkedIn, Outbrain, Taboola, Twitter/X. כל פלטפורמה: מזהה פיקסל + הפעלה/כיבוי + access token לCAPI." },
      { name: "הגדרת פיקסל", description: "בעמוד 'ניהול פיקסלים': לכל פלטפורמה הזינו Pixel ID. הפעילו/כבו. הגדירו CAPI token.", tip: "GA4: G-XXXXXXXXXX. Meta: 15-16 ספרות. Google Ads: AW-XXXXXXXXX." },
      { name: "CAPI Access Tokens", description: "טוקנים לשליחת אירועים בצד שרת. מוצפנים ב-AES-256-GCM לפני שמירה. נדרשים עבור: Meta, TikTok, LinkedIn, Outbrain, Taboola.", tip: "טוקנים רגישים — המערכת מצפינה אותם אוטומטית." },
      { name: "דריסת פיקסלים ברמת עמוד", description: "בהגדרות כל עמוד ← 'מעקב ואנליטיקס': pixel ID חלופי, כיבוי פלטפורמה, או שימוש בגלובלי." },
    ],
  },
  {
    id: "audit",
    icon: ShieldCheck,
    title: "יומן ביקורת (Audit Log)",
    description: "תיעוד מלא של כל פעולות המנהלים במערכת.",
    color: "bg-red-50 text-red-700 border-red-200",
    features: [
      { name: "תיעוד פעולות", description: "כל פעולה מתועדת: יצירה, מחיקה, עריכה, שינוי הגדרות, שכפול, שחזור. כולל: תאריך, משתמש, סוג פעולה, פרטים." },
      { name: "סינון", description: "ניתן לסנן לפי סוג פעולה, עמוד ספציפי, משתמש, או טווח תאריכים." },
      { name: "שמירה", description: "יומן הביקורת נשמר ללא הגבלה. חיוני לעמידה ברגולציה." },
    ],
  },
  {
    id: "languages",
    icon: Globe,
    title: "שפות וכיוון טקסט",
    description: "תמיכה בעברית (RTL), אנגלית (LTR) וערבית (RTL).",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    features: [
      { name: "עברית וערבית — RTL", description: "כל הממשק והעמוד מוצגים מימין לשמאל. חצי CTA, לייאאוט, וטפסים מותאמים אוטומטית." },
      { name: "אנגלית — LTR", description: "טקסטים מיושרים שמאלה, חצים ימינה, לייאאוט מתהפך." },
      { name: "שדות כפולים", description: "כל שדה טקסט קיים בגרסת עברית (_he) ואנגלית (_en). שפת העמוד קובעת מה מוצג." },
    ],
  },
  {
    id: "best-practices",
    icon: Target,
    title: "שיטות עבודה מומלצות",
    description: "טיפים ליצירת דפי נחיתה אפקטיביים.",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    features: [
      { name: "Hero — 3 שניות", description: "המבקר מחליט תוך 3 שניות. כותרת: 5-8 מילים, ברורה, רלוונטית.", tip: "כותרת טובה: 'MBA שמוביל לקריירה'. רעה: 'ברוכים הבאים לאתר הפקולטה'." },
      { name: "CTA — טקסט קצר", description: "2-4 מילים. פועל ציווי: 'השאירו פרטים', 'הצטרפו', 'גלו עוד'." },
      { name: "6-10 סקציות", description: "פחות מ-5 = לא מספיק. יותר מ-12 = ארוך מדי." },
      { name: "בדיקה בנייד", description: "60-70% מהתנועה היא מנייד. בדקו כל דף בנייד לפני פרסום." },
      { name: "A/B Testing", description: "שכפלו עמוד, שנו דבר אחד, שלחו תנועה לשניהם, השוו אחוזי המרה." },
    ],
  },
];

// ============================================================================
// IT Admin Help Sections
// ============================================================================

const IT_ADMIN_SECTIONS: HelpSection[] = [
  {
    id: "it-architecture",
    icon: Server,
    title: "ארכיטקטורת המערכת",
    description: "סקירה טכנית מלאה של המערכת, הרכיבים, וזרימת הנתונים.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    features: [
      { name: "Stack טכנולוגי", description: "Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS. Backend: Next.js API Routes (serverless), Supabase (PostgreSQL + Auth + Storage). Hosting: Vercel (CDN + serverless). Domain: onoleads.vercel.app." },
      { name: "שרתים וסביבות", description: "Production: Vercel (auto-deploy מ-main). Database: Supabase managed PostgreSQL. Storage: Supabase Storage + CDN. אין שרתים פיזיים — הכל serverless.", tip: "Vercel מספק SSL אוטומטי, CDN גלובלי, ו-auto-scaling." },
      { name: "זרימת בקשות", description: "1) מבקר נכנס > Vercel CDN מגיש HTML. 2) React hydration. 3) שליחת טופס > POST /api/leads > Supabase + Webhook + CAPI. 4) אנליטיקס > POST /api/analytics > Supabase. הכל HTTPS." },
      { name: "Database Schema", description: "טבלאות: pages, page_sections, leads, analytics_events, pixel_configurations, page_pixel_overrides, global_settings, shared_sections, page_versions, audit_log. כולן עם Row Level Security (RLS)." },
      { name: "אינטגרציות", description: "Webhook (Make.com/Zapier): POST + JSON. פיקסלים (8 פלטפורמות): client-side + CAPI. Google Maps embed. YouTube embed. Supabase Auth." },
    ],
  },
  {
    id: "it-deployment",
    icon: Zap,
    title: "Deployment ותחזוקה",
    description: "תהליך פריסה, עדכונים, וגיבויים.",
    color: "bg-green-50 text-green-700 border-green-200",
    features: [
      { name: "תהליך פריסה", description: "Push ל-main ב-GitHub > Vercel builds > TypeScript check > deploy. Build time: ~2-3 דק'. Zero downtime." },
      { name: "Rollback", description: "Vercel dashboard: חזרה לכל deployment קודם בלחיצה. DB: Supabase Point-in-Time backups." },
      { name: "Environment Variables", description: "ב-Vercel Dashboard > Settings > Environment Variables. חיוניים: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PIXEL_ENCRYPTION_KEY.", tip: "SERVICE_ROLE_KEY נותן גישה מלאה ל-DB — שמרו בסוד מוחלט." },
      { name: "Domain", description: "ברירת מחדל: onoleads.vercel.app. Custom domain: Vercel > Domains > הוסף > עדכן DNS (CNAME/A). SSL אוטומטי." },
      { name: "ניטור", description: "Vercel: Function logs, build logs, errors. Supabase: SQL editor, table viewer, API logs. GA4: real-time. אין שרתים לנטר." },
      { name: "גיבויים", description: "DB: Supabase Point-in-Time Recovery (7 ימים, Pro plan). Code: GitHub (full history). Media: Supabase Storage (replicated). הכל אוטומטי." },
    ],
  },
  {
    id: "it-performance",
    icon: BarChart3,
    title: "ביצועים",
    description: "מהירות טעינה, CDN, ואופטימיזציות.",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    features: [
      { name: "CDN ו-Caching", description: "Vercel CDN: 100+ edge locations. Static assets: cache ארוך. SSR + edge caching." },
      { name: "Lazy Loading", description: "תמונות, סרטונים, מפות, iframes נטענים רק כשמגיעים לתצוגה." },
      { name: "Code Splitting", description: "Next.js מפצל JS אוטומטית — כל דף טוען רק מה שצריך. Tree shaking מסיר קוד לא בשימוש." },
      { name: "Core Web Vitals", description: "LCP < 2.5s, FID < 100ms, CLS < 0.1. פיקסלים async ולא חוסמים רנדור." },
    ],
  },
  {
    id: "it-troubleshooting",
    icon: AlertTriangle,
    title: "פתרון בעיות נפוצות",
    description: "בעיות נפוצות ופתרונות.",
    color: "bg-red-50 text-red-700 border-red-200",
    features: [
      { name: "500 Error", description: "1) בדקו Vercel Function logs. 2) בדקו Supabase online. 3) בדקו env vars. 4) redeploy." },
      { name: "Webhook לא נשלח", description: "1) URL מוגדר? 2) סטטוס webhook באנליטיקס. 3) URL נגיש? (curl). 4) logs ב-Make.com." },
      { name: "GA4 לא מציג נתונים", description: "1) DevTools > Console > '[pixel] Initializing GA4'. 2) Measurement ID נכון? 3) GA4 Realtime > Active Users. 4) בדקו ללא ad blocker.", tip: "GA4 + Consent Mode שולח cookieless pings גם ללא הסכמה." },
      { name: "Build נכשל", description: "1) Vercel build logs. 2) סיבות: TypeScript errors, missing env vars, package conflicts. 3) 'npm run build' מקומית." },
      { name: "מפת חום ריקה", description: "1) לעמוד יש slug ב-DB? 2) יש אירועי click (analytics_events)? 3) תקופה שנבחרה מכילה נתונים?" },
    ],
  },
];

// ============================================================================
// Security Admin Help Sections
// ============================================================================

const SECURITY_ADMIN_SECTIONS: HelpSection[] = [
  {
    id: "sec-overview",
    icon: Shield,
    title: "סקירת אבטחה כללית",
    description: "ארכיטקטורת אבטחה, שכבות הגנה, ומדיניות.",
    color: "bg-red-50 text-red-700 border-red-200",
    features: [
      { name: "שכבות אבטחה", description: "1) Network: Vercel CDN + DDoS + SSL/TLS 1.3. 2) Application: Input validation, XSS prevention, CSRF. 3) Auth: Supabase Auth (JWT + Refresh). 4) Authorization: RLS on all tables. 5) Encryption: AES-256-GCM. 6) Audit: Full audit log." },
      { name: "HTTPS בלבד", description: "TLS 1.3 על כל התקשורת. SSL certificates אוטומטיים מ-Vercel. HTTP > HTTPS redirect (301). HSTS מופעל." },
      { name: "Authentication", description: "Supabase Auth: Email/Password, Magic Link. JWT עם תוקף מוגבל. Refresh token rotation. Session management server-side." },
      { name: "Authorization (RLS)", description: "Row Level Security על כל הטבלאות. רק authenticated users לדשבורד. JWT validation בכל API request. אין גישה ישירה ל-DB מדפדפן." },
    ],
  },
  {
    id: "sec-data-protection",
    icon: Lock,
    title: "הגנה על נתונים",
    description: "הצפנה, ניקוי קלט, ואבטחת מידע רגיש.",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    features: [
      { name: "הצפנת Tokens (AES-256-GCM)", description: "כל Access Tokens של פיקסלים מוצפנים ב-AES-256-GCM לפני שמירה. מפתח ההצפנה ב-env vars בלבד, לא ב-code.", tip: "AES-256-GCM מספק הצפנה + אימות — לא ניתן לשנות את הנתון המוצפן." },
      { name: "Sanitization של קלט", description: "HTML tags מוסרים, SQL injection נחסם (parameterized queries), XSS נמנע (React escapes). טלפון: רק ספרות. אימייל: regex. שם: trim + max length." },
      { name: "Hashing של PII ב-CAPI", description: "PII (email, phone, name) עובר SHA-256 hashing לפני שליחה לפלטפורמות פרסום. לעולם לא בטקסט גלוי." },
      { name: "Service Role Key", description: "גישה מלאה ל-DB (bypass RLS). רק ב-server-side API routes. לעולם לא נחשף לדפדפן. ב-Vercel env vars בלבד.", tip: "חשד לדליפה? חדשו מיד ב-Supabase Dashboard > Settings > API." },
      { name: "Cookie Security", description: "Session: HttpOnly, Secure, SameSite=Lax. UTM: SameSite=Lax, 90 days. Consent: persistent, user-controlled. אין cookies עם מידע רגיש." },
    ],
  },
  {
    id: "sec-threats",
    icon: AlertTriangle,
    title: "איומים ומניעה",
    description: "איומי אבטחה רלוונטיים ואיך המערכת מתמודדת.",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    features: [
      { name: "XSS", description: "React escapes כל תוכן. Sanitization על user content. CSP headers. URL param injection נחסם." },
      { name: "CSRF", description: "SameSite cookies. Origin header validation. POST requests דורשים JWT Bearer token." },
      { name: "SQL Injection", description: "Supabase client = parameterized queries בלבד. אין SQL גולמי. אין string concatenation בqueries." },
      { name: "DDoS", description: "Vercel CDN DDoS protection. Rate limiting ב-API routes. Supabase connection pooling." },
      { name: "Bot Spam", description: "Client-side validation (טלפון ישראלי, email). Honeypot fields. Rate limiting. עתידי: reCAPTCHA v3." },
      { name: "Token Theft", description: "AES-256-GCM encryption. Short-lived JWT + refresh rotation. HttpOnly cookies. HTTPS only." },
    ],
  },
  {
    id: "sec-compliance",
    icon: ShieldCheck,
    title: "עמידה ברגולציה",
    description: "GDPR, חוק הגנת הפרטיות, Consent Mode.",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    features: [
      { name: "Consent Mode v2 (GDPR)", description: "ברירת מחדל: denied. Cookie banner עם 3 אפשרויות. GA4 cookieless pings ללא הסכמה. שאר הפיקסלים רק אחרי הסכמה. שליחת טופס = הסכמה שיווקית." },
      { name: "מדיניות פרטיות", description: "עמוד /privacy פומבי. לינק בטופס הלידים ובfooter. מפרט: נתונים נאספים, מטרה, משך שמירה, מחיקה." },
      { name: "Audit Log", description: "כל פעולות המנהלים מתועדות: מי, מה, מתי. נדרש ע\"י חוק הגנת הפרטיות ו-GDPR. שמור ללא הגבלה." },
      { name: "Data Minimization", description: "רק שם, טלפון, אימייל. לא ת.ז., כתובת, מידע פיננסי. Click events: קואורדינטות באחוזים בלבד." },
    ],
  },
  {
    id: "sec-incident",
    icon: AlertTriangle,
    title: "תגובה לאירועי אבטחה",
    description: "מה לעשות כשמזהים חשד לפריצה.",
    color: "bg-red-50 text-red-700 border-red-200",
    features: [
      { name: "דליפת Service Role Key", description: "1) חדשו ב-Supabase Dashboard > API. 2) עדכנו ב-Vercel env vars. 3) Redeploy. 4) בדקו audit log." },
      { name: "דליפת Pixel Token", description: "1) בטלו בפלטפורמת הפרסום. 2) צרו טוקן חדש. 3) עדכנו בניהול פיקסלים. ההצפנה מתחדשת אוטומטית." },
      { name: "Spam Leads", description: "1) בדקו patterns בleads table. 2) בדקו referrer + IP. 3) הפעילו reCAPTCHA. 4) rate limiting מחמיר." },
      { name: "שינוי תוכן לא מורשה", description: "1) Audit log — מי שינה, מתי. 2) שחזור גרסה. 3) החליפו סיסמאות. 4) בדקו sessions ב-Supabase Auth." },
    ],
  },
];

// ============================================================================
// Privacy Officer Help Sections
// ============================================================================

const PRIVACY_ADMIN_SECTIONS: HelpSection[] = [
  {
    id: "priv-overview",
    icon: UserCheck,
    title: "סקירת פרטיות — מה אוספים ולמה",
    description: "מידע מלא על הנתונים שנאספים, המטרה, והבסיס החוקי.",
    color: "bg-teal-50 text-teal-700 border-teal-200",
    features: [
      { name: "נתונים מלידים", description: "שם, טלפון, אימייל (הסכמה מפורשת — שליחת טופס). תחום עניין (נבחר ע\"י המבקר). UTM parameters. Device type, referrer. Click IDs.", tip: "הבסיס החוקי: הסכמה מדעת — המבקר ממלא טופס ומסכים למדיניות." },
      { name: "נתונים מביקורים (Analytics)", description: "Page views (cookie_id + timestamp + device). Scroll depth (אחוז). Time on page. Click coordinates (x%, y% — לא תוכן DOM). Form interactions (שם שדה בלבד). כל הנתונים אנונימיים — cookie_id = random UUID." },
      { name: "נתונים שלא נאספים", description: "לא: כתובת, ת.ז., מידע בריאותי/פיננסי, סיסמאות, תוכן DOM, מידע שהוקלד (חוץ משליחת טופס). אין fingerprinting. אין cross-site tracking." },
      { name: "מטרת האיסוף", description: "1) לידים: יצירת קשר עם מתעניינים. 2) Analytics: שיפור דפי נחיתה. 3) Pixels: מדידת אפקטיביות קמפיינים." },
      { name: "משך שמירה", description: "לידים: עד מחיקה ידנית. Analytics: ללא הגבלה (אנונימיים). Cookies: UTM=90 יום, consent=365 יום. Audit log: ללא הגבלה." },
    ],
  },
  {
    id: "priv-consent",
    icon: ShieldCheck,
    title: "מנגנון הסכמה (Consent)",
    description: "איך המערכת מנהלת הסכמת משתמשים.",
    color: "bg-green-50 text-green-700 border-green-200",
    features: [
      { name: "Cookie Consent Banner", description: "כל מבקר חדש רואה באנר. 3 אפשרויות: אשר הכל, דחה (רק חיוניות), הגדרות. ברירת מחדל: denied. נשמר ל-365 יום." },
      { name: "Consent Mode v2 — טכני", description: "ad_storage: denied/granted. analytics_storage: denied/granted. ב-denied: GA4 cookieless pings (conversion modeling), שאר הפיקסלים לא נטענים." },
      { name: "הסכמה דרך טופס", description: "שליחת טופס = הסכמה שיווקית. כל הפיקסלים מופעלים אוטומטית. הטופס כולל טקסט הסכמה + לינק למדיניות.", tip: "טקסט ההסכמה: 'בשליחת הטופס אני מסכים/ה למדיניות הפרטיות ולקבלת חומרי שיווק.'" },
      { name: "שקיפות", description: "עם הסכמה: 8 פיקסלים פעילים + cookies + אנליטיקס מלא. ללא הסכמה: רק GA4 cookieless + first-party analytics (cookie_id ללא PII)." },
    ],
  },
  {
    id: "priv-third-party",
    icon: Network,
    title: "העברת מידע לצדדים שלישיים",
    description: "לאן ואיך נתונים מועברים.",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    features: [
      { name: "פלטפורמות פרסום (CAPI)", description: "Meta, Google, TikTok, LinkedIn, Outbrain, Taboola, Twitter מקבלים: hashed email, hashed phone, hashed name, click ID, event type, timestamp. לעולם לא טקסט גלוי.", tip: "כל פלטפורמה מקבלת רק את ה-hash ואת ה-click ID שלה." },
      { name: "Webhook", description: "נתוני ליד (שם, טלפון, אימייל, UTM) נשלחים בטקסט גלוי ל-webhook URL. HTTPS. האחריות על אבטחה ב-Make.com/Zapier — של הלקוח.", tip: "וודאו URL HTTPS. ב-Make.com/Zapier הגדירו הרשאות מינימליות." },
      { name: "Supabase", description: "כל הנתונים ב-PostgreSQL managed. SOC2 Type II + GDPR compliant. מוצפן at rest (AES-256) ו-in transit (TLS 1.3). Frankfurt region." },
      { name: "Vercel", description: "מארחת את האפליקציה. Function logs (ללא PII). SOC2 Type II. CDN: נתונים לא נשמרים ב-edge." },
    ],
  },
  {
    id: "priv-rights",
    icon: UserCheck,
    title: "זכויות נושאי מידע",
    description: "טיפול בבקשות גישה, מחיקה, ותיקון.",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    features: [
      { name: "זכות עיון (Access)", description: "1) חפשו בleads לפי אימייל/טלפון. 2) חפשו analytics_events לפי cookie_id (אם ידוע). 3) הכינו דו\"ח. 4) השיבו תוך 30 יום." },
      { name: "זכות למחיקה (Erasure)", description: "1) מחקו מleads (Supabase Dashboard). 2) מחקו analytics_events קשורים. 3) אם נשלח ל-webhook/CRM — מחקו גם שם. 4) תעדו.", tip: "שמרו תיעוד של בקשות מחיקה — נדרש ע\"י הרגולטור." },
      { name: "זכות לתיקון", description: "עדכנו ישירות ב-Supabase Dashboard (טבלת leads). שנו את השדה ושמרו." },
      { name: "זכות להתנגד", description: "המבקר יכול: דחיית cookies, בקשת מחיקה, הסרה מרשימות שיווק (CRM). אין כרגע self-service." },
      { name: "Data Portability", description: "ייצוא CSV מדף הלידים. ייצוא ישיר מ-Supabase (SQL/CSV export)." },
    ],
  },
  {
    id: "priv-checklist",
    icon: FileText,
    title: "צ'קליסט ציות — למנהל הפרטיות",
    description: "רשימת בדיקות תקופתית.",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    features: [
      { name: "בדיקה חודשית", description: "1) Audit log — פעולות חריגות? 2) Cookie banner פועל? 3) מדיניות פרטיות מעודכנת? 4) Webhook URLs הם HTTPS?" },
      { name: "בדיקה רבעונית", description: "1) רענון הרשאות — מי צריך גישה? הסירו לא-פעילים. 2) Access tokens בתוקף? 3) כל הפיקסלים נדרשים?" },
      { name: "בדיקה שנתית", description: "1) עדכנו מדיניות פרטיות. 2) סקירת DPA עם ספקים. 3) Data minimization — לא אוספים מיותר?" },
      { name: "מסמכי תיעוד", description: "1) מדיניות פרטיות (פומבית). 2) מסמך עיבודי מידע. 3) DPA עם ספקים. 4) נהלי תגובה לאירוע. 5) יומן בקשות נושאי מידע." },
    ],
  },
];

// ============================================================================
// JSON Guide
// ============================================================================

const JSON_EXAMPLES = [
  {
    id: "benefits", title: "יתרונות (benefits)", description: "כרטיסיות יתרון",
    prompt: `צור JSON של 5 יתרונות ללימודי משפטים באוניברסיטה.\nהפורמט: [{"title_he": "כותרת", "description_he": "תיאור קצר", "icon": "⚖️"}, ...]`,
    example: `[\n  {"title_he": "מסלולים גמישים", "description_he": "לימוד בימים ובשעות שמתאימים לך.", "icon": "🕐"},\n  {"title_he": "הכרה מהמשפחה המשפטית", "description_he": "בוגרי הפקולטה מובילים בבתי משפט.", "icon": "⚖️"}\n]`,
  },
  {
    id: "stats", title: "סטטיסטיקות (stats)", description: "מספרים בולטים",
    prompt: `צור JSON של 4 נתונים סטטיסטיים ללימודי [שם תוכנית].\nהפורמט: [{"value": "95%", "label_he": "שיעור תעסוקה", "icon": "📈"}, ...]`,
    example: `[\n  {"value": "95%", "label_he": "שיעור תעסוקה בתוך שנה", "icon": "📈"},\n  {"value": "3,500+", "label_he": "בוגרים פעילים", "icon": "👩‍💼"}\n]`,
  },
  {
    id: "faq", title: "שאלות נפוצות (faq)", description: "שאלה + תשובה",
    prompt: `צור JSON של 6 שאלות נפוצות ללימודי [שם תוכנית].\nהפורמט: [{"question_he": "שאלה?", "answer_he": "תשובה מפורטת."}, ...]`,
    example: `[\n  {"question_he": "מהי משך הלימודים?", "answer_he": "4 שנים (8 סמסטרים). ניתן ללמוד בקצב מוגבר ולסיים ב-3.5 שנים."},\n  {"question_he": "האם ניתן ללמוד בערב?", "answer_he": "כן, כל הקורסים מתקיימים גם בשעות הערב."}\n]`,
  },
  {
    id: "testimonials", title: "המלצות (testimonials)", description: "ציטוטים מסטודנטים",
    prompt: `צור JSON של 3 המלצות מבוגרי [שם תוכנית].\nהפורמט: [{"name_he": "שם", "quote_he": "ציטוט", "title_he": "תפקיד", "image_url": ""}, ...]`,
    example: `[\n  {"name_he": "מיכל כהן", "quote_he": "הלימודים פתחו לי דלתות שלא ידעתי שקיימות.", "title_he": "בוגרת 2022", "image_url": ""}\n]`,
  },
  {
    id: "curriculum", title: "תוכנית לימודים (curriculum)", description: "שנים + קורסים",
    prompt: `צור JSON לתוכנית לימודים של 4 שנים ב[שם תוכנית].\nהפורמט: [{"year": "שנה א", "courses": ["קורס 1", "קורס 2"]}, ...]`,
    example: `[\n  {"year": "שנה א", "courses": ["מבוא למשפט", "משפט חוקתי", "משפט פלילי א"]},\n  {"year": "שנה ב", "courses": ["דיני קניין", "משפט מסחרי", "דיני עבודה"]}\n]`,
  },
];

// ============================================================================
// Components
// ============================================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[11px] font-semibold text-[#716C70] hover:text-[#B8D900] transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "הועתק!" : "העתק"}
    </button>
  );
}

function JsonGuideSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  return (
    <div id="json-guide" className="rounded-2xl border border-[#E5E5E5] overflow-hidden">
      <div className="bg-[#2A2628] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-[#B8D900]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">מדריך JSON, יצירה עם AI</h3>
            <p className="text-xs text-white/50 mt-0.5">לכל סוג סקציה, פרומפט מוכן + דוגמה</p>
          </div>
        </div>
      </div>
      <div className="bg-[#B8D900]/5 border-b border-[#E5E5E5] px-5 py-3">
        <p className="text-xs text-[#4A4648] leading-relaxed">
          <strong>איך עובד:</strong> העתק פרומפט ל-ChatGPT/Claude, החלף <code className="font-mono bg-white px-1 rounded">[שם תוכנית]</code>, הדבק JSON בעורך.
        </p>
      </div>
      <div className="divide-y divide-[#F0F0F0]">
        {JSON_EXAMPLES.map((ex) => (
          <div key={ex.id} className="overflow-hidden">
            <button onClick={() => setActiveId(activeId === ex.id ? null : ex.id)} className="w-full flex items-center justify-between px-5 py-3.5 text-right hover:bg-[#FAFAFA] transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#2A2628] text-[#B8D900] font-mono text-[10px] font-bold">{ex.id}</span>
                <div><span className="text-sm font-semibold text-[#2A2628]">{ex.title}</span><span className="text-xs text-[#9A969A] mr-2">{ex.description}</span></div>
              </div>
              {activeId === ex.id ? <ChevronUp className="w-4 h-4 text-[#9A969A] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#9A969A] shrink-0" />}
            </button>
            {activeId === ex.id && (
              <div className="px-5 pb-4 space-y-4 bg-[#FAFAFA]">
                <div>
                  <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">פרומפט</span><CopyButton text={ex.prompt} /></div>
                  <pre className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 font-mono whitespace-pre-wrap leading-relaxed">{ex.prompt}</pre>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider">דוגמה</span><CopyButton text={ex.example} /></div>
                  <pre className="bg-[#2A2628] rounded-xl p-3 text-[11px] text-[#B8D900] font-mono overflow-x-auto whitespace-pre leading-relaxed">{ex.example}</pre>
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
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 text-right hover:opacity-90 transition-opacity">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/50 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></div>
          <div><h3 className="text-sm font-bold leading-tight">{section.title}</h3><p className="text-xs opacity-70 mt-0.5 font-normal">{section.description}</p></div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 shrink-0 opacity-50" /> : <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />}
      </button>
      {open && (
        <div className="bg-white/60 border-t border-current/10 px-5 py-4 space-y-3">
          {section.features.map((feature, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-current mt-2 shrink-0 opacity-50" />
              <div>
                <p className="text-sm font-semibold">{feature.name}</p>
                <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{feature.description}</p>
                {feature.tip && <p className="text-xs mt-1.5 px-2.5 py-1.5 rounded-lg bg-white/70 border border-current/10 opacity-80 font-mono">💡 {feature.tip}</p>}
                {feature.codeExample && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider">דוגמה</span><CopyButton text={feature.codeExample} /></div>
                    <pre className="bg-[#2A2628] rounded-xl p-3 text-[10px] text-[#B8D900] font-mono overflow-x-auto whitespace-pre leading-relaxed">{feature.codeExample}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tabs
// ============================================================================

const TABS: { key: HelpTab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "general", label: "מרכז עזרה כללי", icon: BookOpen, desc: "כל היכולות והטיפים" },
  { key: "it-admin", label: "מנהל מערכות מידע", icon: Server, desc: "ארכיטקטורה, deployment, תחזוקה" },
  { key: "security", label: "מנהל אבטחת מידע", icon: Shield, desc: "אבטחה, איומים, compliance" },
  { key: "privacy", label: "מנהל הפרטיות", icon: UserCheck, desc: "פרטיות, הסכמה, זכויות" },
];

// ============================================================================
// Main Page
// ============================================================================

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<HelpTab>("general");

  const getSections = (): HelpSection[] => {
    switch (activeTab) {
      case "it-admin": return IT_ADMIN_SECTIONS;
      case "security": return SECURITY_ADMIN_SECTIONS;
      case "privacy": return PRIVACY_ADMIN_SECTIONS;
      default: return HELP_SECTIONS;
    }
  };

  const sections = getSections();
  const filtered = sections.filter((s) =>
    !search || s.title.includes(search) || s.description.includes(search) ||
    s.features.some((f) => f.name.includes(search) || f.description.includes(search))
  );

  return (
    <div className="p-8 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[#8aac00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2A2628]">מרכז העזרה</h1>
            <p className="text-sm text-[#9A969A]">מדריך מלא למערכת OnoLeads — לכל תפקיד</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(""); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                isActive ? "bg-[#2A2628] text-white border-[#2A2628] shadow-md" : "bg-white text-[#716C70] border-[#E5E5E5] hover:border-[#B8D900] hover:text-[#2A2628]"
              }`}>
              <TabIcon className={`w-5 h-5 ${isActive ? "text-[#B8D900]" : ""}`} />
              <span className="text-xs font-bold leading-tight">{tab.label}</span>
              <span className={`text-[10px] leading-tight ${isActive ? "text-white/60" : "text-[#9A969A]"}`}>{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש..."
          className="w-full h-10 pr-10 pl-4 rounded-xl border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#B8D900]/50" />
      </div>

      {/* Quick stats (general only) */}
      {activeTab === "general" && !search && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "סוגי סקציות", value: "18+", icon: Layers },
            { label: "פלטפורמות מעקב", value: "8", icon: TrendingUp },
            { label: "כלי המרות", value: "6", icon: Target },
            { label: "שפות", value: "3", icon: Globe },
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
      )}

      {/* Role intro banners */}
      {activeTab === "it-admin" && !search && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2"><Server className="w-5 h-5 text-blue-600" /><h2 className="text-sm font-bold text-blue-800">עזרה למנהל מערכות מידע</h2></div>
          <p className="text-xs text-blue-700 leading-relaxed">מדריך טכני מלא: ארכיטקטורה (Next.js 14 + Supabase + Vercel), deployment, ניטור, גיבויים, ביצועים, ופתרון בעיות. אין שרתים פיזיים — הכל serverless.</p>
        </div>
      )}
      {activeTab === "security" && !search && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5 text-red-600" /><h2 className="text-sm font-bold text-red-800">עזרה למנהל אבטחת מידע</h2></div>
          <p className="text-xs text-red-700 leading-relaxed">סקירת אבטחה: שכבות הגנה, הצפנה (AES-256-GCM, TLS 1.3), איומים ומניעה, Consent Mode v2, audit log, ונהלי תגובה לאירועים.</p>
        </div>
      )}
      {activeTab === "privacy" && !search && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2"><UserCheck className="w-5 h-5 text-teal-600" /><h2 className="text-sm font-bold text-teal-800">עזרה למנהל הפרטיות</h2></div>
          <p className="text-xs text-teal-700 leading-relaxed">מדריך פרטיות: מה נאסף ולמה, מנגנון הסכמה (Consent Mode v2), העברה לצדדים שלישיים, זכויות נושאי מידע, וצ&apos;קליסט ציות תקופתי.</p>
        </div>
      )}

      {/* Help cards */}
      <div className="space-y-3">
        {filtered.map((section) => <HelpCard key={section.id} section={section} />)}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#9A969A]">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>לא נמצאו תוצאות עבור &ldquo;{search}&rdquo;</p>
          </div>
        )}
      </div>

      {/* JSON Guide (general only) */}
      {activeTab === "general" && <div className="mt-8"><JsonGuideSection /></div>}
    </div>
  );
}
