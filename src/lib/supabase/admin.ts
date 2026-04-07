/**
 * Supabase admin client with service role key.
 * NEVER import this in client-side code — the server-only guard will throw at build time.
 * Uses a module-level singleton to avoid creating a new HTTP client per request.
 */
import "server-only";
// eslint-disable-next-line import/no-extraneous-dependencies
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase doesn't have a generated Database type in this project yet — use the base client type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = SupabaseClient<any>;

/** Module-level singleton — reused across requests in the same Lambda instance */
let _adminClient: AdminClient | null = null;

/**
 * Returns the Supabase admin client (service role).
 * Bypasses RLS — use only for trusted server-side operations.
 * @returns Singleton SupabaseClient with service role credentials
 */
export function createAdminClient(): AdminClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
      );
    }
    _adminClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _adminClient;
}
