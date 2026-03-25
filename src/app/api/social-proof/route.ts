/**
 * Social Proof API — returns lead count for a page over a given time window.
 * Used by the SocialProofToast component to show "X people registered this week".
 * Anonymous read — only exposes aggregate count, never PII.
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Minimum count to show — avoids showing "1 person registered" */
const MIN_COUNT = 3;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("page_id");
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "7", 10), 1), 90);

  if (!pageId) {
    return NextResponse.json({ count: 0 }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("page_id", pageId)
      .gte("created_at", since);

    if (error) throw error;

    const safeCount = (count ?? 0) >= MIN_COUNT ? count! : 0;
    return NextResponse.json({ count: safeCount }, {
      headers: { "Cache-Control": "public, max-age=300" }, // cache 5 min
    });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
