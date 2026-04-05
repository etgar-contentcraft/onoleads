/**
 * Per-page settings — full page that mirrors the global settings page.
 * Values here override global defaults; empty fields fall back to global.
 */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Loader2, Save, ExternalLink, Tag, Search, X, ChevronUp, ChevronDown, Link2 } from "lucide-react";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";
import { ONO_TY_DEFAULTS } from "@/lib/types/thank-you";
import type { InterestArea } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlobalSettings {
  webhook_url: string;
  whatsapp_number: string;
  phone_number: string;
  logo_url: string;
  default_cta_text: string;
  google_analytics_id: string;
  facebook_pixel_id: string;
}

/** Per-page override settings — all values are strings (stored as JSONB) */
interface PageOverrides {
  webhook_url?: string;
  whatsapp_number?: string;
  phone_number?: string;
  logo_url?: string;
  default_cta_text?: string;
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  brand_color_primary?: string;
  brand_color_dark?: string;
  brand_color_gray?: string;

  social_proof_enabled?: string;
  social_proof_days?: string;
  /** "I don't know" option — display text shown to the visitor */
  interest_unknown_enabled?: string;
  interest_unknown_text?: string;
  /** The real interest area name_he that maps to when unknown is selected */
  interest_unknown_maps_to_name?: string;
}

const EMPTY_GLOBAL: GlobalSettings = {
  webhook_url: "", whatsapp_number: "", phone_number: "*2899",
  logo_url: "", default_cta_text: "השאירו פרטים ונחזור אליכם",
  google_analytics_id: "", facebook_pixel_id: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes a WhatsApp phone number to international format (digits only, no +).
 * Israeli mobile (05x) → 9725x, Israeli landline (0x) → 972x, US → 1xxx
 * @param raw - Raw input from the user
 * @returns Cleaned international number string
 */
function normalizeWhatsAppNumber(raw: string): string {
  // Strip everything except digits and leading +
  const stripped = raw.replace(/[^\d+]/g, "");
  let digits = stripped.replace(/^\+/, "");

  if (!digits) return "";

  // Israeli mobile: 05x → 9725x
  if (/^05\d{8}$/.test(digits)) return "972" + digits.slice(1);
  // Israeli landline: 0[2-9]x → 972x
  if (/^0[2-9]\d{7,8}$/.test(digits)) return "972" + digits.slice(1);
  // Already has country code 972
  if (digits.startsWith("972") && digits.length >= 11) return digits;
  // US: 1 + 10 digits
  if (digits.startsWith("1") && digits.length === 11) return digits;
  // Return as-is if we can't determine
  return digits;
}

/**
 * Custom WhatsApp number input with auto-formatting on blur.
 * Shows formatted number and a preview of the wa.me link.
 */
function WhatsAppNumberField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hasValue = value.trim() !== "";
  const preview = hasValue ? `https://wa.me/${value}` : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Label className="text-sm font-medium text-[#2a2628]">מספר WhatsApp</Label>
        {hasValue ? (
          <Badge className="text-[10px] bg-[#B8D900]/15 text-[#5a7000] border-0 px-1.5 py-0">ידני</Badge>
        ) : (
          <Badge className="text-[10px] bg-[#f3f4f6] text-[#9A969A] border-0 px-1.5 py-0">לא מוגדר — לא יוצג</Badge>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const normalized = normalizeWhatsAppNumber(e.target.value);
          if (normalized !== value) onChange(normalized);
        }}
        placeholder="הכניסו מספר (ישראלי או בינלאומי)"
        className="h-9"
        dir="ltr"
      />
      {hasValue && preview && (
        <p className="text-[11px] text-[#716C70] mt-1 font-mono">{preview}</p>
      )}
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-[11px] text-red-400 hover:text-red-600 mt-0.5"
        >
          נקה — לא יוצג כפתור ווצאפ
        </button>
      )}
    </div>
  );
}

/** Known webhook host patterns — if URL doesn't match, show a warning */
const WEBHOOK_HOST_PATTERNS = ["hook.make.com", "make.celonis.com", "hooks.zapier.com", "n8n.cloud", "n8n.io", "webhook.site", "pipedream.net"];

/**
 * Checks if a URL looks like a valid webhook endpoint.
 * Returns a warning message if suspicious, null if OK.
 * @param url - The URL string to validate
 * @returns Warning string or null
 */
function getWebhookWarning(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "Webhook URL חייב להתחיל ב-https://";
    const isKnownWebhook = WEBHOOK_HOST_PATTERNS.some((p) => parsed.hostname.includes(p));
    if (!isKnownWebhook) {
      return "כתובת זו לא נראית כמו webhook (Make.com / Zapier / n8n). ודאו שהכתובת נכונה.";
    }
  } catch {
    return "כתובת URL לא תקינה";
  }
  return null;
}

function OverrideField({
  label, hint, fieldKey, globalValue, dir = "ltr",
  overrides, onChange,
}: {
  label: string; hint?: string; fieldKey: keyof PageOverrides;
  globalValue?: string; dir?: "ltr" | "rtl";
  overrides: PageOverrides; onChange: (k: keyof PageOverrides, v: string) => void;
}) {
  const val = overrides[fieldKey] ?? "";
  const hasOverride = val.trim() !== "";
  /* Show webhook validation only for webhook_url field */
  const webhookWarning = fieldKey === "webhook_url" ? getWebhookWarning(val) : null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Label className="text-sm font-medium text-[#2a2628]">{label}</Label>
        {hasOverride ? (
          <Badge className="text-[10px] bg-[#B8D900]/15 text-[#5a7000] border-0 px-1.5 py-0">ידני</Badge>
        ) : (
          <Badge className="text-[10px] bg-[#f3f4f6] text-[#9A969A] border-0 px-1.5 py-0">מהגדרות ראשיות</Badge>
        )}
      </div>
      <Input
        value={val}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        placeholder={globalValue ? `ברירת מחדל: ${globalValue}` : "ריק = ייורש מהגדרות ראשיות"}
        className={`h-9 ${webhookWarning ? "border-amber-400 focus:border-amber-500 focus:ring-amber-400/20" : ""}`}
        dir={dir}
      />
      {webhookWarning && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1 flex items-center gap-1">
          ⚠️ {webhookWarning}
        </p>
      )}
      {hint && <p className="text-[11px] text-[#9A969A] mt-1">{hint}</p>}
      {hasOverride && (
        <button
          type="button"
          onClick={() => onChange(fieldKey, "")}
          className="text-[11px] text-red-400 hover:text-red-600 mt-0.5"
        >
          נקה (חזור לברירת מחדל)
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function PageSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;
  const supabase = createClient();

  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(EMPTY_GLOBAL);
  const [overrides, setOverrides] = useState<PageOverrides>({});
  const [tySettings, setTySettings] = useState<ThankYouPageSettings>({ ...ONO_TY_DEFAULTS });
  const [newSlug, setNewSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [interestAreas, setInterestAreas] = useState<InterestArea[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);
  const [areaSearch, setAreaSearch] = useState("");
  const [mapsToSearch, setMapsToSearch] = useState("");
  const [mapsToOpen, setMapsToOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const set = (k: keyof PageOverrides, v: string) =>
    setOverrides((prev) => ({ ...prev, [k]: v }));

  // Load global settings + page overrides
  const load = useCallback(async () => {
    setLoading(true);
    const [globalRes, pageRes, areasRes, assignedRes] = await Promise.all([
      supabase.from("settings").select("key, value"),
      supabase.from("pages").select("title_he, slug, custom_styles").eq("id", pageId).single(),
      supabase.from("interest_areas").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("page_interest_areas").select("interest_area_id").eq("page_id", pageId),
    ]);

    if (areasRes.data) setInterestAreas(areasRes.data as InterestArea[]);
    if (assignedRes.data) setSelectedAreaIds(assignedRes.data.map((r) => r.interest_area_id));

    if (globalRes.data) {
      const m: Record<string, string> = {};
      for (const r of globalRes.data) m[r.key] = r.value || "";
      setGlobalSettings({
        webhook_url: m.webhook_url || EMPTY_GLOBAL.webhook_url,
        whatsapp_number: m.whatsapp_number || EMPTY_GLOBAL.whatsapp_number,
        phone_number: m.phone_number || EMPTY_GLOBAL.phone_number,
        logo_url: m.logo_url || EMPTY_GLOBAL.logo_url,
        default_cta_text: m.default_cta_text || EMPTY_GLOBAL.default_cta_text,
        google_analytics_id: m.google_analytics_id || EMPTY_GLOBAL.google_analytics_id,
        facebook_pixel_id: m.facebook_pixel_id || EMPTY_GLOBAL.facebook_pixel_id,
      });
    }

    if (pageRes.data) {
      setPageTitle(pageRes.data.title_he || "");
      setPageSlug(pageRes.data.slug || "");
      setNewSlug(pageRes.data.slug || "");
      const cs = (pageRes.data.custom_styles || {}) as Record<string, unknown>;
      const ps = (cs.page_settings || {}) as PageOverrides;
      setOverrides(ps);

      // Load per-page TY settings if present
      const tyRaw = (cs.ty_settings || null) as Partial<ThankYouPageSettings> | null;
      if (tyRaw) setTySettings({ ...ONO_TY_DEFAULTS, ...tyRaw });
    }

    setLoading(false);
  }, [pageId, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    /* Validate slug if changed */
    const cleanSlug = newSlug.trim().toLowerCase();
    if (cleanSlug !== pageSlug) {
      if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
        setSlugError("ה-Slug יכול להכיל רק אותיות לטיניות, מספרים ומקפים");
        return;
      }
      if (cleanSlug.length < 2) {
        setSlugError("ה-Slug חייב להכיל לפחות 2 תווים");
        return;
      }
    }
    setSlugError("");
    setSaving(true);

    /* If slug changed: update pages table and save old slug as redirect */
    if (cleanSlug !== pageSlug) {
      const { error: slugError } = await supabase
        .from("pages")
        .update({ slug: cleanSlug })
        .eq("id", pageId);
      if (slugError) {
        setSaving(false);
        showToast("שגיאה: ה-Slug כבר קיים או לא תקין", false);
        return;
      }
      /* Create redirect from old slug so existing links keep working */
      await supabase
        .from("slug_redirects")
        .upsert({ old_slug: pageSlug, page_id: pageId }, { onConflict: "old_slug" });
      setPageSlug(cleanSlug);
    }

    /* Save page custom_styles */
    const { data: existing } = await supabase
      .from("pages")
      .select("custom_styles")
      .eq("id", pageId)
      .single();
    const currentCs = ((existing?.custom_styles) || {}) as Record<string, unknown>;
    const { error: pageError } = await supabase
      .from("pages")
      .update({
        custom_styles: {
          ...currentCs,
          page_settings: overrides,
          ty_settings: tySettings,
        },
      })
      .eq("id", pageId);

    /* Save interest area assignments (replace all) */
    await supabase.from("page_interest_areas").delete().eq("page_id", pageId);
    if (selectedAreaIds.length > 0) {
      await supabase.from("page_interest_areas").insert(
        selectedAreaIds.map((areaId, i) => ({
          page_id: pageId,
          interest_area_id: areaId,
          sort_order: i,
        }))
      );
    }

    setSaving(false);
    if (pageError) showToast("שגיאה בשמירה", false);
    else showToast("הגדרות נשמרו בהצלחה");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#B8D900]" />
      </div>
    );
  }

  const socialEnabled = overrides.social_proof_enabled === "true";

  return (
    <div className="space-y-6 max-w-5xl" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 text-[#9A969A] hover:text-[#2a2628]">
            <ArrowRight className="w-4 h-4" />
            חזרה
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[#2a2628]">הגדרות עמוד</h1>
            <p className="text-sm text-[#9A969A] mt-0.5">{pageTitle} · /{pageSlug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/lp/${pageSlug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <ExternalLink className="w-3.5 h-3.5" />
              צפה בעמוד
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            שמור הגדרות
          </Button>
        </div>
      </div>

      <p className="text-sm text-[#9A969A] bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
        שדות ריקים יירשו את ערכי ברירת המחדל מ<a href="/dashboard/settings" className="text-blue-600 font-medium hover:underline">ההגדרות הראשיות</a>.
        מלאו שדה רק אם רוצים לדרוס את הברירת מחדל לעמוד זה.
      </p>

      {/* Slug editor */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#B8D900]" />
            כתובת עמוד (Slug)
          </CardTitle>
          <CardDescription>
            הכתובת שמופיעה בURL של העמוד. שינוי יצור הפניה אוטומטית מהכתובת הישנה.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#9A969A] shrink-0 font-mono">/lp/</span>
            <Input
              value={newSlug}
              onChange={(e) => {
                setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                setSlugError("");
              }}
              placeholder="slug-shel-haadmud"
              className="h-9 font-mono text-sm flex-1"
              dir="ltr"
            />
            <a
              href={`/lp/${newSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
          {slugError && (
            <p className="text-xs text-red-500 mt-1.5">{slugError}</p>
          )}
          {newSlug !== pageSlug && !slugError && (
            <div className="mt-2 flex items-center justify-between gap-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
              <p className="text-xs text-amber-600">
                הכתובת הנוכחית <span className="font-mono">/lp/{pageSlug}</span> תמשיך לעבוד אחרי השמירה.
              </p>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 h-7 px-3 text-xs bg-[#B8D900] hover:bg-[#c8e920] text-[#2a2628] font-semibold"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "שמור Slug"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interest Areas — full width before grid */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#B8D900]" />
            חיבור לגלבוע
          </CardTitle>
          <CardDescription>
            בחרו תחום אחד או יותר. כשיש תחום אחד — הוא נשלח אוטומטית בוובהוק.
            כשיש יותר מאחד — מופיעה תיבת בחירה בטופס.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {interestAreas.length === 0 ? (
            <p className="text-sm text-gray-400">
              אין תחומי עניין פעילים.{" "}
              <a href="/dashboard/interest-areas" className="text-blue-600 hover:underline">
                צרו תחומים
              </a>
            </p>
          ) : (
            <>
              {/* Selected chips with reorder controls */}
              {selectedAreaIds.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {selectedAreaIds.map((id, index) => {
                    const area = interestAreas.find((a) => a.id === id);
                    if (!area) return null;
                    return (
                      <div
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-sm font-medium bg-[#B8D900]/20 border border-[#B8D900] text-[#5a7000] w-fit"
                      >
                        {/* Reorder buttons */}
                        <button
                          type="button"
                          onClick={() => setSelectedAreaIds((prev) => {
                            const arr = [...prev];
                            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                            return arr;
                          })}
                          disabled={index === 0}
                          className="p-0.5 rounded hover:bg-[#B8D900]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="הזז למעלה"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAreaIds((prev) => {
                            const arr = [...prev];
                            [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
                            return arr;
                          })}
                          disabled={index === selectedAreaIds.length - 1}
                          className="p-0.5 rounded hover:bg-[#B8D900]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label="הזז למטה"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <span className="mx-1">{area.name_he}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAreaIds((prev) => prev.filter((i) => i !== id))}
                          className="p-0.5 rounded hover:text-red-500 transition-colors"
                          aria-label={`הסר ${area.name_he}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  placeholder="חפש תחום עניין..."
                  dir="rtl"
                  className="w-full h-9 pr-9 pl-3 rounded-lg border border-gray-200 text-sm focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 transition-all"
                />
                {areaSearch && (
                  <button
                    type="button"
                    onClick={() => setAreaSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtered list */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {interestAreas
                  .filter((area) =>
                    !areaSearch ||
                    area.name_he.includes(areaSearch) ||
                    (area.name_en?.toLowerCase() || "").includes(areaSearch.toLowerCase())
                  )
                  .filter((area) => !selectedAreaIds.includes(area.id))
                  .map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        setSelectedAreaIds((prev) => [...prev, area.id]);
                        setAreaSearch("");
                      }}
                      className="px-3 py-1.5 rounded-full text-sm font-medium border bg-white border-gray-200 text-gray-600 hover:border-[#B8D900] hover:text-[#5a7000] hover:bg-[#B8D900]/10 transition-all"
                    >
                      + {area.name_he}
                    </button>
                  ))}
              </div>
            </>
          )}
          {selectedAreaIds.length > 1 && (
            <>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                נבחרו {selectedAreaIds.length} תחומים — הטופס יציג לגולש תפריט בחירה.
              </p>

              {/* "אני לא יודע" advanced option */}
              <div className="border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2a2628]">אפשרות &ldquo;אני לא יודע&rdquo;</p>
                    <p className="text-xs text-[#9A969A] mt-0.5">
                      מאפשרת לגולשים לבחור ללא ידיעה ברורה — ועדיין לשייכם לתחום קיים בוובהוק.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("interest_unknown_enabled", overrides.interest_unknown_enabled === "true" ? "false" : "true")}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${overrides.interest_unknown_enabled === "true" ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}
                    role="switch"
                    aria-checked={overrides.interest_unknown_enabled === "true"}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${overrides.interest_unknown_enabled === "true" ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                {overrides.interest_unknown_enabled === "true" && (
                  <div className="space-y-3 pt-1">
                    {/* Editable display text */}
                    <div>
                      <Label className="text-xs text-[#716C70]">טקסט שמוצג לגולש</Label>
                      <Input
                        value={overrides.interest_unknown_text || "אני לא יודע"}
                        onChange={(e) => set("interest_unknown_text", e.target.value)}
                        placeholder="אני לא יודע"
                        dir="rtl"
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    {/* Maps-to selector — searchable combobox */}
                    <div className="relative">
                      <Label className="text-xs text-[#716C70]">ישויך לתחום עניין</Label>
                      {/* Selected value display / search input */}
                      <div className="relative mt-1">
                        <input
                          type="text"
                          dir="rtl"
                          placeholder={overrides.interest_unknown_maps_to_name || "— חיפוש תחום —"}
                          value={mapsToSearch}
                          onFocus={() => setMapsToOpen(true)}
                          onChange={(e) => { setMapsToSearch(e.target.value); setMapsToOpen(true); }}
                          onBlur={() => setTimeout(() => setMapsToOpen(false), 150)}
                          className="w-full h-8 rounded-lg border border-gray-200 px-2 pr-7 text-sm text-[#2a2628] focus:border-[#B8D900] focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20 bg-white"
                        />
                        <Search className="absolute top-1.5 left-2 w-4 h-4 text-[#9A969A] pointer-events-none" />
                        {overrides.interest_unknown_maps_to_name && (
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); set("interest_unknown_maps_to_name", ""); setMapsToSearch(""); }}
                            className="absolute top-1.5 right-2 text-[#9A969A] hover:text-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {/* Current selection badge */}
                      {overrides.interest_unknown_maps_to_name && (
                        <p className="text-xs text-[#2a2628] font-medium mt-1">
                          נבחר: <span className="text-[#6b8d00]">{overrides.interest_unknown_maps_to_name}</span>
                        </p>
                      )}
                      {/* Dropdown list */}
                      {mapsToOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto" dir="rtl">
                          {interestAreas
                            .filter((a) => !mapsToSearch || a.name_he.includes(mapsToSearch))
                            .map((area) => (
                              <button
                                key={area.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  set("interest_unknown_maps_to_name", area.name_he);
                                  setMapsToSearch("");
                                  setMapsToOpen(false);
                                }}
                                className={`w-full text-right px-3 py-2 text-sm hover:bg-[#B8D900]/10 transition-colors ${
                                  overrides.interest_unknown_maps_to_name === area.name_he
                                    ? "bg-[#B8D900]/15 font-semibold text-[#2a2628]"
                                    : "text-[#2a2628]"
                                }`}
                              >
                                {area.name_he}
                              </button>
                            ))}
                          {interestAreas.filter((a) => !mapsToSearch || a.name_he.includes(mapsToSearch)).length === 0 && (
                            <p className="text-center text-xs text-[#9A969A] py-3">לא נמצאו תחומים</p>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-[#9A969A] mt-1">
                        בוובהוק יישלח שם התחום הנבחר כאן — לא הטקסט שמוצג לגולש.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Integrations */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628]">אינטגרציות</CardTitle>
            <CardDescription>Webhook, WhatsApp, טלפון — ידרסו את ברירת המחדל</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverrideField label="Webhook URL" fieldKey="webhook_url" globalValue={globalSettings.webhook_url} hint="כתובת לשליחת הליד של עמוד זה" overrides={overrides} onChange={set} />
            {/* WhatsApp number — custom field with auto-formatter */}
            <WhatsAppNumberField value={overrides.whatsapp_number || ""} onChange={(v) => set("whatsapp_number", v)} />
            <OverrideField label="מספר טלפון" fieldKey="phone_number" globalValue={globalSettings.phone_number} overrides={overrides} onChange={set} />
          </CardContent>
        </Card>

        {/* Logo & CTA */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628]">לוגו וטקסטים</CardTitle>
            <CardDescription>לוגו מותאם וטקסט כפתור ייעודי לעמוד זה</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverrideField label="לוגו מותאם (URL)" fieldKey="logo_url" globalValue={globalSettings.logo_url} overrides={overrides} onChange={set} />
            {overrides.logo_url && (
              <div className="p-3 bg-[#f3f4f6] rounded-xl flex items-center justify-center">
                <img src={overrides.logo_url} alt="Logo preview" className="max-h-10 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <OverrideField label="טקסט CTA" fieldKey="default_cta_text" globalValue={globalSettings.default_cta_text} dir="rtl" hint="טקסט על כפתורי ההרשמה בעמוד זה. תומך בטקסט דינמי: {{utm_source}}, {{utm_campaign}}, {{utm_source|Google}}" overrides={overrides} onChange={set} />
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628]">צבעוניות מותג</CardTitle>
            <CardDescription>דורסים את צבעי הברירת מחדל לעמוד זה בלבד. ריק = ממשיכים את הצבעים הגלובליים.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              { key: "brand_color_primary" as const, label: "צבע ראשי", placeholder: "#B8D900" },
              { key: "brand_color_dark" as const, label: "צבע כהה", placeholder: "#2a2628" },
              { key: "brand_color_gray" as const, label: "צבע אפור", placeholder: "#716C70" },
            ] as { key: keyof PageOverrides; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label className="text-sm font-medium text-[#2a2628]">{label}</Label>
                  {overrides[key] ? (
                    <Badge className="text-[10px] bg-[#B8D900]/15 text-[#5a7000] border-0 px-1.5 py-0">ידני</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-[#f3f4f6] text-[#9A969A] border-0 px-1.5 py-0">גלובלי</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg border-2 border-[#e5e7eb] cursor-pointer relative overflow-hidden shrink-0"
                    style={{ backgroundColor: overrides[key] || placeholder }}>
                    <input type="color" value={overrides[key] || placeholder}
                      onChange={(e) => set(key, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                  </div>
                  <Input value={overrides[key] ?? ""} onChange={(e) => set(key, e.target.value)}
                    placeholder={`ברירת מחדל: ${placeholder}`} className="h-9 font-mono text-sm" dir="ltr" />
                  {overrides[key] && (
                    <button type="button" onClick={() => set(key, "")} className="text-[11px] text-red-400 hover:text-red-600 whitespace-nowrap shrink-0">נקה</button>
                  )}
                </div>
              </div>
            ))}
            {/* Preview */}
            {(overrides.brand_color_primary || overrides.brand_color_dark || overrides.brand_color_gray) && (
              <div className="flex items-center gap-2 pt-1">
                <div className="h-7 flex-1 rounded-lg" style={{ backgroundColor: overrides.brand_color_primary || "#B8D900" }} />
                <div className="h-7 flex-1 rounded-lg" style={{ backgroundColor: overrides.brand_color_dark || "#2a2628" }} />
                <div className="h-7 flex-1 rounded-lg" style={{ backgroundColor: overrides.brand_color_gray || "#716C70" }} />
                <span className="text-xs text-[#9A969A]">תצוגה מקדימה</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tracking */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628]">מעקב ואנליטיקס</CardTitle>
            <CardDescription>GA ו-Pixel ייעודיים לעמוד זה</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverrideField label="Google Analytics ID" fieldKey="google_analytics_id" globalValue={globalSettings.google_analytics_id} hint="מזהה GA4 ייעודי לעמוד זה" overrides={overrides} onChange={set} />
            <OverrideField label="Facebook Pixel ID" fieldKey="facebook_pixel_id" globalValue={globalSettings.facebook_pixel_id} hint="Pixel ייעודי לקמפיין" overrides={overrides} onChange={set} />
          </CardContent>
        </Card>

        {/* Conversions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628]">המרות</CardTitle>
            <CardDescription>כלי המרה פעילים בעמוד זה</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Social proof */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-xs font-semibold text-[#2A2628] block">הוכחה חברתית</Label>
                <p className="text-[11px] text-[#9A969A] mt-0.5">Toast: &ldquo;X אנשים נרשמו השבוע&rdquo;</p>
                {socialEnabled && (
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-[11px] text-[#716C70] shrink-0">ימים אחורה:</Label>
                    <Input type="number" min={1} max={90} value={overrides.social_proof_days || "7"}
                      onChange={(e) => set("social_proof_days", e.target.value)}
                      className="h-7 w-16 text-xs" dir="ltr" />
                  </div>
                )}
              </div>
              <button type="button"
                onClick={() => set("social_proof_enabled", socialEnabled ? "false" : "true")}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-0.5 ${socialEnabled ? "bg-[#B8D900]" : "bg-[#E5E5E5]"}`}
                role="switch" aria-checked={socialEnabled}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${socialEnabled ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popups — link to campaigns management + create new */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base text-[#2a2628]">פופאפים</CardTitle>
              <CardDescription className="mt-1">
                ניהול פופאפים, exit intent, וסרגלי CTA לעמוד זה. ניתן ליצור פופאפים מתבניות מוכנות ולשייך אותם לעמודים.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/dashboard/campaigns?page_id=${pageId}&action=create`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B8D900] text-[#2A2628] text-sm font-semibold hover:bg-[#A8C400] transition-colors"
              >
                + צור פופאפ לעמוד זה
              </a>
              <a
                href="/dashboard/campaigns"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E5E5] text-[#4A4648] text-sm font-medium hover:border-[#B8D900] transition-colors"
              >
                ניהול פופאפים
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Thank You Page */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-[#2a2628]">עמוד תודה — לעמוד זה</CardTitle>
          <CardDescription>דורס את הגדרות עמוד התודה הגלובליות לעמוד זה בלבד. ריק = יירש גלובלי.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-[#2a2628]">כותרת ראשית</Label>
              <Input value={tySettings.heading_he || ""} onChange={(e) => setTySettings((p) => ({ ...p, heading_he: e.target.value }))}
                placeholder="תודה! קיבלנו את פרטיך" className="mt-1.5 h-9" dir="rtl" />
              <p className="text-[11px] text-[#9A969A] mt-1">השתמשו ב-[שם] להצגת שם הלקוח</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-[#2a2628]">כותרת משנה</Label>
              <Input value={tySettings.subheading_he || ""} onChange={(e) => setTySettings((p) => ({ ...p, subheading_he: e.target.value }))}
                placeholder="יועץ לימודים ייצור איתך קשר תוך 24 שעות" className="mt-1.5 h-9" dir="rtl" />
            </div>
          </div>

          <Separator />

          {/* Social */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-[#2a2628]">רשתות חברתיות</Label>
              <div className="flex items-center gap-2">
                <Switch checked={tySettings.show_social !== false}
                  onCheckedChange={(v) => setTySettings((p) => ({ ...p, show_social: v }))} />
                <span className="text-xs text-[#9A969A]">{tySettings.show_social !== false ? "מוצג" : "מוסתר"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(["facebook_url", "instagram_url", "youtube_url", "linkedin_url", "tiktok_url"] as const).map((k) => (
                <div key={k}>
                  <Label className="text-xs text-[#716C70]">{k.replace("_url", "").replace("_", " ")}</Label>
                  <Input value={tySettings[k] || ""} onChange={(e) => setTySettings((p) => ({ ...p, [k]: e.target.value }))}
                    placeholder="https://..." className="mt-1 h-8 text-xs" dir="ltr" />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold text-[#2a2628]">כפתור WhatsApp</Label>
              <div className="flex items-center gap-2">
                <Switch checked={tySettings.show_whatsapp !== false}
                  onCheckedChange={(v) => setTySettings((p) => ({ ...p, show_whatsapp: v }))} />
                <span className="text-xs text-[#9A969A]">{tySettings.show_whatsapp !== false ? "מוצג" : "מוסתר"}</span>
              </div>
            </div>
            <Input value={tySettings.whatsapp_cta_he || ""} onChange={(e) => setTySettings((p) => ({ ...p, whatsapp_cta_he: e.target.value }))}
              placeholder="רוצים לדבר עכשיו? כתבו לנו" className="h-9" dir="rtl" />
          </div>

          <Separator />

          {/* Preview */}
          <div className="p-3 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] flex items-center justify-between">
            <span className="text-xs text-[#9A969A]">תצוגה מקדימה של עמוד תודה</span>
            <a href={`/ty?name=ישראל&page_id=${pageId}`} target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium text-[#B8D900] hover:underline flex items-center gap-1">
              פתחו עמוד תודה
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          שמור הגדרות
        </Button>
      </div>
    </div>
  );
}
