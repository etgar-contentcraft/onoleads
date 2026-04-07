/**
 * Social Proof API — returns anonymous form submission count for a page.
 * Uses analytics_events table (no PII). Only exposes aggregate count.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/** Minimum count to show — avoids displaying "1 person registered" */
const MIN_COUNT = 3;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("page_id");
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "7", 10), 1), 90);

  /* Validate UUID format — Supabase throws 500 on invalid UUID; return 400 instead */
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!pageId || !UUID_PATTERN.test(pageId)) {
    return NextResponse.json({ count: 0 }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("page_id", pageId)
      .eq("event_type", "form_submit")
      .gte("created_at", since);

    if (error) throw error;

    const safeCount = (count ?? 0) >= MIN_COUNT ? count! : 0;
    return NextResponse.json({ count: safeCount }, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
