/**
 * One-shot: insert the "open_day" thank-you template into Supabase using the
 * service-role key. Mirrors the migration file so the DB always matches the
 * catalog constants, even when migrations aren't run automatically.
 *
 * Usage: npx tsx scripts/apply-open-day-template.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { TY_TEMPLATE_CATALOG } from "../src/lib/thank-you/templates-catalog";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const seed = TY_TEMPLATE_CATALOG.find((t) => t.template_key === "open_day");
  if (!seed) {
    console.error("open_day seed not found in catalog");
    process.exit(1);
  }

  // Upsert on template_key so the script is idempotent
  const { data, error } = await supabase
    .from("thank_you_templates")
    .upsert(
      {
        template_key: seed.template_key,
        layout_id: seed.layout_id,
        name_he: seed.name_he,
        name_en: seed.name_en,
        name_ar: seed.name_ar,
        description_he: seed.description_he,
        description_en: seed.description_en,
        description_ar: seed.description_ar,
        content: seed.content,
        config: seed.config,
        is_system: seed.is_system,
        is_active: true,
        is_default: seed.is_default,
      },
      { onConflict: "template_key" },
    )
    .select()
    .single();

  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`✓ Open Day template ready`);
  console.log(`  id          = ${data.id}`);
  console.log(`  template_key= ${data.template_key}`);
  console.log(`  layout_id   = ${data.layout_id}`);
  console.log(`  preview URL = /ty?slug=preview&template=${data.id}`);

  // Also backfill the missing fields on existing templates so the editor
  // shows them as blank inputs instead of undefined.
  const backfills: Array<{ key: string; paths: Array<[string, string, string]> }> = [
    {
      key: "calendar_focus",
      paths: [
        ["he", "calendar_url", ""],
        ["en", "calendar_url", ""],
        ["ar", "calendar_url", ""],
      ],
    },
    {
      key: "video_welcome",
      paths: [
        ["he", "video_url", ""],
        ["en", "video_url", ""],
        ["ar", "video_url", ""],
      ],
    },
    {
      key: "multi_channel",
      paths: [
        ["he", "phone_number", ""],
        ["en", "phone_number", ""],
        ["ar", "phone_number", ""],
        ["he", "email_address", "info@ono.ac.il"],
        ["en", "email_address", "info@ono.ac.il"],
        ["ar", "email_address", "info@ono.ac.il"],
      ],
    },
  ];

  for (const bf of backfills) {
    const { data: row, error: fetchErr } = await supabase
      .from("thank_you_templates")
      .select("id, content")
      .eq("template_key", bf.key)
      .maybeSingle();
    if (fetchErr || !row) {
      console.log(`  (skipping ${bf.key} — not found in DB)`);
      continue;
    }
    const content = row.content as Record<string, Record<string, string>>;
    let changed = false;
    for (const [lang, key, defaultVal] of bf.paths) {
      if (!content[lang]) content[lang] = {};
      if (content[lang][key] === undefined) {
        content[lang][key] = defaultVal;
        changed = true;
      }
    }
    if (changed) {
      const { error: updErr } = await supabase
        .from("thank_you_templates")
        .update({ content })
        .eq("id", row.id);
      if (updErr) {
        console.error(`  ✗ ${bf.key} backfill failed:`, updErr.message);
      } else {
        console.log(`  ✓ ${bf.key} backfilled`);
      }
    } else {
      console.log(`  ✓ ${bf.key} already has all fields`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
