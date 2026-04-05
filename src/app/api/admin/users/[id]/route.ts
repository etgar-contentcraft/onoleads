/**
 * Admin single-user API endpoint.
 * Handles deletion of a specific user by their ID.
 * Only accessible to authenticated users (super admins).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * DELETE /api/admin/users/[id]
 * Permanently deletes a user from Supabase Auth.
 * @param request - The incoming request
 * @param params - Route params containing the user id
 * @returns { success: true } or an error response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    /* --- Verify caller is authenticated --- */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* --- Verify caller has admin role (via admin client to bypass RLS) --- */
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    /* --- Prevent self-deletion --- */
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    /* --- Delete user via admin client --- */
    const { error } = await adminClient.auth.admin.deleteUser(id);

    if (error) {
      console.error("Admin deleteUser error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Admin user DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
