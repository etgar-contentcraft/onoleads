/**
 * Terms of service page in Hebrew.
 * Covers usage terms for the OnoLeads platform landing pages.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "תנאי שימוש | הקריה האקדמית אונו",
  description: "תנאי השימוש באתר הקריה האקדמית אונו",
};

export default function TermsPage() {
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
            תנאי שימוש
          </h1>
          <p className="text-sm text-gray-500 mt-2">עודכן לאחרונה: מרץ 2026</p>
        </div>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">1. כללי</h2>
            <p>
              ברוכים הבאים לאתר הקריה האקדמית אונו (להלן: &quot;האתר&quot;). השימוש באתר ובשירותים
              המוצעים בו כפוף לתנאי שימוש אלה. גלישה באתר ו/או שימוש בשירותיו מהווים
              הסכמה לתנאים אלה. אם אינכם מסכימים לתנאי השימוש, אנא הימנעו משימוש באתר.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">2. השירותים באתר</h2>
            <p>האתר מספק מידע אודות תוכניות הלימוד בהקריה האקדמית אונו ומאפשר:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>עיון במידע אודות תוכניות לימוד, התמחויות ומסלולים אקדמיים</li>
              <li>השארת פרטי קשר לצורך קבלת מידע נוסף מיועצי לימודים</li>
              <li>צפייה בתוכן שיווקי ואינפורמטיבי</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">3. קניין רוחני</h2>
            <p>
              כל התכנים באתר, לרבות טקסטים, תמונות, סמלים, עיצובים, תוכנה וקוד מקור,
              הם רכוש הקריה האקדמית אונו או צדדים שלישיים שנתנו רישיון לשימוש בהם.
              אין להעתיק, לשכפל, להפיץ או לעשות שימוש מסחרי בתכנים ללא אישור מראש ובכתב.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">4. שימוש מותר</h2>
            <p>בעת השימוש באתר, הנכם מתחייבים:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>לעשות שימוש באתר בהתאם לכל דין</li>
              <li>לא להעלות תוכן פוגעני, מטעה או מפר זכויות</li>
              <li>לא לנסות לפרוץ, לשנות או לשבש את פעולת האתר</li>
              <li>לא לבצע פעולות אוטומטיות (כגון סריקה) ללא אישור</li>
              <li>למסור פרטים אישיים מדויקים ונכונים בעת מילוי טפסים</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">5. הגבלת אחריות</h2>
            <p>
              המידע באתר מסופק &quot;כפי שהוא&quot; (As Is). הקריה האקדמית אונו עושה מאמצים
              לוודא שהמידע מדויק ועדכני, אך אינה מתחייבת לכך. המוסד לא יישא באחריות
              לנזק ישיר או עקיף שייגרם כתוצאה משימוש באתר או הסתמכות על המידע המופיע בו.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">6. קישורים חיצוניים</h2>
            <p>
              האתר עשוי לכלול קישורים לאתרים חיצוניים. אנו לא אחראים לתוכן, למדיניות הפרטיות
              או לשיטות האבטחה של אתרים אלה. כניסה לאתרים חיצוניים היא על אחריותכם בלבד.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">7. פרטיות</h2>
            <p>
              איסוף המידע והשימוש בו כפופים ל
              <a href="/privacy" className="text-[#B8D900] hover:underline font-medium mx-1">
                מדיניות הפרטיות
              </a>
              שלנו, המהווה חלק בלתי נפרד מתנאי שימוש אלה.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">8. נגישות</h2>
            <p>
              הקריה האקדמית אונו מחויבת להנגשת האתר בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות,
              התשנ&quot;ח-1998, ותקנותיו, ובהתאם לתקן הישראלי 5568 ולהנחיות WCAG 2.1 ברמה AA.
              אם נתקלתם בבעיית נגישות, אנא פנו אלינו ונטפל בכך בהקדם.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">9. שינויים בתנאים</h2>
            <p>
              הקריה האקדמית אונו רשאית לשנות תנאים אלה מעת לעת. שינויים יכנסו לתוקף עם פרסומם באתר.
              המשך השימוש באתר לאחר פרסום השינויים מהווה הסכמה לתנאים המעודכנים.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">10. דין חל וסמכות שיפוט</h2>
            <p>
              על תנאי שימוש אלה יחולו דיני מדינת ישראל. סמכות השיפוט הבלעדית תהיה נתונה
              לבתי המשפט המוסמכים במחוז תל אביב-יפו.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#2a2628] mt-8">11. יצירת קשר</h2>
            <p>לשאלות בנוגע לתנאי השימוש, ניתן לפנות אלינו:</p>
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
