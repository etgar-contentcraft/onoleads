/**
 * ImageUploadField — combined image upload + URL input with live preview.
 * Shows recommended dimensions as a hint. Supports drag-and-drop and click-to-upload.
 * Falls back gracefully if a URL is entered directly.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { uploadFile, validateFile } from "@/lib/supabase/storage";
import { Input } from "@/components/ui/input";

interface ImageUploadFieldProps {
  /** Current image URL value */
  value: string;
  /** Called when the URL changes (upload or manual entry) */
  onChange: (url: string) => void;
  /** Recommended image dimensions shown as hint, e.g. "1920×1080" */
  recommendedSize?: string;
  /** Optional hint about image purpose */
  hint?: string;
  /** Placeholder for the URL input */
  placeholder?: string;
  /** Aspect ratio class for the preview box, e.g. "aspect-video" */
  previewAspect?: "aspect-video" | "aspect-square" | "aspect-[4/3]" | "aspect-[3/2]";
  /** Whether this is an image-only field (no video upload) */
  imageOnly?: boolean;
}

/**
 * Compact upload button with drag-and-drop, fallback URL input, and live preview.
 */
export function ImageUploadField({
  value,
  onChange,
  recommendedSize,
  hint,
  placeholder = "https://...",
  previewAspect = "aspect-video",
  imageOnly = true,
}: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const result = await uploadFile(file);

    setIsUploading(false);

    if (result.success && result.url) {
      onChange(result.url);
    } else {
      setUploadError(result.error || "שגיאה בהעלאת הקובץ");
    }
  }, [onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset so same file can be re-selected
    e.target.value = "";
  }, [handleFiles]);

  return (
    <div className="space-y-2">
      {/* Upload drop zone — compact */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer
          transition-all duration-150 text-sm
          ${isDragging
            ? "border-[#B8D900] bg-[#B8D900]/5"
            : "border-dashed border-[#D0D0D0] hover:border-[#B8D900]/60 hover:bg-[#fafafa]"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={imageOnly ? "image/*" : "image/*,video/*"}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Icon */}
        <div className="w-7 h-7 rounded-md bg-[#B8D900]/10 flex items-center justify-center shrink-0">
          {isUploading ? (
            <div className="w-3.5 h-3.5 border-2 border-[#B8D900] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a9200" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#2a2628] leading-tight">
            {isUploading ? "מעלה..." : "העלה תמונה"}
          </p>
          {recommendedSize && (
            <p className="text-[10px] text-[#9A969A] leading-tight mt-0.5">
              מידות מומלצות: <span className="font-semibold text-[#716C70]">{recommendedSize} px</span>
              {hint && <> · {hint}</>}
            </p>
          )}
        </div>

        <span className="text-[10px] text-[#B0B0B0] shrink-0">גרור או לחץ</span>
      </div>

      {/* Upload error */}
      {uploadError && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {uploadError}
        </p>
      )}

      {/* URL input fallback */}
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => { setUploadError(null); onChange(e.target.value); }}
          placeholder={placeholder}
          dir="ltr"
          className="text-xs pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[#9A969A] hover:text-red-500 transition-colors"
            title="הסר תמונה"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Live preview */}
      {value && (
        <div className={`rounded-lg overflow-hidden border border-[#E5E5E5] bg-[#f3f4f6] ${previewAspect} relative`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="תצוגה מקדימה"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {recommendedSize && (
            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded">
              {recommendedSize} px
            </div>
          )}
        </div>
      )}
    </div>
  );
}
