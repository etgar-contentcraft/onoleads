/**
 * Settings page - Configure webhook URLs, branding, tracking, and CTA text.
 * All settings are saved to the Supabase "settings" table.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { ThankYouPageSettings } from "@/lib/types/thank-you";
import { ONO_TY_DEFAULTS } from "@/lib/types/thank-you";

/** Shape of the settings stored in the database */
interface AppSettings {
  webhook_url: string;
  whatsapp_number: string;
  phone_number: string;
  brand_color_primary: string;
  brand_color_dark: string;
  brand_color_gray: string;
  logo_url: string;
  default_cta_text: string;
  google_analytics_id: string;
  facebook_pixel_id: string;
  font_body: string;
}

/** Default settings values */
const DEFAULT_SETTINGS: AppSettings = {
  webhook_url: "",
  whatsapp_number: "",
  phone_number: "*2899",
  brand_color_primary: "#B8D900",
  brand_color_dark: "#2a2628",
  brand_color_gray: "#716C70",
  logo_url: "",
  default_cta_text: "השאירו פרטים ונחזור אליכם",
  google_analytics_id: "",
  facebook_pixel_id: "",
  font_body: "rubik",
};

/** Available font options for the picker */
const FONT_OPTIONS = [
  {
    key: "rubik",
    name: "Rubik",
    nameHe: "רוביק",
    cssVar: "var(--font-heading)",
    desc: "מודרני, עגלגל, עברית / ערבית / לטינית",
  },
  {
    key: "heebo",
    name: "Heebo",
    nameHe: "היבו",
    cssVar: "var(--font-heebo)",
    desc: "נקי ומאוזן, נפוץ בעברית",
  },
  {
    key: "assistant",
    name: "Assistant",
    nameHe: "אסיסטנט",
    cssVar: "var(--font-assistant)",
    desc: "עגול ונעים, מצוין לגוף טקסט",
  },
  {
    key: "noto-sans-hebrew",
    name: "Noto Sans Hebrew",
    nameHe: "נוטו",
    cssVar: "var(--font-noto-sans-hebrew)",
    desc: "כיסוי Unicode מלא, ניטרלי",
  },
  {
    key: "frank-ruhl",
    name: "Frank Ruhl Libre",
    nameHe: "פרנק רול",
    cssVar: "var(--font-frank-ruhl)",
    desc: "סריף קלאסי, מראה אקדמי",
  },
] as const;

/** Toast notification state */
interface Toast {
  message: string;
  type: "success" | "error";
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tySettings, setTySettings] = useState<ThankYouPageSettings>({ ...ONO_TY_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const supabase = createClient();

  /** Shows a temporary toast notification */
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /** Fetches settings from the database */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .order("key");

    if (!error && data) {
      const settingsMap: Record<string, string> = {};
      for (const row of data) {
        settingsMap[row.key] = row.value || "";
      }

      setSettings({
        webhook_url: settingsMap.webhook_url || DEFAULT_SETTINGS.webhook_url,
        whatsapp_number: settingsMap.whatsapp_number || DEFAULT_SETTINGS.whatsapp_number,
        phone_number: settingsMap.phone_number || DEFAULT_SETTINGS.phone_number,
        brand_color_primary: settingsMap.brand_color_primary || DEFAULT_SETTINGS.brand_color_primary,
        brand_color_dark: settingsMap.brand_color_dark || DEFAULT_SETTINGS.brand_color_dark,
        brand_color_gray: settingsMap.brand_color_gray || DEFAULT_SETTINGS.brand_color_gray,
        logo_url: settingsMap.logo_url || DEFAULT_SETTINGS.logo_url,
        default_cta_text: settingsMap.default_cta_text || DEFAULT_SETTINGS.default_cta_text,
        google_analytics_id: settingsMap.google_analytics_id || DEFAULT_SETTINGS.google_analytics_id,
        facebook_pixel_id: settingsMap.facebook_pixel_id || DEFAULT_SETTINGS.facebook_pixel_id,
        font_body: settingsMap.font_body || DEFAULT_SETTINGS.font_body,
      });

      // Parse thank you page settings from JSON key
      if (settingsMap.thank_you_page_settings) {
        try {
          const parsed = JSON.parse(settingsMap.thank_you_page_settings);
          setTySettings({ ...ONO_TY_DEFAULTS, ...parsed });
        } catch { /* keep defaults */ }
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /** Saves all settings to the database using upsert */
  const handleSave = useCallback(async () => {
    setSaving(true);

    const rows = [
      ...Object.entries(settings).map(([key, value]) => ({ key, value: value || "" })),
      // Serialize TY settings as a single JSON blob
      { key: "thank_you_page_settings", value: JSON.stringify(tySettings) },
    ];

    /* Upsert each setting key-value pair */
    for (const row of rows) {
      const { error } = await supabase
        .from("settings")
        .upsert(row, { onConflict: "key" });

      if (error) {
        showToast(`שגיאה בשמירת ${row.key}`, "error");
        setSaving(false);
        return;
      }
    }

    showToast("ההגדרות נשמרו בהצלחה");
    setSaving(false);
  }, [settings, tySettings, showToast]);

  /** Updates a single setting value in local state */
  const updateSetting = useCallback((key: keyof AppSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">הגדרות</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">הגדרות המערכת</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
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
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">הגדרות</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">הגדרות המערכת והמותג</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] shadow-md shadow-[#B8D900]/20"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2a2628] border-t-transparent" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          )}
          שמור הגדרות
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook & Integration */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              אינטגרציות
            </CardTitle>
            <CardDescription>Webhook, WhatsApp ומספר טלפון</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#2a2628]">כתובת Webhook</Label>
              <Input
                value={settings.webhook_url}
                onChange={(e) => updateSetting("webhook_url", e.target.value)}
                placeholder="https://hook.eu1.make.celonis.com/..."
                className={`mt-1.5 h-9 ${settings.webhook_url.trim() && (() => {
                  try {
                    const h = new URL(settings.webhook_url).hostname;
                    return !["make.com","make.celonis.com","zapier.com","n8n.cloud","n8n.io","webhook.site","pipedream.net"].some((p) => h.includes(p));
                  } catch { return true; }
                })() ? "border-amber-400" : ""}`}
                dir="ltr"
              />
              {settings.webhook_url.trim() && (() => {
                const url = settings.webhook_url.trim();
                try {
                  const parsed = new URL(url);
                  if (parsed.protocol !== "https:") return <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1">⚠️ Webhook URL חייב להתחיל ב-https://</p>;
                  const knownHosts = ["make.com","make.celonis.com","zapier.com","n8n.cloud","n8n.io","webhook.site","pipedream.net"];
                  if (!knownHosts.some((p) => parsed.hostname.includes(p))) {
                    return <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1">⚠️ כתובת זו לא נראית כמו webhook (Make.com / Zapier / n8n). ודאו שהכתובת נכונה.</p>;
                  }
                } catch {
                  return <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-1">⚠️ כתובת URL לא תקינה</p>;
                }
                return null;
              })()}
              <p className="text-[11px] text-[#9A969A] mt-1">כתובת URL לשליחת לידים חדשים</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#2a2628]">מספר WhatsApp</Label>
              <Input
                value={settings.whatsapp_number}
                onChange={(e) => updateSetting("whatsapp_number", e.target.value)}
                placeholder="972501234567"
                className="mt-1.5 h-9"
                dir="ltr"
              />
              <p className="text-[11px] text-[#9A969A] mt-1">מספר בפורמט בינלאומי ללא מקף</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#2a2628]">מספר טלפון</Label>
              <Input
                value={settings.phone_number}
                onChange={(e) => updateSetting("phone_number", e.target.value)}
                placeholder="*2899"
                className="mt-1.5 h-9"
                dir="ltr"
              />
              <p className="text-[11px] text-[#9A969A] mt-1">מספר הטלפון שיוצג בדפי הנחיתה</p>
            </div>
          </CardContent>
        </Card>

        {/* Brand Colors */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="10.5" r="2.5" />
                <circle cx="8.5" cy="7.5" r="2.5" />
                <circle cx="6.5" cy="12.5" r="2.5" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
              צבעי מותג
            </CardTitle>
            <CardDescription>התאם את הצבעים של המותג</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "brand_color_primary" as const, label: "צבע ראשי (ירוק)", default: "#B8D900" },
              { key: "brand_color_dark" as const, label: "צבע כהה", default: "#2a2628" },
              { key: "brand_color_gray" as const, label: "צבע אפור", default: "#716C70" },
            ].map((color) => (
              <div key={color.key} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl border-2 border-[#e5e7eb] cursor-pointer relative overflow-hidden shrink-0"
                  style={{ backgroundColor: settings[color.key] }}
                >
                  <input
                    type="color"
                    value={settings[color.key]}
                    onChange={(e) => updateSetting(color.key, e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium text-[#2a2628]">{color.label}</Label>
                  <Input
                    value={settings[color.key]}
                    onChange={(e) => updateSetting(color.key, e.target.value)}
                    className="mt-1 h-8 text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            ))}

            {/* Color preview */}
            <div className="mt-4 p-4 rounded-xl border border-[#e5e7eb]">
              <p className="text-xs text-[#9A969A] mb-2">תצוגה מקדימה</p>
              <div className="flex items-center gap-2">
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: settings.brand_color_primary }} />
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: settings.brand_color_dark }} />
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: settings.brand_color_gray }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo & CTA */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              לוגו וטקסטים
            </CardTitle>
            <CardDescription>לוגו וטקסט ברירת מחדל לכפתורי CTA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#2a2628]">כתובת URL ללוגו</Label>
              <Input
                value={settings.logo_url}
                onChange={(e) => updateSetting("logo_url", e.target.value)}
                placeholder="https://..."
                className="mt-1.5 h-9"
                dir="ltr"
              />
              {settings.logo_url && (
                <div className="mt-2 p-3 bg-[#f3f4f6] rounded-xl flex items-center justify-center">
                  <img
                    src={settings.logo_url}
                    alt="Logo preview"
                    className="max-h-12 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-[#2a2628]">טקסט CTA ברירת מחדל</Label>
              <Input
                value={settings.default_cta_text}
                onChange={(e) => updateSetting("default_cta_text", e.target.value)}
                placeholder="השאירו פרטים ונחזור אליכם"
                className="mt-1.5 h-9"
              />
            </div>

            <p className="text-[11px] text-[#9A969A]">עמוד התודה המלא מוגדר בסעיף "עמוד תודה" למטה</p>
          </CardContent>
        </Card>

        {/* Fonts */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              פונטים
            </CardTitle>
            <CardDescription>
              בחר פונט ברירת מחדל לכל דפי הנחיתה. ניתן לדרוס פר-עמוד דרך הגדרות עמוד.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {FONT_OPTIONS.map((font) => {
                const selected = settings.font_body === font.key;
                return (
                  <button
                    key={font.key}
                    type="button"
                    onClick={() => updateSetting("font_body", font.key)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${
                      selected
                        ? "border-[#B8D900] bg-[#f7fce0] shadow-md"
                        : "border-[#e5e7eb] bg-white hover:border-[#c8e920] hover:bg-[#fafff0]"
                    }`}
                    style={{ fontFamily: font.cssVar }}
                  >
                    {selected && (
                      <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-[#B8D900] flex items-center justify-center">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                    <span className="text-xl font-bold text-[#2a2628] leading-tight" dir="rtl">
                      שלום עולם
                    </span>
                    <span className="text-sm text-[#716C70] leading-tight">Hello World</span>
                    <div className="mt-1">
                      <span className="text-[11px] font-semibold text-[#2a2628] block">{font.nameHe}</span>
                      <span className="text-[10px] text-[#9A969A]">{font.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tracking */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10" />
                <path d="M12 20V4" />
                <path d="M6 20v-6" />
              </svg>
              מעקב ואנליטיקס
            </CardTitle>
            <CardDescription>Google Analytics ו-Facebook Pixel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#2a2628]">Google Analytics ID</Label>
              <Input
                value={settings.google_analytics_id}
                onChange={(e) => updateSetting("google_analytics_id", e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="mt-1.5 h-9"
                dir="ltr"
              />
              <p className="text-[11px] text-[#9A969A] mt-1">מזהה Google Analytics 4</p>
            </div>

            <div>
              <Label className="text-sm font-medium text-[#2a2628]">Facebook Pixel ID</Label>
              <Input
                value={settings.facebook_pixel_id}
                onChange={(e) => updateSetting("facebook_pixel_id", e.target.value)}
                placeholder="123456789012345"
                className="mt-1.5 h-9"
                dir="ltr"
              />
              <p className="text-[11px] text-[#9A969A] mt-1">מזהה Facebook Pixel למעקב המרות</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thank You Page Settings — full width card */}
      <Card className="border-0 shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base text-[#2a2628] flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            עמוד תודה — ברירת מחדל
          </CardTitle>
          <CardDescription>
            מוצג לאחר שליחת טופס ליד. ניתן לדרוס עמוד לעמוד דרך "הגדרות עמוד" בבונה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-[#2a2628]">כותרת ראשית</Label>
              <Input
                value={tySettings.heading_he || ""}
                onChange={(e) => setTySettings((p) => ({ ...p, heading_he: e.target.value }))}
                placeholder="תודה! קיבלנו את פרטיך"
                className="mt-1.5 h-9"
                dir="rtl"
              />
              <p className="text-[11px] text-[#9A969A] mt-1">השתמשו ב-[שם] להצגת שם הלקוח</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-[#2a2628]">כותרת משנה</Label>
              <Input
                value={tySettings.subheading_he || ""}
                onChange={(e) => setTySettings((p) => ({ ...p, subheading_he: e.target.value }))}
                placeholder="יועץ לימודים ייצור איתך קשר בקרוב"
                className="mt-1.5 h-9"
                dir="rtl"
              />
            </div>
          </div>

          <Separator />

          {/* Social media */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-[#2a2628]">רשתות חברתיות</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tySettings.show_social !== false}
                  onCheckedChange={(v) => setTySettings((p) => ({ ...p, show_social: v }))}
                />
                <span className="text-xs text-[#9A969A]">{tySettings.show_social !== false ? "מוצג" : "מוסתר"}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: "facebook_url" as const, label: "Facebook" },
                { key: "instagram_url" as const, label: "Instagram" },
                { key: "youtube_url" as const, label: "YouTube" },
                { key: "linkedin_url" as const, label: "LinkedIn" },
                { key: "tiktok_url" as const, label: "TikTok" },
              ].map((s) => (
                <div key={s.key}>
                  <Label className="text-xs text-[#716C70]">{s.label}</Label>
                  <Input
                    value={tySettings[s.key] || ""}
                    onChange={(e) => setTySettings((p) => ({ ...p, [s.key]: e.target.value }))}
                    placeholder="https://..."
                    className="mt-1 h-8 text-xs"
                    dir="ltr"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-[#2a2628]">כפתור WhatsApp</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tySettings.show_whatsapp !== false}
                  onCheckedChange={(v) => setTySettings((p) => ({ ...p, show_whatsapp: v }))}
                />
                <span className="text-xs text-[#9A969A]">{tySettings.show_whatsapp !== false ? "מוצג" : "מוסתר"}</span>
              </div>
            </div>
            <Input
              value={tySettings.whatsapp_cta_he || ""}
              onChange={(e) => setTySettings((p) => ({ ...p, whatsapp_cta_he: e.target.value }))}
              placeholder="רוצים לדבר עכשיו? כתבו לנו"
              className="h-9"
              dir="rtl"
            />
            <p className="text-[11px] text-[#9A969A] mt-1">מספר ה-WhatsApp נלקח מהגדרות האינטגרציות</p>
          </div>

          <Separator />

          {/* Referral */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-[#2a2628]">שיתוף עם חבר</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tySettings.show_referral !== false}
                  onCheckedChange={(v) => setTySettings((p) => ({ ...p, show_referral: v }))}
                />
                <span className="text-xs text-[#9A969A]">{tySettings.show_referral !== false ? "מוצג" : "מוסתר"}</span>
              </div>
            </div>
            <Input
              value={tySettings.referral_cta_he || ""}
              onChange={(e) => setTySettings((p) => ({ ...p, referral_cta_he: e.target.value }))}
              placeholder="שתפו עם חבר שמחפש תואר"
              className="h-9"
              dir="rtl"
            />
          </div>

          <Separator />

          {/* Calendar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-[#2a2628]">קביעת שיחה (Calendly)</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={tySettings.show_calendar === true}
                  onCheckedChange={(v) => setTySettings((p) => ({ ...p, show_calendar: v }))}
                />
                <span className="text-xs text-[#9A969A]">{tySettings.show_calendar ? "מוצג" : "מוסתר"}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                value={tySettings.calendar_url || ""}
                onChange={(e) => setTySettings((p) => ({ ...p, calendar_url: e.target.value }))}
                placeholder="https://calendly.com/..."
                className="h-9"
                dir="ltr"
              />
              <Input
                value={tySettings.calendar_cta_he || ""}
                onChange={(e) => setTySettings((p) => ({ ...p, calendar_cta_he: e.target.value }))}
                placeholder="קבעו שיחה עכשיו"
                className="h-9"
                dir="rtl"
              />
            </div>
          </div>

          <Separator />

          {/* Preview link */}
          <div className="p-3 rounded-xl bg-[#f9fafb] border border-[#e5e7eb] flex items-center justify-between">
            <span className="text-xs text-[#9A969A]">תצוגה מקדימה של עמוד תודה</span>
            <a
              href="/ty?name=ישראל"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#B8D900] hover:underline flex items-center gap-1"
            >
              פתחו עמוד תודה
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Save button (bottom) */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-[#B8D900] text-[#2a2628] hover:bg-[#a8c400] shadow-md shadow-[#B8D900]/20 px-8"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2a2628] border-t-transparent" />
          ) : (
            "שמור הגדרות"
          )}
        </Button>
      </div>
    </div>
  );
}
