/**
 * API route for writing audit log entries from admin client-side actions.
 * POST /api/audit — logs admin actions like page edits, settings changes, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog, type AuditAction } from "@/lib/security/audit-log";

const VALID_ACTIONS: AuditAction[] = [
  "admin_page_created",
  "admin_page_updated",
  "admin_page_deleted",
  "admin_settings_updated",
];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to write audit log" }, { status: 500 });
  }
}
