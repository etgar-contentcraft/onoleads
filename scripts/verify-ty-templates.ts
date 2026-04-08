/**
 * Quick verification script — reads all thank_you_templates rows and reports
 * whether the system is in a good state.
 *
 * Usage: npx tsx scripts/verify-ty-templates.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function verify() {
  const { data, error } = await supabase
    .from("thank_you_templates")
    .select("id, template_key, layout_id, name_he, is_default, is_active, is_system")
    .order("created_at");

  if (error) {
    console.error("✗ Query failed:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error("✗ No templates found in DB");
    process.exit(1);
  }

  console.log(`✓ Found ${data.length} templates:`);
  for (const t of data) {
    const flags = [
      t.is_default && "DEFAULT",
      t.is_system && "system",
      !t.is_active && "inactive",
    ]
      .filter(Boolean)
      .join(" · ");
    console.log(`  - ${t.template_key.padEnd(22)} → ${t.layout_id.padEnd(20)} ${flags}`);
  }

  const defaults = data.filter((t) => t.is_default);
  if (defaults.length !== 1) {
    console.error(`\n✗ Expected exactly 1 default template, found ${defaults.length}`);
    process.exit(1);
  }

  console.log(`\n✓ Default template: ${defaults[0].name_he} (${defaults[0].template_key})`);
  console.log("✓ Verification passed");
}

verify().catch((err) => {
  console.error("Verify failed:", err);
  process.exit(1);
});
