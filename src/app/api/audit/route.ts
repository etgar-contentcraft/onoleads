/**
 * API route for writing audit log entries from admin client-side actions.
 * POST /api/audit — logs admin actions like page edits, settings changes, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog, type AuditAction } from "@/lib/security/audit-log";
import { getClientIp } from "@/lib/security/rate-limit";

const VALID_ACTIONS: AuditAction[] = [
  "admin_page_created",
  "admin_page_updated",
  "admin_page_deleted",
  "admin_page_published",
  "admin_page_unpublished",
  "admin_settings_updated",
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Verify caller has admin role — viewer-role users must not write audit entries */
    const adminDb = createAdminClient();
    const { data: profile } = await adminDb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, resource_type, resource_id, metadata } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await writeAuditLog({
      action,
      actor_id: user.id,
      actor_email: user.email,
      resource_type: resource_type || null,
      resource_id: resource_id || null,
      metadata: metadata || null,
      ip_address: getClientIp(req.headers),
      user_agent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to write audit log" }, { status: 500 });
  }
}
