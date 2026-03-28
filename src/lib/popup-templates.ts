/**
 * Pre-designed popup campaign templates for common conversion scenarios.
 * These are static definitions — when a user picks a template, the content
 * is copied into a new popup_campaigns row in the database.
 */

import type { PopupTemplate } from "@/lib/types/popup-campaigns";

export const POPUP_TEMPLATES: PopupTemplate[] = [
  // ── Exit Intent ────────────────────────────────────────────────────────

  {
    id: "exit_last_chance",
    name_he: "הזדמנות אחרונה להירשם",
    description_he: "פופאפ דחיפות — נלכד כשהמשתמש מנסה לעזוב את העמוד",
    campaign_type: "exit_intent",
    icon: "🚪",
    content: {
      title_he: "רגע! לפני שעוזבים...",
      body_he: "ההרשמה לסמסטר הקרוב נסגרת בקרוב. השאירו פרטים עכשיו ויועץ לימודים יחזור אליכם תוך שעה.",
      cta_text_he: "כן, אני רוצה לשמור מקום",
      dismiss_text_he: "לא תודה, אוותר",
      bg_color: "#ffffff",
      accent_color: "#B8D900",
      include_form: false,
    },
    trigger_config: { sensitivity: "medium" },
  },
  {
    id: "exit_free_consultation",
    name_he: "ייעוץ לימודים חינם",
    description_he: "הצעת ייעוץ אישי ללא עלות — כולל טופס ליד מובנה",
    campaign_type: "exit_intent",
    icon: "💬",
    content: {
      title_he: "קבלו ייעוץ לימודים חינם!",
      body_he: "לא בטוחים מה ללמוד? יועץ אקדמי מנוסה ישמח ללוות אתכם בבחירת המסלול המתאים — ללא כל התחייבות.",
      cta_text_he: "לתיאום שיחת ייעוץ",
      dismiss_text_he: "אולי מאוחר יותר",
      bg_color: "#ffffff",
      accent_color: "#B8D900",
      include_form: true,
    },
    trigger_config: { sensitivity: "medium" },
  },
  {
    id: "exit_brochure",
    name_he: "הורדת חוברת מידע",
    description_he: "הצעה להוריד חוברת תוכנית לימודים — כולל טופס ליד",
    campaign_type: "exit_intent",
    icon: "📄",
    content: {
      title_he: "רוצים לקרוא על זה בשקט?",
      body_he: "השאירו פרטים ונשלח לכם חוברת מידע מלאה על התוכנית ישירות למייל — בחינם.",
      cta_text_he: "שלחו לי את החוברת",
      dismiss_text_he: "לא צריך, תודה",
      bg_color: "#ffffff",
      accent_color: "#B8D900",
      include_form: true,
    },
    trigger_config: { sensitivity: "medium" },
  },

  // ── Timed ──────────────────────────────────────────────────────────────

  {
    id: "timed_limited_spots",
    name_he: "מקומות מוגבלים",
    description_he: "פופאפ דחיפות שמופיע לאחר 15 שניות בעמוד",
    campaign_type: "timed",
    icon: "🔥",
    content: {
      title_he: "נותרו מקומות אחרונים!",
      body_he: "המחזור הקרוב כמעט מלא. הבטיחו את מקומכם עכשיו — השאירו פרטים ויועץ יחזור אליכם היום.",
      cta_text_he: "שמרו לי מקום",
      dismiss_text_he: "אמשיך לקרוא",
      bg_color: "#ffffff",
      accent_color: "#ef4444",
      include_form: false,
    },
    trigger_config: { delay_seconds: 15 },
  },
  {
    id: "timed_open_day",
    name_he: "הזמנה ליום פתוח",
    description_he: "הזמנה לאירוע הכרות — מופיע לאחר 20 שניות",
    campaign_type: "timed",
    icon: "🎓",
    content: {
      title_he: "בואו להכיר אותנו מקרוב!",
      body_he: "יום פתוח הקרוב שלנו — הירשמו עכשיו ותוכלו לסייר בקמפוס, לפגוש מרצים ולשמוע על מסלולי הלימוד.",
      cta_text_he: "הרשמה ליום הפתוח",
      dismiss_text_he: "לא הפעם",
      bg_color: "#ffffff",
      accent_color: "#B8D900",
      include_form: true,
    },
    trigger_config: { delay_seconds: 20 },
  },
  {
    id: "timed_scholarship",
    name_he: "בדיקת זכאות למלגה",
    description_he: "הצעה לבדוק זכאות למלגה — מופיע לאחר 25 שניות",
    campaign_type: "timed",
    icon: "🎁",
    content: {
      title_he: "ייתכן שמגיעה לכם מלגה!",
      body_he: "אונו מעניקה מלגות לסטודנטים חדשים. השאירו פרטים ונבדוק את הזכאות שלכם — ללא התחייבות.",
      cta_text_he: "בדקו זכאות למלגה",
      dismiss_text_he: "אולי אחר כך",
      bg_color: "#ffffff",
      accent_color: "#B8D900",
      include_form: true,
    },
    trigger_config: { delay_seconds: 25 },
  },

  // ── Scroll Triggered ───────────────────────────────────────────────────

  {
    id: "scroll_interested",
    name_he: "נראה שמעניין אתכם",
    description_he: "פופאפ רך שמופיע לאחר 50% גלילה",
    campaign_type: "scroll_triggered",
    icon: "👀",
    content: {
      title_he: "נראה שהתוכנית מעניינת אתכם",
      body_he: "רוצים לשמוע עוד? השאירו פרטים ויועץ לימודים ייצור אתכם קשר לשיחה קצרה — ללא התחייבות.",
      cta_text_he: "כן, ספרו לי עוד",
      dismiss_text_he: "אמשיך לקרוא קודם",
      bg_color: "#ffffff",
      accent_color: "#B8D900",
      include_form: false,
    },
    trigger_config: { scroll_percent: 50 },
  },
  {
    id: "scroll_whatsapp",
    name_he: "שיחה בוואטסאפ",
    description_he: "הצעה לשוחח בוואטסאפ — מופיע לאחר 60% גלילה",
    campaign_type: "scroll_triggered",
    icon: "💚",
    content: {
      title_he: "מעדיפים לשוחח בוואטסאפ?",
      body_he: "שלחו לנו הודעה ונשמח לענות על כל שאלה — זמינים גם בערב ובסופ\"ש.",
      cta_text_he: "שלחו הודעה בוואטסאפ",
      dismiss_text_he: "לא כרגע",
      bg_color: "#ffffff",
      accent_color: "#25D366",
      include_form: false,
      whatsapp_action: true,
    },
    trigger_config: { scroll_percent: 60 },
  },

  // ── Sticky Bar ─────────────────────────────────────────────────────────

  {
    id: "sticky_register_now",
    name_he: "בר הרשמה תחתון",
    description_he: "פס קבוע בתחתית המסך עם כפתור הרשמה ומספר טלפון",
    campaign_type: "sticky_bar",
    icon: "📌",
    content: {
      text_he: "ההרשמה לסמסטר הקרוב פתוחה!",
      cta_text_he: "להרשמה",
      phone_number: "*2899",
      bg_color: "#2a2628",
      accent_color: "#B8D900",
      show_phone: true,
      position: "bottom",
    },
    trigger_config: { show_after_scroll_px: 0 },
  },
  {
    id: "sticky_limited_time",
    name_he: "בר דחיפות עליון",
    description_he: "פס עליון עם מסר דחוף — צבע אדום לדחיפות",
    campaign_type: "sticky_bar",
    icon: "⏰",
    content: {
      text_he: "מקומות אחרונים! ההרשמה נסגרת ב-30.4",
      cta_text_he: "הבטיחו מקום",
      bg_color: "#ef4444",
      accent_color: "#ffffff",
      show_phone: false,
      position: "top",
    },
    trigger_config: { show_after_scroll_px: 0 },
  },
  {
    id: "sticky_call_us",
    name_he: "בר טלפון + CTA",
    description_he: "פס תחתון עם מספר טלפון בולט וכפתור הרשמה",
    campaign_type: "sticky_bar",
    icon: "📞",
    content: {
      text_he: "שאלות? דברו עם יועץ לימודים",
      cta_text_he: "השאירו פרטים",
      phone_number: "*2899",
      bg_color: "#B8D900",
      accent_color: "#2a2628",
      show_phone: true,
      position: "bottom",
    },
    trigger_config: { show_after_scroll_px: 300 },
  },
];

/** Group templates by campaign type for the template picker UI */
export const TEMPLATE_GROUPS = [
  { type: "exit_intent" as const, label_he: "Exit Intent", description_he: "מופיע כשהמשתמש מנסה לעזוב" },
  { type: "timed" as const, label_he: "פופאפ מתוזמן", description_he: "מופיע לאחר X שניות בעמוד" },
  { type: "scroll_triggered" as const, label_he: "פופאפ גלילה", description_he: "מופיע לאחר גלילה ל-X% מהעמוד" },
  { type: "sticky_bar" as const, label_he: "בר קבוע", description_he: "פס קבוע בראש או בתחתית המסך" },
] as const;
