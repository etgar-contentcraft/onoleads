"use client";

/**
 * LogoPicker — reusable logo selection control for the admin settings forms.
 *
 * Renders a current-selection preview button. Clicking it opens a dialog with
 * the full library of logos. Selecting a logo calls onChange with the public
 * URL of that logo (we store URLs, not IDs, so deletes/renames don't break
 * existing settings).
 *
 * Props
 *   value     The currently-selected logo URL (or undefined / "" for "default")
 *   onChange  Called with the new URL, or "" to clear (use default)
 *   label     Optional label shown above the picker
 *   allowClear  If true, shows a "Use default" option in the dialog
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, ImagePlus, Star, Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listLogos } from "@/lib/services/logos";
import type { Logo } from "@/lib/types/logos";

interface LogoPickerProps {
  value?: string;
  onChange: (newUrl: string) => void;
  label?: string;
  /** When true, the dialog shows a "Use default" option that clears the override */
  allowClear?: boolean;
  /** Hint text rendered under the picker */
  hint?: string;
}

/**
 * LogoPicker component — see file header.
 */
export function LogoPicker({
  value,
  onChange,
  label,
  allowClear = true,
  hint,
}: LogoPickerProps) {
  const [open, setOpen] = useState(false);
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(false);

  /** Loads the logo library on dialog open. */
  const loadLogos = useCallback(async () => {
    setLoading(true);
    const rows = await listLogos();
    setLogos(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadLogos();
  }, [open, loadLogos]);

  /** Resolved current logo metadata for the preview button. */
  const currentLogo = logos.find((l) => l.url === value);
  const defaultLogo = logos.find((l) => l.is_default);

  /** Display URL for the preview thumbnail. */
  const previewUrl = value || defaultLogo?.url;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-[#2A2628]">{label}</label>
      )}

      {/* Preview button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#B8D900] transition-colors text-right"
      >
        <div className="w-16 h-12 rounded-lg bg-[#FAFAFA] border border-[#F0F0F0] flex items-center justify-center shrink-0 overflow-hidden">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Logo preview"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ImagePlus className="w-5 h-5 text-[#9A969A]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#2A2628] truncate">
            {value
              ? currentLogo?.name ?? "לוגו מותאם אישית"
              : `ברירת מחדל${defaultLogo ? ` (${defaultLogo.name})` : ""}`}
          </div>
          <div className="text-xs text-[#9A969A] mt-0.5">לחצו לבחירת לוגו</div>
        </div>
      </button>

      {hint && <p className="text-xs text-[#9A969A]">{hint}</p>}

      {/* Picker dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>בחירת לוגו</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#8BA000]" />
            </div>
          ) : logos.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#9A969A]">
              עדיין לא הועלו לוגואים. עברו ל"ניהול לוגואים" כדי להוסיף.
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {/* Optional "Use default" tile */}
              {allowClear && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl border-2 transition-all text-right ${
                      !value
                        ? "border-[#B8D900] bg-[#B8D900]/5"
                        : "border-[#E5E5E5] hover:border-[#B8D900]"
                    }`}
                  >
                    <div className="h-20 rounded-lg bg-[#FAFAFA] border border-dashed border-[#E5E5E5] flex items-center justify-center mb-2">
                      <X className="w-6 h-6 text-[#9A969A]" />
                    </div>
                    <div className="text-xs font-semibold text-[#2A2628]">
                      ברירת מחדל
                    </div>
                    <div className="text-[10px] text-[#9A969A] mt-0.5">
                      השתמש בברירת המחדל הראשית
                    </div>
                  </button>
                </li>
              )}

              {logos.map((logo) => {
                const selected = value === logo.url;
                return (
                  <li key={logo.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(logo.url);
                        setOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-right ${
                        selected
                          ? "border-[#B8D900] bg-[#B8D900]/5"
                          : "border-[#E5E5E5] hover:border-[#B8D900]"
                      }`}
                    >
                      <div className="h-20 rounded-lg bg-[#FAFAFA] border border-[#F0F0F0] flex items-center justify-center mb-2 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logo.url}
                          alt={logo.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-[#2A2628] truncate flex-1">
                          {logo.name}
                        </span>
                        {selected && (
                          <Check className="w-3 h-3 text-[#8BA000] shrink-0" />
                        )}
                        {logo.is_default && (
                          <Star className="w-3 h-3 text-[#8BA000] fill-current shrink-0" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-2 pt-3 border-t border-[#F0F0F0] text-xs text-[#9A969A] text-center">
            לניהול הלוגואים (העלאה, מחיקה, הגדרת ברירת מחדל) — עברו ל
            <a
              href="/dashboard/logos"
              className="text-[#8BA000] hover:underline mr-1"
            >
              ניהול לוגואים
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
