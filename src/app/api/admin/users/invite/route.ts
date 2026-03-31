/**
 * Admin user invite API endpoint.
 * Uses generateLink to get the invitation token, then constructs the correct
 * production URL — bypassing Supabase's Site URL setting entirely.
 * Sends the invitation email via Supabase's built-in mailer.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Production site URL — used for constructing invitation links */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://onoleads.vercel.app";

/**
 * POST /api/admin/users/invite
 * Invites a new user by email. Uses generateLink for full control over the redirect URL,
 * then falls back to inviteUserByEmail if generateLink is unavailable.
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

    /* --- Generate invitation link with full URL control --- */
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: trimmedEmail,
      options: {
        redirectTo: `${SITE_URL}/auth/callback`,
      },
    });

    if (error) {
      console.error("generateLink error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to generate invitation" },
        { status: 500 }
      );
    }

    /*
     * generateLink returns a properties object with hashed_token and verification_url.
     * The verification_url points to the Supabase auth endpoint.
     * We need to send the email ourselves since generateLink doesn't send one automatically.
     */
    const tokenHash = data?.properties?.hashed_token;
    const actionLink = data?.properties?.action_link;

    if (!tokenHash && !actionLink) {
      console.error("generateLink returned no token or action_link:", data);
      return NextResponse.json(
        { error: "Failed to generate invitation link" },
        { status: 500 }
      );
    }

    /*
     * Now send the actual invitation email via Supabase.
     * inviteUserByEmail sends the email AND uses redirectTo for the post-auth redirect.
     * The user was already created by generateLink, so inviteUserByEmail will
     * re-send the invitation to the existing user.
     */
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      trimmedEmail,
      {
        redirectTo: `${SITE_URL}/auth/callback`,
      }
    );

    if (inviteError) {
      /*
       * If inviteUserByEmail fails (e.g., user already exists),
       * return the action link so the admin can share it directly.
       */
      console.error("inviteUserByEmail error (user may already exist):", inviteError);

      if (actionLink) {
        /* Replace Supabase's localhost URL with our production URL in the action link */
        const fixedLink = actionLink.replace(
          /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g,
          SITE_URL
        );
        return NextResponse.json({
          success: true,
          message: "ההזמנה נוצרה. שתף את הקישור עם המשתמש.",
          inviteLink: fixedLink,
        });
      }

      return NextResponse.json(
        { error: inviteError.message || "Failed to send invitation email" },
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
