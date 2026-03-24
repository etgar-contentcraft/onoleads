"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Globe,
  Clock,
  ExternalLink,
  Rocket,
} from "lucide-react";
import Link from "next/link";

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

export default function PagesManagementPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");

  const supabase = createClient();

  useEffect(() => {
    fetchPages();
  }, [filterStatus, filterType, filterLanguage, searchQuery]);

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

  async function handleDuplicate(page: LandingPage) {
    const { data, error } = await supabase
      .from("pages")
      .insert({
        title_he: page.title_he ? `${page.title_he} (העתק)` : null,
        title_en: page.title_en ? `${page.title_en} (copy)` : null,
        slug: `${page.slug}-copy-${Date.now()}`,
        language: page.language,
        status: "draft" as const,
        page_type: page.page_type,
        program_id: (page as unknown as Record<string, unknown>).program_id ?? null,
      })
      .select()
      .single();

    if (!error) {
      fetchPages();
    }
  }

  async function handleDelete(pageId: string) {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק דף זה?")) return;
    const { error } = await supabase.from("pages").delete().eq("id", pageId);
    if (!error) {
      fetchPages();
    }
  }

  async function handlePublish(pageId: string) {
    const { error } = await supabase
      .from("pages")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", pageId);
    if (!error) {
      fetchPages();
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getPageTitle = (page: LandingPage) => {
    return page.title_he || page.title_en || page.slug;
  };

  return (
    <div className="space-y-6">
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
                placeholder="חיפוש לפי שם או slug..."
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
              <p className="text-lg font-medium">אין דפי נחיתה</p>
              <p className="text-sm mt-1">צור את דף הנחיתה הראשון שלך</p>
              <Link href="/dashboard/pages/new">
                <Button className="mt-4 gap-2 bg-[#B8D900] text-[#4A4648] hover:bg-[#9AB800]">
                  <Plus className="w-4 h-4" />
                  דף נחיתה חדש
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
                    <DropdownMenuTrigger >
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem >
                        <Link href={`/dashboard/builder?page=${page.id}`} className="gap-2">
                          <Pencil className="w-4 h-4" />
                          עריכה
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem >
                        <Link href={`/p/${page.slug}`} target="_blank" className="gap-2">
                          <Eye className="w-4 h-4" />
                          תצוגה מקדימה
                        </Link>
                      </DropdownMenuItem>
                      {page.status !== "published" && (
                        <DropdownMenuItem onClick={() => handlePublish(page.id)} className="gap-2">
                          <Rocket className="w-4 h-4" />
                          פרסום
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDuplicate(page)} className="gap-2">
                        <Copy className="w-4 h-4" />
                        שכפול
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
                          <DropdownMenuTrigger >
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem >
                              <Link href={`/dashboard/builder?page=${page.id}`} className="gap-2">
                                <Pencil className="w-4 h-4" />
                                עריכה
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem >
                              <Link href={`/p/${page.slug}`} target="_blank" className="gap-2">
                                <Eye className="w-4 h-4" />
                                תצוגה מקדימה
                              </Link>
                            </DropdownMenuItem>
                            {page.status !== "published" && (
                              <DropdownMenuItem onClick={() => handlePublish(page.id)} className="gap-2">
                                <Rocket className="w-4 h-4" />
                                פרסום
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(page)} className="gap-2">
                              <Copy className="w-4 h-4" />
                              שכפול
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
    </div>
  );
}

// Small inline icon component used above
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
