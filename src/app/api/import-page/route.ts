/**
 * AI Import API — creates a complete landing page from imported JSON content.
 * POST /api/import-page
 *
 * Expects JSON body matching the AI-generated format:
 * {
 *   page: { title_he, seo_title, seo_description, language },
 *   sections: [{ section_type, sort_order, content }]
 * }
 *
 * Creates the page in Supabase and all its sections in one transaction.
 * Requires authenticated admin user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateImportedContent } from "@/lib/ai-import/content-schema";
import { generateSlug } from "@/lib/utils/slug";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Auth + role check — only admins can import pages
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate structure
  const errors = validateImportedContent(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
  }

  const data = body as {
    page: { title_he?: string; seo_title?: string; seo_description?: string; language?: string };
    sections: { section_type: string; sort_order?: number; content: Record<string, unknown> }[];
    slug?: string;
    program_id?: string;
  };

  // Generate English-only slug from title (transliterates Hebrew automatically)
  const title = data.page.title_he || "untitled";
  const baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("slug", baseSlug)
    .single();

  const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  // Create the page
  const { data: page, error: pageError } = await supabase
    .from("pages")
    .insert({
      title_he: data.page.title_he || title,
      slug,
      language: data.page.language || "he",
      status: "draft",
      page_type: "degree",
      seo_title: data.page.seo_title || data.page.title_he || "",
      seo_description: data.page.seo_description || "",
      program_id: data.program_id || null,
    })
    .select("id, slug")
    .single();

  if (pageError || !page) {
    return NextResponse.json(
      { error: "Failed to create page", details: pageError?.message },
      { status: 500 },
    );
  }

  // Create all sections
  const sectionRows = data.sections.map((s, i) => ({
    page_id: page.id,
    section_type: s.section_type,
    sort_order: s.sort_order ?? (i + 1),
    content: s.content,
    is_visible: true,
  }));

  const { error: sectionsError } = await supabase
    .from("page_sections")
    .insert(sectionRows);

  if (sectionsError) {
    // Clean up: delete the page we just created
    await supabase.from("pages").delete().eq("id", page.id);
    return NextResponse.json(
      { error: "Failed to create sections", details: sectionsError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    page_id: page.id,
    slug: page.slug,
    sections_created: sectionRows.length,
    builder_url: `/dashboard/pages/${page.id}/builder`,
  });
}
