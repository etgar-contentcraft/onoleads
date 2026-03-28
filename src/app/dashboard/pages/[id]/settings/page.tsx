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
import { ArrowRight, Loader2, Save, ExternalLink } from "lucide-react";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";
import { ONO_TY_DEFAULTS } from "@/lib/types/thank-you";

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
}

const EMPTY_GLOBAL: GlobalSettings = {
  webhook_url: "", whatsapp_number: "", phone_number: "*2899",
  logo_url: "", default_cta_text: "השאירו פרטים ונחזור אליכם",
  google_analytics_id: "", facebook_pixel_id: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
        className="h-9"
        dir={dir}
      />
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
    const [globalRes, pageRes] = await Promise.all([
      supabase.from("settings").select("key, value"),
      supabase.from("pages").select("title_he, slug, custom_styles").eq("id", pageId).single(),
    ]);

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
    setSaving(true);
    // Load current custom_styles to preserve other keys (e.g. page_settings)
    const { data: existing } = await supabase
      .from("pages")
      .select("custom_styles")
      .eq("id", pageId)
      .single();
    const currentCs = ((existing?.custom_styles) || {}) as Record<string, unknown>;
    const { error } = await supabase
      .from("pages")
      .update({
        custom_styles: {
          ...currentCs,
          page_settings: overrides,
          ty_settings: tySettings,
        },
      })
      .eq("id", pageId);
    setSaving(false);
    if (error) showToast("שגיאה בשמירה", false);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Integrations */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628]">אינטגרציות</CardTitle>
            <CardDescription>Webhook, WhatsApp, טלפון — ידרסו את ברירת המחדל</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <OverrideField label="Webhook URL" fieldKey="webhook_url" globalValue={globalSettings.webhook_url} hint="כתובת לשליחת הליד של עמוד זה" overrides={overrides} onChange={set} />
            <OverrideField label="מספר WhatsApp" fieldKey="whatsapp_number" globalValue={globalSettings.whatsapp_number} hint="פורמט בינלאומי ללא מקף" overrides={overrides} onChange={set} />
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

      {/* Popups — link to campaigns management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base text-[#2a2628]">פופאפים</CardTitle>
              <CardDescription className="mt-1">
                ניהול פופאפים, exit intent, וסרגלי CTA לעמוד זה. ניתן ליצור פופאפים מתבניות מוכנות ולשייך אותם לעמודים.
              </CardDescription>
            </div>
            <a
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#B8D900] text-[#2A2628] text-sm font-semibold hover:bg-[#A8C400] transition-colors shrink-0"
            >
              ניהול פופאפים
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
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
