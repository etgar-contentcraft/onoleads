/**
 * Seed Script for OnoLeads
 * ========================
 * Reads data/ono-programs-catalog.md and seeds all faculties, programs,
 * specializations, templates, and default settings into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-programs.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

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

interface FacultyData {
  name_he: string;
  name_en: string;
  slug: string;
  sort_order: number;
}

interface ProgramData {
  faculty_slug: string;
  name_he: string;
  name_en?: string;
  slug: string;
  degree_type: string;
  level: "bachelor" | "master" | "certificate" | "continuing_ed";
  original_url: string | null;
  is_international: boolean;
  specializations: string[];
  campuses?: string[];
  schedule_options?: string[];
  meta?: Record<string, unknown>;
}

// ============================================
// SLUG GENERATION
// ============================================

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 120);
}

function extractSlugFromUrl(url: string): string {
  if (!url || url === "-") return "";
  const match = url.match(/\/curriculum\/([^/]+)\/?$/);
  if (match) return match[1].replace(/\/$/, "");
  const engMatch = url.match(/\/eng\/curriculum\/([^/]+)\/?$/);
  if (engMatch) return engMatch[1].replace(/\/$/, "");
  return "";
}

// ============================================
// DEGREE TYPE => LEVEL MAPPING
// ============================================

function degreeToLevel(degree: string): "bachelor" | "master" | "certificate" | "continuing_ed" {
  const d = degree.trim().toUpperCase();
  if (
    d.includes("B.A") ||
    d.includes("B.SC") ||
    d.includes("B.S.N") ||
    d.includes("B.O.T") ||
    d.includes("B.MUS") ||
    d.includes("LL.B")
  ) {
    return "bachelor";
  }
  if (
    d.includes("M.A") ||
    d.includes("M.SC") ||
    d.includes("M.P.S") ||
    d.includes("MBA") ||
    d.includes("LL.M") ||
    d.includes("EXECUTIVE")
  ) {
    return "master";
  }
  return "certificate";
}

// ============================================
// PARSE CATALOG
// ============================================

function parseCatalog(content: string): {
  faculties: FacultyData[];
  programs: ProgramData[];
  continuingEd: { name: string; category: string }[];
} {
  const faculties: FacultyData[] = [];
  const programs: ProgramData[] = [];
  const continuingEd: { name: string; category: string }[] = [];

  const lines = content.split("\n");

  // Define faculty sections with their Hebrew and English names
  const facultySections: {
    name_he: string;
    name_en: string;
    slug: string;
    sort_order: number;
    headerPattern: RegExp;
  }[] = [
    {
      name_he: "פקולטה למנהל עסקים",
      name_en: "Faculty of Business Administration",
      slug: "business-administration",
      sort_order: 1,
      headerPattern: /פקולטה למנהל עסקים/,
    },
    {
      name_he: "פקולטה למשפטים",
      name_en: "Faculty of Law",
      slug: "law",
      sort_order: 2,
      headerPattern: /פקולטה למשפטים/,
    },
    {
      name_he: "פקולטה למדעי הרוח והחברה",
      name_en: "Faculty of Humanities & Social Sciences",
      slug: "humanities-social-sciences",
      sort_order: 3,
      headerPattern: /פקולטה למדעי הרוח והחברה/,
    },
    {
      name_he: "פקולטה למקצועות הבריאות",
      name_en: "Faculty of Health Professions",
      slug: "health-professions",
      sort_order: 4,
      headerPattern: /פקולטה למקצועות הבריאות/,
    },
    {
      name_he: "בית הספר הבינלאומי",
      name_en: "Ono International School",
      slug: "international-school",
      sort_order: 5,
      headerPattern: /בית הספר הבינלאומי/,
    },
    {
      name_he: "לימודי תעודה והמשך",
      name_en: "Continuing Education",
      slug: "continuing-education",
      sort_order: 6,
      headerPattern: /לימודי תעודה והמשך/,
    },
  ];

  // Build faculties list
  for (const fs of facultySections) {
    faculties.push({
      name_he: fs.name_he,
      name_en: fs.name_en,
      slug: fs.slug,
      sort_order: fs.sort_order,
    });
  }

  // Find section boundaries
  interface Section {
    faculty: typeof facultySections[0];
    startLine: number;
    endLine: number;
  }

  const sections: Section[] = [];

  for (const fac of facultySections) {
    for (let i = 0; i < lines.length; i++) {
      if (fac.headerPattern.test(lines[i])) {
        sections.push({ faculty: fac, startLine: i, endLine: lines.length });
        break;
      }
    }
  }

  // Set end lines
  sections.sort((a, b) => a.startLine - b.startLine);
  for (let i = 0; i < sections.length - 1; i++) {
    sections[i].endLine = sections[i + 1].startLine;
  }

  // Parse each section
  for (const section of sections) {
    const sectionLines = lines.slice(section.startLine, section.endLine);
    const facultySlug = section.faculty.slug;

    if (facultySlug === "continuing-education") {
      // Parse continuing education items
      let currentCategory = "";
      for (const line of sectionLines) {
        if (line.startsWith("###") && !line.includes("Portal")) {
          currentCategory = line.replace(/^#+\s*/, "").trim();
        }
        const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
        if (numberedMatch) {
          continuingEd.push({
            name: numberedMatch[1].trim(),
            category: currentCategory,
          });
        }
        const bulletMatch = line.match(/^-\s+(.+)$/);
        if (bulletMatch && currentCategory) {
          continuingEd.push({
            name: bulletMatch[1].trim(),
            category: currentCategory,
          });
        }
      }
      continue;
    }

    // Parse tables in this section
    let currentDegreeLevel: "bachelor" | "master" | "certificate" | null = null;

    for (let i = 0; i < sectionLines.length; i++) {
      const line = sectionLines[i];

      // Detect degree level headers
      if (line.includes("תואר ראשון") || line.includes("Bachelor")) {
        currentDegreeLevel = "bachelor";
      } else if (line.includes("תואר שני") || line.includes("Master")) {
        currentDegreeLevel = "master";
      }

      // Parse table rows (skip header row and separator)
      if (!line.startsWith("|")) continue;
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Skip header rows and separator rows
      if (
        cells.length < 3 ||
        cells[0] === "#" ||
        cells[0] === "---" ||
        cells[0].match(/^-+$/) ||
        cells[1] === "שם התוכנית" ||
        cells[1] === "Program" ||
        cells[1] === "--------"
      ) {
        continue;
      }

      // International school has a different format
      if (facultySlug === "international-school") {
        // Format: | # | Program | Degree | URL |
        const name_en = cells[1];
        const degree_type = cells[2];
        const url = cells[3] || "-";

        const urlSlug = extractSlugFromUrl(url);
        const slug = urlSlug || toSlug(name_en);

        if (!name_en || !degree_type || name_en === "Program") continue;

        programs.push({
          faculty_slug: facultySlug,
          name_he: name_en, // International programs use English name as primary
          name_en: name_en,
          slug: slug,
          degree_type: degree_type,
          level: degreeToLevel(degree_type),
          original_url: url !== "-" ? url : null,
          is_international: true,
          specializations: [],
        });
      } else {
        // Hebrew faculties format: | # | שם התוכנית | תואר | URL | התמחויות |
        const name_he = cells[1];
        const degree_type = cells[2];
        const url = cells[3] || "-";
        const specsRaw = cells[4] || "-";

        if (!name_he || !degree_type) continue;

        const urlSlug = extractSlugFromUrl(url);
        const slug = urlSlug || toSlug(name_he + "-" + degree_type.toLowerCase().replace(/[^a-z]/g, ""));

        const level = currentDegreeLevel || degreeToLevel(degree_type);

        // Parse specializations
        const specializations: string[] = [];
        if (specsRaw && specsRaw !== "-") {
          // Split by comma or semicolon
          const specs = specsRaw.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 0);
          specializations.push(...specs);
        }

        // Parse campuses and schedule from specializations/notes for LL.B
        const campuses: string[] = [];
        const scheduleOptions: string[] = [];
        const meta: Record<string, unknown> = {};

        if (specsRaw.includes("קמפוס") || specsRaw.includes("קרית אונו")) {
          const campusMatch = specsRaw.match(/קרית אונו|חיפה|ירושלים|חרדי/g);
          if (campusMatch) campuses.push(...campusMatch);
        }
        if (specsRaw.includes("בוקר") || specsRaw.includes("ערב")) {
          const schedMatch = specsRaw.match(/בוקר|ערב|משולב/g);
          if (schedMatch) scheduleOptions.push(...schedMatch);
        }
        if (specsRaw.includes("מסלול מחקרי")) {
          meta.research_track = true;
        }
        if (specsRaw.includes("שנות ניסיון")) {
          meta.experience_required = specsRaw;
        }
        if (specsRaw.includes("מסלולים")) {
          meta.tracks = specsRaw;
        }

        programs.push({
          faculty_slug: facultySlug,
          name_he,
          slug,
          degree_type,
          level,
          original_url: url !== "-" && url.startsWith("/") ? url : (url !== "-" ? url : null),
          is_international: false,
          specializations: specializations.filter(
            (s) => !s.includes("קמפוס") && !s.includes("קרית אונו") && !s.match(/^(בוקר|ערב|משולב)$/)
          ),
          campuses: campuses.length > 0 ? campuses : undefined,
          schedule_options: scheduleOptions.length > 0 ? scheduleOptions : undefined,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
        });
      }
    }
  }

  return { faculties, programs, continuingEd };
}

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedFaculties(faculties: FacultyData[]): Promise<Map<string, string>> {
  console.log(`\nSeeding ${faculties.length} faculties...`);
  const slugToId = new Map<string, string>();

  for (const faculty of faculties) {
    // Upsert by slug
    const { data, error } = await supabase
      .from("faculties")
      .upsert(
        {
          name_he: faculty.name_he,
          name_en: faculty.name_en,
          slug: faculty.slug,
          sort_order: faculty.sort_order,
        },
        { onConflict: "slug" }
      )
      .select("id, slug")
      .single();

    if (error) {
      console.error(`  Error seeding faculty "${faculty.name_he}":`, error.message);
      continue;
    }

    if (data) {
      slugToId.set(faculty.slug, data.id);
      console.log(`  + ${faculty.name_he} (${data.id})`);
    }
  }

  return slugToId;
}

async function seedPrograms(
  programs: ProgramData[],
  facultyMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log(`\nSeeding ${programs.length} programs...`);
  const slugToId = new Map<string, string>();
  const seenSlugs = new Set<string>();

  for (const prog of programs) {
    const facultyId = facultyMap.get(prog.faculty_slug);

    // Ensure unique slug
    let slug = prog.slug;
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${prog.level}`;
    }
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${Date.now()}`;
    }
    seenSlugs.add(slug);

    const record: Record<string, unknown> = {
      faculty_id: facultyId || null,
      name_he: prog.name_he,
      name_en: prog.name_en || null,
      slug,
      degree_type: prog.degree_type,
      level: prog.level,
      original_url: prog.original_url,
      is_international: prog.is_international,
      is_active: true,
      campuses: prog.campuses || [],
      schedule_options: prog.schedule_options || [],
      meta: prog.meta || {},
    };

    const { data, error } = await supabase
      .from("programs")
      .upsert(record, { onConflict: "slug" })
      .select("id, slug")
      .single();

    if (error) {
      console.error(`  Error seeding program "${prog.name_he}":`, error.message);
      continue;
    }

    if (data) {
      slugToId.set(slug, data.id);
      console.log(`  + [${prog.degree_type}] ${prog.name_he} (${slug})`);
    }
  }

  return slugToId;
}

async function seedSpecializations(
  programs: ProgramData[],
  programSlugToId: Map<string, string>
): Promise<void> {
  const allSpecs: { program_id: string; name_he: string; slug: string; sort_order: number }[] = [];
  const seenSlugs = new Set<string>();

  for (const prog of programs) {
    // Find the program ID by matching slug
    let programId: string | undefined;
    for (const [slug, id] of programSlugToId) {
      if (slug === prog.slug || slug.startsWith(prog.slug)) {
        programId = id;
        break;
      }
    }
    if (!programId) continue;

    for (let i = 0; i < prog.specializations.length; i++) {
      const specName = prog.specializations[i];
      if (!specName || specName === "-") continue;

      let specSlug = toSlug(`${prog.slug}-${specName}`);
      if (seenSlugs.has(specSlug)) {
        specSlug = `${specSlug}-${i}`;
      }
      seenSlugs.add(specSlug);

      allSpecs.push({
        program_id: programId,
        name_he: specName,
        slug: specSlug,
        sort_order: i,
      });
    }
  }

  if (allSpecs.length === 0) {
    console.log("\nNo specializations to seed.");
    return;
  }

  console.log(`\nSeeding ${allSpecs.length} specializations...`);

  // Insert in batches of 20
  for (let i = 0; i < allSpecs.length; i += 20) {
    const batch = allSpecs.slice(i, i + 20);
    const { error } = await supabase.from("specializations").upsert(batch, { onConflict: "slug" });

    if (error) {
      console.error(`  Error seeding specializations batch ${i}:`, error.message);
    } else {
      for (const spec of batch) {
        console.log(`  + ${spec.name_he} (${spec.slug})`);
      }
    }
  }
}

async function seedContinuingEd(
  items: { name: string; category: string }[],
  facultyMap: Map<string, string>
): Promise<void> {
  const facultyId = facultyMap.get("continuing-education");
  if (!facultyId || items.length === 0) return;

  console.log(`\nSeeding ${items.length} continuing education programs...`);
  const seenSlugs = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    let slug = toSlug(`ce-${item.name}`);
    if (!slug) slug = `ce-${i}`;
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${i}`;
    }
    seenSlugs.add(slug);

    const { error } = await supabase.from("programs").upsert(
      {
        faculty_id: facultyId,
        name_he: item.name,
        slug,
        degree_type: "תעודה",
        level: "continuing_ed",
        is_international: false,
        is_active: true,
        meta: { category: item.category },
      },
      { onConflict: "slug" }
    );

    if (error) {
      console.error(`  Error seeding CE "${item.name}":`, error.message);
    } else {
      console.log(`  + [תעודה] ${item.name}`);
    }
  }
}

async function seedTemplates(): Promise<void> {
  console.log("\nSeeding templates...");

  const templates = [
    {
      name: "תוכנית לימוד",
      type: "degree_program" as const,
      description: "תבנית סטנדרטית לדף נחיתה של תוכנית לימוד אקדמית",
      is_active: true,
      section_schema: [
        {
          type: "hero",
          label: "כותרת ראשית",
          default_content: {
            title: "",
            subtitle: "",
            background_image: "",
            cta_text: "השאירו פרטים",
          },
          default_styles: {},
        },
        {
          type: "form",
          label: "טופס לידים",
          default_content: {
            title: "רוצים לשמוע עוד?",
            subtitle: "השאירו פרטים ונחזור אליכם",
          },
          default_styles: {},
        },
        {
          type: "program_info",
          label: "מידע על התוכנית",
          default_content: {
            title: "על התוכנית",
            description: "",
            highlights: [],
          },
          default_styles: {},
        },
        {
          type: "curriculum",
          label: "תוכנית הלימודים",
          default_content: {
            title: "מה לומדים?",
            semesters: [],
          },
          default_styles: {},
        },
        {
          type: "career",
          label: "הזדמנויות קריירה",
          default_content: {
            title: "לאן ממשיכים?",
            careers: [],
          },
          default_styles: {},
        },
        {
          type: "testimonials",
          label: "המלצות",
          default_content: {
            title: "מה אומרים הסטודנטים",
            items: [],
          },
          default_styles: {},
        },
        {
          type: "faq",
          label: "שאלות נפוצות",
          default_content: {
            title: "שאלות נפוצות",
            items: [],
          },
          default_styles: {},
        },
        {
          type: "footer_cta",
          label: "קריאה לפעולה תחתונה",
          default_content: {
            title: "מוכנים להתחיל?",
            cta_text: "הרשמו עכשיו",
          },
          default_styles: {},
        },
      ],
    },
    {
      name: "אירוע / יום פתוח",
      type: "event" as const,
      description: "תבנית לאירוע יום פתוח, וובינר או מפגש מידע",
      is_active: true,
      section_schema: [
        {
          type: "hero",
          label: "כותרת האירוע",
          default_content: {
            title: "",
            subtitle: "",
            event_date: "",
            event_location: "",
            cta_text: "הרשמו לאירוע",
          },
          default_styles: {},
        },
        {
          type: "form",
          label: "טופס הרשמה",
          default_content: {
            title: "הרשמה לאירוע",
            subtitle: "מלאו את הפרטים ונשלח אישור",
          },
          default_styles: {},
        },
        {
          type: "event_details",
          label: "פרטי האירוע",
          default_content: {
            title: "מה בתוכנית?",
            agenda: [],
          },
          default_styles: {},
        },
        {
          type: "speakers",
          label: "דוברים",
          default_content: {
            title: "הדוברים שלנו",
            items: [],
          },
          default_styles: {},
        },
        {
          type: "map",
          label: "מפה והגעה",
          default_content: {
            title: "איך מגיעים?",
            address: "",
          },
          default_styles: {},
        },
        {
          type: "footer_cta",
          label: "קריאה לפעולה",
          default_content: {
            title: "אל תפספסו!",
            cta_text: "הרשמו עכשיו",
          },
          default_styles: {},
        },
      ],
    },
    {
      name: "אירוע מכירות",
      type: "sales_event" as const,
      description: "תבנית לקמפיין מכירות ממוקד עם דחיפות",
      is_active: true,
      section_schema: [
        {
          type: "hero",
          label: "כותרת ראשית",
          default_content: {
            title: "",
            subtitle: "",
            urgency_text: "",
            cta_text: "קבלו הצעה מיוחדת",
          },
          default_styles: {},
        },
        {
          type: "form",
          label: "טופס לידים",
          default_content: {
            title: "השאירו פרטים",
            subtitle: "ונחזור אליכם עם הצעה אישית",
          },
          default_styles: {},
        },
        {
          type: "benefits",
          label: "יתרונות",
          default_content: {
            title: "למה דווקא אצלנו?",
            items: [],
          },
          default_styles: {},
        },
        {
          type: "countdown",
          label: "ספירה לאחור",
          default_content: {
            title: "ההטבה מסתיימת בקרוב",
            end_date: "",
          },
          default_styles: {},
        },
        {
          type: "social_proof",
          label: "הוכחה חברתית",
          default_content: {
            title: "הצטרפו לאלפי סטודנטים",
            stats: [],
            testimonials: [],
          },
          default_styles: {},
        },
        {
          type: "footer_cta",
          label: "קריאה לפעולה",
          default_content: {
            title: "אל תחכו!",
            cta_text: "קבלו הצעה עכשיו",
          },
          default_styles: {},
        },
      ],
    },
  ];

  for (const template of templates) {
    const { error } = await supabase
      .from("templates")
      .upsert(template, { onConflict: "name" })
      .select();

    if (error) {
      // If upsert on name fails (no unique constraint on name), try insert
      const { error: insertError } = await supabase.from("templates").insert(template);
      if (insertError) {
        console.error(`  Error seeding template "${template.name}":`, insertError.message);
      } else {
        console.log(`  + ${template.name} (${template.type})`);
      }
    } else {
      console.log(`  + ${template.name} (${template.type})`);
    }
  }
}

async function seedDefaultSettings(): Promise<void> {
  console.log("\nSeeding default settings...");

  const settings = [
    {
      key: "webhook_url",
      value: JSON.stringify("https://hook.make.com/placeholder"),
    },
    {
      key: "site_name",
      value: JSON.stringify({
        he: "הקריה האקדמית אונו",
        en: "Ono Academic College",
        ar: "الحرم الأكاديمي أونو",
      }),
    },
    {
      key: "brand_colors",
      value: JSON.stringify({
        primary_green: "#B8D900",
        primary_gray: "#716C70",
        text_gray: "#716C70",
        light_bg: "#F5F5F5",
        white: "#FFFFFF",
      }),
    },
    {
      key: "brand_fonts",
      value: JSON.stringify({
        hebrew: "Foodifot, Arial, sans-serif",
        english: "Tahoma, sans-serif",
        arabic: "Tahoma, Arial, sans-serif",
      }),
    },
    {
      key: "default_form_fields",
      value: JSON.stringify([
        { name: "full_name", type: "text", label_he: "שם מלא", label_en: "Full Name", required: true },
        { name: "phone", type: "tel", label_he: "טלפון", label_en: "Phone", required: true },
        { name: "email", type: "email", label_he: "אימייל", label_en: "Email", required: false },
      ]),
    },
    {
      key: "whatsapp_number",
      value: JSON.stringify("972501234567"),
    },
    {
      key: "slogan",
      value: JSON.stringify({
        he: "משנים את פני החברה בישראל",
        en: "Changing the Face of Israeli Society",
      }),
    },
  ];

  for (const setting of settings) {
    const { error } = await supabase
      .from("settings")
      .upsert(setting, { onConflict: "key" });

    if (error) {
      console.error(`  Error seeding setting "${setting.key}":`, error.message);
    } else {
      console.log(`  + ${setting.key}`);
    }
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("========================================");
  console.log("OnoLeads Seed Script");
  console.log("========================================");

  // Read catalog file
  const catalogPath = path.resolve(__dirname, "..", "data", "ono-programs-catalog.md");
  console.log(`\nReading catalog from: ${catalogPath}`);

  if (!fs.existsSync(catalogPath)) {
    console.error(`Catalog file not found: ${catalogPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(catalogPath, "utf-8");
  console.log(`Catalog loaded (${content.length} characters)`);

  // Parse
  const { faculties, programs, continuingEd } = parseCatalog(content);
  console.log(`\nParsed:`);
  console.log(`  Faculties: ${faculties.length}`);
  console.log(`  Programs: ${programs.length}`);
  console.log(`  Continuing Ed: ${continuingEd.length}`);

  // Seed in order
  const facultyMap = await seedFaculties(faculties);
  const programMap = await seedPrograms(programs, facultyMap);
  await seedSpecializations(programs, programMap);
  await seedContinuingEd(continuingEd, facultyMap);
  await seedTemplates();
  await seedDefaultSettings();

  console.log("\n========================================");
  console.log("Seeding complete!");
  console.log(`  Faculties: ${facultyMap.size}`);
  console.log(`  Programs: ${programMap.size}`);
  console.log(`  Continuing Ed: ${continuingEd.length}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
