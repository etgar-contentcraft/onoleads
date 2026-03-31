/**
 * Admin user invite API endpoint.
 * Sends an invitation email to a new user via Supabase admin client.
 * Only accessible to authenticated users (super admins).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/users/invite
 * Invites a new user by email. They receive a link to set their password.
 * @param request - Request body must include { email: string }
 * @returns { success: true } or an error response
 */
export async function POST(request: NextRequest) {
  try {
    /* --- Verify caller is authenticated --- */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* --- Parse and validate request body --- */
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { email } = body as { email?: string };
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    /* --- Invite user via admin client --- */
    const adminClient = createAdminClient();
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://onoleads.vercel.app";
    const { error } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${SITE_URL}/login` }
    );

    if (error) {
      console.error("Admin inviteUserByEmail error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send invitation" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin invite POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
