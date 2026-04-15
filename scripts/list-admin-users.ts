/**
 * Lists existing Supabase auth users so we can identify an admin to use for
 * screenshot capture via the guide generator.
 *
 * Usage: npx tsx scripts/list-admin-users.ts
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
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 20 });
  if (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
  const users = data?.users || [];
  console.log(`Found ${users.length} users\n`);
  for (const u of users) {
    console.log(`- ${u.email ?? "(no email)"}  id=${u.id}  role=${u.role ?? "(none)"}  confirmed=${u.email_confirmed_at ? "yes" : "no"}`);
  }
}

main().catch(console.error);
