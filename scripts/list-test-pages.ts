/**
 * Quick script to list available test pages and their TY template settings.
 * Used for verifying end-to-end during development.
 *
 * Usage: npx tsx scripts/list-test-pages.ts
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
    .from("pages")
    .select("id, slug, title_he, language, custom_styles, status")
    .limit(10);

  if (error) {
    console.error("Query failed:", error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No published pages found.");
    return;
  }

  for (const page of data) {
    const cs = (page.custom_styles || {}) as Record<string, unknown>;
    const ty = (cs.ty_settings || cs.thank_you_settings || {}) as Record<string, unknown>;
    console.log(`- ${page.slug.padEnd(40)} "${page.title_he}"  ty_template=${ty.template_id || "(default)"}`);
  }
}

main().catch(console.error);
