/** Temporary debug route — DELETE after verifying env var is available */
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.CAPI_TOKEN_MASTER_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return NextResponse.json({
    hasCapiKey: !!key,
    capiKeyLen: key?.length ?? 0,
    capiFirst4: key ? key.substring(0, 4) + "..." : null,
    hasSupaUrl: !!supaUrl,
    hasServiceRole: !!serviceRole,
    nodeEnv: process.env.NODE_ENV,
    hasTestVar: !!process.env.MY_TEST_VAR,
    testVarVal: process.env.MY_TEST_VAR || null,
    allEnvKeys: Object.keys(process.env).filter(k =>
      k.includes("CAPI") || k.includes("SUPA") || k.includes("NEXT_PUBLIC_SUPA") || k.includes("MY_TEST")
    ),
  });
}
