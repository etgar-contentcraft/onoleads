"use client";

/**
 * Faculty Members dashboard page — full CRUD for the faculty_members table.
 * Allows admins to create, edit, and delete lecturer profiles used across landing pages.
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
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  Globe,
  Link as LinkIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacultyMember {
  id: string;
  name_he: string;
  name_en: string | null;
  title_he: string | null;
  title_en: string | null;
  image_url: string | null;
  phone: string | null;
  email: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Empty form state for creating a new member */
const EMPTY_FORM: Omit<FacultyMember, "id" | "created_at" | "updated_at"> = {
  name_he: "",
  name_en: "",
  title_he: "",
  title_en: "",
  image_url: "",
  phone: "",
  email: "",
  linkedin_url: "",
  facebook_url: "",
  instagram_url: "",
  website_url: "",
  sort_order: 0,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function FacultyPage() {
  const supabase = createClient();

  const [members, setMembers] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<FacultyMember | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FacultyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form fields mirror the FacultyMember shape (minus server-generated fields)
  const [form, setForm] = useState(EMPTY_FORM);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  /**
   * Fetches all faculty members ordered by sort_order then name.
   */
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("faculty_members")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name_he", { ascending: true });

    if (data) setMembers(data as FacultyMember[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------------------------------------------------------------------------
  // Dialog helpers
  // ---------------------------------------------------------------------------

  /** Opens the dialog in create mode (no pre-filled data). */
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setEditOpen(true);
  };

  /** Opens the dialog in edit mode, pre-filling all fields from the given member. */
  const openEdit = (member: FacultyMember) => {
    setEditTarget(member);
    setForm({
      name_he: member.name_he ?? "",
      name_en: member.name_en ?? "",
      title_he: member.title_he ?? "",
      title_en: member.title_en ?? "",
      image_url: member.image_url ?? "",
      phone: member.phone ?? "",
      email: member.email ?? "",
      linkedin_url: member.linkedin_url ?? "",
      facebook_url: member.facebook_url ?? "",
      instagram_url: member.instagram_url ?? "",
      website_url: member.website_url ?? "",
      sort_order: member.sort_order ?? 0,
    });
    setEditOpen(true);
  };

  /**
   * Helper to update a single form field by key.
   * @param key - Field name from the form state
   * @param value - New value to set
   */
  const setField = (key: keyof typeof EMPTY_FORM, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ---------------------------------------------------------------------------
  // Save / Delete handlers
  // ---------------------------------------------------------------------------

  /**
   * Saves the current form as either an insert (create) or update (edit).
   * Normalises empty strings to null before persisting.
   */
  const handleSave = async () => {
    if (!form.name_he.trim()) return;
    setSaving(true);

    // Convert empty strings to null for nullable columns
    const payload = {
      name_he: form.name_he.trim(),
      name_en: form.name_en?.trim() || null,
      title_he: form.title_he?.trim() || null,
      title_en: form.title_en?.trim() || null,
      image_url: form.image_url?.trim() || null,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      linkedin_url: form.linkedin_url?.trim() || null,
      facebook_url: form.facebook_url?.trim() || null,
      instagram_url: form.instagram_url?.trim() || null,
      website_url: form.website_url?.trim() || null,
      sort_order: Number(form.sort_order) || 0,
    };

    if (editTarget) {
      const { error } = await supabase
        .from("faculty_members")
        .update(payload)
        .eq("id", editTarget.id);
      if (!error) {
        setEditOpen(false);
        load();
      }
    } else {
      const { error } = await supabase
        .from("faculty_members")
        .insert(payload);
      if (!error) {
        setEditOpen(false);
        load();
      }
    }

    setSaving(false);
  };

  /**
   * Deletes the currently targeted faculty member after confirmation.
   */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("faculty_members").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8 max-w-6xl mx-auto" dir="rtl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/15 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[#8aac00]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#2A2628]">מאגר מרצים</h1>
            <p className="text-sm text-[#9A969A]">
              ניהול פרופילי מרצים — שם, תמונה, פרטי קשר ורשתות חברתיות
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
        >
          <Plus className="w-4 h-4" />
          מרצה חדש
        </Button>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-[#9A969A]" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-[#E5E5E5] rounded-2xl">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 text-[#C8C4C8]" />
          <p className="text-[#9A969A] font-medium mb-1">אין מרצים במאגר עדיין</p>
          <p className="text-sm text-[#C8C4C8] mb-4">
            הוסיפו מרצים כדי שיופיעו בסקציית הסגל בדפי הנחיתה
          </p>
          <Button
            onClick={openCreate}
            className="gap-2 bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
          >
            <Plus className="w-4 h-4" />
            הוסף מרצה ראשון
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FA] border-b border-[#F0F0F0]">
              <tr>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">
                  תמונה
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">
                  שם
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">
                  תפקיד / ביו
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">
                  פרטי קשר
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#9A969A]">
                  סדר
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F5]">
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-[#FAFAFA] transition-colors"
                >
                  {/* Thumbnail */}
                  <td className="px-5 py-3.5">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[#B8D900]/10 flex items-center justify-center shrink-0">
                      {member.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.image_url}
                          alt={member.name_he}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-bold text-[#9ab800]">
                          {member.name_he.charAt(0)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-[#2A2628]">{member.name_he}</p>
                    {member.name_en && (
                      <p className="text-xs text-[#9A969A] mt-0.5">{member.name_en}</p>
                    )}
                  </td>

                  {/* Title / bio */}
                  <td className="px-5 py-3.5 max-w-[220px]">
                    {member.title_he ? (
                      <p className="text-[#716C70] text-xs leading-relaxed line-clamp-2">
                        {member.title_he}
                      </p>
                    ) : (
                      <span className="text-[#C8C4C8] text-xs">—</span>
                    )}
                  </td>

                  {/* Contact badges */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {member.phone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F0F0F0] text-[#716C70] text-xs">
                          <Phone className="w-3 h-3" />
                          {member.phone}
                        </span>
                      )}
                      {member.email && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </span>
                      )}
                      {member.linkedin_url && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F0FE] text-[#0077B5] text-xs">
                          <LinkIcon className="w-3 h-3" />
                          LinkedIn
                        </span>
                      )}
                      {member.website_url && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs">
                          <Globe className="w-3 h-3" />
                          אתר
                        </span>
                      )}
                      {!member.phone && !member.email && !member.linkedin_url && !member.website_url && (
                        <span className="text-[#C8C4C8] text-xs">—</span>
                      )}
                    </div>
                  </td>

                  {/* Sort order */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#9A969A] tabular-nums">
                      {member.sort_order}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(member)}
                        className="h-8 w-8 p-0 text-[#9A969A] hover:text-[#2A2628]"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(member)}
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

      {/* ------------------------------------------------------------------ */}
      {/* Create / Edit Dialog                                                */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? `עריכת ${editTarget.name_he}` : "מרצה חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Image preview + URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">תמונה</Label>
              <div className="flex items-center gap-4">
                {/* Live preview thumbnail */}
                <div className="w-16 h-16 rounded-full overflow-hidden bg-[#B8D900]/10 flex items-center justify-center shrink-0 border border-[#E5E5E5]">
                  {form.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.image_url}
                      alt="תצוגה מקדימה"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-[#C8C4C8]" />
                  )}
                </div>
                <Input
                  value={form.image_url ?? ""}
                  onChange={(e) => setField("image_url", e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  dir="ltr"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-[#9A969A]">
                הדביקו כתובת URL של תמונה. תצוגה המקדימה מתעדכנת בזמן אמת.
              </p>
            </div>

            {/* Name fields row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  שם בעברית <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name_he}
                  onChange={(e) => setField("name_he", e.target.value)}
                  placeholder="פרופ׳ ישראל ישראלי"
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">שם באנגלית</Label>
                <Input
                  value={form.name_en ?? ""}
                  onChange={(e) => setField("name_en", e.target.value)}
                  placeholder="Prof. Israel Israeli"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Title / bio fields row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">תפקיד / ביו (עברית)</Label>
                <Input
                  value={form.title_he ?? ""}
                  onChange={(e) => setField("title_he", e.target.value)}
                  placeholder="ראש המחלקה למשפטים"
                  dir="rtl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">תפקיד / ביו (אנגלית)</Label>
                <Input
                  value={form.title_en ?? ""}
                  onChange={(e) => setField("title_en", e.target.value)}
                  placeholder="Head of Law Department"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Contact fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#9A969A]" />
                  טלפון
                </Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="050-1234567"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#9A969A]" />
                  דוא&quot;ל
                </Label>
                <Input
                  value={form.email ?? ""}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="name@ono.ac.il"
                  dir="ltr"
                  type="email"
                />
              </div>
            </div>

            {/* Social / web links */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-[#716C70]">
                קישורים חיצוניים
              </Label>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  {/* LinkedIn icon */}
                  <svg
                    className="w-4 h-4 text-[#0077B5] shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <Input
                    value={form.linkedin_url ?? ""}
                    onChange={(e) => setField("linkedin_url", e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {/* Facebook icon */}
                  <svg
                    className="w-4 h-4 text-[#1877F2] shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <Input
                    value={form.facebook_url ?? ""}
                    onChange={(e) => setField("facebook_url", e.target.value)}
                    placeholder="https://facebook.com/..."
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {/* Instagram icon */}
                  <svg
                    className="w-4 h-4 text-[#E1306C] shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  <Input
                    value={form.instagram_url ?? ""}
                    onChange={(e) => setField("instagram_url", e.target.value)}
                    placeholder="https://instagram.com/..."
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-[#9A969A] shrink-0" />
                  <Input
                    value={form.website_url ?? ""}
                    onChange={(e) => setField("website_url", e.target.value)}
                    placeholder="https://www.example.com"
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Sort order */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">סדר תצוגה</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setField("sort_order", parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="w-28"
                dir="ltr"
              />
              <p className="text-xs text-[#9A969A]">
                מספר קטן יותר = מופיע ראשון. ברירת מחדל: 0.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name_he.trim()}
              className="bg-[#B8D900] text-[#2A2628] hover:bg-[#A8C400]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Delete Confirmation Dialog                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              מחיקת מרצה
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#4A4648]">
            האם למחוק את <strong>{deleteTarget?.name_he}</strong>?
            <span className="block mt-2 text-amber-700 bg-amber-50 rounded-lg p-2 text-xs">
              פעולה זו בלתי הפיכה. הפרופיל יוסר לצמיתות מהמאגר.
            </span>
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
