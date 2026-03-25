/**
 * Privacy policy page in Hebrew.
 * Covers Israeli Privacy Protection Law 5741-1981 and GDPR requirements.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "מדיניות פרטיות | הקריה האקדמית אונו",
  description: "מדיניות הפרטיות של הקריה האקדמית אונו - הגנת פרטיות והשימוש בנתונים אישיים",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" dir="rtl" lang="he">
      {/* Header accent */}
      <div className="h-1 bg-gradient-to-l from-[#B8D900] via-[#c8e920] to-[#B8D900]" />

      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-10">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm text-[#B8D900] hover:underline font-medium mb-6"
          >
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
            </svg>
            חזרה לדף הבית
          </a>
          <h1 className="text-3xl font-bold text-[#2a2628] font-heading">
            מדיניות פרטיות
          </h1>
          <p className="text-sm text-gray-500 mt-2">עודכן לאחרונה: מרץ 2026</p>
        </div>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">1. כללי</h2>
            <p>
              הקריה האקדמית אונו (להלן: &quot;המוסד&quot; או &quot;אנחנו&quot;) מכבדת את פרטיות המשתמשים באתר זה
              ומחויבת להגן על המידע האישי שנאסף באמצעותו. מדיניות פרטיות זו מפרטת כיצד אנו אוספים,
              משתמשים, שומרים ומגנים על המידע שלכם, בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981,
              תקנות הגנת הפרטיות (אבטחת מידע), התשע&quot;ז-2017, והתקנה הכללית להגנה על מידע (GDPR)
              ככל שחלה.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">2. מידע שאנו אוספים</h2>
            <p>אנו אוספים את סוגי המידע הבאים:</p>

            <h3 className="text-lg font-semibold text-[#2a2628] mt-4">2.1 מידע שנמסר על ידכם</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>שם מלא</li>
              <li>מספר טלפון</li>
              <li>כתובת דואר אלקטרוני</li>
              <li>תחום עניין אקדמי (תוכנית לימודים מבוקשת)</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#2a2628] mt-4">2.2 מידע שנאסף אוטומטית</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>כתובת IP</li>
              <li>סוג מכשיר (מחשב, טלפון, טאבלט)</li>
              <li>מקור ההפניה (Referrer URL)</li>
              <li>פרמטרי קמפיין שיווקי (UTM)</li>
              <li>עוגיות מזהה (Cookie ID) - ראשוניות בלבד (First-party)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">3. מטרות השימוש במידע</h2>
            <p>המידע שנאסף משמש אך ורק למטרות הבאות:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>יצירת קשר עם מתעניינים בתוכניות הלימוד של המוסד</li>
              <li>שיפור חוויית הגלישה והתאמת תוכן</li>
              <li>ניתוח סטטיסטי אנונימי של תנועת הגולשים באתר</li>
              <li>שיפור המערכת והשירות</li>
            </ul>
            <p>
              <strong>אנו לא משתמשים במידע למטרות שיווק ישיר ללא הסכמה מפורשת.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">4. עוגיות (Cookies)</h2>
            <p>האתר משתמש בעוגיות ראשוניות (First-party) בלבד. אנו לא משתמשים בעוגיות צד שלישי.</p>

            <h3 className="text-lg font-semibold text-[#2a2628] mt-4">סוגי העוגיות באתר:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>עוגיות חיוניות:</strong> נדרשות לתפקוד תקין של האתר, כולל אבטחה וניהול הפעלה (Session)</li>
              <li><strong>עוגיות ניתוח:</strong> עוזרות לנו להבין כיצד משתמשים מנווטים באתר, לצורך שיפור חוויית המשתמש</li>
            </ul>
            <p>
              תוכלו לנהל את העדפות העוגיות שלכם באמצעות באנר העוגיות המופיע בכניסה לאתר,
              או דרך הגדרות הדפדפן שלכם.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">5. אבטחת מידע</h2>
            <p>אנו נוקטים באמצעי אבטחה מתקדמים להגנה על המידע האישי:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>הצפנת נתונים בהעברה באמצעות TLS/SSL</li>
              <li>אחסון מאובטח בשרתי ענן מוגנים עם הצפנה במנוחה (At-rest encryption)</li>
              <li>הגבלת גישה למידע לגורמים מורשים בלבד</li>
              <li>ביקורות אבטחה תקופתיות</li>
              <li>הגנת CSRF (Cross-Site Request Forgery)</li>
              <li>סינון קלט והגנה מפני XSS (Cross-Site Scripting)</li>
              <li>הגבלת קצב בקשות (Rate Limiting)</li>
              <li>כותרות אבטחה (Security Headers) בהתאם לשיטות המומלצות</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">6. שמירת מידע</h2>
            <p>
              מידע אישי נשמר לתקופה הנדרשת למימוש המטרות שלשמן נאסף, ובהתאם לדרישות חוקיות.
              פניות של מתעניינים נשמרות לתקופה של עד 24 חודשים, אלא אם נדרש אחרת על פי דין.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">7. שיתוף מידע עם צדדים שלישיים</h2>
            <p>
              איננו מוכרים, משכירים או מעבירים מידע אישי לצדדים שלישיים, למעט:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>ספקי שירות הפועלים מטעמנו (כגון מערכת CRM), הכפופים להסכמי סודיות</li>
              <li>כנדרש על פי חוק, צו בית משפט או דרישה של רשות מוסמכת</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">8. זכויות המשתמש</h2>
            <p>בהתאם לחוק הגנת הפרטיות, כל אדם רשאי:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>לעיין במידע שנאסף אודותיו</li>
              <li>לבקש תיקון מידע שגוי</li>
              <li>לבקש מחיקת מידע</li>
              <li>להתנגד לשימוש במידע למטרות שיווק</li>
              <li>לבקש העברת מידע (ניידות מידע)</li>
              <li>להגיש תלונה לרשות להגנת הפרטיות</li>
            </ul>
            <p>
              לצורך מימוש זכויותיכם, ניתן לפנות אלינו בפרטי הקשר המופיעים בסעיף 10 להלן.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">9. שינויים במדיניות</h2>
            <p>
              אנו שומרים על הזכות לעדכן מדיניות פרטיות זו מעת לעת. שינויים מהותיים יפורסמו באתר
              עם תאריך עדכון חדש. המשך השימוש באתר לאחר עדכון המדיניות מהווה הסכמה למדיניות המעודכנת.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">10. יצירת קשר</h2>
            <p>
              לשאלות, בקשות או תלונות בנוגע למדיניות הפרטיות ולעיבוד מידע אישי, ניתן לפנות אלינו:
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mt-3">
              <p className="font-semibold text-[#2a2628]">הקריה האקדמית אונו</p>
              <p>רח&apos; צה&quot;ל 104, קריית אונו 5500000</p>
              <p>טלפון: *2899</p>
              <p>דוא&quot;ל: info@ono.ac.il</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-[#B8D900] hover:underline font-semibold"
          >
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6l6 6-6 6" />
            </svg>
            חזרה לדף הבית
          </a>
        </div>
      </div>
    </div>
  );
}
