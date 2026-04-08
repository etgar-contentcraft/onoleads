"use client";

/**
 * Thank-You Page Templates dashboard.
 *
 * Lists all rows from `thank_you_templates`. Admins can:
 *   - Pick which template is the global default (only one allowed)
 *   - Toggle is_active
 *   - Edit content for any of the 3 languages (he/en/ar)
 *   - Edit visual config (accent_color, bg_style)
 *   - Create new custom templates by cloning an existing layout
 *   - Delete custom (non-system) templates
 *
 * Per-page selection happens in the page builder's PageSettings dialog,
 * not here. This page is the global catalogue.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Eye, Pencil, Plus, Star, Trash2 } from "lucide-react";
import type { ThankYouTemplate, TyLayoutId } from "@/lib/types/thank-you-templates";

const LAYOUT_LABELS: Record<TyLayoutId, string> = {
  classic_dark: "קלאסי כהה",
  minimal_light: "מינימליסטי בהיר",
  celebration: "חגיגה",
  personal_advisor: "יועץ אישי",
  calendar_focus: "התמקדות ביומן",
  video_welcome: "ברכת וידאו",
  resource_library: "ספריית משאבים",
  social_proof: "הוכחה חברתית",
  urgency_cohort: "דחיפות מחזור",
  multi_channel: "רב-ערוצי",
  simple_thanks: "תודה בסיסי",
  open_day: "יום פתוח",
};

const LAYOUT_IDS: TyLayoutId[] = [
  "classic_dark",
  "minimal_light",
  "celebration",
  "personal_advisor",
  "calendar_focus",
  "video_welcome",
  "resource_library",
  "social_proof",
  "urgency_cohort",
  "multi_channel",
  "simple_thanks",
  "open_day",
];

export default function TyTemplatesDashboard() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<ThankYouTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("thank_you_templates")
      .select("*")
      .order("is_system", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setTemplates([]);
    } else {
      setTemplates((data || []) as ThankYouTemplate[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Set this template as the global default.
   * Uses a 2-step transaction: clear all defaults, then set new one.
   * (The DB unique-partial-index enforces "only one default at a time".)
   */
  async function setAsDefault(id: string) {
    setBusyId(id);
    // Step 1: clear current default
    await supabase.from("thank_you_templates").update({ is_default: false }).eq("is_default", true);
    // Step 2: set new default
    const { error } = await supabase.from("thank_you_templates").update({ is_default: true }).eq("id", id);
    if (error) alert("שגיאה: " + error.message);
    await loadTemplates();
    setBusyId(null);
  }

  async function toggleActive(id: string, currentActive: boolean) {
    setBusyId(id);
    const { error } = await supabase
      .from("thank_you_templates")
      .update({ is_active: !currentActive })
      .eq("id", id);
    if (error) alert("שגיאה: " + error.message);
    await loadTemplates();
    setBusyId(null);
  }

  async function deleteTemplate(id: string) {
    if (!confirm("למחוק את התבנית? פעולה זו לא ניתנת לביטול.")) return;
    setBusyId(id);
    const { error } = await supabase.from("thank_you_templates").delete().eq("id", id);
    if (error) alert("שגיאה: " + error.message);
    await loadTemplates();
    setBusyId(null);
  }

  /** Create a new custom template by cloning a base layout */
  async function createNewTemplate(baseLayoutId: TyLayoutId) {
    setCreating(true);
    // Clone content from an existing template that uses this layout (preferably system)
    const base = templates.find((t) => t.layout_id === baseLayoutId);
    const { data, error } = await supabase
      .from("thank_you_templates")
      .insert({
        template_key: `custom_${baseLayoutId}_${Date.now()}`,
        layout_id: baseLayoutId,
        name_he: `תבנית מותאמת — ${LAYOUT_LABELS[baseLayoutId]}`,
        name_en: `Custom — ${baseLayoutId}`,
        name_ar: `قالب مخصص — ${LAYOUT_LABELS[baseLayoutId]}`,
        description_he: "",
        description_en: "",
        description_ar: "",
        content: base?.content || {},
        config: base?.config || { accent_color: "#B8D900", bg_style: "dark" },
        is_system: false,
        is_active: true,
        is_default: false,
      })
      .select("id")
      .single();

    setCreating(false);
    if (error) {
      alert("שגיאה ביצירת תבנית: " + error.message);
      return;
    }
    if (data?.id) {
      // Navigate to edit page
      window.location.href = `/dashboard/ty-templates/${data.id}`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">תבניות עמוד תודה</h1>
          <p className="text-gray-600 mt-1">
            בחרו אילו תבניות יוצגו לאחר מילוי טופס. אפשר לערוך את התוכן בכל אחת משלוש השפות.
          </p>
        </div>
      </div>

      {/* Create new template — choose a layout */}
      <div className="mb-8 p-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-800">יצירת תבנית חדשה</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">בחרו ממשק (ניתן להעתיק מהקיים):</p>
        <div className="flex flex-wrap gap-2">
          {LAYOUT_IDS.map((id) => (
            <button
              key={id}
              disabled={creating}
              onClick={() => createNewTemplate(id)}
              className="text-xs px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-[#B8D900] hover:bg-[#B8D900]/5 transition-colors disabled:opacity-50"
            >
              {LAYOUT_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((tpl) => {
          const isBusy = busyId === tpl.id;
          return (
            <div
              key={tpl.id}
              className={`relative rounded-2xl border-2 bg-white p-5 transition-all ${
                tpl.is_default
                  ? "border-[#B8D900] shadow-[0_0_0_4px_rgba(184,217,0,0.1)]"
                  : "border-gray-200 hover:border-gray-300"
              } ${!tpl.is_active ? "opacity-50" : ""}`}
            >
              {tpl.is_default && (
                <div className="absolute -top-3 right-4 bg-[#B8D900] text-black text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md">
                  ברירת מחדל
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 leading-tight">{tpl.name_he}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {LAYOUT_LABELS[tpl.layout_id as TyLayoutId] || tpl.layout_id}
                    {tpl.is_system && " · מערכת"}
                  </p>
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                  style={{
                    background: tpl.config?.accent_color || "#B8D900",
                  }}
                  title={tpl.config?.accent_color}
                />
              </div>

              {tpl.description_he && (
                <p className="text-xs text-gray-600 leading-relaxed mb-4 line-clamp-2">{tpl.description_he}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                <Link
                  href={`/dashboard/ty-templates/${tpl.id}`}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <Pencil className="w-3.5 h-3.5" /> ערוך
                </Link>
                <a
                  href={`/ty?slug=preview&template=${tpl.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <Eye className="w-3.5 h-3.5" /> תצוגה
                </a>
                {!tpl.is_default && (
                  <button
                    disabled={isBusy}
                    onClick={() => setAsDefault(tpl.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-[#B8D900]/10 hover:bg-[#B8D900]/20 text-[#5a6900] disabled:opacity-50"
                  >
                    <Star className="w-3.5 h-3.5" /> הפוך לברירת מחדל
                  </button>
                )}
                <button
                  disabled={isBusy}
                  onClick={() => toggleActive(tpl.id, tpl.is_active)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {tpl.is_active ? "השבת" : "הפעל"}
                </button>
                {!tpl.is_system && (
                  <button
                    disabled={isBusy}
                    onClick={() => deleteTemplate(tpl.id)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> מחק
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          לא נמצאו תבניות. הריצו את <code>npx tsx scripts/seed-ty-templates.ts</code> כדי לאתחל את המערכת.
        </div>
      )}
    </div>
  );
}
