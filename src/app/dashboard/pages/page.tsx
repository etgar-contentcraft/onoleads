"use client";

// Pages management admin list - supports grid/list view, filtering, duplicate with sections, and toast notifications
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Clock,
  Rocket,
  CheckCircle2,
  XCircle,
  Settings,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LandingPage {
  id: string;
  title_he: string | null;
  title_en: string | null;
  slug: string;
  language: "he" | "en" | "ar";
  status: "draft" | "published" | "archived";
  page_type: "degree" | "event" | "sales" | "specialization";
  last_built_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  program?: { name_he: string } | null;
}

interface PageSection {
  section_type: string;
  sort_order: number;
  is_visible: boolean;
  content: Record<string, unknown> | null;
  styles: Record<string, unknown> | null;
}

/** Simple in-page toast notification */
interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "טיוטה", className: "bg-gray-100 text-gray-600 border-0" },
  published: { label: "מפורסם", className: "bg-green-50 text-green-700 border-0" },
  archived: { label: "בארכיון", className: "bg-orange-50 text-orange-600 border-0" },
};

const TYPE_LABELS: Record<string, string> = {
  degree: "תואר",
  event: "אירוע",
  sales: "מכירות",
  specialization: "התמחות",
};

const LANGUAGE_LABELS: Record<string, string> = {
  he: "עברית",
  en: "English",
  ar: "عربي",
};

// ---------------------------------------------------------------------------
// Toast Component
// ---------------------------------------------------------------------------

/**
 * Renders stacked toast notifications anchored to the bottom-left corner.
 * Each toast has a dismiss button and is auto-dismissed by the caller.
 */
function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2" dir="rtl">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            toast.type === "success"
              ? "bg-white border-green-200 text-green-800"
              : "bg-white border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => onDismiss(toast.id)}
            className="mr-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function PagesManagementPage() {
  const router = useRouter();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [toasts, setToasts] = useState<Toast[]>([]);
  /** ID of the page pending delete confirmation — null when dialog is closed */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * Adds a toast notification that auto-dismisses after 4 seconds.
   * @param type - "success" or "error"
   * @param message - Notification text
   */
  const showToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    fetchPages();
  }, [filterStatus, filterType, filterLanguage, searchQuery]);

  /**
   * Loads pages from Supabase with active filters applied.
   */
  async function fetchPages() {
    setLoading(true);
    let query = supabase
      .from("pages")
      .select("*, program:programs(name_he)")
      .order("updated_at", { ascending: false });

    if (filterStatus && filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    if (filterType && filterType !== "all") {
      query = query.eq("page_type", filterType);
    }
    if (filterLanguage && filterLanguage !== "all") {
      query = query.eq("language", filterLanguage);
    }
    if (searchQuery) {
      query = query.or(`title_he.ilike.%${searchQuery}%,title_en.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPages(data as LandingPage[]);
    }
    setLoading(false);
  }

  /**
   * Duplicates a page (status = draft) and copies all its page_sections.
   * Shows a success or error toast upon completion.
   * @param page - The source page to duplicate
   */
  async function handleDuplicate(page: LandingPage) {
    setDuplicatingId(page.id);

    try {
      // Create the duplicate page record with a timestamped slug to avoid conflicts
      const newSlug = `${page.slug}-copy-${Date.now()}`;

      const { data: newPage, error: pageError } = await supabase
        .from("pages")
        .insert({
          title_he: page.title_he ? `${page.title_he} (העתק)` : null,
          title_en: page.title_en ? `${page.title_en} (copy)` : null,
          slug: newSlug,
          language: page.language,
          status: "draft" as const,
          page_type: page.page_type,
          program_id: (page as unknown as Record<string, unknown>).program_id ?? null,
        })
        .select()
        .single();

      if (pageError || !newPage) {
        throw pageError ?? new Error("שגיאה ביצירת עמוד חדש");
      }

      // Copy all page_sections from the original to the new page
      const { data: sections, error: sectionsReadError } = await supabase
        .from("page_sections")
        .select("section_type, sort_order, is_visible, content, styles")
        .eq("page_id", page.id)
        .order("sort_order");

      if (!sectionsReadError && sections && sections.length > 0) {
        const sectionInserts = (sections as PageSection[]).map((s) => ({
          page_id: (newPage as { id: string }).id,
          section_type: s.section_type,
          sort_order: s.sort_order,
          is_visible: s.is_visible,
          content: s.content,
          styles: s.styles,
        }));

        const { error: sectionsWriteError } = await supabase
          .from("page_sections")
          .insert(sectionInserts);

        if (sectionsWriteError) {
          // Non-fatal — page exists, sections just didn't copy
          console.warn("Failed to copy page sections:", sectionsWriteError);
        }
      }

      await fetchPages();
      showToast("success", `הדף שוכפל בהצלחה! סלאג: ${newSlug}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בשכפול הדף";
      showToast("error", message);
    } finally {
      setDuplicatingId(null);
    }
  }

  /**
   * Opens the styled delete confirmation dialog for a page.
   * @param pageId - ID of the page to confirm deletion
   */
  function handleDelete(pageId: string) {
    setDeleteConfirmId(pageId);
  }

  /**
   * Executes the confirmed delete action and closes the dialog.
   */
  async function confirmDelete() {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from("pages").delete().eq("id", deleteConfirmId);
    if (!error) {
      fetchPages();
      fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "admin_page_deleted", resource_type: "page", resource_id: deleteConfirmId }) }).catch(() => {});
    }
    setDeleteConfirmId(null);
  }

  /**
   * Sets a page's status to "published" with the current timestamp.
   * @param pageId - ID of the page to publish
   */
  async function handlePublish(pageId: string) {
    const { error } = await supabase
      .from("pages")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", pageId);
    if (!error) {
      fetchPages();
    }
  }

  /**
   * Formats an ISO date string in Israeli locale.
   * @param dateStr - ISO string or null
   * @returns Formatted date string or "-"
   */
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  /**
   * Returns the best available display title for a page.
   * @param page - LandingPage record
   */
  const getPageTitle = (page: LandingPage) => {
    return page.title_he || page.title_en || page.slug;
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#4A4648]">דפי נחיתה</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">
            ניהול דפי נחיתה לתוכניות לימוד ואירועים
          </p>
        </div>
        <Link href="/dashboard/pages/new">
          <Button className="gap-2 bg-[#B8D900] text-[#4A4648] hover:bg-[#9AB800]">
            <Plus className="w-4 h-4" />
            דף נחיתה חדש
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
              <Input
                placeholder="חיפוש לפי שם עמוד או כתובת..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-9"
              />
            </div>

            <Select
              value={filterStatus}
              onValueChange={(val) => setFilterStatus(val as string)}
            >
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="draft">טיוטה</SelectItem>
                <SelectItem value="published">מפורסם</SelectItem>
                <SelectItem value="archived">בארכיון</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterType}
              onValueChange={(val) => setFilterType(val as string)}
            >
              <SelectTrigger className="h-9 w-[120px]">
                <SelectValue placeholder="סוג" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="degree">תואר</SelectItem>
                <SelectItem value="event">אירוע</SelectItem>
                <SelectItem value="sales">מכירות</SelectItem>
                <SelectItem value="specialization">התמחות</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterLanguage}
              onValueChange={(val) => setFilterLanguage(val as string)}
            >
              <SelectTrigger className="h-9 w-[110px]">
                <SelectValue placeholder="שפה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל השפות</SelectItem>
                <SelectItem value="he">עברית</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">عربي</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex items-center border border-[#E5E5E5] rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-l-none ${viewMode === "grid" ? "bg-[#F0F7CC] text-[#4A4648]" : "text-[#9A969A]"}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-r-none ${viewMode === "list" ? "bg-[#F0F7CC] text-[#4A4648]" : "text-[#9A969A]"}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
      ) : pages.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center text-[#9A969A]">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium text-[#4A4648]">עדיין לא יצרת דפי נחיתה</p>
              <p className="text-sm mt-1 max-w-md mx-auto">
                דפי נחיתה הם עמודים ייעודיים לתוכניות לימוד, אירועים או קמפיינים שיווקיים.
                <br />
                צור את הדף הראשון שלך בכמה קליקים פשוטים.
              </p>
              <Link href="/dashboard/pages/new">
                <Button className="mt-6 gap-2 bg-[#B8D900] text-[#4A4648] hover:bg-[#9AB800] px-8 py-5 text-base">
                  <Plus className="w-5 h-5" />
                  צור דף נחיתה ראשון
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => {
            const statusInfo = STATUS_LABELS[page.status];
            const isDuplicating = duplicatingId === page.id;

            return (
              <Card key={page.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex-row items-start justify-between pb-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-medium text-[#4A4648] truncate">
                      {getPageTitle(page)}
                    </CardTitle>
                    <p className="text-xs text-[#9A969A] mt-1 font-mono truncate" dir="ltr">
                      /{page.slug}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => router.push(`/dashboard/pages/${page.id}/builder`)} className="gap-2">
                          <Pencil className="w-4 h-4" />
                          עריכה
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/dashboard/analytics?page=${page.id}`)} className="gap-2">
                          <BarChart3 className="w-4 h-4" />
                          אנליטיקס
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => router.push(`/dashboard/pages/${page.id}/settings`)} className="gap-2">
                          <Settings className="w-4 h-4" />
                          הגדרות עמוד
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => window.open(`/lp/${page.slug}`, "_blank")} className="gap-2">
                          <Eye className="w-4 h-4" />
                          תצוגה מקדימה
                      </DropdownMenuItem>
                      {page.status !== "published" && (
                        <DropdownMenuItem onClick={() => handlePublish(page.id)} className="gap-2">
                          <Rocket className="w-4 h-4" />
                          פרסום
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(page)}
                        disabled={isDuplicating}
                        className="gap-2"
                      >
                        <Copy className={`w-4 h-4 ${isDuplicating ? "animate-spin" : ""}`} />
                        {isDuplicating ? "משכפל..." : "שכפל"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(page.id)}
                        className="gap-2 text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                        מחיקה
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {TYPE_LABELS[page.page_type]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {LANGUAGE_LABELS[page.language]}
                    </Badge>
                  </div>
                  {page.program && (
                    <p className="text-xs text-[#716C70] mb-2 truncate">
                      <BookOpenIcon className="w-3 h-3 inline ml-1" />
                      {(page.program as { name_he: string }).name_he}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-[#9A969A]">
                    <Clock className="w-3 h-3" />
                    <span>
                      {page.last_built_at
                        ? `נבנה: ${formatDate(page.last_built_at)}`
                        : `נוצר: ${formatDate(page.created_at)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">שפה</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right hidden md:table-cell">עדכון אחרון</TableHead>
                  <TableHead className="text-right w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => {
                  const statusInfo = STATUS_LABELS[page.status];
                  const isDuplicating = duplicatingId === page.id;

                  return (
                    <TableRow key={page.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#4A4648]">{getPageTitle(page)}</p>
                          <p className="text-xs text-[#9A969A] font-mono" dir="ltr">/{page.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#716C70]">{TYPE_LABELS[page.page_type]}</TableCell>
                      <TableCell className="text-[#716C70]">{LANGUAGE_LABELS[page.language]}</TableCell>
                      <TableCell>
                        <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-[#9A969A] text-xs hidden md:table-cell">
                        {formatDate(page.updated_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/pages/${page.id}/builder`)} className="gap-2">
                                <Pencil className="w-4 h-4" />
                                עריכה
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/analytics?page=${page.id}`)} className="gap-2">
                                <BarChart3 className="w-4 h-4" />
                                אנליטיקס
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => router.push(`/dashboard/pages/${page.id}/settings`)} className="gap-2">
                                <Settings className="w-4 h-4" />
                                הגדרות עמוד
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => window.open(`/lp/${page.slug}`, "_blank")} className="gap-2">
                                <Eye className="w-4 h-4" />
                                תצוגה מקדימה
                            </DropdownMenuItem>
                            {page.status !== "published" && (
                              <DropdownMenuItem onClick={() => handlePublish(page.id)} className="gap-2">
                                <Rocket className="w-4 h-4" />
                                פרסום
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(page)}
                              disabled={isDuplicating}
                              className="gap-2"
                            >
                              <Copy className={`w-4 h-4 ${isDuplicating ? "animate-spin" : ""}`} />
                              {isDuplicating ? "משכפל..." : "שכפל"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(page.id)}
                              className="gap-2 text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                              מחיקה
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {/* Delete confirmation dialog — replaces native window.confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-lg">מחיקת דף נחיתה</DialogTitle>
            <DialogDescription className="text-right text-sm text-[#9A969A] mt-2">
              פעולה זו תמחק את הדף לצמיתות, כולל כל הסקשנים והתוכן שלו.
              <br />
              <strong className="text-red-500">לא ניתן לבטל פעולה זו.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="gap-2">
              <Trash2 className="w-4 h-4" />
              מחק לצמיתות
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icon components
// ---------------------------------------------------------------------------

/** Small book-open SVG icon used in page cards to indicate program association */
function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
