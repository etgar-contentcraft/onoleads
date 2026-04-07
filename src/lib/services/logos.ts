/**
 * Logos service module — encapsulates all Supabase access for the `logos` table.
 * Use this from client components and dashboard pages instead of inlining queries.
 */

import { createClient } from "@/lib/supabase/client";
import type { Logo, CreateLogoInput, UpdateLogoInput } from "@/lib/types/logos";

const TABLE = "logos";

/**
 * Fetches all logos, default first, then alphabetical by name.
 * @returns Array of logos (empty array on error)
 */
export async function listLogos(): Promise<Logo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[logos.listLogos] failed:", error.message);
    return [];
  }
  return (data ?? []) as Logo[];
}

/**
 * Returns the single default logo (or null if none has been marked).
 * Used by callers that need a fallback URL.
 */
export async function getDefaultLogo(): Promise<Logo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("is_default", true)
    .maybeSingle();

  if (error) {
    console.error("[logos.getDefaultLogo] failed:", error.message);
    return null;
  }
  return (data ?? null) as Logo | null;
}

/**
 * Creates a new logo row.
 * @param input - The logo to create
 * @returns The newly created logo, or null on failure
 */
export async function createLogo(input: CreateLogoInput): Promise<Logo | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("[logos.createLogo] failed:", error.message);
    return null;
  }
  return data as Logo;
}

/**
 * Updates a logo row. If `is_default` is set to true, the previous default is
 * cleared first to satisfy the unique-default index.
 * @param id - Logo UUID
 * @param input - Partial fields to update
 * @returns Updated logo or null on failure
 */
export async function updateLogo(
  id: string,
  input: UpdateLogoInput
): Promise<Logo | null> {
  const supabase = createClient();

  // If the caller is promoting this logo to the default, clear the previous
  // default first. The unique index would otherwise reject the update.
  if (input.is_default === true) {
    await supabase
      .from(TABLE)
      .update({ is_default: false })
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[logos.updateLogo] failed:", error.message);
    return null;
  }
  return data as Logo;
}

/**
 * Deletes a logo row. The actual storage file is NOT deleted automatically — pass
 * `alsoDeleteFile: true` only if the caller knows the file is unused elsewhere.
 * @param id - Logo UUID
 * @returns True on success
 */
export async function deleteLogo(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[logos.deleteLogo] failed:", error.message);
    return false;
  }
  return true;
}
