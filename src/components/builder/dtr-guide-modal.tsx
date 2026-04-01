"use client";

/**
 * DTR Guide Modal — explains how to use dynamic text replacement tokens
 * in section titles and content fields. Opened via a "?" help link.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface DtrGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Supported variable definitions */
const VARIABLES = [
  { key: "utm_source", desc: "מקור התנועה", example: "Facebook, Google, Instagram" },
  { key: "utm_medium", desc: "ערוץ השיווק", example: "cpc, social, email" },
  { key: "utm_campaign", desc: "שם הקמפיין", example: "spring_2026, law_ma" },
  { key: "utm_content", desc: "תוכן המודעה", example: "banner_1, video_ad" },
  { key: "utm_term", desc: "מילת מפתח", example: "לימודי משפטים, MBA" },
  { key: "referrer", desc: "דף המקור", example: "google.com, facebook.com" },
];

const EXAMPLES = [
  {
    title: "כותרת עם מקור התנועה",
    template: "לימודי משפטים מ-{{utm_source|הקריה האקדמית אונו}}",
    scenarios: [
      { params: "utm_source=Facebook", result: "לימודי משפטים מ-Facebook" },
      { params: "utm_source=Google", result: "לימודי משפטים מ-Google" },
      { params: "(ללא פרמטר)", result: "לימודי משפטים מ-הקריה האקדמית אונו" },
    ],
  },
  {
    title: "שם קמפיין בכותרת",
    template: "תוכנית {{utm_campaign}} — הרשמה פתוחה",
    scenarios: [
      { params: "utm_campaign=MBA", result: "תוכנית MBA — הרשמה פתוחה" },
      { params: "(ללא פרמטר)", result: "תוכנית  — הרשמה פתוחה" },
    ],
  },
  {
    title: "מילת מפתח עם fallback",
    template: "הצטרפו ללימודי {{utm_term|מנהל עסקים}} באונו",
    scenarios: [
      { params: "utm_term=חשבונאות", result: "הצטרפו ללימודי חשבונאות באונו" },
      { params: "(ללא פרמטר)", result: "הצטרפו ללימודי מנהל עסקים באונו" },
    ],
  },
];

/**
 * Modal dialog that displays a comprehensive DTR (Dynamic Text Replacement) guide.
 * Covers syntax, available variables, practical examples, testing tips, and best practices.
 * @param {boolean} open - whether the modal is visible
 * @param {function} onOpenChange - callback to toggle visibility
 */
export function DtrGuideModal({ open, onOpenChange }: DtrGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-bold text-[#2A2628]">
            מדריך כותרות דינמיות (DTR)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* What is DTR */}
          <section>
            <h3 className="font-heading font-bold text-[#2A2628] mb-2">מה זה טקסט דינמי?</h3>
            <p className="text-[#716C70] leading-relaxed">
              טקסט דינמי מאפשר לכם להתאים את תוכן העמוד אוטומטית על פי הפרמטרים ב-URL
              (UTM parameters) של המבקר. כך תוכלו להציג כותרת שונה למבקרים מפייסבוק
              לעומת מבקרים מגוגל — בלי ליצור עמודים נפרדים.
            </p>
          </section>

          {/* Syntax */}
          <section>
            <h3 className="font-heading font-bold text-[#2A2628] mb-2">תחביר</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Badge variant="outline" className="font-mono shrink-0 mt-0.5" dir="ltr">{"{{variable}}"}</Badge>
                <p className="text-[#716C70]">מוחלף בערך הפרמטר מה-URL. אם הפרמטר לא קיים — נשאר ריק.</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Badge variant="outline" className="font-mono shrink-0 mt-0.5" dir="ltr">{"{{variable|fallback}}"}</Badge>
                <p className="text-[#716C70]">מוחלף בערך הפרמטר. אם לא קיים — מוצג טקסט ברירת המחדל (fallback).</p>
              </div>
            </div>
          </section>

          {/* Available variables */}
          <section>
            <h3 className="font-heading font-bold text-[#2A2628] mb-2">משתנים זמינים</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-right py-2 px-3 font-semibold text-[#2A2628]">משתנה</th>
                    <th className="text-right py-2 px-3 font-semibold text-[#2A2628]">תיאור</th>
                    <th className="text-right py-2 px-3 font-semibold text-[#2A2628]">דוגמאות</th>
                  </tr>
                </thead>
                <tbody>
                  {VARIABLES.map((v) => (
                    <tr key={v.key} className="border-t">
                      <td className="py-2 px-3 font-mono text-xs text-[#B8D900]" dir="ltr">{`{{${v.key}}}`}</td>
                      <td className="py-2 px-3 text-[#716C70]">{v.desc}</td>
                      <td className="py-2 px-3 text-[#9A969A] text-xs">{v.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Examples */}
          <section>
            <h3 className="font-heading font-bold text-[#2A2628] mb-2">דוגמאות מעשיות</h3>
            <div className="space-y-4">
              {EXAMPLES.map((ex, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-[#2A2628]">{ex.title}</p>
                  <div className="p-2 rounded bg-[#2A2628] text-white font-mono text-xs" dir="ltr">
                    {ex.template}
                  </div>
                  <div className="space-y-1.5">
                    {ex.scenarios.map((s, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span className="text-[#9A969A] shrink-0 w-40" dir="ltr">{s.params}</span>
                        <span className="text-[#716C70]">{"\u2190"}</span>
                        <span className="text-[#2A2628] font-medium">{s.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* How to test */}
          <section>
            <h3 className="font-heading font-bold text-[#2A2628] mb-2">איך לבדוק?</h3>
            <div className="p-4 rounded-lg bg-[#B8D900]/5 border border-[#B8D900]/20">
              <p className="text-[#716C70] mb-3">
                פשוט הוסיפו פרמטרים ל-URL של העמוד:
              </p>
              <div className="p-2 rounded bg-[#2A2628] text-white font-mono text-xs break-all" dir="ltr">
                https://onoleads.vercel.app/lp/law-ma?utm_source=Facebook&utm_campaign=Spring2026
              </div>
              <p className="text-[#9A969A] text-xs mt-2">
                טיפ: כשמפרסמים בפייסבוק או גוגל, הפרמטרים מתווספים אוטומטית לכל לינק.
              </p>
            </div>
          </section>

          {/* Best practices */}
          <section>
            <h3 className="font-heading font-bold text-[#2A2628] mb-2">טיפים</h3>
            <ul className="space-y-2 text-[#716C70]">
              <li className="flex gap-2">
                <span className="text-[#B8D900] shrink-0">&#10003;</span>
                <span>תמיד השתמשו ב-fallback כדי שהכותרת תיראה טוב גם בלי UTM</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#B8D900] shrink-0">&#10003;</span>
                <span>בדקו את העמוד גם עם וגם בלי פרמטרים</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#B8D900] shrink-0">&#10003;</span>
                <span>שמרו על כותרות קצרות — גם אחרי ההחלפה</span>
              </li>
              <li className="flex gap-2">
                <span className="text-red-400 shrink-0">&#10007;</span>
                <span>אל תשימו את כל הכותרת בתוך משתנה — רק חלקים ספציפיים</span>
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
