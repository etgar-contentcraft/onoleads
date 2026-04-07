/**
 * Logo type for the managed logo library.
 * Stored in the `logos` Supabase table; uploaded files live in the `media` storage bucket.
 */

export interface Logo {
  /** UUID primary key */
  id: string;
  /** Hebrew display name shown in the picker dropdown */
  name: string;
  /** Public URL of the logo image (from storage bucket or external) */
  url: string;
  /** Storage path within the `media` bucket — null for external URLs */
  storage_path: string | null;
  /** Whether this logo is the site-wide default */
  is_default: boolean;
  /** Auth user id of who created the row (nullable on backfill) */
  created_by: string | null;
  /** ISO timestamp */
  created_at: string;
  /** ISO timestamp */
  updated_at: string;
}

/** Payload for creating a new logo row */
export interface CreateLogoInput {
  name: string;
  url: string;
  storage_path?: string | null;
  is_default?: boolean;
}

/** Payload for updating an existing logo row */
export interface UpdateLogoInput {
  name?: string;
  is_default?: boolean;
}
