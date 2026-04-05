/**
 * Admin users API endpoint.
 * Lists all authenticated users in the system using the Supabase admin client.
 * Only accessible to authenticated users (super admins).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/users
 * Returns all auth users with id, email, created_at, last_sign_in_at, user_metadata.
 * @returns {Array} - Array of user objects
 */
export async function GET() {
  try {
    /* --- Verify caller is authenticated --- */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* --- Fetch profile role via admin client (bypasses RLS to avoid circular policy issues) --- */
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { data, error } = await adminClient.auth.admin.listUsers();

    if (error) {
      console.error("Admin listUsers error:", error);
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 }
      );
    }

    /* --- Return only the fields needed by the UI --- */
    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      user_metadata: u.user_metadata,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Admin users GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
