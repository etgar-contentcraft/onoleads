/** Temporary debug route — DELETE after verifying env var is available */
import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.CAPI_TOKEN_MASTER_KEY;
  return NextResponse.json({
    hasKey: !!key,
    keyLen: key?.length ?? 0,
    keyFirst4: key ? key.substring(0, 4) + "..." : null,
    nodeEnv: process.env.NODE_ENV,
  });
}
