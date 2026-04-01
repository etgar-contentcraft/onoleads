/**
 * Admin user invite API endpoint.
 * Uses inviteUserByEmail to create the user and send the invitation email
 * in a single step. The redirectTo parameter controls where the user lands
 * after clicking the email link.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Production site URL — used for constructing invitation redirect */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://onoleads.vercel.app";

/**
 * POST /api/admin/users/invite
 * Invites a new user by email. Creates the user and sends the invitation email.
 * @param request - Request body must include { email: string }
 * @returns { success: true, message: string } or an error response
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

    /* --- Verify caller has admin role --- */
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: "Forbidden — admin access required" }, { status: 403 });
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

    const trimmedEmail = email.trim().toLowerCase();

    /* --- Send invitation email --- */
    const adminClient = createAdminClient();
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      trimmedEmail,
      {
        redirectTo: `${SITE_URL}/auth/callback`,
      }
    );

    if (inviteError) {
      console.error("inviteUserByEmail error:", inviteError);
      return NextResponse.json(
        { error: inviteError.message || "שגיאה בשליחת ההזמנה" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "ההזמנה נשלחה בהצלחה",
    });
  } catch (err) {
    console.error("Admin invite POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
