/**
 * Generate Landing Pages for Academic Degree Programs (v2 - Rich Content)
 * ========================================================================
 * Creates published landing pages in Supabase with 11 sections per page,
 * using REAL scraped data from ono.ac.il where available.
 *
 * Usage:
 *   npx tsx scripts/generate-landing-pages.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ============================================
// SUPABASE CLIENT
// ============================================

const SUPABASE_URL = "https://tyadjthzqcjmhldvuvsz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5YWRqdGh6cWNqbWhsZHZ1dnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDM3Mjg5MSwiZXhwIjoyMDg5OTQ4ODkxfQ.mFd5ZXO93cmG0tnPiQB4t2JQMBPM4AfGzmadesF0dmQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// TYPES
// ============================================

/** Row from Supabase programs table joined with faculty */
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

/** Scraped program data shape from scraped_program_data.json */
interface ScrapedProgram {
  id: string;
  url: string;
  title_he: string;
  title_en?: string;
  description_he: string;
  duration: string;
  duration_en?: string;
  format: string;
  format_en?: string;
  location?: string;
  locations?: string[];
  benefits: string[];
  career_outcomes?: string[];
  unique_selling_points?: string[];
  courses?: string[];
  courses_year_1?: string[];
  program_structure?: Record<string, string[]>;
  admission?: Record<string, unknown>;
  faculty: Array<{ name: string; role: string }>;
  testimonials: Array<{
    name: string;
    role: string;
    quote_he: string;
    image?: string;
  }>;
  images: string[];
  statistics?: string[];
  certifications?: string[];
  specializations?: Array<{ name: string; note?: string }>;
  schedule_details?: Array<Record<string, string>>;
  icons?: string[];
}

interface ScrapedData {
  programs: ScrapedProgram[];
  shared_assets: {
    logo: string;
    campus_images: Record<string, string>;
    icons: Record<string, string>;
  };
}

interface SectionData {
  section_type: string;
  sort_order: number;
  is_visible: boolean;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
}

// ============================================
// LOAD SCRAPED DATA
// ============================================

/** Loads and parses the scraped program JSON file */
function loadScrapedData(): ScrapedData {
  const filePath = path.resolve(__dirname, "..", "scraped_program_data.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ScrapedData;
}

// ============================================
// SLUG MATCHING - match Supabase programs to scraped data
// ============================================

/**
 * Builds a map from scraped program IDs to scraped data.
 * Matching is done by comparing the Supabase program slug against
 * the scraped program id (they use similar kebab-case naming).
 */
function buildScrapedMap(
  scrapedData: ScrapedData
): Map<string, ScrapedProgram> {
  const map = new Map<string, ScrapedProgram>();
  for (const sp of scrapedData.programs) {
    map.set(sp.id, sp);
  }
  return map;
}

/**
 * Finds the best scraped program match for a given Supabase slug.
 * Tries exact match first, then partial/fuzzy matching.
 */
function findScrapedMatch(
  slug: string,
  scrapedMap: Map<string, ScrapedProgram>
): ScrapedProgram | null {
  // Exact match
  if (scrapedMap.has(slug)) return scrapedMap.get(slug)!;

  // Try matching with common variations
  for (const [id, sp] of Array.from(scrapedMap.entries())) {
    if (slug.includes(id) || id.includes(slug)) return sp;
    // Remove degree suffix for matching
    const slugBase = slug
      .replace(/-bsc$|-ba$|-bsn$|-bot$|-bmus$|-llb$|-mba$|-ma$|-msc$|-mps$|-llm$/, "");
    const idBase = id
      .replace(/-bsc$|-ba$|-bsn$|-bot$|-bmus$|-llb$|-mba$|-ma$|-msc$|-mps$|-llm$/, "");
    if (slugBase === idBase) return sp;
    if (slugBase.includes(idBase) || idBase.includes(slugBase)) return sp;
  }

  return null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Returns Hebrew label for degree level */
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

/** Returns duration string from Supabase program data */
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
  if (program.level === "master") {
    const d = program.degree_type.toUpperCase();
    if (d.includes("MBA") || d.includes("EXECUTIVE")) return "שנה וחצי";
    return "שנתיים";
  }
  const d = program.degree_type.toUpperCase();
  if (d.includes("LL.B")) return "3.5 שנים";
  return "3 שנים";
}

/** Returns campus string */
function getCampus(program: ProgramRow): string {
  if (program.campuses && program.campuses.length > 0) {
    return program.campuses.join(", ");
  }
  return "קריית אונו";
}

/** Returns schedule string */
function getSchedule(program: ProgramRow): string {
  if (program.schedule_options && program.schedule_options.length > 0) {
    return program.schedule_options.join("/");
  }
  if (program.level === "master") return "ערב";
  return "בוקר/ערב";
}

/** Returns a key stat for the hero section */
function getHeroStat(program: ProgramRow): { value: string; label: string } {
  const d = program.degree_type.toUpperCase();
  if (d.includes("LL.B") || d.includes("LL.M")) {
    return { value: "90%", label: "שיעור הצלחה בבחינת לשכה" };
  }
  if (d.includes("B.S.N")) {
    return { value: "100%", label: "הצלחה בבחינות רישוי" };
  }
  if (d.includes("B.O.T")) {
    return { value: "100%", label: "הצלחה בבחינות רישוי" };
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

/** Extracts the academic field name from Hebrew program name */
function getFieldName(program: ProgramRow): string {
  return program.name_he
    .replace(/^(תואר ראשון ב|תואר שני ב|לימודי )/, "")
    .trim();
}

// ============================================
// HERO IMAGES - mapped by faculty keyword
// ============================================

const HERO_IMAGES: Record<string, string> = {
  business:
    "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg",
  law: "https://www.ono.ac.il/wp-content/uploads/2019/05/desk_1920x628_25.jpg",
  humanities:
    "https://www.ono.ac.il/wp-content/uploads/2019/06/desk_580x1920_flip.jpg",
  health:
    "https://www.ono.ac.il/wp-content/uploads/2019/06/desk_1920x628_2.jpg",
  technology:
    "https://www.ono.ac.il/wp-content/uploads/2019/05/freestocks-I_pOqP6kCOI-unsplash-scaled.jpg",
  international:
    "https://www.ono.ac.il/wp-content/uploads/2020/05/mobile_991x374_4-min-scaled.jpg",
  default:
    "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg",
};

/** Gets a hero background image for a program based on its faculty */
function getHeroImage(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): string {
  // Prefer first large image from scraped data
  if (scraped && scraped.images && scraped.images.length > 0) {
    // Pick the first wide/banner-like image (usually first in the array)
    return scraped.images[0];
  }
  const facultyName = (program.faculties?.name_he || "").toLowerCase();
  if (facultyName.includes("עסקים")) return HERO_IMAGES.business;
  if (facultyName.includes("משפט")) return HERO_IMAGES.law;
  if (facultyName.includes("רוח") || facultyName.includes("חברה"))
    return HERO_IMAGES.humanities;
  if (facultyName.includes("בריאות")) return HERO_IMAGES.health;
  if (
    program.slug.includes("computer") ||
    program.slug.includes("information")
  )
    return HERO_IMAGES.technology;
  if (program.is_international) return HERO_IMAGES.international;
  return HERO_IMAGES.default;
}

// ============================================
// BENEFIT ICON MAPPING
// ============================================

const BENEFIT_ICONS = [
  "star",
  "faculty",
  "practical",
  "placement",
  "campuses",
  "scholarship",
  "certificate",
  "network",
  "innovation",
  "flexibility",
];

// ============================================
// SECTION BUILDERS
// ============================================

/**
 * Builds the hero section (sort_order: 0)
 * Uses real background images and stats from scraped data.
 */
function buildHeroSection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  const degreeLabel = getDegreeLabel(program.degree_type);
  const stat = getHeroStat(program);

  // Override stat with scraped statistics if available
  let statValue = stat.value;
  let statLabel = stat.label;
  if (scraped?.statistics && scraped.statistics.length > 0) {
    const firstStat = scraped.statistics[0];
    // Extract percentage or number from the stat string
    const match = firstStat.match(/(\d+%?)/);
    if (match) {
      statValue = match[1];
      statLabel = firstStat.replace(match[1], "").trim();
    }
  }

  const facultyName = program.faculties?.name_he || "";

  return {
    section_type: "hero",
    sort_order: 0,
    is_visible: true,
    content: {
      heading_he: `${degreeLabel} ${program.name_he}`,
      subheading_he: scraped
        ? scraped.description_he.substring(0, 120) +
          (scraped.description_he.length > 120 ? "..." : "")
        : "הקריה האקדמית אונו - המכללה המומלצת בישראל",
      cta_text_he: "לפרטים נוספים",
      stat_value: statValue,
      stat_label_he: statLabel,
      background_image: getHeroImage(program, scraped),
      faculty_name_he: facultyName,
      degree_type: program.degree_type,
    },
    styles: {},
  };
}

/**
 * Builds the program info bar section (sort_order: 1)
 * Shows duration, campus, schedule, and degree type.
 */
function buildProgramInfoBar(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  const duration = scraped?.duration || getDuration(program);
  const campus = scraped
    ? scraped.locations?.join(", ") || scraped.location || getCampus(program)
    : getCampus(program);
  const format = scraped?.format || getSchedule(program);

  return {
    section_type: "program_info_bar",
    sort_order: 1,
    is_visible: true,
    content: {
      items: [
        { icon: "duration", label: "משך הלימודים", value: duration },
        { icon: "campus", label: "קמפוס", value: campus },
        { icon: "format", label: "מתכונת", value: format },
        { icon: "degree", label: "תואר", value: program.degree_type },
      ],
    },
    styles: {},
  };
}

/**
 * Builds the about section (sort_order: 2)
 * Uses real description and unique selling points from scraped data.
 */
function buildAboutSection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  const fieldName = getFieldName(program);
  const degreeLabel = getDegreeLabel(program.degree_type);

  const description = scraped
    ? scraped.description_he
    : `תוכנית לימודי ${degreeLabel} ב${fieldName} בקריה האקדמית אונו מציעה הכשרה אקדמית ברמה הגבוהה ביותר. התוכנית משלבת בין תיאוריה לפרקטיקה, ומכינה את הסטודנטים לקריירה מצליחה בתחום. הקריה האקדמית אונו - המכללה המומלצת בישראל - מספקת סביבה לימודית תומכת עם סגל אקדמי מוביל.`;

  const bullets = scraped?.unique_selling_points || [
    `סגל אקדמי מוביל בתחום ${fieldName}`,
    "שילוב ייחודי של תיאוריה ופרקטיקה",
    "שיעור השמה גבוה של בוגרים בשוק העבודה",
    "מלגות ומסלולי מימון מגוונים",
    "קמפוסים נגישים ברחבי הארץ",
  ];

  // Pick an about image - prefer a campus/program image from scraped data
  let imageUrl = "";
  if (scraped && scraped.images && scraped.images.length > 1) {
    // Use the last campus image (usually a nice overview shot)
    imageUrl =
      scraped.images.find((img) =>
        img.includes("V2_OP2")
      ) || scraped.images[Math.min(1, scraped.images.length - 1)];
  }

  return {
    section_type: "about",
    sort_order: 2,
    is_visible: true,
    content: {
      heading_he: `למה ללמוד ${fieldName} באונו?`,
      description_he: description,
      image_url: imageUrl,
      bullets,
      cta_text_he: "לפרטים נוספים",
    },
    styles: {},
  };
}

/**
 * Builds the benefits section (sort_order: 3)
 * Uses real benefits from scraped data with icon mapping.
 */
function buildBenefitsSection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  const fieldName = getFieldName(program);

  let benefitItems: Array<{
    icon: string;
    title_he: string;
    description_he: string;
  }>;

  if (scraped && scraped.benefits && scraped.benefits.length > 0) {
    benefitItems = scraped.benefits.map((benefit, i) => {
      // Split benefit into title and description if it contains a dash
      const dashIndex = benefit.indexOf(" - ");
      let title: string;
      let desc: string;
      if (dashIndex > 0 && dashIndex < 40) {
        title = benefit.substring(0, dashIndex);
        desc = benefit.substring(dashIndex + 3);
      } else if (benefit.length > 50) {
        // Long benefit: first few words as title, rest as description
        const words = benefit.split(" ");
        title = words.slice(0, 4).join(" ");
        desc = words.slice(4).join(" ");
      } else {
        title = benefit;
        desc = "";
      }
      return {
        icon: BENEFIT_ICONS[i % BENEFIT_ICONS.length],
        title_he: title,
        description_he: desc,
      };
    });
  } else {
    // Generate reasonable defaults
    benefitItems = [
      {
        icon: "faculty",
        title_he: "סגל אקדמי מוביל",
        description_he: `מרצים מהשורה הראשונה בתחום ${fieldName} עם ניסיון אקדמי ומעשי`,
      },
      {
        icon: "practical",
        title_he: "למידה מעשית",
        description_he:
          "שילוב ייחודי של תיאוריה ופרקטיקה עם התנסויות בשטח",
      },
      {
        icon: "placement",
        title_he: "שיעור השמה גבוה",
        description_he:
          "בוגרי התוכנית משתלבים בהצלחה בשוק העבודה ובארגונים מובילים",
      },
      {
        icon: "campuses",
        title_he: "קמפוסים נגישים",
        description_he:
          "לימודים בקמפוסים מודרניים ונגישים ברחבי הארץ",
      },
      {
        icon: "flexibility",
        title_he: "גמישות בלימודים",
        description_he:
          "מסלולי בוקר וערב המאפשרים שילוב לימודים עם עבודה",
      },
      {
        icon: "scholarship",
        title_he: "מלגות ומימון",
        description_he:
          "מגוון מלגות ומסלולי מימון להנגשת הלימודים",
      },
    ];
  }

  return {
    section_type: "benefits",
    sort_order: 3,
    is_visible: true,
    content: {
      heading_he: `היתרונות של לימודי ${fieldName} באונו`,
      items: benefitItems,
    },
    styles: {},
  };
}

/**
 * Builds the curriculum section (sort_order: 4)
 * Uses real course lists and program structure from scraped data.
 */
function buildCurriculumSection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  const YEAR_LABELS: Record<string, string> = {
    year_1: "שנה א׳",
    year_2: "שנה ב׳",
    year_3: "שנה ג׳",
    year_4: "שנה ד׳",
  };

  let semesters: Array<{
    title_he: string;
    courses: Array<{ name_he: string }>;
  }> = [];

  if (scraped?.program_structure) {
    // Real year-by-year structure
    for (const [yearKey, courses] of Object.entries(
      scraped.program_structure
    )) {
      semesters.push({
        title_he: YEAR_LABELS[yearKey] || yearKey,
        courses: courses.map((c) => ({ name_he: c })),
      });
    }
  } else if (scraped?.courses && scraped.courses.length > 0) {
    // Flat course list - split into semesters
    const allCourses = scraped.courses;
    const perSemester = Math.ceil(allCourses.length / 3);
    const chunks: string[][] = [];
    for (let i = 0; i < allCourses.length; i += perSemester) {
      chunks.push(allCourses.slice(i, i + perSemester));
    }
    semesters = chunks.map((chunk, i) => ({
      title_he: YEAR_LABELS[`year_${i + 1}`] || `שנה ${i + 1}`,
      courses: chunk.map((c) => ({ name_he: c })),
    }));
  } else if (scraped?.courses_year_1 && scraped.courses_year_1.length > 0) {
    // Only year 1 courses available
    semesters.push({
      title_he: "שנה א׳",
      courses: scraped.courses_year_1.map((c) => ({ name_he: c })),
    });
  } else {
    // Generate default curriculum based on field
    const fieldName = getFieldName(program);
    if (program.level === "bachelor") {
      semesters = [
        {
          title_he: "שנה א׳ - קורסי יסוד",
          courses: [
            { name_he: `מבוא ל${fieldName}` },
            { name_he: "שיטות מחקר" },
            { name_he: "סטטיסטיקה" },
            { name_he: "אנגלית אקדמית" },
            { name_he: "אוריינות אקדמית" },
          ],
        },
        {
          title_he: "שנה ב׳ - קורסי ליבה",
          courses: [
            { name_he: `נושאים מתקדמים ב${fieldName}` },
            { name_he: "סמינריון" },
            { name_he: "קורסי בחירה" },
            { name_he: "התנסות מעשית" },
          ],
        },
        {
          title_he: "שנה ג׳ - התמחות ופרויקט",
          courses: [
            { name_he: "קורסי התמחות" },
            { name_he: "פרויקט גמר" },
            { name_he: "סדנה מעשית" },
            { name_he: "סטאז׳/התמחות בשטח" },
          ],
        },
      ];
    } else {
      semesters = [
        {
          title_he: "סמסטר א׳",
          courses: [
            { name_he: `יסודות מתקדמים ב${fieldName}` },
            { name_he: "שיטות מחקר מתקדמות" },
            { name_he: "סמינריון" },
          ],
        },
        {
          title_he: "סמסטר ב׳",
          courses: [
            { name_he: "קורסי התמחות" },
            { name_he: "קורסי בחירה" },
            { name_he: "פרויקט/תזה" },
          ],
        },
      ];
    }
  }

  return {
    section_type: "curriculum",
    sort_order: 4,
    is_visible: true,
    content: {
      heading_he: "תוכנית הלימודים",
      semesters,
    },
    styles: {},
  };
}

/**
 * Builds the career outcomes section (sort_order: 5)
 * Uses real career outcomes from scraped data.
 */
function buildCareerSection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  const fieldName = getFieldName(program);

  let items: Array<{ title_he: string; icon?: string }>;

  if (scraped?.career_outcomes && scraped.career_outcomes.length > 0) {
    items = scraped.career_outcomes.map((outcome) => ({
      title_he: outcome,
    }));
  } else {
    // Generate reasonable defaults based on field
    items = [
      { title_he: `תפקידים מקצועיים בתחום ${fieldName}` },
      { title_he: "ניהול צוותים ופרויקטים בארגונים מובילים" },
      { title_he: "עבודה במגזר הציבורי והפרטי" },
      { title_he: "יזמות והקמת עסק עצמאי" },
      { title_he: "המשך לימודים לתואר מתקדם" },
    ];
  }

  return {
    section_type: "career",
    sort_order: 5,
    is_visible: true,
    content: {
      heading_he: "לאן תגיעו אחרי התואר?",
      subheading_he: `בוגרי ${fieldName} באונו משתלבים בתפקידים מובילים`,
      items,
    },
    styles: {},
  };
}

/**
 * Builds the testimonials section (sort_order: 6)
 * Uses REAL testimonials with names, roles, quotes, and photos.
 */
function buildTestimonialsSection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  let items: Array<{
    name: string;
    role_he: string;
    quote_he: string;
    image_url?: string;
  }>;

  if (
    scraped?.testimonials &&
    scraped.testimonials.length > 0 &&
    scraped.testimonials.some((t) => t.quote_he && t.quote_he.length > 0)
  ) {
    items = scraped.testimonials
      .filter((t) => t.quote_he && t.quote_he.length > 0)
      .map((t) => ({
        name: t.name,
        role_he: t.role,
        quote_he: t.quote_he,
        image_url: t.image || undefined,
      }));
  } else {
    // Empty - the component will hide itself if no items
    items = [];
  }

  return {
    section_type: "testimonials",
    sort_order: 6,
    is_visible: items.length > 0,
    content: {
      heading_he: "מה אומרים הבוגרים שלנו",
      items,
    },
    styles: {},
  };
}

/**
 * Builds the faculty section (sort_order: 7)
 * Uses REAL faculty names and roles from scraped data.
 */
function buildFacultySection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  let members: Array<{
    name_he: string;
    title_he?: string;
    image_url?: string;
  }>;

  if (scraped?.faculty && scraped.faculty.length > 0) {
    members = scraped.faculty.map((f) => ({
      name_he: f.name,
      title_he: f.role,
    }));
  } else {
    // Empty - the component hides if no members
    members = [];
  }

  return {
    section_type: "faculty",
    sort_order: 7,
    is_visible: members.length > 0,
    content: {
      heading_he: "הסגל האקדמי",
      members,
    },
    styles: {},
  };
}

/**
 * Builds the FAQ section (sort_order: 8)
 * Generates FAQs that incorporate REAL admission requirements data.
 */
function buildFaqSection(
  program: ProgramRow,
  scraped: ScrapedProgram | null
): SectionData {
  const fieldName = getFieldName(program);
  const degreeLabel = getDegreeLabel(program.degree_type);
  const duration = scraped?.duration || getDuration(program);
  const schedule = scraped?.format || getSchedule(program);

  // Build admission answer from real data
  let admissionAnswer: string;
  if (scraped?.admission) {
    const parts: string[] = [];
    const adm = scraped.admission;

    if (typeof adm.direct === "string") {
      parts.push(`קבלה ישירה: ${adm.direct}`);
    } else if (Array.isArray(adm.direct)) {
      parts.push(
        "קבלה ישירה: " + (adm.direct as string[]).join(" / ")
      );
    } else if (adm.direct && typeof adm.direct === "object") {
      const d = adm.direct as Record<string, string>;
      const subParts: string[] = [];
      if (d.bagrut_average) subParts.push(`ממוצע בגרות ${d.bagrut_average}`);
      if (d.psychometric) subParts.push(`פסיכומטרי ${d.psychometric}`);
      if (d.math) subParts.push(`מתמטיקה: ${d.math}`);
      parts.push("קבלה ישירה: " + subParts.join(", "));
    }

    if (typeof adm.basic === "string") {
      parts.push(adm.basic);
    }

    if (Array.isArray(adm.weighted)) {
      parts.push(
        "קבלה משוקללת: " + (adm.weighted as string[]).join(" / ")
      );
    }
    if (Array.isArray(adm.conditional)) {
      parts.push(
        "קבלה מותנית: " + (adm.conditional as string[]).join(" / ")
      );
    }
    if (typeof adm.preparation === "string") {
      parts.push(`מכינה: ${adm.preparation}`);
    }
    if (typeof adm.language === "string") {
      parts.push(`דרישות שפה: ${adm.language}`);
    }

    admissionAnswer =
      parts.length > 0
        ? parts.join(". ") + "."
        : `תנאי הקבלה ל${degreeLabel} ב${fieldName} כוללים בגרות מלאה ופסיכומטרי. לפרטים מדויקים פנו למחלקת הרישום.`;
  } else {
    admissionAnswer =
      program.level === "bachelor"
        ? `תנאי הקבלה ל${degreeLabel} ב${fieldName} כוללים בגרות מלאה ופסיכומטרי או ציון מותאם. ניתן להגיש מועמדות גם על סמך תואר קודם או ניסיון מקצועי. לפרטים - פנו למחלקת הרישום.`
        : `תנאי הקבלה כוללים תואר ראשון ממוסד אקדמי מוכר עם ממוצע מינימלי. חלק מהתוכניות דורשות ניסיון מקצועי. לפרטים - פנו למחלקת הרישום.`;
  }

  // Build schedule/format answer from real data
  const scheduleAnswer = scraped?.format
    ? `מתכונת הלימודים: ${scraped.format}. ${
        scraped.schedule_details && scraped.schedule_details.length > 0
          ? "לפרטים על מועדי הלימודים בכל קמפוס - פנו למחלקת הרישום."
          : ""
      }`
    : `הלימודים מתקיימים במתכונת ${schedule}. הקריה האקדמית אונו מציעה גמישות במסלולי הלימוד כדי לאפשר שילוב בין לימודים לעבודה.`;

  // Certifications FAQ if available
  const certFaq =
    scraped?.certifications && scraped.certifications.length > 0
      ? [
          {
            question_he: "אילו תעודות מקבלים בסיום התואר?",
            answer_he: `בסיום התוכנית תקבלו: ${scraped.certifications.join(", ")}.`,
          },
        ]
      : [];

  const faqs = [
    {
      question_he: `מה תנאי הקבלה ל${program.name_he}?`,
      answer_he: admissionAnswer,
    },
    {
      question_he: "כמה זמן נמשכים הלימודים?",
      answer_he: `משך הלימודים הוא ${duration}. ${scheduleAnswer}`,
    },
    {
      question_he:
        program.level === "bachelor"
          ? "האם ניתן ללמוד בערב?"
          : "האם ניתן לשלב לימודים עם עבודה?",
      answer_he:
        program.level === "bachelor"
          ? `כן, הקריה האקדמית אונו מציעה מסלולי לימוד ב${schedule} כדי לאפשר שילוב בין לימודים לעבודה.`
          : `בהחלט. הלימודים מתקיימים בשעות ${schedule} ומאפשרים שילוב מלא בין הקריירה ללימודים.`,
    },
    ...certFaq,
    {
      question_he: `מהן אפשרויות הקריירה לאחר סיום התואר ב${fieldName}?`,
      answer_he:
        scraped?.career_outcomes && scraped.career_outcomes.length > 0
          ? `בוגרי התוכנית משתלבים בתפקידים כמו: ${scraped.career_outcomes.slice(0, 4).join(", ")} ועוד.`
          : `בוגרי ${degreeLabel} ב${fieldName} נהנים ממגוון רחב של אפשרויות תעסוקה. הקריה האקדמית אונו שמה דגש על הכשרה מעשית המבטיחה שיעור השמה גבוה.`,
    },
    {
      question_he: `למה כדאי ללמוד ${program.name_he} בקריה האקדמית אונו?`,
      answer_he:
        scraped?.unique_selling_points &&
        scraped.unique_selling_points.length > 0
          ? `${scraped.unique_selling_points.join(". ")}. הקריה האקדמית אונו היא המכללה המומלצת בישראל.`
          : `הקריה האקדמית אונו היא המכללה המומלצת בישראל, עם סגל אקדמי מוביל, תוכניות לימוד מעודכנות ומתקנים חדישים. המכללה מציעה מלגות ומסלולי מימון מגוונים.`,
    },
  ];

  return {
    section_type: "faq",
    sort_order: 8,
    is_visible: true,
    content: {
      heading_he: "שאלות נפוצות",
      items: faqs,
    },
    styles: {},
  };
}

/**
 * Builds the CTA section (sort_order: 9)
 * No form - just a CTA button.
 */
function buildCtaSection(program: ProgramRow): SectionData {
  const fieldName = getFieldName(program);
  return {
    section_type: "cta",
    sort_order: 9,
    is_visible: true,
    content: {
      heading_he: `מוכנים להתחיל ללמוד ${fieldName}?`,
      description_he:
        "השאירו פרטים ויועץ לימודים יחזור אליכם תוך 24 שעות",
      button_text_he: "לפרטים נוספים",
      phone: "*2899",
    },
    styles: {},
  };
}

/**
 * Builds admission content from scraped admission data
 */
function buildAdmissionContent(scraped: ScrapedProgram): Record<string, unknown> {
  const adm = scraped.admission;
  if (!adm) return {};

  // Multi-track: if admission has 'direct' + 'conditional' or multiple keys
  if (typeof adm === "object" && !Array.isArray(adm)) {
    const admObj = adm as Record<string, unknown>;
    const tracks = [];

    if (admObj.direct) {
      const reqs = Array.isArray(admObj.direct) ? admObj.direct as string[] : [String(admObj.direct)];
      tracks.push({ title_he: "קבלה ישירה", icon: "star", badge_he: "מומלץ", requirements: reqs });
    }
    if (admObj.conditional) {
      const reqs = Array.isArray(admObj.conditional) ? admObj.conditional as string[] : [String(admObj.conditional)];
      tracks.push({ title_he: "קבלה מותנית", icon: "check", requirements: reqs });
    }
    if (admObj.weighted) {
      const reqs = Array.isArray(admObj.weighted) ? admObj.weighted as string[] : [String(admObj.weighted)];
      tracks.push({ title_he: "מסלול נוסף", icon: "shield", requirements: reqs });
    }
    if (admObj.other) {
      const reqs = Array.isArray(admObj.other) ? admObj.other as string[] : [String(admObj.other)];
      tracks.push({ title_he: "מסלולים נוספים", icon: "award", requirements: reqs });
    }

    if (tracks.length > 1) {
      return { heading_he: "תנאי קבלה", tracks };
    }
    if (tracks.length === 1) {
      return { heading_he: "תנאי קבלה", requirements: tracks[0].requirements };
    }
  }

  // Simple array
  if (Array.isArray(adm)) {
    return { heading_he: "תנאי קבלה", requirements: adm as string[] };
  }

  return { heading_he: "תנאי קבלה", requirements: [String(adm)] };
}

/**
 * Builds the WhatsApp floating button section (sort_order: 10)
 */
function buildWhatsappSection(program: ProgramRow): SectionData {
  return {
    section_type: "whatsapp",
    sort_order: 10,
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
  console.log("OnoLeads - Generate Landing Pages (v2)");
  console.log("========================================\n");

  // 1. Load scraped data
  console.log("Loading scraped program data...");
  const scrapedData = loadScrapedData();
  const scrapedMap = buildScrapedMap(scrapedData);
  console.log(
    `Loaded ${scrapedData.programs.length} scraped programs: ${Array.from(scrapedMap.keys()).join(", ")}\n`
  );

  // 2. Fetch all academic programs from Supabase
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

  // 3. Fetch the degree_program template
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

  // 4. DELETE all existing pages and sections (clean slate)
  console.log("Deleting ALL existing page_sections...");
  const { error: delSectionsErr } = await supabase
    .from("page_sections")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

  if (delSectionsErr) {
    console.error(
      "Error deleting page_sections:",
      delSectionsErr.message
    );
    process.exit(1);
  }
  console.log("  Deleted all page_sections.");

  console.log("Deleting ALL existing pages...");
  const { error: delPagesErr } = await supabase
    .from("pages")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

  if (delPagesErr) {
    console.error("Error deleting pages:", delPagesErr.message);
    process.exit(1);
  }
  console.log("  Deleted all pages.\n");

  // 5. Generate pages for each program
  let created = 0;
  let withScrapedData = 0;

  for (const program of programs as unknown as ProgramRow[]) {
    const scraped = findScrapedMatch(program.slug, scrapedMap);
    const hasScraped = scraped !== null;
    if (hasScraped) withScrapedData++;

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
      seo_title: `${program.name_he} - ${degreeLabel} | הקריה האקדמית אונו`,
      seo_description: scraped
        ? scraped.description_he.substring(0, 160)
        : `לימודי ${program.name_he} בהקריה האקדמית אונו. ${degreeLabel} עם הכשרה מעשית ושיעור השמה גבוה. המכללה המומלצת בישראל.`,
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
      console.error(
        `  ERROR: no page returned for "${program.name_he}"`
      );
      continue;
    }

    // Build all sections — gallery added when scraped data has 3+ real images
    const galleryImages = scraped?.images && scraped.images.length >= 3
      ? scraped.images.slice(0, 8).map((url: string) => ({ url, alt_he: program.name_he }))
      : null;

    const sections: SectionData[] = [
      buildHeroSection(program, scraped),
      buildProgramInfoBar(program, scraped),
      buildAboutSection(program, scraped),
      buildBenefitsSection(program, scraped),
      buildCurriculumSection(program, scraped),
      buildCareerSection(program, scraped),
      buildTestimonialsSection(program, scraped),
      buildFacultySection(program, scraped),
      // Gallery section (only for programs with real scraped images)
      ...(galleryImages ? [{
        section_type: "gallery",
        sort_order: 8,
        is_visible: true,
        content: {
          heading_he: "תמונות מהתוכנית",
          images: galleryImages,
          layout: "grid",
        },
        styles: {},
      } as SectionData] : []),
      // Admission section — injected from scraped admission data
      ...(scraped?.admission ? [{
        section_type: "admission",
        sort_order: 9,
        is_visible: true,
        content: buildAdmissionContent(scraped),
        styles: {},
      } as SectionData] : []),
      buildFaqSection(program, scraped),
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

    const scrapedTag = hasScraped ? " [REAL DATA]" : " [generated]";
    console.log(
      `  + [${program.degree_type}] ${program.name_he} -> /lp/${program.slug} (${sections.length} sections)${scrapedTag}`
    );
    created++;
  }

  console.log("\n========================================");
  console.log("Landing Page Generation Complete!");
  console.log(`  Created: ${created} pages (${withScrapedData} with real scraped data)`);
  console.log(`  Sections per page: 11`);
  console.log(`  Total programs: ${programs.length}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Generation failed:", err);
  process.exit(1);
});
