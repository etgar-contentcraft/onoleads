/**
 * Generate Landing Pages for Academic Degree Programs
 * ====================================================
 * Creates published landing pages in Supabase for all bachelor & master programs.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/generate-landing-pages.ts
 */

import { createClient } from "@supabase/supabase-js";

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// TYPES
// ============================================

interface ProgramRow {
  id: string;
  name_he: string;
  name_en: string | null;
  slug: string;
  degree_type: string;
  level: string;
  duration_semesters: number | null;
  campuses: string[];
  schedule_options: string[];
  is_international: boolean;
  faculty_id: string;
  faculties: {
    id: string;
    name_he: string;
    name_en: string | null;
    slug: string;
  } | null;
}

interface SectionData {
  section_type: string;
  sort_order: number;
  is_visible: boolean;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
}

// ============================================
// CONTENT GENERATORS
// ============================================

function getDegreeLabel(degreeType: string): string {
  const d = degreeType.trim().toUpperCase();
  if (d.includes("B.A")) return "תואר ראשון";
  if (d.includes("B.SC")) return "תואר ראשון";
  if (d.includes("B.S.N")) return "תואר ראשון";
  if (d.includes("B.O.T")) return "תואר ראשון";
  if (d.includes("B.MUS")) return "תואר ראשון";
  if (d.includes("LL.B")) return "תואר ראשון";
  if (d.includes("MBA")) return "תואר שני";
  if (d.includes("M.A")) return "תואר שני";
  if (d.includes("M.SC")) return "תואר שני";
  if (d.includes("M.P.S")) return "תואר שני";
  if (d.includes("LL.M")) return "תואר שני";
  if (d.includes("EXECUTIVE")) return "תואר שני";
  return "תואר";
}

function getDuration(program: ProgramRow): string {
  if (program.duration_semesters) {
    const years = program.duration_semesters / 2;
    if (years === 1) return "שנה";
    if (years === 1.5) return "שנה וחצי";
    if (years === 2) return "שנתיים";
    if (years === 3) return "3 שנים";
    if (years === 4) return "4 שנים";
    return `${years} שנים`;
  }
  // Default by level
  if (program.level === "master") {
    const d = program.degree_type.toUpperCase();
    if (d.includes("MBA") || d.includes("EXECUTIVE")) return "שנה וחצי";
    return "שנתיים";
  }
  // Bachelor
  const d = program.degree_type.toUpperCase();
  if (d.includes("LL.B")) return "3.5 שנים";
  return "3 שנים";
}

function getCampus(program: ProgramRow): string {
  if (program.campuses && program.campuses.length > 0) {
    return program.campuses.join(", ");
  }
  return "קריית אונו";
}

function getSchedule(program: ProgramRow): string {
  if (program.schedule_options && program.schedule_options.length > 0) {
    return program.schedule_options.join("/");
  }
  if (program.level === "master") return "ערב";
  return "בוקר/ערב";
}

function getHeroStat(program: ProgramRow): { value: string; label: string } {
  const d = program.degree_type.toUpperCase();
  // Vary stats by faculty / degree to keep things interesting
  if (d.includes("LL.B") || d.includes("LL.M")) {
    return { value: "90%", label: "שיעור הצלחה בבחינת לשכה" };
  }
  if (d.includes("B.S.N")) {
    return { value: "95%", label: "שיעור השמה" };
  }
  if (d.includes("B.O.T")) {
    return { value: "93%", label: "שיעור השמה" };
  }
  if (d.includes("MBA") || d.includes("EXECUTIVE")) {
    return { value: "30+", label: "שנות מצוינות אקדמית" };
  }
  if (d.includes("B.SC") || d.includes("M.SC")) {
    return { value: "92%", label: "שיעור השמה בתעשייה" };
  }
  if (d.includes("B.MUS")) {
    return { value: "85%", label: "בוגרים פעילים בתעשייה" };
  }
  if (program.level === "master") {
    return { value: "#1", label: "המכללה המומלצת בישראל" };
  }
  return { value: "92%", label: "שיעור השמה" };
}

function getFieldName(program: ProgramRow): string {
  // Extract the academic field from the Hebrew name
  const name = program.name_he;
  // Remove common prefixes
  return name
    .replace(/^(תואר ראשון ב|תואר שני ב|לימודי )/, "")
    .trim();
}

// ============================================
// SECTION BUILDERS
// ============================================

// Real Ono campus/program images mapped by faculty
const HERO_IMAGES: Record<string, string> = {
  "business": "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg",
  "law": "https://www.ono.ac.il/wp-content/uploads/2019/05/desk_1920x628_25.jpg",
  "humanities": "https://www.ono.ac.il/wp-content/uploads/2019/02/V2_OP2-e1677752521329.jpg",
  "health": "https://www.ono.ac.il/wp-content/uploads/2019/06/desk_1920x628_2.jpg",
  "technology": "https://www.ono.ac.il/wp-content/uploads/2019/05/freestocks-I_pOqP6kCOI-unsplash-scaled.jpg",
  "international": "https://www.ono.ac.il/wp-content/uploads/2020/05/mobile_991x374_4-min-scaled.jpg",
  "default": "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg",
};

function getHeroImage(program: ProgramRow): string {
  const facultyName = (program.faculties?.name_he || "").toLowerCase();
  if (facultyName.includes("עסקים")) return HERO_IMAGES.business;
  if (facultyName.includes("משפט")) return HERO_IMAGES.law;
  if (facultyName.includes("רוח") || facultyName.includes("חברה")) return HERO_IMAGES.humanities;
  if (facultyName.includes("בריאות")) return HERO_IMAGES.health;
  if (program.slug.includes("computer") || program.slug.includes("information")) return HERO_IMAGES.technology;
  if (program.is_international) return HERO_IMAGES.international;
  return HERO_IMAGES.default;
}

function buildHeroSection(program: ProgramRow): SectionData {
  const degreeLabel = getDegreeLabel(program.degree_type);
  const stat = getHeroStat(program);

  return {
    section_type: "hero",
    sort_order: 0,
    is_visible: true,
    content: {
      heading_he: `${degreeLabel} ${program.name_he} ${program.degree_type}`,
      subheading_he: "הקריה האקדמית אונו - המכללה המומלצת בישראל",
      cta_text_he: "השאירו פרטים וקבלו מידע מלא",
      stat_value: stat.value,
      stat_label_he: stat.label,
      background_image: getHeroImage(program),
    },
    styles: {},
  };
}

function buildFormSection(_program: ProgramRow): SectionData {
  return {
    section_type: "form",
    sort_order: 1,
    is_visible: true,
    content: {
      heading_he: "רוצים לשמוע עוד?",
      subheading_he: "השאירו פרטים ונחזור אליכם בהקדם",
      fields: [
        {
          name: "full_name",
          type: "text",
          label_he: "שם מלא",
          placeholder_he: "הכניסו שם מלא",
          required: true,
        },
        {
          name: "phone",
          type: "tel",
          label_he: "טלפון",
          placeholder_he: "050-0000000",
          required: true,
        },
        {
          name: "email",
          type: "email",
          label_he: "אימייל",
          placeholder_he: "example@email.com",
          required: false,
        },
      ],
      submit_text_he: "שלחו לי מידע",
      thank_you_he: "תודה! נציג יחזור אליך בהקדם",
    },
    styles: {},
  };
}

function buildStatsSection(program: ProgramRow): SectionData {
  const duration = getDuration(program);
  const campus = getCampus(program);
  const schedule = getSchedule(program);

  const stats: { icon: string; value: string; label_he: string }[] = [];

  if (program.level === "bachelor") {
    stats.push(
      { icon: "clock", value: duration, label_he: "משך הלימודים" },
      { icon: "map-pin", value: campus, label_he: "קמפוס" },
      { icon: "calendar", value: schedule, label_he: "מתכונת לימודים" }
    );
  } else {
    // Master
    stats.push(
      { icon: "clock", value: duration, label_he: "משך הלימודים" },
      { icon: "map-pin", value: campus, label_he: "קמפוס" },
      { icon: "calendar", value: schedule, label_he: "מתכונת לימודים" }
    );
  }

  return {
    section_type: "stats",
    sort_order: 2,
    is_visible: true,
    content: {
      heading_he: "נתונים על התוכנית",
      stats,
    },
    styles: {},
  };
}

function buildFaqSection(program: ProgramRow): SectionData {
  const fieldName = getFieldName(program);
  const degreeLabel = getDegreeLabel(program.degree_type);
  const duration = getDuration(program);
  const schedule = getSchedule(program);

  let faqs: { question_he: string; answer_he: string }[];

  if (program.level === "bachelor") {
    faqs = [
      {
        question_he: `מה תנאי הקבלה ל${program.name_he}?`,
        answer_he: `תנאי הקבלה ל${degreeLabel} ב${fieldName} כוללים בגרות מלאה ופסיכומטרי או ציון מותאם בהתאם למסלול. ניתן להגיש מועמדות גם על סמך תואר קודם או ניסיון מקצועי רלוונטי. לפרטים מדויקים על תנאי הקבלה מומלץ ליצור קשר עם מחלקת הרישום.`,
      },
      {
        question_he: `כמה זמן נמשכים הלימודים?`,
        answer_he: `לימודי ה${degreeLabel} ב${fieldName} נמשכים ${duration}. תוכנית הלימודים בנויה בצורה מובנית המאפשרת לסטודנטים לרכוש ידע תיאורטי ומעשי לאורך התקופה. הקריה האקדמית אונו מציעה גמישות במסלולי הלימוד.`,
      },
      {
        question_he: `האם ניתן ללמוד בערב?`,
        answer_he: `כן, הקריה האקדמית אונו מציעה מסלולי לימוד ב${schedule} כדי לאפשר שילוב בין לימודים לעבודה. מסלול הערב מתאים במיוחד לעובדים המעוניינים לרכוש השכלה אקדמית מבלי לוותר על הקריירה שלהם.`,
      },
      {
        question_he: `מהן אפשרויות הקריירה לאחר סיום התואר?`,
        answer_he: `בוגרי ${degreeLabel} ב${fieldName} נהנים ממגוון רחב של אפשרויות תעסוקה בתעשייה, במגזר הציבורי ובמגזר הפרטי. הקריה האקדמית אונו שמה דגש על הכשרה מעשית ושיתופי פעולה עם מעסיקים מובילים, מה שמבטיח שיעור השמה גבוה לבוגרים.`,
      },
      {
        question_he: `למה כדאי ללמוד ${program.name_he} בקריה האקדמית אונו?`,
        answer_he: `הקריה האקדמית אונו היא המכללה המומלצת בישראל, עם סגל אקדמי מוביל, תוכניות לימוד מעודכנות ומתקנים חדישים. התוכנית ב${fieldName} משלבת תיאוריה עם פרקטיקה ומכינה את הסטודנטים לקריירה מצליחה בתחום. בנוסף, המכללה מציעה מלגות ומסלולי מימון מגוונים.`,
      },
    ];
  } else {
    // Master
    faqs = [
      {
        question_he: `מה תנאי הקבלה לתואר שני ב${program.name_he}?`,
        answer_he: `תנאי הקבלה לתואר שני ב${fieldName} כוללים תואר ראשון ממוסד אקדמי מוכר עם ממוצע מינימלי בהתאם לדרישות התוכנית. חלק מהתוכניות דורשות ניסיון מקצועי של שנתיים או יותר. לפרטים מדויקים מומלץ לפנות למחלקת הרישום.`,
      },
      {
        question_he: `כמה זמן נמשכים לימודי התואר השני?`,
        answer_he: `לימודי התואר השני ב${fieldName} נמשכים ${duration}. התוכנית מתקיימת בדרך כלל בימי ${schedule} כדי לאפשר שילוב עם עבודה. הקריה האקדמית אונו מקפידה על תוכנית לימודים אינטנסיבית ואיכותית.`,
      },
      {
        question_he: `האם ניתן לשלב לימודים עם עבודה?`,
        answer_he: `בהחלט. הקריה האקדמית אונו מעצבת את תוכניות התואר השני כך שיתאימו לאנשי מקצוע עובדים. הלימודים מתקיימים בשעות ${schedule} ומאפשרים שילוב מלא בין הקריירה ללימודים. רוב הסטודנטים בתוכנית עובדים במקביל ללימודיהם.`,
      },
      {
        question_he: `מהם היתרונות של תואר שני ב${fieldName}?`,
        answer_he: `תואר שני ב${fieldName} מאפשר התמקצעות מעמיקה בתחום, קידום מקצועי ושכר גבוה יותר. הלימודים מעניקים כלים מתקדמים, רשת קשרים מקצועית ויכולת תחרותית בשוק העבודה. בוגרי התוכנית ממלאים תפקידים בכירים בארגונים מובילים במשק.`,
      },
      {
        question_he: `למה לבחור את הקריה האקדמית אונו - המכללה המומלצת בישראל?`,
        answer_he: `הקריה האקדמית אונו היא המכללה המומלצת בישראל, עם מוניטין של מצוינות אקדמית ופרקטיקה. סגל ההוראה כולל חוקרים ואנשי מקצוע מובילים בתעשייה, והתוכניות מותאמות לצרכי שוק העבודה העדכניים. המכללה מציעה סביבה אקדמית תומכת ומתקנים חדישים.`,
      },
    ];
  }

  return {
    section_type: "faq",
    sort_order: 3,
    is_visible: true,
    content: {
      heading_he: "שאלות נפוצות",
      items: faqs,
    },
    styles: {},
  };
}

function buildCtaSection(_program: ProgramRow): SectionData {
  return {
    section_type: "cta",
    sort_order: 4,
    is_visible: true,
    content: {
      heading_he: "מוכנים להתחיל? הצעד הראשון מתחיל כאן",
      description_he:
        "השאירו פרטים ויועץ לימודים יחזור אליכם תוך 24 שעות",
      button_text_he: "לפרטים נוספים",
    },
    styles: {},
  };
}

function buildWhatsappSection(program: ProgramRow): SectionData {
  return {
    section_type: "whatsapp",
    sort_order: 5,
    is_visible: true,
    content: {
      phone: "972501234567",
      message_he: `היי, אני מתעניין/ת בתואר ${program.name_he} בקריה האקדמית אונו`,
      tooltip_he: "שלחו לנו הודעה בוואטסאפ",
    },
    styles: {},
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("========================================");
  console.log("OnoLeads - Generate Landing Pages");
  console.log("========================================\n");

  // 1. Fetch all academic programs (bachelor + master)
  console.log("Fetching academic programs (bachelor + master)...");
  const { data: programs, error: progError } = await supabase
    .from("programs")
    .select(
      `
      id, name_he, name_en, slug, degree_type, level,
      duration_semesters, campuses, schedule_options,
      is_international, faculty_id,
      faculties (id, name_he, name_en, slug)
    `
    )
    .in("level", ["bachelor", "master"])
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (progError) {
    console.error("Error fetching programs:", progError.message);
    process.exit(1);
  }

  if (!programs || programs.length === 0) {
    console.log("No academic programs found. Run seed-programs.ts first.");
    process.exit(0);
  }

  console.log(`Found ${programs.length} academic programs.\n`);

  // 2. Fetch the degree_program template
  console.log("Fetching degree_program template...");
  const { data: template, error: tplError } = await supabase
    .from("templates")
    .select("id")
    .eq("type", "degree_program")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (tplError || !template) {
    console.error(
      "Error fetching degree_program template:",
      tplError?.message ?? "not found"
    );
    process.exit(1);
  }

  console.log(`Template ID: ${template.id}\n`);

  // 3. Fetch existing page slugs to skip duplicates
  console.log("Checking existing pages...");
  const { data: existingPages, error: pagesError } = await supabase
    .from("pages")
    .select("slug");

  if (pagesError) {
    console.error("Error fetching existing pages:", pagesError.message);
    process.exit(1);
  }

  const existingSlugs = new Set(
    (existingPages || []).map((p: { slug: string }) => p.slug)
  );
  console.log(`Found ${existingSlugs.size} existing pages.\n`);

  // 4. Generate pages for each program
  let created = 0;
  let skipped = 0;

  for (const program of programs as unknown as ProgramRow[]) {
    if (existingSlugs.has(program.slug)) {
      console.log(`  SKIP: ${program.name_he} (slug "${program.slug}" already exists)`);
      skipped++;
      continue;
    }

    const degreeLabel = getDegreeLabel(program.degree_type);

    // Create page record
    const pageRecord = {
      program_id: program.id,
      specialization_id: null,
      template_id: template.id,
      title_he: `${degreeLabel} ${program.name_he} | הקריה האקדמית אונו`,
      title_en: program.name_en
        ? `${program.degree_type} ${program.name_en} | Ono Academic College`
        : null,
      title_ar: null,
      slug: program.slug,
      language: "he" as const,
      status: "published" as const,
      page_type: "degree" as const,
      seo_title: `${program.name_he} - ${degreeLabel} | הקריה האקדמית אונו - המכללה המומלצת בישראל`,
      seo_description: `לימודי ${program.name_he} בהקריה האקדמית אונו. ${degreeLabel} עם הכשרה מעשית ושיעור השמה גבוה. המכללה המומלצת בישראל.`,
      custom_styles: null,
      published_at: new Date().toISOString(),
      last_built_at: null,
    };

    const { data: page, error: pageError } = await supabase
      .from("pages")
      .insert(pageRecord)
      .select("id")
      .single();

    if (pageError) {
      console.error(
        `  ERROR creating page for "${program.name_he}":`,
        pageError.message
      );
      continue;
    }

    if (!page) {
      console.error(`  ERROR: no page returned for "${program.name_he}"`);
      continue;
    }

    // Build all sections
    const sections: SectionData[] = [
      buildHeroSection(program),
      buildFormSection(program),
      buildStatsSection(program),
      buildFaqSection(program),
      buildCtaSection(program),
      buildWhatsappSection(program),
    ];

    // Insert sections
    const sectionRecords = sections.map((s) => ({
      page_id: page.id,
      section_type: s.section_type,
      sort_order: s.sort_order,
      is_visible: s.is_visible,
      content: s.content,
      styles: s.styles,
    }));

    const { error: secError } = await supabase
      .from("page_sections")
      .insert(sectionRecords);

    if (secError) {
      console.error(
        `  ERROR creating sections for "${program.name_he}":`,
        secError.message
      );
      continue;
    }

    console.log(
      `  + [${program.degree_type}] ${program.name_he} -> /lp/${program.slug} (${sections.length} sections)`
    );
    created++;
  }

  console.log("\n========================================");
  console.log("Landing Page Generation Complete!");
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped} (already exist)`);
  console.log(`  Total programs: ${programs.length}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
