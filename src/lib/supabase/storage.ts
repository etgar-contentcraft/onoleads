/**
 * Supabase Storage utilities for media file uploads and management.
 * Handles uploading, deleting, and URL generation for the "media" bucket.
 */

import { createClient } from "./client";

/** Name of the Supabase storage bucket for media files */
const MEDIA_BUCKET = "media";

/** Maximum file size allowed for upload (10MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Allowed MIME types for upload */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

/** Result of an upload operation */
export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

/**
 * Generates a unique storage path for a file to avoid name collisions.
 * @param filename - Original filename
 * @returns Unique path with timestamp prefix
 */
function generateStoragePath(filename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${timestamp}-${randomSuffix}-${sanitized}`;
}

/**
 * Validates a file before upload.
 * @param file - The File object to validate
 * @returns Error message or null if valid
 */
export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `הקובץ גדול מדי. הגודל המקסימלי הוא ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "סוג קובץ לא נתמך. יש להעלות תמונה או וידאו.";
  }
  return null;
}

/**
 * Uploads a single file to Supabase storage.
 * @param file - File object to upload
 * @returns Upload result with path and public URL
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  const validationError = validateFile(file);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const supabase = createClient();
  const storagePath = generateStoragePath(file.name);

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  const { data: urlData } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(data.path);

  return {
    success: true,
    path: data.path,
    url: urlData.publicUrl,
  };
}

/**
 * Uploads multiple files in parallel.
 * @param files - Array of File objects to upload
 * @returns Array of upload results
 */
export async function uploadFiles(files: File[]): Promise<UploadResult[]> {
  return Promise.all(files.map(uploadFile));
}

/**
 * Deletes a file from Supabase storage by its storage path.
 * @param storagePath - The path within the media bucket
 * @returns True if deleted successfully
 */
export async function deleteFile(storagePath: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([storagePath]);

  return !error;
}

/**
 * Deletes multiple files from Supabase storage.
 * @param storagePaths - Array of paths within the media bucket
 * @returns True if all deletions succeeded
 */
export async function deleteFiles(storagePaths: string[]): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove(storagePaths);

  return !error;
}

/**
 * Gets the public URL for a file in storage.
 * @param storagePath - The path within the media bucket
 * @returns Public URL string
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = createClient();
  const { data } = supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Formats file size in bytes to human-readable string.
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "לא ידוע";
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`;
  }
  if (bytes >= KB) {
    return `${(bytes / KB).toFixed(0)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Determines if a MIME type represents an image.
 * @param mimeType - MIME type string
 * @returns True if the MIME type is an image type
 */
export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Determines if a MIME type represents a video.
 * @param mimeType - MIME type string
 * @returns True if the MIME type is a video type
 */
export function isVideoType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}
