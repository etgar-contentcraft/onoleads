/**
 * Quick script: list all active TY templates with their IDs.
 * Used to verify the /ty?template=<id> preview override.
 *
 * Usage: npx tsx scripts/list-ty-templates.ts
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
  const { data, error } = await supabase
    .from("thank_you_templates")
    .select("id, template_key, layout_id, name_he, is_default")
    .eq("is_active", true)
    .order("template_key");

  if (error) {
    console.error("Query failed:", error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No active templates found.");
    return;
  }

  console.log(`Found ${data.length} active templates:\n`);
  for (const tpl of data) {
    const def = tpl.is_default ? " [DEFAULT]" : "";
    console.log(`- ${tpl.template_key.padEnd(25)} ${tpl.layout_id.padEnd(20)} ${tpl.name_he}${def}`);
    console.log(`  → /ty?slug=preview&template=${tpl.id}`);
  }
}

main().catch(console.error);
