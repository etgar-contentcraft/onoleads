/**
 * Media Library page - manages uploaded images and videos.
 * Features: grid view, drag-and-drop upload, search, filter, bulk delete.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaUpload } from "@/components/admin/media-upload";
import { formatFileSize, deleteFile, deleteFiles } from "@/lib/supabase/storage";

/** Shape of a media record from the database */
interface MediaItem {
  id: string;
  filename: string;
  storage_path: string;
  url: string;
  mime_type: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  alt_text_he: string | null;
  created_at: string;
}

/** Toast notification state */
interface Toast {
  message: string;
  type: "success" | "error";
}

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const supabase = createClient();

  /** Shows a temporary toast notification */
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Fetches media items from the database */
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (searchQuery) {
      query = query.ilike("filename", `%${searchQuery}%`);
    }
    if (filterType === "image") {
      query = query.like("mime_type", "image/%");
    } else if (filterType === "video") {
      query = query.like("mime_type", "video/%");
    }

    const { data, error } = await query;
    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }, [searchQuery, filterType]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  /** Handles successful uploads by refreshing the list */
  const handleUploadComplete = useCallback(() => {
    fetchMedia();
    setShowUpload(false);
    showToast("הקבצים הועלו בהצלחה");
  }, [fetchMedia, showToast]);

  /** Copies URL to clipboard */
  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast("הקישור הועתק ללוח");
    } catch {
      showToast("שגיאה בהעתקה", "error");
    }
  }, [showToast]);

  /** Deletes a single media item */
  const handleDelete = useCallback(async (item: MediaItem) => {
    const storageOk = await deleteFile(item.storage_path);
    if (!storageOk) {
      showToast("שגיאה במחיקת הקובץ מהשרת", "error");
      return;
    }

    const { error } = await supabase.from("media").delete().eq("id", item.id);
    if (error) {
      showToast("שגיאה במחיקת הרשומה", "error");
      return;
    }

    showToast("הקובץ נמחק בהצלחה");
    setDeleteConfirmId(null);
    setPreviewItem(null);
    fetchMedia();
  }, [fetchMedia, showToast]);

  /** Handles bulk deletion of selected items */
  const handleBulkDelete = useCallback(async () => {
    if (selectedItems.size === 0) return;
    if (!window.confirm(`האם למחוק ${selectedItems.size} קבצים?`)) return;

    const selectedMediaItems = items.filter((item) => selectedItems.has(item.id));
    const paths = selectedMediaItems.map((item) => item.storage_path);

    await deleteFiles(paths);

    const ids = Array.from(selectedItems);
    for (const id of ids) {
      await supabase.from("media").delete().eq("id", id);
    }

    setSelectedItems(new Set());
    showToast(`${ids.length} קבצים נמחקו`);
    fetchMedia();
  }, [selectedItems, items, fetchMedia, showToast]);

  /** Toggles item selection for bulk operations */
  const toggleSelect = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /** Selects or deselects all visible items */
  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  }, [items, selectedItems]);

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">ספריית מדיה</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">ניהול תמונות וסרטונים</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              מחק ({selectedItems.size})
            </Button>
          )}
          <Button
            onClick={() => setShowUpload(!showUpload)}
            className="gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] shadow-md shadow-[#B8D900]/20"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            העלאת קובץ
          </Button>
        </div>
      </div>

      {/* Upload Zone (collapsible) */}
      {showUpload && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <MediaUpload onUploadComplete={handleUploadComplete} />
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <Input
                placeholder="חיפוש לפי שם קובץ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-9"
              />
            </div>
            <Select value={filterType} onValueChange={(val) => val && setFilterType(val)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="כל הסוגים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="image">תמונות</SelectItem>
                <SelectItem value="video">וידאו</SelectItem>
              </SelectContent>
            </Select>
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="h-9 text-xs"
              >
                {selectedItems.size === items.length ? "בטל בחירה" : "בחר הכל"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16">
            <div className="text-center text-[#9A969A]">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-lg font-medium">אין קבצי מדיה</p>
              <p className="text-sm mt-1">העלה את הקובץ הראשון שלך</p>
              <Button
                onClick={() => setShowUpload(true)}
                className="mt-4 gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400]"
              >
                העלאת קובץ
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const isSelected = selectedItems.has(item.id);
            return (
              <div
                key={item.id}
                className={`group relative bg-white rounded-xl shadow-sm border-2 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  isSelected
                    ? "border-[#B8D900] ring-2 ring-[#B8D900]/20"
                    : "border-transparent"
                }`}
              >
                {/* Selection checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                  className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-[#B8D900] border-[#B8D900]"
                      : "bg-white/80 border-[#d1d5db] opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Preview */}
                <div
                  onClick={() => setPreviewItem(item)}
                  className="aspect-square bg-[#f3f4f6] relative overflow-hidden"
                >
                  {isImage(item.mime_type) ? (
                    <img
                      src={item.url}
                      alt={item.alt_text_he || item.filename}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#2a2628]/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#716C70" strokeWidth="2">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-[#2a2628] truncate" title={item.filename}>
                    {item.filename}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-[#9A969A]">
                      {formatFileSize(item.size_bytes)}
                    </span>
                    {item.width && item.height && (
                      <span className="text-[10px] text-[#9A969A]">
                        {item.width}x{item.height}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="sm:max-w-lg">
          {previewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base truncate">{previewItem.filename}</DialogTitle>
                <DialogDescription>
                  {new Date(previewItem.created_at).toLocaleDateString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </DialogDescription>
              </DialogHeader>

              {/* Preview Image/Video */}
              <div className="rounded-xl overflow-hidden bg-[#f3f4f6] max-h-64 flex items-center justify-center">
                {isImage(previewItem.mime_type) ? (
                  <img
                    src={previewItem.url}
                    alt={previewItem.alt_text_he || previewItem.filename}
                    className="max-w-full max-h-64 object-contain"
                  />
                ) : (
                  <video
                    src={previewItem.url}
                    controls
                    className="max-w-full max-h-64"
                  />
                )}
              </div>

              {/* File details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#9A969A]">גודל</span>
                  <span className="text-[#2a2628]">{formatFileSize(previewItem.size_bytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9A969A]">סוג</span>
                  <span className="text-[#2a2628]">{previewItem.mime_type}</span>
                </div>
                {previewItem.width && previewItem.height && (
                  <div className="flex justify-between">
                    <span className="text-[#9A969A]">מימדים</span>
                    <span className="text-[#2a2628]">
                      {previewItem.width} x {previewItem.height} px
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCopyUrl(previewItem.url)}
                  className="flex-1 gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  העתק קישור
                </Button>
                <Button
                  onClick={() => {
                    setDeleteConfirmId(previewItem.id);
                  }}
                  variant="outline"
                  className="gap-2 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  מחק
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק קובץ זה? פעולה זו אינה ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              ביטול
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => {
                const item = items.find((i) => i.id === deleteConfirmId);
                if (item) handleDelete(item);
              }}
            >
              מחק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
