/**
 * Seed Script — Thank You Page Templates
 * ======================================
 * Inserts the 10 built-in thank-you-page templates into the
 * `thank_you_templates` table. Idempotent (uses upsert on template_key).
 *
 * Usage:
 *   npx tsx scripts/seed-ty-templates.ts
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { TY_TEMPLATE_CATALOG } from "../src/lib/thank-you/templates-catalog";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log(`Seeding ${TY_TEMPLATE_CATALOG.length} thank-you templates...`);

  for (const tpl of TY_TEMPLATE_CATALOG) {
    const { error } = await supabase
      .from("thank_you_templates")
      .upsert(
        {
          template_key: tpl.template_key,
          layout_id: tpl.layout_id,
          name_he: tpl.name_he,
          name_en: tpl.name_en,
          name_ar: tpl.name_ar,
          description_he: tpl.description_he,
          description_en: tpl.description_en,
          description_ar: tpl.description_ar,
          content: tpl.content,
          config: tpl.config,
          is_system: tpl.is_system,
          is_default: tpl.is_default,
          is_active: true,
        },
        { onConflict: "template_key" },
      );

    if (error) {
      console.error(`✗ Failed to seed ${tpl.template_key}:`, error.message);
      process.exit(1);
    }
    console.log(`✓ ${tpl.template_key} (${tpl.layout_id})${tpl.is_default ? "  [DEFAULT]" : ""}`);
  }

  console.log("\n✅ All templates seeded successfully");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
