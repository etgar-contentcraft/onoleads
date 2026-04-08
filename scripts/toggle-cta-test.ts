/**
 * Test script: toggles `cta_enabled` on all sections of a given page.
 * Used to verify the CTA on/off toggle works end-to-end.
 *
 * Usage: npx tsx scripts/toggle-cta-test.ts <slug> <true|false>
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const slug = process.argv[2];
  const enable = process.argv[3] === "true";

  if (!slug) {
    console.error("Usage: npx tsx scripts/toggle-cta-test.ts <slug> <true|false>");
    process.exit(1);
  }

  const { data: page, error: pageErr } = await supabase
    .from("pages")
    .select("id, slug")
    .eq("slug", slug)
    .single();

  if (pageErr || !page) {
    console.error("Page not found:", slug, pageErr?.message);
    process.exit(1);
  }

  const { data: sections, error: secErr } = await supabase
    .from("page_sections")
    .select("id, section_type, content")
    .eq("page_id", page.id);

  if (secErr || !sections) {
    console.error("Sections query failed:", secErr?.message);
    process.exit(1);
  }

  let updated = 0;
  for (const sec of sections) {
    const content = (sec.content || {}) as Record<string, unknown>;
    const newContent = { ...content, cta_enabled: enable };
    const { error } = await supabase
      .from("page_sections")
      .update({ content: newContent })
      .eq("id", sec.id);
    if (error) {
      console.error(`✗ ${sec.section_type}:`, error.message);
    } else {
      console.log(`✓ ${sec.section_type} cta_enabled=${enable}`);
      updated++;
    }
  }

  console.log(`\nUpdated ${updated}/${sections.length} sections on page "${slug}"`);
}

main().catch(console.error);
