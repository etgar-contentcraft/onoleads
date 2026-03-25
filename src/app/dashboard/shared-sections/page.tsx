/**
 * Shared Sections dashboard — create and manage reusable section blocks
 * that can be added to any landing page. Edits here update all pages instantly.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { Globe, Plus, Pencil, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface SharedSection {
  id: string;
  name_he: string;
  section_type: string;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /** How many pages currently use this section */
  usage_count?: number;
}

/** Human-readable section type names */
const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: "Hero — כותרת ראשית",
  about: "אודות",
  benefits: "יתרונות",
  stats: "סטטיסטיקות",
  testimonials: "המלצות",
  faq: "שאלות נפוצות",
  cta: "קריאה לפעולה",
  curriculum: "תוכנית לימודים",
  career: "קריירה",
  faculty: "סגל",
  video: "וידאו",
  gallery: "גלריה",
  countdown: "ספירה לאחור",
  map: "מפה",
};

const SECTION_TYPES = Object.keys(SECTION_TYPE_LABELS);

export default function SharedSectionsPage() {
  const supabase = createClient();
  const [sections, setSections] = useState<SharedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<SharedSection | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SharedSection | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("cta");
  const [formContentJson, setFormContentJson] = useState("{}");
  const [jsonError, setJsonError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shared_sections")
      .select("*")
      .order("updated_at", { ascending: false });

    if (data) {
      // Count usage per section
      const { data: usageData } = await supabase
        .from("page_sections")
        .select("shared_section_id")
        .not("shared_section_id", "is", null);

      const usageMap: Record<string, number> = {};
      for (const row of usageData || []) {
        if (row.shared_section_id) {
          usageMap[row.shared_section_id] = (usageMap[row.shared_section_id] || 0) + 1;
        }
      }

      setSections(
        (data as SharedSection[]).map((s) => ({
          ...s,
          usage_count: usageMap[s.id] || 0,
        }))
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setFormName("");
    setFormType("cta");
    setFormContentJson("{}");
    setJsonError("");
    setEditOpen(true);
  };

  const openEdit = (section: SharedSection) => {
    setEditTarget(section);
    setFormName(section.name_he);
    setFormType(section.section_type);
    setFormContentJson(JSON.stringify(section.content, null, 2));
    setJsonError("");
    setEditOpen(true);
  };

  const handleSave = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(formContentJson);
    } catch {
      setJsonError("JSON לא תקין");
      return;
    }
    setJsonError("");
    setSaving(true);

    if (editTarget) {
      const { error } = await supabase
        .from("shared_sections")
        .update({ name_he: formName, section_type: formType, content: parsed })
        .eq("id", editTarget.id);
      if (!error) { setEditOpen(false); load(); }
    } else {
      const { error } = await supabase
        .from("shared_sections")
        .insert({ name_he: formName, section_type: formType, content: parsed });
      if (!error) { setEditOpen(false); load(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("shared_sections").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
            <Globe className="w-5 h-5 text-[#8aac00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2A2628]">סקציות גלובליות</h1>
            <p className="text-sm text-[#9A969A]">בלוקים משותפים לכמה עמודים — שינוי אחד מתעדכן בכולם</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]">
          <Plus className="w-4 h-4" />
          סקציה גלובלית חדשה
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[#9A969A]" />
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E5E5] rounded-2xl">
          <Globe className="w-12 h-12 mx-auto mb-3 text-[#C8C4C8]" />
          <p className="text-[#9A969A] font-medium mb-1">אין סקציות גלובליות עדיין</p>
          <p className="text-sm text-[#C8C4C8]">צרו סקציה גלובלית ותוכלו לשתף אותה בין עמודים</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] border-b border-[#F0F0F0]">
              <tr>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">שם</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">סוג סקציה</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">שימוש בעמודים</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">עדכון אחרון</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {sections.map((section) => (
                <tr key={section.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#B8D900]/10 flex items-center justify-center shrink-0">
                        <Globe className="w-3 h-3 text-[#8aac00]" />
                      </div>
                      <span className="font-medium text-[#2A2628]">{section.name_he}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-[#716C70] text-xs font-medium">
                      {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-semibold ${(section.usage_count || 0) > 0 ? "text-[#2A2628]" : "text-[#C8C4C8]"}`}>
                      {section.usage_count || 0} עמודים
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#9A969A] text-xs">
                    {new Date(section.updated_at).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(section)}
                        className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#2A2628]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(section)}
                        className="h-8 w-8 p-0 text-[#9A969A] hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editTarget ? "עריכת סקציה גלובלית" : "סקציה גלובלית חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">שם (לזיהוי פנימי)</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="למשל: Footer CTA — אונו"
                dir="rtl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">סוג סקציה</Label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                dir="rtl"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t} value={t}>{SECTION_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">תוכן (JSON)</Label>
              <textarea
                value={formContentJson}
                onChange={(e) => { setFormContentJson(e.target.value); setJsonError(""); }}
                className="w-full h-48 font-mono text-xs p-3 rounded-lg border border-input bg-[#FAFAFA] resize-y focus:outline-none focus:ring-1 focus:ring-[#B8D900]"
                dir="ltr"
                spellCheck={false}
              />
              {jsonError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {jsonError}
                </p>
              )}
              <p className="text-xs text-[#9A969A]">
                השתמשו בכותרות כגון heading_he, description_he וכו׳ בהתאם לסוג הסקציה
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>ביטול</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              מחיקת סקציה גלובלית
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#4A4648]">
            האם למחוק את <strong>{deleteTarget?.name_he}</strong>?
            {(deleteTarget?.usage_count || 0) > 0 && (
              <span className="block mt-2 text-amber-700 bg-amber-50 rounded-lg p-2 text-xs">
                אזהרה: {deleteTarget?.usage_count} עמודים משתמשים בסקציה זו ויתנתקו ממנה (הם יישמרו עם התוכן הנוכחי).
              </span>
            )}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ביטול</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "מחק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
