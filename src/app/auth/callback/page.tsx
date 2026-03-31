/**
 * Auth callback page — handles Supabase auth redirects (invitations, password reset, magic links).
 *
 * This MUST be a client-side page (not a route.ts) because Supabase's invitation flow
 * uses the implicit grant, placing access_token and refresh_token in the URL hash fragment.
 * Hash fragments are never sent to the server — only JavaScript in the browser can read them.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Parses the URL hash fragment into a key-value map.
 * Example: "#access_token=abc&refresh_token=def" → { access_token: "abc", refresh_token: "def" }
 * @param hash - The hash string from window.location.hash
 * @returns Record of key-value pairs from the hash fragment
 */
function parseHashFragment(hash: string): Record<string, string> {
  if (!hash || hash.length < 2) return {};
  const params = new URLSearchParams(hash.substring(1));
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * AuthCallbackPage — extracts auth tokens from the URL hash fragment,
 * sets the Supabase session, and redirects the user appropriately.
 *
 * For invited users: redirects to /auth/set-password
 * For other auth flows: redirects to /dashboard
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Main callback handler — reads hash fragment tokens and establishes a session.
   * Falls back to query parameter handling (PKCE flow) if no hash tokens found.
   */
  async function handleAuthCallback() {
    const supabase = createClient();

    /* --- Try hash fragment first (implicit grant / invitation flow) --- */
    const hashParams = parseHashFragment(window.location.hash);
    const accessToken = hashParams["access_token"];
    const refreshToken = hashParams["refresh_token"];
    const type = hashParams["type"];

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.error("Failed to set session from hash tokens:", sessionError);
        setError("שגיאה בהגדרת החיבור. נסה שנית.");
        setTimeout(() => router.push("/login?error=auth_callback_failed"), 2000);
        return;
      }

      /* Invitation flow — redirect to set-password page */
      if (type === "invite" || type === "signup" || type === "magiclink") {
        router.push("/auth/set-password");
        return;
      }

      /* Other flows — redirect to dashboard */
      router.push("/dashboard");
      router.refresh();
      return;
    }

    /* --- Fallback: try query parameters (PKCE flow with ?code=) --- */
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");

    if (code) {
      const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
      if (!codeError) {
        const next = searchParams.get("next") ?? "/dashboard";
        router.push(next);
        router.refresh();
        return;
      }
      console.error("Code exchange failed:", codeError);
    }

    /* --- Fallback: try token_hash parameter (older Supabase email links) --- */
    const tokenHash = searchParams.get("token_hash");
    const tokenType = searchParams.get("type");

    if (tokenHash && tokenType) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tokenType as "invite" | "recovery" | "email",
      });

      if (!otpError) {
        if (tokenType === "invite") {
          router.push("/auth/set-password");
          return;
        }
        router.push("/dashboard");
        router.refresh();
        return;
      }
      console.error("OTP verification failed:", otpError);
    }

    /* --- No valid tokens found — redirect to login with error --- */
    setError("קישור ההזמנה פג תוקף או אינו תקין.");
    setTimeout(() => router.push("/login?error=auth_callback_failed"), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]" dir="rtl">
      <div className="text-center">
        {error ? (
          <div className="space-y-3">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-[#716C70]">מעביר לדף ההתחברות...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#B8D900] mx-auto" />
            <p className="text-[#716C70] font-medium">מאמת את החיבור...</p>
          </div>
        )}
      </div>
    </div>
  );
}
