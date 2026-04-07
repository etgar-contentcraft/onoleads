"use client";

/**
 * Logos management page — admin CRUD for the brand logo library.
 *
 * Lets admins upload new logos to the media bucket, name them in Hebrew,
 * mark one as the site-wide default, rename, and delete. The default logo
 * is rendered everywhere unless a per-page override picks a different one.
 */

import { useEffect, useState, useCallback } from "react";
import {
  ImagePlus,
  Star,
  Pencil,
  Trash2,
  Loader2,
  Upload,
  AlertTriangle,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  listLogos,
  createLogo,
  updateLogo,
  deleteLogo,
} from "@/lib/services/logos";
import { uploadFile, validateFile } from "@/lib/supabase/storage";
import type { Logo } from "@/lib/types/logos";

// ============================================================================
// Page
// ============================================================================

/**
 * Brand logo library page. Mounted at /dashboard/logos.
 */
export default function LogosPage() {
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Logo | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Logo | null>(null);

  /** Loads the full list of logos from the database. */
  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await listLogos();
    setLogos(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // --------------------------------------------------------------------------
  // Upload handler
  // --------------------------------------------------------------------------

  /**
   * Handles a file selected via the upload button: validates, uploads to the
   * media bucket, then creates a row in the logos table.
   */
  const handleFileSelected = useCallback(
    async (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setUploading(true);
      const result = await uploadFile(file);
      if (!result.success || !result.url) {
        setError(result.error ?? "ההעלאה נכשלה");
        setUploading(false);
        return;
      }

      // Default name = filename without extension, max 60 chars
      const defaultName = file.name.replace(/\.[^.]+$/, "").slice(0, 60);

      const created = await createLogo({
        name: defaultName,
        url: result.url,
        storage_path: result.path ?? null,
        is_default: logos.length === 0, // first logo becomes default automatically
      });

      setUploading(false);
      if (!created) {
        setError("שמירת הלוגו במסד הנתונים נכשלה");
        return;
      }
      await refresh();
    },
    [logos.length, refresh]
  );

  // --------------------------------------------------------------------------
  // Set-default / rename / delete actions
  // --------------------------------------------------------------------------

  /** Marks the given logo as the site-wide default. */
  const handleSetDefault = useCallback(
    async (logo: Logo) => {
      if (logo.is_default) return;
      const updated = await updateLogo(logo.id, { is_default: true });
      if (!updated) {
        setError("עדכון ברירת המחדל נכשל");
        return;
      }
      await refresh();
    },
    [refresh]
  );

  /** Saves a rename from the edit dialog. */
  const handleSaveRename = useCallback(async () => {
    if (!editing) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("שם הלוגו לא יכול להיות ריק");
      return;
    }
    const updated = await updateLogo(editing.id, { name: trimmed });
    if (!updated) {
      setError("שמירת השם נכשלה");
      return;
    }
    setEditing(null);
    setEditName("");
    await refresh();
  }, [editing, editName, refresh]);

  /** Deletes the logo selected in the confirm dialog. */
  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    const ok = await deleteLogo(confirmDelete.id);
    if (!ok) {
      setError("מחיקת הלוגו נכשלה");
      return;
    }
    setConfirmDelete(null);
    await refresh();
  }, [confirmDelete, refresh]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2A2628] flex items-center gap-2">
            <ImagePlus className="w-6 h-6 text-[#8BA000]" />
            ניהול לוגואים
          </h1>
          <p className="text-sm text-[#716C70] mt-1">
            הלוגו המסומן כברירת מחדל מוצג בכל האתר. ניתן לבחור לוגו אחר עבור עמודים
            ספציפיים בהגדרות העמוד.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B8D900] text-[#2A2628] font-semibold cursor-pointer hover:bg-[#a8c500] transition-colors">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              מעלה...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              העלאת לוגו חדש
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelected(f);
              e.target.value = ""; // allow re-selecting the same file
            }}
          />
        </label>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#8BA000]" />
        </div>
      ) : logos.length === 0 ? (
        <div className="border-2 border-dashed border-[#E5E5E5] rounded-2xl p-12 text-center text-[#9A969A]">
          עדיין אין לוגואים. השתמשו בכפתור "העלאת לוגו חדש" כדי להוסיף.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {logos.map((logo) => (
            <li
              key={logo.id}
              className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden flex flex-col"
            >
              {/* Preview */}
              <div className="h-32 bg-[#FAFAFA] flex items-center justify-center p-4 border-b border-[#F0F0F0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.url}
                  alt={logo.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-[#2A2628] text-sm leading-tight break-words">
                    {logo.name}
                  </h3>
                  {logo.is_default && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#B8D900]/20 text-[#5d6d00] shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      ברירת מחדל
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[#F0F0F0]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(logo)}
                    disabled={logo.is_default}
                    title={logo.is_default ? "כבר ברירת המחדל" : "הגדר כברירת מחדל"}
                  >
                    {logo.is_default ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(logo);
                      setEditName(logo.name);
                    }}
                    title="שינוי שם"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(logo)}
                    disabled={logo.is_default}
                    title={
                      logo.is_default
                        ? "אי אפשר למחוק את ברירת המחדל"
                        : "מחיקת הלוגו"
                    }
                    className="text-red-600 hover:text-red-700 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Rename dialog */}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setEditName("");
          }
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>שינוי שם הלוגו</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="logo-name">שם הלוגו</Label>
            <Input
              id="logo-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="למשל: לוגו אונו ראשי"
              maxLength={80}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setEditName("");
              }}
            >
              ביטול
            </Button>
            <Button onClick={handleSaveRename}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
      >
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת לוגו</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-[#716C70]">
            האם אתם בטוחים שברצונכם למחוק את הלוגו{" "}
            <strong className="text-[#2A2628]">{confirmDelete?.name}</strong>?
            עמודים שמשתמשים בלוגו זה יחזרו אוטומטית ללוגו ברירת המחדל.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              ביטול
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              מחק
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
