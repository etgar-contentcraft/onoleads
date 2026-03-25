/**
 * SEO Dashboard - overview of all pages with their SEO scores.
 * Shows title/description length, missing fields, and inline editing.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Ideal SEO title and description character lengths */
const IDEAL_TITLE_MIN = 30;
const IDEAL_TITLE_MAX = 60;
const IDEAL_DESC_MIN = 120;
const IDEAL_DESC_MAX = 160;

/** Shape of a page with SEO-relevant fields */
interface SeoPage {
  id: string;
  title_he: string | null;
  slug: string;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
}

/** Toast notification state */
interface Toast {
  message: string;
  type: "success" | "error";
}

/**
 * Calculates a simple SEO score from 0 to 100 based on field completeness and length.
 * @param page - The page to score
 * @returns Numeric score
 */
function calcSeoScore(page: SeoPage): number {
  let score = 0;
  const MAX_SCORE = 100;

  /* Title presence: 20 points */
  if (page.seo_title) {
    score += 20;
    const len = page.seo_title.length;
    /* Title length quality: 15 points */
    if (len >= IDEAL_TITLE_MIN && len <= IDEAL_TITLE_MAX) {
      score += 15;
    } else if (len > 0 && len < IDEAL_TITLE_MIN) {
      score += 5;
    } else if (len > IDEAL_TITLE_MAX) {
      score += 8;
    }
  }

  /* Description presence: 20 points */
  if (page.seo_description) {
    score += 20;
    const len = page.seo_description.length;
    /* Description length quality: 15 points */
    if (len >= IDEAL_DESC_MIN && len <= IDEAL_DESC_MAX) {
      score += 15;
    } else if (len > 0 && len < IDEAL_DESC_MIN) {
      score += 5;
    } else if (len > IDEAL_DESC_MAX) {
      score += 8;
    }
  }

  /* Slug: 15 points */
  if (page.slug && page.slug.length > 0) {
    score += 15;
  }

  /* Published status: 15 points */
  if (page.status === "published") {
    score += 15;
  }

  return Math.min(score, MAX_SCORE);
}

/**
 * Returns a color class based on the SEO score.
 */
function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 bg-emerald-50";
  if (score >= 50) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

/**
 * Returns a label for length quality.
 */
function lengthLabel(len: number, min: number, max: number): { text: string; className: string } {
  if (len === 0) return { text: "חסר", className: "text-red-500" };
  if (len < min) return { text: "קצר מדי", className: "text-amber-500" };
  if (len > max) return { text: "ארוך מדי", className: "text-amber-500" };
  return { text: "מושלם", className: "text-emerald-500" };
}

export default function SeoDashboardPage() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPage, setEditPage] = useState<SeoPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createClient();

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pages")
      .select("id, title_he, slug, status, seo_title, seo_description")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setPages(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  /** Opens the edit dialog for a page */
  const openEdit = useCallback((page: SeoPage) => {
    setEditPage(page);
    setEditTitle(page.seo_title || "");
    setEditDesc(page.seo_description || "");
  }, []);

  /** Saves SEO fields for a page */
  const handleSave = useCallback(async () => {
    if (!editPage) return;
    setSaving(true);

    const { error } = await supabase
      .from("pages")
      .update({
        seo_title: editTitle || null,
        seo_description: editDesc || null,
      })
      .eq("id", editPage.id);

    if (error) {
      showToast("שגיאה בשמירה", "error");
    } else {
      showToast("שדות SEO עודכנו בהצלחה");
      setEditPage(null);
      fetchPages();
    }
    setSaving(false);
  }, [editPage, editTitle, editDesc, fetchPages, showToast]);

  /* Filter pages by search */
  const filteredPages = pages.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.title_he && p.title_he.toLowerCase().includes(q)) ||
      p.slug.toLowerCase().includes(q) ||
      (p.seo_title && p.seo_title.toLowerCase().includes(q))
    );
  });

  /* Summary stats */
  const avgScore = pages.length > 0
    ? Math.round(pages.reduce((sum, p) => sum + calcSeoScore(p), 0) / pages.length)
    : 0;
  const missingTitles = pages.filter((p) => !p.seo_title).length;
  const missingDescs = pages.filter((p) => !p.seo_description).length;
  const perfectPages = pages.filter((p) => calcSeoScore(p) >= 80).length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#2a2628]">לוח SEO</h1>
        <p className="text-sm text-[#9A969A] mt-0.5">סקירת אופטימיזציה למנועי חיפוש</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "ציון ממוצע", value: `${avgScore}/100`, icon: "chart", color: scoreColor(avgScore) },
          { label: "חסרי כותרת SEO", value: String(missingTitles), icon: "alert", color: missingTitles > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
          { label: "חסרי תיאור SEO", value: String(missingDescs), icon: "desc", color: missingDescs > 0 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50" },
          { label: "דפים מושלמים", value: `${perfectPages}/${pages.length}`, icon: "star", color: "text-[#B8D900] bg-[#B8D900]/10" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-[#9A969A] font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#2a2628]">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4">
          <div className="relative">
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <Input
              placeholder="חיפוש דפים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pages Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#f3f4f6]">
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider py-3 px-4">דף</th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider py-3 px-4">ציון</th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider py-3 px-4">כותרת SEO</th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider py-3 px-4">תיאור SEO</th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider py-3 px-4">Slug</th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider py-3 px-4">בעיות</th>
                    <th className="text-right text-[11px] font-semibold text-[#9A969A] uppercase tracking-wider py-3 px-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.map((page) => {
                    const score = calcSeoScore(page);
                    const titleLen = page.seo_title?.length || 0;
                    const descLen = page.seo_description?.length || 0;
                    const titleStatus = lengthLabel(titleLen, IDEAL_TITLE_MIN, IDEAL_TITLE_MAX);
                    const descStatus = lengthLabel(descLen, IDEAL_DESC_MIN, IDEAL_DESC_MAX);
                    const issues: string[] = [];
                    if (!page.seo_title) issues.push("כותרת חסרה");
                    if (!page.seo_description) issues.push("תיאור חסר");
                    if (titleLen > 0 && titleLen < IDEAL_TITLE_MIN) issues.push("כותרת קצרה");
                    if (titleLen > IDEAL_TITLE_MAX) issues.push("כותרת ארוכה");
                    if (descLen > 0 && descLen < IDEAL_DESC_MIN) issues.push("תיאור קצר");
                    if (descLen > IDEAL_DESC_MAX) issues.push("תיאור ארוך");

                    return (
                      <tr key={page.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-[#2a2628]">{page.title_he || page.slug}</p>
                            <p className="text-[11px] text-[#9A969A] font-mono" dir="ltr">/{page.slug}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${scoreColor(score)}`}>
                            {score}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-xs text-[#716C70] truncate max-w-[200px]">
                              {page.seo_title || <span className="text-red-400 italic">חסר</span>}
                            </p>
                            <span className={`text-[10px] font-medium ${titleStatus.className}`}>
                              {titleLen > 0 && `${titleLen} תווים - `}{titleStatus.text}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-xs text-[#716C70] truncate max-w-[200px]">
                              {page.seo_description || <span className="text-red-400 italic">חסר</span>}
                            </p>
                            <span className={`text-[10px] font-medium ${descStatus.className}`}>
                              {descLen > 0 && `${descLen} תווים - `}{descStatus.text}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-mono text-[#716C70]" dir="ltr">/{page.slug}</span>
                        </td>
                        <td className="py-3 px-4">
                          {issues.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {issues.map((issue) => (
                                <Badge key={issue} className="text-[10px] bg-red-50 text-red-600 border-0">
                                  {issue}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Badge className="text-[10px] bg-emerald-50 text-emerald-600 border-0">
                              תקין
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(page)}
                            className="text-xs text-[#B8D900] hover:text-[#9AB800] hover:bg-[#B8D900]/10"
                          >
                            ערוך
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editPage} onOpenChange={() => setEditPage(null)}>
        <DialogContent className="sm:max-w-lg">
          {editPage && (
            <>
              <DialogHeader>
                <DialogTitle>עריכת SEO - {editPage.title_he || editPage.slug}</DialogTitle>
                <DialogDescription>עדכן את שדות ה-SEO של הדף</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* SEO Title */}
                <div>
                  <label className="text-sm font-medium text-[#2a2628] block mb-1.5">
                    כותרת SEO
                  </label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="הזן כותרת SEO..."
                    className="h-9"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[11px] font-medium ${
                      lengthLabel(editTitle.length, IDEAL_TITLE_MIN, IDEAL_TITLE_MAX).className
                    }`}>
                      {lengthLabel(editTitle.length, IDEAL_TITLE_MIN, IDEAL_TITLE_MAX).text}
                    </span>
                    <span className="text-[11px] text-[#9A969A]">
                      {editTitle.length}/{IDEAL_TITLE_MAX} תווים
                    </span>
                  </div>
                  {/* Visual progress bar */}
                  <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        editTitle.length <= IDEAL_TITLE_MAX
                          ? editTitle.length >= IDEAL_TITLE_MIN
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${Math.min((editTitle.length / IDEAL_TITLE_MAX) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* SEO Description */}
                <div>
                  <label className="text-sm font-medium text-[#2a2628] block mb-1.5">
                    תיאור SEO
                  </label>
                  <Textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="הזן תיאור SEO..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[11px] font-medium ${
                      lengthLabel(editDesc.length, IDEAL_DESC_MIN, IDEAL_DESC_MAX).className
                    }`}>
                      {lengthLabel(editDesc.length, IDEAL_DESC_MIN, IDEAL_DESC_MAX).text}
                    </span>
                    <span className="text-[11px] text-[#9A969A]">
                      {editDesc.length}/{IDEAL_DESC_MAX} תווים
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        editDesc.length <= IDEAL_DESC_MAX
                          ? editDesc.length >= IDEAL_DESC_MIN
                            ? "bg-emerald-500"
                            : "bg-amber-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${Math.min((editDesc.length / IDEAL_DESC_MAX) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Google preview */}
                <div>
                  <label className="text-xs text-[#9A969A] block mb-2">תצוגת Google</label>
                  <div className="border border-[#e5e7eb] rounded-xl p-3 bg-white">
                    <p className="text-blue-700 text-sm font-medium truncate" dir="ltr">
                      {editTitle || "ללא כותרת"}
                    </p>
                    <p className="text-xs text-emerald-700 font-mono truncate mt-0.5" dir="ltr">
                      https://onoleads.co.il/p/{editPage.slug}
                    </p>
                    <p className="text-xs text-[#716C70] mt-1 line-clamp-2">
                      {editDesc || "ללא תיאור"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditPage(null)}>
                  ביטול
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400]"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2a2628] border-t-transparent" />
                  ) : (
                    "שמור"
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
