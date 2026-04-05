"use client";

/**
 * Interest Areas dashboard page — full CRUD for the interest_areas table.
 * Each interest area can be assigned to one or more landing pages.
 * When a page has a single area it is passed silently; when multiple, a dropdown appears.
 */

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
import { Tag, Plus, Pencil, Trash2, Loader2, AlertTriangle, GripVertical } from "lucide-react";
import type { InterestArea, InterestAreaInsert } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_FORM: InterestAreaInsert = {
  name_he: "",
  name_en: "",
  name_ar: "",
  slug: "",
  sort_order: 0,
  is_active: true,
};

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function InterestAreasPage() {
  const supabase = createClient();

  const [areas, setAreas] = useState<InterestArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<InterestArea | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InterestArea | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState<InterestAreaInsert>(EMPTY_FORM);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("interest_areas")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name_he", { ascending: true });

    if (error) {
      showToast("error", "שגיאה בטעינת תחומי עניין");
    } else {
      setAreas(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Toast ────────────────────────────────────────────────────────────────────

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY_FORM, sort_order: areas.length });
    setSlugManuallyEdited(false);
    setIsCreateOpen(true);
  }

  function openEdit(area: InterestArea) {
    setForm({
      name_he: area.name_he,
      name_en: area.name_en || "",
      name_ar: area.name_ar || "",
      slug: area.slug,
      sort_order: area.sort_order,
      is_active: area.is_active,
    });
    setSlugManuallyEdited(true);
    setEditTarget(area);
  }

  function handleNameHeChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, name_he: value };
      if (!slugManuallyEdited) {
        next.slug = toSlug(value);
      }
      return next;
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name_he.trim()) {
      showToast("error", "שם בעברית הוא שדה חובה");
      return;
    }
    if (!form.slug.trim()) {
      showToast("error", "Slug הוא שדה חובה");
      return;
    }

    setSaving(true);
    const payload = {
      name_he: form.name_he.trim(),
      name_en: form.name_en?.trim() || null,
      name_ar: form.name_ar?.trim() || null,
      slug: form.slug.trim(),
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    if (editTarget) {
      const { error } = await supabase
        .from("interest_areas")
        .update(payload)
        .eq("id", editTarget.id);

      if (error) {
        showToast("error", error.message.includes("unique") ? "Slug כבר קיים" : "שגיאה בשמירה");
      } else {
        showToast("success", "תחום עניין עודכן");
        setEditTarget(null);
        load();
      }
    } else {
      const { error } = await supabase.from("interest_areas").insert(payload);
      if (error) {
        showToast("error", error.message.includes("unique") ? "Slug כבר קיים" : "שגיאה ביצירה");
      } else {
        showToast("success", "תחום עניין נוצר");
        setIsCreateOpen(false);
        load();
      }
    }
    setSaving(false);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase
      .from("interest_areas")
      .delete()
      .eq("id", deleteTarget.id);

    if (error) {
      showToast("error", "שגיאה במחיקה");
    } else {
      showToast("success", "תחום עניין נמחק");
      setDeleteTarget(null);
      load();
    }
    setDeleting(false);
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(area: InterestArea) {
    const { error } = await supabase
      .from("interest_areas")
      .update({ is_active: !area.is_active })
      .eq("id", area.id);

    if (!error) {
      setAreas((prev) =>
        prev.map((a) => (a.id === area.id ? { ...a, is_active: !a.is_active } : a))
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto" dir="rtl">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
            <Tag className="w-5 h-5 text-[#B8D900]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">תחומי עניין</h1>
            <p className="text-sm text-gray-500">{areas.length} תחומים</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-[#B8D900] hover:bg-[#a5c400] text-[#2a2628]">
          <Plus className="w-4 h-4" />
          הוסף תחום עניין
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : areas.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>אין תחומי עניין עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {areas.map((area) => (
            <div
              key={area.id}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-gray-300 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{area.name_he}</span>
                  {area.name_en && (
                    <span className="text-sm text-gray-400">/ {area.name_en}</span>
                  )}
                  {!area.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      לא פעיל
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 font-mono">{area.slug}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Active toggle */}
                <button
                  onClick={() => toggleActive(area)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    area.is_active ? "bg-[#B8D900]" : "bg-gray-200"
                  }`}
                  title={area.is_active ? "פעיל — לחץ להשבית" : "לא פעיל — לחץ להפעיל"}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      area.is_active ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  onClick={() => openEdit(area)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                  title="ערוך"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(area)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500"
                  title="מחק"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditTarget(null);
          }
        }}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editTarget ? "עריכת תחום עניין" : "תחום עניין חדש"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>שם בעברית *</Label>
              <Input
                value={form.name_he}
                onChange={(e) => handleNameHeChange(e.target.value)}
                placeholder="לדוגמה: משפטים"
                className="mt-1"
                dir="rtl"
              />
            </div>

            <div>
              <Label>שם באנגלית</Label>
              <Input
                value={form.name_en || ""}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                placeholder="e.g. Law"
                className="mt-1"
                dir="ltr"
              />
            </div>

            <div>
              <Label>Slug (מזהה URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setForm({ ...form, slug: toSlug(e.target.value) });
                }}
                placeholder="law"
                className="mt-1 font-mono text-sm"
                dir="ltr"
              />
              <p className="text-xs text-gray-400 mt-1">נוצר אוטומטית משם בעברית</p>
            </div>

            <div>
              <Label>סדר תצוגה</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                className="mt-1 w-24"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">פעיל</Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditTarget(null);
              }}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#B8D900] hover:bg-[#a5c400] text-[#2a2628]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              מחיקת תחום עניין
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            האם למחוק את <strong>{deleteTarget?.name_he}</strong>?
            <br />
            עמודים המשויכים לתחום זה יאבדו את השיוך אך לא יימחקו.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              ביטול
            </Button>
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
