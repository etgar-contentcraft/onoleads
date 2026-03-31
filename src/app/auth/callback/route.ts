/**
 * Auth callback route — handles Supabase auth redirects (invitations, password reset, magic links).
 * Exchanges the auth code for a session and redirects the user to the appropriate page.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback
 * Supabase redirects here after email confirmation, invitation acceptance, or password reset.
 * Exchanges the code parameter for a valid session, then redirects the user.
 * @param request - Incoming request with code and optional next parameters
 * @returns Redirect to dashboard (success) or login with error
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  /** Auth code from Supabase email link */
  const code = searchParams.get("code");

  /** Where to redirect after successful auth (defaults to dashboard) */
  const next = searchParams.get("next") ?? "/dashboard";

  /** Token hash for older-style email links (type=invite, type=recovery) */
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    /* PKCE flow: exchange the code for a session */
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    /* Older token-based flow (some Supabase versions use this for invites) */
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "invite" | "recovery" | "email",
    });
    if (!error) {
      /* For invitations, redirect to set-password page */
      if (type === "invite") {
        return NextResponse.redirect(`${origin}/auth/set-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  /* If code exchange failed, redirect to login with error */
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
