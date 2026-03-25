/**
 * Page Editor - Visual section reorder, visibility toggle, and content editing.
 * Features: drag handles, up/down buttons, section preview, add/delete sections.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** Shape of a page section from the database */
interface Section {
  id: string;
  page_id: string;
  section_type: string;
  sort_order: number;
  is_visible: boolean;
  content: Record<string, unknown> | null;
  styles: Record<string, unknown> | null;
}

/** Shape of the page record */
interface PageData {
  id: string;
  title_he: string | null;
  slug: string;
  status: string;
}

/** Available section templates */
const SECTION_TEMPLATES = [
  { type: "hero", label: "גיבור (Hero)", icon: "layout" },
  { type: "about", label: "אודות", icon: "info" },
  { type: "benefits", label: "יתרונות", icon: "star" },
  { type: "curriculum", label: "תוכנית לימודים", icon: "book" },
  { type: "faculty", label: "סגל", icon: "users" },
  { type: "testimonials", label: "המלצות", icon: "message" },
  { type: "faq", label: "שאלות נפוצות", icon: "help" },
  { type: "cta", label: "קריאה לפעולה", icon: "zap" },
  { type: "stats", label: "סטטיסטיקות", icon: "chart" },
  { type: "career", label: "קריירה", icon: "briefcase" },
];

/** Hebrew labels for section types */
const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "גיבור (Hero)",
  about: "אודות",
  benefits: "יתרונות",
  curriculum: "תוכנית לימודים",
  faculty: "סגל",
  testimonials: "המלצות",
  faq: "שאלות נפוצות",
  cta: "קריאה לפעולה",
  stats: "סטטיסטיקות",
  career: "קריירה",
  contact: "יצירת קשר",
  gallery: "גלריה",
};

/** Toast notification state */
interface Toast {
  message: string;
  type: "success" | "error";
}

export default function PageEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Fetches the page and its sections */
  const fetchData = useCallback(async () => {
    setLoading(true);

    const [pageRes, sectionsRes] = await Promise.all([
      supabase.from("pages").select("id, title_he, slug, status").eq("id", params.id).single(),
      supabase.from("page_sections").select("*").eq("page_id", params.id).order("sort_order"),
    ]);

    if (pageRes.data) setPage(pageRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);

    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Moves a section up or down */
  const moveSection = useCallback(async (sectionId: string, direction: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sections.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const newSections = [...sections];
    [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];

    /* Update sort_order for all sections */
    const updatedSections = newSections.map((s, i) => ({ ...s, sort_order: i }));
    setSections(updatedSections);

    /* Persist to database */
    for (const section of updatedSections) {
      await supabase
        .from("page_sections")
        .update({ sort_order: section.sort_order })
        .eq("id", section.id);
    }

    showToast("סדר הסקציות עודכן");
  }, [sections, showToast]);

  /** Toggles section visibility */
  const toggleVisibility = useCallback(async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    const newVisible = !section.is_visible;
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, is_visible: newVisible } : s))
    );

    await supabase
      .from("page_sections")
      .update({ is_visible: newVisible })
      .eq("id", sectionId);

    showToast(newVisible ? "הסקציה מוצגת" : "הסקציה מוסתרת");
  }, [sections, showToast]);

  /** Adds a new section from template */
  const addSection = useCallback(async (sectionType: string) => {
    const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.sort_order)) : -1;

    const { data, error } = await supabase
      .from("page_sections")
      .insert({
        page_id: params.id,
        section_type: sectionType,
        sort_order: maxOrder + 1,
        is_visible: true,
        content: {},
        styles: {},
      })
      .select()
      .single();

    if (!error && data) {
      setSections((prev) => [...prev, data]);
      setShowAddSection(false);
      showToast("סקציה חדשה נוספה");
    } else {
      showToast("שגיאה בהוספת סקציה", "error");
    }
  }, [params.id, sections, showToast]);

  /** Deletes a section after confirmation */
  const deleteSection = useCallback(async (sectionId: string) => {
    const { error } = await supabase
      .from("page_sections")
      .delete()
      .eq("id", sectionId);

    if (!error) {
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      setDeleteConfirmId(null);
      showToast("הסקציה נמחקה");
    } else {
      showToast("שגיאה במחיקה", "error");
    }
  }, [showToast]);

  /** Opens the section content editor */
  const openEditSection = useCallback((section: Section) => {
    setEditSection(section);
    setEditContent(JSON.stringify(section.content || {}, null, 2));
  }, []);

  /** Saves edited section content */
  const saveEditSection = useCallback(async () => {
    if (!editSection) return;
    setSaving(true);

    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(editContent);
    } catch {
      showToast("JSON לא תקין", "error");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("page_sections")
      .update({ content: parsedContent })
      .eq("id", editSection.id);

    if (!error) {
      setSections((prev) =>
        prev.map((s) =>
          s.id === editSection.id ? { ...s, content: parsedContent } : s
        )
      );
      setEditSection(null);
      showToast("התוכן עודכן בהצלחה");
    } else {
      showToast("שגיאה בשמירה", "error");
    }
    setSaving(false);
  }, [editSection, editContent, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-24">
        <p className="text-lg text-[#9A969A]">דף לא נמצא</p>
        <Link href="/dashboard/pages">
          <Button variant="outline" className="mt-4 gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            חזרה לדפים
          </Button>
        </Link>
      </div>
    );
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/pages">
            <Button variant="ghost" size="sm" className="text-[#9A969A] hover:text-[#2a2628]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#2a2628]">
              עריכת דף: {page.title_he || page.slug}
            </h1>
            <p className="text-sm text-[#9A969A] mt-0.5 font-mono" dir="ltr">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/lp/${page.slug}`} target="_blank">
            <Button variant="outline" className="gap-2 text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              תצוגה מקדימה
            </Button>
          </Link>
          <Button
            onClick={() => setShowAddSection(true)}
            className="gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            הוסף סקציה
          </Button>
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16">
            <div className="text-center text-[#9A969A]">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <p className="text-lg font-medium">אין סקציות בדף</p>
              <p className="text-sm mt-1">הוסף סקציה ראשונה כדי להתחיל לבנות את הדף</p>
              <Button
                onClick={() => setShowAddSection(true)}
                className="mt-4 gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400]"
              >
                הוסף סקציה
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section, idx) => (
            <Card
              key={section.id}
              className={`border-0 shadow-sm transition-all duration-200 ${
                !section.is_visible ? "opacity-50" : ""
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {/* Drag handle area */}
                  <div className="flex flex-col items-center gap-1 text-[#9A969A] shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5" />
                      <circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" />
                      <circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" />
                      <circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>

                  {/* Section info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#9A969A] bg-[#f3f4f6] rounded-md px-2 py-0.5">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-[#2a2628]">
                        {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                      </h3>
                      {!section.is_visible && (
                        <Badge className="text-[10px] bg-[#f3f4f6] text-[#9A969A] border-0">
                          מוסתר
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9A969A] mt-0.5 font-mono">{section.section_type}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Move up */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSection(section.id, "up")}
                      disabled={idx === 0}
                      className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#2a2628]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                    </Button>

                    {/* Move down */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveSection(section.id, "down")}
                      disabled={idx === sections.length - 1}
                      className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#2a2628]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </Button>

                    {/* Visibility toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisibility(section.id)}
                      className={`h-8 w-8 p-0 ${section.is_visible ? "text-[#B8D900]" : "text-[#9A969A]"}`}
                    >
                      {section.is_visible ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      )}
                    </Button>

                    {/* Edit content */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditSection(section)}
                      className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#2a2628]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(section.id)}
                      className="h-8 w-8 p-0 text-[#9A969A] hover:text-red-500"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Section Dialog */}
      <Dialog open={showAddSection} onOpenChange={setShowAddSection}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>הוסף סקציה חדשה</DialogTitle>
            <DialogDescription>בחר תבנית סקציה מהרשימה</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SECTION_TEMPLATES.map((tpl) => (
              <button
                key={tpl.type}
                onClick={() => addSection(tpl.type)}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#e5e7eb] hover:border-[#B8D900] hover:bg-[#B8D900]/5 transition-all text-right"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f3f4f6] flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#716C70" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-[#2a2628]">{tpl.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Section Content Dialog */}
      <Dialog open={!!editSection} onOpenChange={() => setEditSection(null)}>
        <DialogContent className="sm:max-w-lg">
          {editSection && (
            <>
              <DialogHeader>
                <DialogTitle>
                  עריכת תוכן - {SECTION_TYPE_LABELS[editSection.section_type] || editSection.section_type}
                </DialogTitle>
                <DialogDescription>ערוך את תוכן הסקציה בפורמט JSON</DialogDescription>
              </DialogHeader>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                dir="ltr"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditSection(null)}>
                  ביטול
                </Button>
                <Button
                  onClick={saveEditSection}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
            <DialogDescription>
              האם אתה בטוח שברצונך למחוק סקציה זו? פעולה זו אינה ניתנת לביטול.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              ביטול
            </Button>
            <Button
              className="bg-red-500 text-white hover:bg-red-600"
              onClick={() => deleteConfirmId && deleteSection(deleteConfirmId)}
            >
              מחק
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
