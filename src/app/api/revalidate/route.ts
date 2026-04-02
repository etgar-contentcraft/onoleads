/**
 * On-demand ISR revalidation — called by the page builder after each save.
 * Triggers Next.js to regenerate the static HTML for a specific LP slug.
 * Requires authentication to prevent abuse (cache stampede / DoS).
 * POST /api/revalidate  { slug: string }
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  /* Verify caller is an authenticated admin */
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Verify caller has admin role — prevents cache stampede from non-admin accounts */
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = (await request.json()) as { slug?: string };
  if (!slug) return Response.json({ error: "missing slug" }, { status: 400 });

  revalidatePath(`/lp/${slug}`);

  return Response.json({ revalidated: true, slug, at: new Date().toISOString() });
}
