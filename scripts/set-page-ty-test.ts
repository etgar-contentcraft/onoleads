/**
 * Test script: sets a specific page's thank-you template to a specific template_key
 * so we can verify the /ty preview route renders different layouts.
 *
 * Usage: npx tsx scripts/set-page-ty-test.ts <slug> <template_key>
 * Example: npx tsx scripts/set-page-ty-test.ts ll-b-in-law-internationa-school simple_thanks
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
  const templateKey = process.argv[3];

  if (!slug || !templateKey) {
    console.error("Usage: npx tsx scripts/set-page-ty-test.ts <slug> <template_key>");
    process.exit(1);
  }

  const { data: tpl, error: tplErr } = await supabase
    .from("thank_you_templates")
    .select("id, template_key, layout_id, name_he")
    .eq("template_key", templateKey)
    .single();

  if (tplErr || !tpl) {
    console.error("Template not found:", templateKey, tplErr?.message);
    process.exit(1);
  }

  const { data: page, error: pageErr } = await supabase
    .from("pages")
    .select("id, slug, custom_styles")
    .eq("slug", slug)
    .single();

  if (pageErr || !page) {
    console.error("Page not found:", slug, pageErr?.message);
    process.exit(1);
  }

  const cs = (page.custom_styles || {}) as Record<string, unknown>;
  const tySettings = (cs.ty_settings || cs.thank_you_settings || {}) as Record<string, unknown>;
  const updatedTySettings = { ...tySettings, template_id: tpl.id };

  const { error: updErr } = await supabase
    .from("pages")
    .update({
      custom_styles: {
        ...cs,
        ty_settings: updatedTySettings,
        thank_you_settings: updatedTySettings,
      },
    })
    .eq("id", page.id);

  if (updErr) {
    console.error("Update failed:", updErr.message);
    process.exit(1);
  }

  console.log(`✓ Set page "${page.slug}" to template "${tpl.name_he}" (${tpl.layout_id})`);
  console.log(`→ Preview URL: http://localhost:3000/ty?slug=${encodeURIComponent(page.slug)}`);
}

main().catch(console.error);
