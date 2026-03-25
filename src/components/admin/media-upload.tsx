/**
 * Reusable drag-and-drop media upload component.
 * Supports multiple file uploads with preview and progress indication.
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { validateFile, uploadFile, type UploadResult } from "@/lib/supabase/storage";

/** Props for the MediaUpload component */
interface MediaUploadProps {
  /** Callback fired when upload completes successfully */
  onUploadComplete?: (results: UploadResult[]) => void;
  /** Optional CSS class */
  className?: string;
  /** Whether to allow multiple file selection */
  multiple?: boolean;
}

/** State of a single file being uploaded */
interface UploadingFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  result?: UploadResult;
}

/**
 * Drag-and-drop media upload zone with file previews and progress.
 * Validates file type and size before uploading to Supabase Storage.
 */
export function MediaUpload({ onUploadComplete, className = "", multiple = true }: MediaUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Handles files selected via input or dropped */
  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const uploadItems: UploadingFile[] = files.map((file) => ({
      file,
      status: "pending" as const,
    }));

    setUploadingFiles(uploadItems);
    setIsUploading(true);

    const results: UploadResult[] = [];

    for (let i = 0; i < uploadItems.length; i++) {
      setUploadingFiles((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: "uploading" } : item
        )
      );

      const validationError = validateFile(uploadItems[i].file);
      if (validationError) {
        setUploadingFiles((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: validationError } : item
          )
        );
        results.push({ success: false, error: validationError });
        continue;
      }

      const result = await uploadFile(uploadItems[i].file);
      results.push(result);

      setUploadingFiles((prev) =>
        prev.map((item, idx) =>
          idx === i
            ? {
                ...item,
                status: result.success ? "success" : "error",
                error: result.error,
                result,
              }
            : item
        )
      );
    }

    setIsUploading(false);

    const successResults = results.filter((r) => r.success);
    if (successResults.length > 0 && onUploadComplete) {
      onUploadComplete(successResults);
    }

    /* Clear after a short delay so user sees success state */
    setTimeout(() => {
      setUploadingFiles([]);
    }, 2000);
  }, [onUploadComplete]);

  /** Drag event handlers */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div className={className}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? "border-[#B8D900] bg-[#B8D900]/5 scale-[1.01]"
            : "border-[#e5e7eb] hover:border-[#B8D900]/50 hover:bg-[#f9fafb]"
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Upload icon */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#B8D900]/10 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8D900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <p className="text-sm font-medium text-[#2a2628] mb-1">
          גרור קבצים לכאן או לחץ לבחירה
        </p>
        <p className="text-xs text-[#9A969A]">
          תמונות (JPG, PNG, GIF, WebP, SVG) או וידאו (MP4, WebM) עד 10MB
        </p>
      </div>

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 bg-white rounded-xl p-3 border border-[#e5e7eb]"
            >
              {/* Thumbnail preview */}
              {item.file.type.startsWith("image/") && (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f3f4f6] shrink-0">
                  <img
                    src={URL.createObjectURL(item.file)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {item.file.type.startsWith("video/") && (
                <div className="w-10 h-10 rounded-lg bg-[#f3f4f6] shrink-0 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9A969A" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              )}

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#2a2628] truncate">{item.file.name}</p>
                <p className="text-[11px] text-[#9A969A]">
                  {(item.file.size / 1024).toFixed(0)} KB
                </p>
              </div>

              {/* Status indicator */}
              {item.status === "uploading" && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#B8D900] border-t-transparent" />
              )}
              {item.status === "success" && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {item.status === "error" && (
                <div className="text-xs text-red-500">{item.error}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
