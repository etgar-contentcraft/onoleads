import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | הקריה האקדמית אונו",
  description: "מדיניות הפרטיות של הקריה האקדמית אונו - הגנת פרטיות והשימוש בנתונים אישיים",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl" lang="he">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-[#2a2628] mb-8 font-heading">
          מדיניות פרטיות
        </h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <p className="text-sm text-gray-500">עודכן לאחרונה: מרץ 2026</p>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">1. כללי</h2>
          <p>
            הקריה האקדמית אונו (להלן: &quot;המכללה&quot;) מכבדת את פרטיות המשתמשים באתר זה
            ומחויבת להגן על המידע האישי שנאסף באמצעותו, בהתאם לחוק הגנת הפרטיות,
            התשמ&quot;א-1981, ותקנותיו.
          </p>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">2. מידע שנאסף</h2>
          <p>במהלך השימוש באתר, אנו עשויים לאסוף את המידע הבא:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>שם מלא, מספר טלפון וכתובת דוא&quot;ל (בעת מילוי טופס פנייה)</li>
            <li>תחום עניין אקדמי (תוכנית לימודים מבוקשת)</li>
            <li>מידע טכני: כתובת IP, סוג דפדפן, מערכת הפעלה</li>
            <li>עוגיות (cookies) לזיהוי ומעקב אחר פעילות באתר</li>
            <li>פרמטרי קמפיין שיווקי (UTM)</li>
          </ul>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">3. שימוש במידע</h2>
          <p>המידע שנאסף משמש למטרות הבאות:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>יצירת קשר עם מתעניינים בתוכניות הלימוד</li>
            <li>שיפור חוויית הגלישה והתאמת תוכן</li>
            <li>ניתוח סטטיסטי של תנועת הגולשים באתר</li>
            <li>שליחת מידע שיווקי (בכפוף להסכמה)</li>
          </ul>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">4. עוגיות (Cookies)</h2>
          <p>
            האתר משתמש בעוגיות לצורך שיפור חוויית השימוש, זיכרון העדפות המשתמש,
            וניתוח תנועה. ניתן לשלוט בהגדרות העוגיות דרך הגדרות הדפדפן.
          </p>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">5. אבטחת מידע</h2>
          <p>
            אנו נוקטים אמצעי אבטחה סבירים להגנה על המידע האישי שנאסף, כולל הצפנת
            נתונים בהעברה (SSL), אחסון מאובטח, והגבלת גישה לגורמים מורשים בלבד.
          </p>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">6. שיתוף מידע</h2>
          <p>
            איננו מוכרים, משכירים או מעבירים מידע אישי לצדדים שלישיים, למעט: ספקי
            שירות הפועלים מטעמנו (כגון מערכת CRM), או כנדרש על פי חוק.
          </p>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">7. זכויות המשתמש</h2>
          <p>
            בהתאם לחוק הגנת הפרטיות, כל אדם רשאי לעיין במידע שנאסף אודותיו, לבקש
            תיקון או מחיקה של מידע, ולהתנגד לשימוש במידע למטרות שיווק.
          </p>

          <h2 className="text-xl font-bold text-[#2a2628] mt-8">8. יצירת קשר</h2>
          <p>
            לשאלות בנוגע למדיניות הפרטיות, ניתן לפנות אלינו:
            <br />
            הקריה האקדמית אונו
            <br />
            רח&apos; צה&quot;ל 104, קריית אונו 5500000
            <br />
            טלפון: *2899
            <br />
            דוא&quot;ל: info@ono.ac.il
          </p>
        </div>

        <div className="mt-12 pt-8 border-t">
          <a
            href="/"
            className="text-[#B8D900] hover:underline font-semibold"
          >
            ← חזרה לדף הבית
          </a>
        </div>
      </div>
    </div>
  );
}
