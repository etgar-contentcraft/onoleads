/**
 * POST /api/pixels/encrypt-token
 * Encrypts a CAPI access token using AES-256-GCM before it is stored in the DB.
 * Only accessible by authenticated dashboard users (Supabase session required).
 * The raw token is never logged or stored — only the encrypted form leaves this route.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/security/token-encryption";

/** Platforms that accept an encrypted access token / API secret */
const CAPI_PLATFORMS = new Set(["meta", "google", "tiktok", "ga4", "linkedin", "taboola", "twitter"]);

export async function POST(req: NextRequest) {
  try {
    // Verify the caller is an authenticated dashboard user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { platform?: string; token?: string };
    const { platform, token } = body;

    if (!platform || !CAPI_PLATFORMS.has(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (token.trim().length > 2048) {
      return NextResponse.json({ error: "Token too long" }, { status: 400 });
    }

    const encrypted = encryptToken(token.trim());
    return NextResponse.json({ encrypted });
  } catch (err) {
    console.error("[encrypt-token] Error:", err);
    return NextResponse.json({ error: "Encryption failed" }, { status: 500 });
  }
}
