/**
 * Seed Script: Event Landing Pages
 * =================================
 * Creates two example open day event pages in Supabase:
 *   1. Physical open day at Kiryat Ono campus
 *   2. Zoom open day focused on Law programs
 *
 * Event configuration is stored in the `custom_styles` JSON column of the
 * pages table (matching the EventMeta type in event-page-layout).
 *
 * Usage:
 *   npx tsx scripts/seed-event-pages.ts
 */

import { createClient } from "@supabase/supabase-js";

// ============================================================================
// Supabase Client (hardcoded for convenience — rotate key after use)
// ============================================================================

const SUPABASE_URL = "https://tyadjthzqcjmhldvuvsz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5YWRqdGh6cWNqbWhsZHZ1dnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM3Mjg5MSwiZXhwIjoyMDg5OTQ4ODkxfQ.mFd5ZXO93cmG0tnPiQB4t2JQMBPM4AfGzmadesF0dmQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Types (mirrors EventMeta from event-page-layout.tsx)
// ============================================================================

interface EventMeta {
  event_type: "event_physical" | "event_zoom";
  event_date: string;
  duration_hours: number;
  venue?: string;
  google_maps_url?: string;
  parking_info?: string;
  zoom_link?: string;
  programs_featured: string[];
  schedule: { time: string; title: string }[];
  speakers?: { name: string; role: string; image_url?: string }[];
  faq?: { question: string; answer: string }[];
}

interface PageData {
  title_he: string;
  title_en: string | null;
  title_ar: string | null;
  slug: string;
  language: "he";
  status: "published";
  page_type: "event";
  seo_title: string | null;
  seo_description: string | null;
  custom_styles: EventMeta;
  published_at: string;
  program_id: null;
  specialization_id: null;
  template_id: null;
}

// ============================================================================
// Event Page Definitions
// ============================================================================

/**
 * Physical open day event at Kiryat Ono campus.
 * A comprehensive 3-hour event covering all major faculties.
 */
const physicalOpenDay: PageData = {
  title_he: "יום פתוח - הקריה האקדמית אונו | קמפוס קריית אונו",
  title_en: "Open Day - Ono Academic College | Kiryat Ono Campus",
  title_ar: null,
  slug: "open-day-kiryat-ono-2026",
  language: "he",
  status: "published",
  page_type: "event",
  seo_title: "יום פתוח 2026 - הקריה האקדמית אונו | קמפוס קריית אונו",
  seo_description:
    "הצטרפו ליום הפתוח של הקריה האקדמית אונו בקמפוס קריית אונו. הכירו את הצוות האקדמי, סיירו בקמפוס, שמעו על משפטים, MBA, מדעי המחשב וסיעוד.",
  published_at: new Date().toISOString(),
  program_id: null,
  specialization_id: null,
  template_id: null,
  custom_styles: {
    event_type: "event_physical",
    event_date: "2026-04-15T17:00:00",
    duration_hours: 3,
    venue: "קריית אונו, רחוב זאב ז'בוטינסקי 104",
    google_maps_url: "https://maps.google.com/?q=קריה+אקדמית+אונו",
    parking_info:
      "חניה חינמית זמינה בחניון הקמפוס. ניתן להגיע גם בקו 37 מתחנת הרכבת כפר סבא-קריית שרת.",
    programs_featured: [
      "משפטים (LL.B)",
      "מנהל עסקים (MBA)",
      "מדעי המחשב (B.Sc)",
      "סיעוד (B.Sc)",
      "פסיכולוגיה (B.A)",
      "עבודה סוציאלית (B.S.W)",
    ],
    schedule: [
      { time: "17:00", title: "הרשמה וקבלת פנים - כיבוד קל בלובי הראשי" },
      { time: "17:30", title: "טקס פתיחה - ברכות נשיא המכללה וסגן הרקטור" },
      { time: "18:00", title: "הכרת הפקולטות - מצגות קצרות מכל ראשי החוגים" },
      { time: "18:45", title: "שאלות ותשובות - ישיבה פתוחה עם הסגל האקדמי" },
      { time: "19:00", title: "פגישות אישיות עם ראשי החוגים בפקולטות" },
      { time: "19:45", title: "סיור קמפוס מודרך - ספריה, מעבדות, מתקני ספורט" },
      { time: "20:00", title: "סיום האירוע - ייעוץ אישי בפגישות פרטיות" },
    ],
    speakers: [
      {
        name: "פרופ' אמיר דגן",
        role: "ראש הפקולטה למשפטים",
      },
      {
        name: "פרופ' יעל שפירו",
        role: "ראש הפקולטה למנהל עסקים",
      },
      {
        name: "ד\"ר רון לוי",
        role: "ראש החוג למדעי המחשב",
      },
    ],
    faq: [
      {
        question: "האם צריך להירשם מראש?",
        answer:
          "כן, ההרשמה מראש מאפשרת לנו להכין חומרים ולהתאים את האירוע לתחומי העניין שלכם. ההרשמה חינמית לחלוטין.",
      },
      {
        question: "האם האירוע מתאים גם להורים?",
        answer:
          "בהחלט! אנחנו ממליצים להגיע יחד עם בני משפחה. ישנם גם פעילויות ייעודיות להורים ומפגש עם היועצים הכלכליים.",
      },
      {
        question: "כמה זמן נמשך האירוע?",
        answer:
          "האירוע נמשך כ-3 שעות, מ-17:00 עד 20:00. אתם יכולים להגיע ולעזוב בכל שלב.",
      },
      {
        question: "האם יש חניה?",
        answer:
          "כן, ישנה חניה חינמית בחניון הקמפוס. ניתן גם להגיע בתחבורה ציבורית - קו 37 מתחנת הרכבת.",
      },
      {
        question: "האם ניתן לקבל מלגה?",
        answer:
          "ביום הפתוח ניתן לשמוע על כלל מסלולי המלגות והסיוע הכלכלי הזמינים בקריה האקדמית אונו.",
      },
    ],
  },
};

/**
 * Zoom open day focused on Law programs (LL.B and LL.M).
 */
const zoomOpenDayLaw: PageData = {
  title_he: "יום פתוח בזום - לימודי משפטים | הקריה האקדמית אונו",
  title_en: "Open Day via Zoom - Law Studies | Ono Academic College",
  title_ar: null,
  slug: "open-day-zoom-law-2026",
  language: "he",
  status: "published",
  page_type: "event",
  seo_title: "יום פתוח בזום - לימודי משפטים LL.B ו-LL.M | הקריה האקדמית אונו",
  seo_description:
    "הצטרפו ליום הפתוח בזום של הקריה האקדמית אונו לכל מי שמתעניין בלימודי משפטים. הכירו את התוכניות LL.B ו-LL.M, פגשו מרצים וקבלו מידע על מלגות.",
  published_at: new Date().toISOString(),
  program_id: null,
  specialization_id: null,
  template_id: null,
  custom_styles: {
    event_type: "event_zoom",
    event_date: "2026-04-08T19:00:00",
    duration_hours: 1.5,
    zoom_link: "https://zoom.us/j/placeholder", // Replace with actual Zoom link before event
    programs_featured: [
      "משפטים - תואר ראשון (LL.B)",
      "משפטים - תואר שני (LL.M)",
      "משפטים ועסקים - תואר דואלי",
      "קרימינולוגיה (B.A)",
    ],
    schedule: [
      { time: "19:00", title: "פתיחה ובדיקת קישורים - ברכות ממנהל הפקולטה" },
      { time: "19:10", title: "הצגת תוכניות המשפטים - LL.B ו-LL.M בפירוט" },
      { time: "19:30", title: "יתרונות הלימוד באונו - מחקר, קליניקות ומשפט מעשי" },
      { time: "19:45", title: "שאלות ותשובות פתוח - שאלו כל שאלה בצ'אט" },
      { time: "20:10", title: "חדרים נפרדים - פגישות אישיות עם יועצי לימודים" },
      { time: "20:30", title: "סיום - מידע על הרשמה ומלגות" },
    ],
    speakers: [
      {
        name: "פרופ' רחל כהן",
        role: "דקאן הפקולטה למשפטים",
      },
      {
        name: "עו\"ד דוד ברק",
        role: "ראש תוכנית LL.M",
      },
    ],
    faq: [
      {
        question: "מה ההבדל בין LL.B ל-LL.M?",
        answer:
          "LL.B הוא תואר ראשון במשפטים (3 שנים) המכשיר לפרקטיקה משפטית. LL.M הוא תואר שני (שנה עד שנה וחצי) לבעלי תואר ראשון שרוצים להתמחות.",
      },
      {
        question: "האם צריך לדעת להשתמש בזום?",
        answer:
          "לא חייבים ניסיון קודם. ניתן להצטרף גם דרך הדפדפן ללא הורדה. נשלח הוראות מפורטות לפני האירוע.",
      },
      {
        question: "מתי יישלח קישור הזום?",
        answer:
          "קישור הזום יישלח לאימייל שסיפקתם שעה לפני תחילת האירוע, וגם ב-SMS לטלפון.",
      },
      {
        question: "האם ניתן לשאול שאלות אישיות?",
        answer:
          "כן! בחלק האחרון של האירוע (20:10-20:30) ישנם חדרים נפרדים לפגישות פרטיות עם יועצי לימודים.",
      },
      {
        question: "מה דרישות הקבלה ללימודי משפטים?",
        answer:
          "ביום הפתוח נסביר בפירוט על דרישות הקבלה, ציוני פסיכומטרי ובגרות, ומסלולי הכנה שאנחנו מציעים.",
      },
    ],
  },
};

// ============================================================================
// Seed Logic
// ============================================================================

/**
 * Upserts a single event page into Supabase, updating on slug conflict.
 * @param pageData - Page data object to insert/update
 */
async function seedEventPage(pageData: PageData): Promise<void> {
  console.log(`\n📄 Seeding page: ${pageData.slug}`);

  // Check if page already exists
  const { data: existing } = await supabase
    .from("pages")
    .select("id, slug")
    .eq("slug", pageData.slug)
    .single();

  if (existing) {
    console.log(`   ⚠️  Page "${pageData.slug}" already exists (id: ${existing.id}). Updating...`);
    const { error } = await supabase
      .from("pages")
      .update(pageData)
      .eq("slug", pageData.slug);

    if (error) {
      console.error(`   ❌ Update failed:`, error.message);
    } else {
      console.log(`   ✅ Updated successfully.`);
    }
    return;
  }

  // Insert new page
  const { data, error } = await supabase
    .from("pages")
    .insert(pageData)
    .select("id, slug")
    .single();

  if (error) {
    console.error(`   ❌ Insert failed:`, error.message);
    console.error(`   Details:`, error.details);
  } else {
    console.log(`   ✅ Created successfully (id: ${data?.id})`);
    console.log(`   🔗 URL: /lp/events/${pageData.slug}`);
  }
}

/**
 * Main entry point — seeds both event pages.
 */
async function main(): Promise<void> {
  console.log("🌱 OnoLeads Event Pages Seeder");
  console.log("================================");
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);

  // Test connection
  const { error: pingError } = await supabase.from("pages").select("count").limit(1);
  if (pingError) {
    console.error("❌ Cannot connect to Supabase:", pingError.message);
    process.exit(1);
  }
  console.log("✅ Connected to Supabase\n");

  await seedEventPage(physicalOpenDay);
  await seedEventPage(zoomOpenDayLaw);

  console.log("\n================================");
  console.log("✅ Seeding complete!");
  console.log("\nEvent pages available at:");
  console.log(`  → /lp/events/open-day-kiryat-ono-2026`);
  console.log(`  → /lp/events/open-day-zoom-law-2026`);
  console.log("\nNote: Replace the Zoom placeholder link in the zoom event before going live.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
