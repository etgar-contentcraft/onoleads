/**
 * On-demand ISR revalidation — called by the page builder after each save.
 * Triggers Next.js to regenerate the static HTML for a specific LP slug.
 * POST /api/revalidate  { slug: string }
 */
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const { slug } = (await request.json()) as { slug?: string };
  if (!slug) return Response.json({ error: "missing slug" }, { status: 400 });

  // Revalidate the landing page and its metadata
  revalidatePath(`/lp/${slug}`);

  return Response.json({ revalidated: true, slug, at: new Date().toISOString() });
}
