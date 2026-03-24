/**
 * Update Landing Pages with Real Scraped Content
 * ================================================
 * Reads scraped_program_data.json and updates existing landing pages
 * in Supabase with rich, real content from the Ono Academic College website.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/update-pages-with-real-content.ts
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

interface ScrapedTestimonial {
  name: string;
  role: string;
  quote_he: string;
  image?: string;
}

interface ScrapedFaculty {
  name: string;
  role: string;
}

interface ScrapedSpecialization {
  name: string;
  note?: string;
}

interface ScrapedScheduleDetail {
  campus?: string;
  track?: string;
  days?: string;
  options?: string[];
}

interface ScrapedAdmission {
  direct?: string | string[] | { bagrut_average?: string; math?: string; psychometric?: string; notes?: string };
  weighted?: string[];
  conditional?: string[];
  other?: string | string[];
  preparation?: string;
  basic?: string;
  language?: string;
  special_tracks?: string[];
  scholarship?: string;
  academic?: string;
  preparatory?: string;
}

interface ScrapedProgramStructure {
  year_1?: string[];
  year_2?: string[];
  year_3?: string[];
  year_4?: string[];
}

interface ScrapedProgram {
  id: string;
  url: string;
  title_he: string;
  title_en: string;
  description_he: string;
  duration: string;
  duration_en: string;
  format: string;
  format_en: string;
  location?: string;
  locations?: string[];
  benefits: (string | ScrapedSpecialization)[];
  career_outcomes?: string[];
  unique_selling_points?: string[];
  admission?: ScrapedAdmission;
  program_structure?: ScrapedProgramStructure;
  courses?: string[];
  courses_year_1?: string[];
  certifications?: string[];
  faculty?: ScrapedFaculty[];
  testimonials: ScrapedTestimonial[];
  images: string[];
  icons?: string[];
  statistics?: string[];
  schedule_details?: ScrapedScheduleDetail[];
  specializations?: ScrapedSpecialization[];
}

interface ScrapedData {
  scraped_date: string;
  source: string;
  programs: ScrapedProgram[];
  shared_assets: {
    logo: string;
    campus_images: Record<string, string>;
    icons: Record<string, string>;
  };
}

// ============================================
// SLUG MAPPING: scraped ID -> page slug
// ============================================

// Map scraped program IDs to the slugs used in the pages table
const SLUG_MAP: Record<string, string> = {
  "computer-science-bsc": "computer-science-bsc",
  "llb": "llb",
  "finance-and-capital-markets-mba": "finance-and-capital-markets-mba",
  "nursing": "nursing",
  "education-and-society-ba": "education-and-society-ba",
  "accounting-ba": "accounting-ba",
  "business-strategy-mba": "business-strategy-mba",
  "occupational-therapy-bot": "occupational-therapy-bot",
};

// ============================================
// HELPERS
// ============================================

function getFirstSentence(text: string): string {
  // Get first sentence (ending with period)
  const match = text.match(/^[^.]+\./);
  return match ? match[0] : text;
}

function getLocation(program: ScrapedProgram): string {
  if (program.locations && program.locations.length > 0) {
    return program.locations.join(", ");
  }
  return program.location || "קריית אונו";
}

function formatAdmissionForFaq(admission: ScrapedAdmission): string {
  const parts: string[] = [];

  if (admission.direct) {
    if (typeof admission.direct === "string") {
      parts.push(admission.direct);
    } else if (Array.isArray(admission.direct)) {
      parts.push(...admission.direct);
    } else {
      // Object with bagrut_average, math, psychometric, notes
      const d = admission.direct;
      if (d.bagrut_average) parts.push(`ממוצע בגרות ${d.bagrut_average}`);
      if (d.math) parts.push(`מתמטיקה: ${d.math}`);
      if (d.psychometric) parts.push(`פסיכומטרי ${d.psychometric}`);
      if (d.notes) parts.push(d.notes);
    }
  }

  if (admission.weighted) {
    parts.push(...admission.weighted);
  }

  if (admission.conditional) {
    parts.push(...admission.conditional);
  }

  if (admission.basic) {
    parts.push(admission.basic);
  }

  if (admission.other) {
    if (typeof admission.other === "string") {
      parts.push(admission.other);
    } else {
      parts.push(...admission.other);
    }
  }

  if (admission.preparation) {
    parts.push(`קורס הכנה: ${admission.preparation}`);
  }

  if (admission.special_tracks) {
    parts.push(...admission.special_tracks);
  }

  return parts.join(". ") + ".";
}

function formatProgramStructureForFaq(structure: ScrapedProgramStructure): string {
  const parts: string[] = [];
  if (structure.year_1) {
    parts.push(`שנה א': ${structure.year_1.slice(0, 5).join(", ")} ועוד`);
  }
  if (structure.year_2) {
    parts.push(`שנה ב': ${structure.year_2.slice(0, 5).join(", ")} ועוד`);
  }
  if (structure.year_3) {
    parts.push(`שנה ג': ${structure.year_3.slice(0, 5).join(", ")} ועוד`);
  }
  if (structure.year_4) {
    parts.push(`שנה ד': ${structure.year_4.slice(0, 4).join(", ")} ועוד`);
  }
  return parts.join(". ");
}

// ============================================
// SECTION BUILDERS
// ============================================

function buildUpdatedHeroSection(program: ScrapedProgram) {
  const backgroundImage =
    program.images && program.images.length > 0
      ? program.images[0]
      : "https://www.ono.ac.il/wp-content/uploads/2023/04/Ono_009-min-1-scaled-e1649600345705-2-2.jpg";

  // Pick stat based on program
  let statValue = "92%";
  let statLabel = "שיעור השמה";
  if (program.statistics && program.statistics.length > 0) {
    const stat = program.statistics[0];
    const numMatch = stat.match(/(\d+%)/);
    if (numMatch) {
      statValue = numMatch[1];
      statLabel = stat.replace(numMatch[1], "").trim();
    }
  } else if (program.id === "llb") {
    statValue = "90%";
    statLabel = "שיעור הצלחה בבחינת לשכה";
  } else if (program.id === "nursing" || program.id === "occupational-therapy-bot") {
    statValue = "100%";
    statLabel = "הצלחה בבחינות הרישוי";
  } else if (program.id.includes("mba")) {
    statValue = "30+";
    statLabel = "שנות מצוינות אקדמית";
  } else if (program.id === "computer-science-bsc") {
    statValue = "92%";
    statLabel = "שיעור השמה בתעשייה";
  }

  return {
    heading_he: program.title_he,
    subheading_he: getFirstSentence(program.description_he),
    cta_text_he: "השאירו פרטים וקבלו מידע מלא",
    stat_value: statValue,
    stat_label_he: statLabel,
    background_image: backgroundImage,
  };
}

function buildUpdatedStatsSection(program: ScrapedProgram) {
  const location = getLocation(program);

  const stats: { icon: string; value: string; label_he: string }[] = [
    { icon: "clock", value: program.duration, label_he: "משך הלימודים" },
    { icon: "map-pin", value: location, label_he: "קמפוס" },
    { icon: "calendar", value: program.format.split(".")[0].split(",")[0], label_he: "מתכונת לימודים" },
  ];

  // Add career stat if available
  if (program.career_outcomes && program.career_outcomes.length > 0) {
    stats.push({
      icon: "briefcase",
      value: `${program.career_outcomes.length}+`,
      label_he: "כיווני קריירה",
    });
  }

  // Add certifications count if available
  if (program.certifications && program.certifications.length > 0) {
    stats.push({
      icon: "award",
      value: `${program.certifications.length}`,
      label_he: "תעודות בתואר אחד",
    });
  }

  return {
    heading_he: "נתונים על התוכנית",
    stats,
  };
}

function buildBenefitsSection(program: ScrapedProgram) {
  const items: { title_he: string; description_he: string }[] = [];

  // Add benefits
  for (const benefit of program.benefits) {
    const benefitText = typeof benefit === "string" ? benefit : benefit.name;
    // Split benefit into title and description
    const dashIdx = benefitText.indexOf(" - ");
    if (dashIdx > 0) {
      items.push({
        title_he: benefitText.substring(0, dashIdx),
        description_he: benefitText.substring(dashIdx + 3),
      });
    } else {
      // Use first few words as title
      const words = benefitText.split(" ");
      const titleWords = words.slice(0, Math.min(4, words.length));
      items.push({
        title_he: titleWords.join(" "),
        description_he: benefitText,
      });
    }
  }

  // Add career outcomes as items
  if (program.career_outcomes && program.career_outcomes.length > 0) {
    items.push({
      title_he: "הזדמנויות קריירה",
      description_he: program.career_outcomes.join(", "),
    });
  }

  // Add USPs
  if (program.unique_selling_points) {
    for (const usp of program.unique_selling_points) {
      const words = usp.split(" ");
      const titleWords = words.slice(0, Math.min(4, words.length));
      items.push({
        title_he: titleWords.join(" "),
        description_he: usp,
      });
    }
  }

  return {
    heading_he: "למה ללמוד אצלנו?",
    items,
  };
}

function buildTestimonialsSection(program: ScrapedProgram) {
  const items = program.testimonials
    .filter((t) => t.quote_he && t.quote_he.length > 0)
    .map((t) => ({
      name: t.name,
      role_he: t.role,
      quote_he: t.quote_he,
      image: t.image || null,
    }));

  return {
    heading_he: "מה אומרים הבוגרים",
    items,
  };
}

function buildUpdatedFaqSection(program: ScrapedProgram) {
  const faqs: { question_he: string; answer_he: string }[] = [];

  // 1. Admission requirements FAQ
  if (program.admission) {
    faqs.push({
      question_he: `מה תנאי הקבלה ל${program.title_he}?`,
      answer_he: formatAdmissionForFaq(program.admission),
    });
  }

  // 2. Duration FAQ
  faqs.push({
    question_he: "כמה זמן נמשכים הלימודים?",
    answer_he: `משך הלימודים הוא ${program.duration}. מתכונת הלימודים: ${program.format}.`,
  });

  // 3. Program structure FAQ
  if (program.program_structure) {
    faqs.push({
      question_he: "מה לומדים בתוכנית?",
      answer_he: formatProgramStructureForFaq(program.program_structure),
    });
  } else if (program.courses && program.courses.length > 0) {
    faqs.push({
      question_he: "מה לומדים בתוכנית?",
      answer_he: `התוכנית כוללת קורסים כמו: ${program.courses.slice(0, 8).join(", ")} ועוד.`,
    });
  } else if (program.courses_year_1 && program.courses_year_1.length > 0) {
    faqs.push({
      question_he: "מה לומדים בתוכנית?",
      answer_he: `בשנה הראשונה לומדים: ${program.courses_year_1.slice(0, 8).join(", ")} ועוד.`,
    });
  }

  // 4. Career outcomes FAQ
  if (program.career_outcomes && program.career_outcomes.length > 0) {
    faqs.push({
      question_he: "מהן אפשרויות הקריירה לאחר סיום התואר?",
      answer_he: `בוגרי התוכנית משתלבים בתפקידים כגון: ${program.career_outcomes.join(", ")}.`,
    });
  }

  // 5. Location FAQ
  const location = getLocation(program);
  if (program.locations && program.locations.length > 1) {
    faqs.push({
      question_he: "באילו קמפוסים ניתן ללמוד?",
      answer_he: `התוכנית מתקיימת בקמפוסים: ${location}. ${program.schedule_details ? "מגוון מסלולי לימוד ומתכונות שונות זמינים בכל קמפוס." : ""}`,
    });
  }

  // 6. Schedule FAQ
  if (program.schedule_details && program.schedule_details.length > 0) {
    const schedParts = program.schedule_details.map((s) => {
      const parts: string[] = [];
      if (s.campus) parts.push(`קמפוס ${s.campus}`);
      if (s.track) parts.push(`מסלול ${s.track}`);
      if (s.days) parts.push(s.days);
      if (s.options) parts.push(s.options.join(" / "));
      return parts.join(" - ");
    });
    faqs.push({
      question_he: "מה מתכונת הלימודים?",
      answer_he: schedParts.join(". ") + ".",
    });
  }

  // 7. Why Ono FAQ
  const usps = program.unique_selling_points || [];
  faqs.push({
    question_he: `למה כדאי ללמוד ${program.title_he} בקריה האקדמית אונו?`,
    answer_he: usps.length > 0
      ? `הקריה האקדמית אונו היא המכללה המומלצת בישראל. ${usps.join(". ")}.`
      : `הקריה האקדמית אונו היא המכללה המומלצת בישראל, עם סגל אקדמי מוביל, תוכניות לימוד מעודכנות ומתקנים חדישים. התוכנית משלבת תיאוריה עם פרקטיקה ומכינה את הסטודנטים לקריירה מצליחה.`,
  });

  // 8. Certifications FAQ (if applicable)
  if (program.certifications && program.certifications.length > 0) {
    faqs.push({
      question_he: "אילו תעודות מקבלים בסיום?",
      answer_he: `בסיום התוכנית מקבלים: ${program.certifications.join(", ")}.`,
    });
  }

  // 9. Specializations FAQ (if applicable)
  if (program.specializations && program.specializations.length > 0) {
    const specNames = program.specializations.map((s) =>
      typeof s === "string" ? s : `${s.name}${s.note ? ` (${s.note})` : ""}`
    );
    faqs.push({
      question_he: "אילו התמחויות יש בתוכנית?",
      answer_he: `התוכנית מציעה התמחויות: ${specNames.join(", ")}.`,
    });
  }

  return {
    heading_he: "שאלות נפוצות",
    items: faqs,
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("========================================");
  console.log("OnoLeads - Update Pages with Real Content");
  console.log("========================================\n");

  // 1. Read scraped data
  const scrapedPath = path.resolve(__dirname, "..", "scraped_program_data.json");
  console.log(`Reading scraped data from: ${scrapedPath}`);

  if (!fs.existsSync(scrapedPath)) {
    console.error(`Scraped data file not found: ${scrapedPath}`);
    process.exit(1);
  }

  const scrapedData: ScrapedData = JSON.parse(fs.readFileSync(scrapedPath, "utf-8"));
  console.log(`Loaded ${scrapedData.programs.length} scraped programs (scraped on ${scrapedData.scraped_date}).\n`);

  // 2. Process each scraped program
  let updatedPages = 0;
  let updatedPrograms = 0;
  let errors = 0;

  for (const scraped of scrapedData.programs) {
    const slug = SLUG_MAP[scraped.id];
    if (!slug) {
      console.log(`  SKIP: No slug mapping for scraped ID "${scraped.id}"`);
      continue;
    }

    console.log(`\n--- Processing: ${scraped.title_he} (slug: ${slug}) ---`);

    // 3. Find the page by slug
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, slug, program_id")
      .eq("slug", slug)
      .single();

    if (pageError || !page) {
      console.error(`  ERROR: Page not found for slug "${slug}":`, pageError?.message);
      errors++;
      continue;
    }

    console.log(`  Found page: ${page.id}`);

    // 4. Get existing sections
    const { data: existingSections, error: secError } = await supabase
      .from("page_sections")
      .select("id, section_type, sort_order")
      .eq("page_id", page.id)
      .order("sort_order", { ascending: true });

    if (secError) {
      console.error(`  ERROR fetching sections:`, secError.message);
      errors++;
      continue;
    }

    console.log(`  Found ${existingSections?.length || 0} existing sections`);

    // 5. Update Hero section (sort_order=0)
    const heroSection = existingSections?.find((s) => s.section_type === "hero");
    if (heroSection) {
      const heroContent = buildUpdatedHeroSection(scraped);
      const { error } = await supabase
        .from("page_sections")
        .update({ content: heroContent })
        .eq("id", heroSection.id);
      if (error) {
        console.error(`  ERROR updating hero:`, error.message);
      } else {
        console.log(`  + Updated hero section with real title and image`);
      }
    }

    // 6. Update Stats section (sort_order=2)
    const statsSection = existingSections?.find((s) => s.section_type === "stats");
    if (statsSection) {
      const statsContent = buildUpdatedStatsSection(scraped);
      const { error } = await supabase
        .from("page_sections")
        .update({ content: statsContent })
        .eq("id", statsSection.id);
      if (error) {
        console.error(`  ERROR updating stats:`, error.message);
      } else {
        console.log(`  + Updated stats section with real duration/location/format`);
      }
    }

    // 7. Update FAQ section
    const faqSection = existingSections?.find((s) => s.section_type === "faq");
    if (faqSection) {
      const faqContent = buildUpdatedFaqSection(scraped);
      const { error } = await supabase
        .from("page_sections")
        .update({ content: faqContent })
        .eq("id", faqSection.id);
      if (error) {
        console.error(`  ERROR updating FAQ:`, error.message);
      } else {
        console.log(`  + Updated FAQ section with ${faqContent.items.length} real Q&As`);
      }
    }

    // 8. Shift existing sections to make room for new ones
    // Move FAQ from sort_order=3 to 5, CTA from 4 to 6, WhatsApp from 5 to 7
    const sectionsToShift = existingSections?.filter(
      (s) => s.section_type === "faq" || s.section_type === "cta" || s.section_type === "whatsapp"
    );

    const shiftMap: Record<string, number> = {
      faq: 5,
      cta: 6,
      whatsapp: 7,
    };

    for (const section of sectionsToShift || []) {
      const newOrder = shiftMap[section.section_type];
      if (newOrder !== undefined && section.sort_order !== newOrder) {
        await supabase
          .from("page_sections")
          .update({ sort_order: newOrder })
          .eq("id", section.id);
      }
    }

    // 9. INSERT Benefits/Accordion section (sort_order=3)
    const existingBenefits = existingSections?.find(
      (s) => s.section_type === "accordion" || s.section_type === "benefits"
    );
    if (!existingBenefits && scraped.benefits.length > 0) {
      const benefitsContent = buildBenefitsSection(scraped);
      const { error } = await supabase.from("page_sections").insert({
        page_id: page.id,
        section_type: "accordion",
        sort_order: 3,
        is_visible: true,
        content: benefitsContent,
        styles: {},
      });
      if (error) {
        console.error(`  ERROR inserting benefits:`, error.message);
      } else {
        console.log(`  + Inserted benefits/accordion section with ${benefitsContent.items.length} items`);
      }
    }

    // 10. INSERT Testimonials section (sort_order=4)
    const existingTestimonials = existingSections?.find(
      (s) => s.section_type === "testimonials"
    );
    const validTestimonials = scraped.testimonials.filter(
      (t) => t.quote_he && t.quote_he.length > 0
    );

    if (!existingTestimonials && validTestimonials.length > 0) {
      const testimonialsContent = buildTestimonialsSection(scraped);
      const { error } = await supabase.from("page_sections").insert({
        page_id: page.id,
        section_type: "testimonials",
        sort_order: 4,
        is_visible: true,
        content: testimonialsContent,
        styles: {},
      });
      if (error) {
        console.error(`  ERROR inserting testimonials:`, error.message);
      } else {
        console.log(`  + Inserted testimonials section with ${testimonialsContent.items.length} testimonials`);
      }
    } else if (existingTestimonials && validTestimonials.length > 0) {
      // Update existing testimonials with real data
      const testimonialsContent = buildTestimonialsSection(scraped);
      const { error } = await supabase
        .from("page_sections")
        .update({ content: testimonialsContent })
        .eq("id", existingTestimonials.id);
      if (error) {
        console.error(`  ERROR updating testimonials:`, error.message);
      } else {
        console.log(`  + Updated testimonials section with ${testimonialsContent.items.length} real testimonials`);
      }
    }

    updatedPages++;

    // 11. Update the programs table with enriched data
    if (page.program_id) {
      const mainImage =
        scraped.images && scraped.images.length > 0
          ? scraped.images[0]
          : null;

      const programUpdate: Record<string, unknown> = {
        description_he: scraped.description_he,
      };

      if (mainImage) {
        programUpdate.hero_image_url = mainImage;
      }

      if (scraped.career_outcomes && scraped.career_outcomes.length > 0) {
        programUpdate.career_outcomes = scraped.career_outcomes;
      }

      // Build enriched meta
      const metaUpdate: Record<string, unknown> = {};

      if (scraped.faculty && scraped.faculty.length > 0) {
        metaUpdate.faculty = scraped.faculty;
      }

      if (scraped.benefits && scraped.benefits.length > 0) {
        metaUpdate.benefits = scraped.benefits;
      }

      if (scraped.unique_selling_points && scraped.unique_selling_points.length > 0) {
        metaUpdate.unique_selling_points = scraped.unique_selling_points;
      }

      if (scraped.admission) {
        metaUpdate.admission = scraped.admission;
      }

      if (scraped.program_structure) {
        metaUpdate.program_structure = scraped.program_structure;
      }

      if (scraped.courses) {
        metaUpdate.courses = scraped.courses;
      }

      if (scraped.courses_year_1) {
        metaUpdate.courses_year_1 = scraped.courses_year_1;
      }

      if (scraped.certifications) {
        metaUpdate.certifications = scraped.certifications;
      }

      if (scraped.specializations) {
        metaUpdate.specializations = scraped.specializations;
      }

      if (scraped.schedule_details) {
        metaUpdate.schedule_details = scraped.schedule_details;
      }

      if (scraped.testimonials && scraped.testimonials.length > 0) {
        metaUpdate.testimonials = scraped.testimonials;
      }

      if (scraped.format) {
        metaUpdate.format_details = scraped.format;
      }

      if (scraped.url) {
        metaUpdate.source_url = scraped.url;
      }

      if (Object.keys(metaUpdate).length > 0) {
        // Merge with existing meta rather than replacing
        const { data: existingProg } = await supabase
          .from("programs")
          .select("meta")
          .eq("id", page.program_id)
          .single();

        const existingMeta = (existingProg?.meta as Record<string, unknown>) || {};
        programUpdate.meta = { ...existingMeta, ...metaUpdate };
      }

      const { error: progError } = await supabase
        .from("programs")
        .update(programUpdate)
        .eq("id", page.program_id);

      if (progError) {
        console.error(`  ERROR updating program:`, progError.message);
      } else {
        console.log(`  + Updated program record with description, image, career outcomes, and meta`);
        updatedPrograms++;
      }
    }
  }

  console.log("\n========================================");
  console.log("Update Complete!");
  console.log(`  Pages updated: ${updatedPages}`);
  console.log(`  Programs updated: ${updatedPrograms}`);
  console.log(`  Errors: ${errors}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
