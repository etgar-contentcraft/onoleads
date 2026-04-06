/**
 * Pixels dashboard page.
 * Manages global pixel/CAPI configuration per platform.
 * Tokens are AES-256-GCM encrypted before being saved to the database.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Constants
// ============================================================================

/** All supported platforms with their metadata */
const PLATFORMS = [
  {
    key: "ga4",
    name: "Google Analytics 4",
    icon: "📊",
    color: "#E37400",
    pixelLabel: "Measurement ID",
    pixelPlaceholder: "G-XXXXXXXXXX",
    pixelHelp: "מזהה המדידה של GA4. נמצא ב: Admin → Data Streams → Web → Measurement ID",
    hasToken: false,
    hasCapi: false,
    helpUrl: "https://support.google.com/analytics/answer/9304153",
    category: "analytics",
  },
  {
    key: "meta",
    name: "Meta (Facebook) Pixel + CAPI",
    icon: "📘",
    color: "#0082FB",
    pixelLabel: "Pixel ID",
    pixelPlaceholder: "1234567890123456",
    pixelHelp: "מזהה הפיקסל. נמצא ב: Events Manager → Pixels → Settings",
    hasToken: true,
    tokenLabel: "Access Token (CAPI)",
    tokenHelp: "טוקן גישה ל-CAPI. נמצא ב: Events Manager → Pixels → Settings → Generate Access Token",
    hasCapi: true,
    hasTestCode: true,
    testCodeLabel: "Test Event Code",
    testCodeHelp: "קוד טסט אירועים לבדיקת CAPI. נמצא ב: Events Manager → Test Events",
    helpUrl: "https://developers.facebook.com/docs/marketing-api/conversions-api",
    category: "social",
  },
  {
    key: "google",
    name: "Google Ads + Enhanced Conversions",
    icon: "🎯",
    color: "#4285F4",
    pixelLabel: "Conversion ID",
    pixelPlaceholder: "AW-XXXXXXXXXX",
    pixelHelp: "מזהה ההמרה. נמצא ב: Google Ads → Tools → Conversions → Tag setup",
    hasToken: true,
    tokenLabel: "API Key (Enhanced Conversions)",
    tokenHelp: "מפתח API לשיפור המרות. נמצא ב: Google Ads → Tools → Google Ads API",
    hasCapi: true,
    hasConversionLabel: true,
    conversionLabelHelp: "תווית ההמרה. נמצא ב: Google Ads → Conversions → Action → Tag details",
    helpUrl: "https://support.google.com/google-ads/answer/11062876",
    category: "advertising",
  },
  {
    key: "tiktok",
    name: "TikTok Pixel + CAPI",
    icon: "🎵",
    color: "#010101",
    pixelLabel: "Pixel ID",
    pixelPlaceholder: "CXXXXXXXXXXXXXXXXXX",
    pixelHelp: "מזהה הפיקסל. נמצא ב: TikTok Ads Manager → Assets → Events → Web Events",
    hasToken: true,
    tokenLabel: "Access Token (CAPI)",
    tokenHelp: "טוקן גישה ל-CAPI. נמצא ב: TikTok Ads Manager → Assets → Events → Manage",
    hasCapi: true,
    helpUrl: "https://ads.tiktok.com/help/article/events-api",
    category: "social",
  },
  {
    key: "linkedin",
    name: "LinkedIn Insight Tag",
    icon: "💼",
    color: "#0A66C2",
    pixelLabel: "Partner ID",
    pixelPlaceholder: "1234567",
    pixelHelp: "מזהה השותף. נמצא ב: Campaign Manager → Analyze → Insight Tag",
    hasToken: false,
    hasCapi: false,
    helpUrl: "https://www.linkedin.com/help/lms/answer/a418880",
    category: "social",
  },
  {
    key: "outbrain",
    name: "Outbrain Pixel",
    icon: "📰",
    color: "#FF4B1F",
    pixelLabel: "Account ID",
    pixelPlaceholder: "XXXXXXXXXXXXXXXXXXXXXXXXXX",
    pixelHelp: "מזהה החשבון. נמצא ב: Outbrain → Settings → Pixel",
    hasToken: false,
    hasCapi: false,
    helpUrl: "https://www.outbrain.com/help/advertisers/outbrain-pixel/",
    category: "advertising",
  },
  {
    key: "taboola",
    name: "Taboola Pixel",
    icon: "📢",
    color: "#0056D6",
    pixelLabel: "Account ID",
    pixelPlaceholder: "taboola-account-id",
    pixelHelp: "מזהה החשבון. נמצא ב: Taboola Ads → Tracking → Pixel",
    hasToken: false,
    hasCapi: false,
    helpUrl: "https://help.taboola.com/hc/en-us/articles/115006880507",
    category: "advertising",
  },
  {
    key: "twitter",
    name: "X (Twitter) Pixel",
    icon: "🐦",
    color: "#000000",
    pixelLabel: "Pixel ID",
    pixelPlaceholder: "o1234",
    pixelHelp: "מזהה הפיקסל. נמצא ב: X Ads → Tools → Conversion Tracking",
    hasToken: false,
    hasCapi: false,
    helpUrl: "https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html",
    category: "social",
  },
] as const;

type PlatformKey = typeof PLATFORMS[number]["key"];

/** Shape of a single row from pixel_configurations */
interface PixelRow {
  platform: PlatformKey;
  is_enabled: boolean;
  pixel_id: string | null;
  access_token_enc: string | null;
  test_event_code: string | null;
  additional_config: Record<string, string | null>;
}

/** Local form state per platform */
interface FormState {
  is_enabled: boolean;
  pixel_id: string;
  /** Raw token input — only set when user explicitly types a new one */
  new_token: string;
  /** True if the DB already has an encrypted token */
  has_saved_token: boolean;
  test_event_code: string;
  conversion_label: string;
  /** Whether save is in progress */
  saving: boolean;
  /** Last save result message */
  message: string;
  messageType: "success" | "error" | "";
}

const emptyForm = (): FormState => ({
  is_enabled: false,
  pixel_id: "",
  new_token: "",
  has_saved_token: false,
  test_event_code: "",
  conversion_label: "",
  saving: false,
  message: "",
  messageType: "",
});

// ============================================================================
// Component
// ============================================================================

export default function PixelsPage() {
  const [forms, setForms] = useState<Record<PlatformKey, FormState>>(() => {
    const init = {} as Record<PlatformKey, FormState>;
    for (const p of PLATFORMS) init[p.key] = emptyForm();
    return init;
  });

  const [loading, setLoading] = useState(true);

  // ── Load existing config ──────────────────────────────────────────────────

  const loadConfig = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pixel_configurations")
      .select("platform, is_enabled, pixel_id, access_token_enc, test_event_code, additional_config");

    if (error) {
      console.error("Failed to load pixel config:", error);
      setLoading(false);
      return;
    }

    setForms((prev) => {
      const next = { ...prev };
      for (const row of (data || []) as PixelRow[]) {
        const platform = row.platform as PlatformKey;
        if (!next[platform]) continue;
        next[platform] = {
          ...next[platform],
          is_enabled: row.is_enabled,
          pixel_id: row.pixel_id || "",
          new_token: "",
          has_saved_token: !!row.access_token_enc,
          test_event_code: row.test_event_code || "",
          conversion_label: row.additional_config?.conversion_label || "",
        };
      }
      return next;
    });
    setLoading(false);
  }, []);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  // ── Update a single field for a platform ─────────────────────────────────

  const setField = <K extends keyof FormState>(
    platform: PlatformKey,
    field: K,
    value: FormState[K]
  ) => {
    setForms((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value },
    }));
  };

  // ── Save a single platform ────────────────────────────────────────────────

  /**
   * Saves the config for a single platform.
   * If a new_token was entered, sends it to the API route for encryption.
   * Otherwise, only updates the non-secret fields.
   */
  const savePlatform = async (platformKey: PlatformKey) => {
    const form = forms[platformKey];
    setField(platformKey, "saving", true);
    setField(platformKey, "message", "");
    setField(platformKey, "messageType", "");

    try {
      // Encrypt token server-side if a new one was entered
      let encryptedToken: string | undefined;
      if (form.new_token.trim()) {
        const res = await fetch("/api/pixels/encrypt-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: platformKey, token: form.new_token.trim() }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "שגיאה בהצפנת הטוקן");
        }
        const data = await res.json();
        encryptedToken = data.encrypted;
      }

      // Build update payload — never send raw token
      const updatePayload: Record<string, unknown> = {
        is_enabled: form.is_enabled,
        pixel_id: form.pixel_id.trim() || null,
        test_event_code: form.test_event_code.trim() || null,
        additional_config: {
          conversion_label: form.conversion_label.trim() || null,
        },
        updated_at: new Date().toISOString(),
      };
      if (encryptedToken !== undefined) {
        updatePayload.access_token_enc = encryptedToken;
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("pixel_configurations")
        .update(updatePayload)
        .eq("platform", platformKey);

      if (error) throw error;

      setForms((prev) => ({
        ...prev,
        [platformKey]: {
          ...prev[platformKey],
          saving: false,
          new_token: "",
          has_saved_token: prev[platformKey].has_saved_token || !!encryptedToken,
          message: "נשמר בהצלחה ✓",
          messageType: "success",
        },
      }));
    } catch (err) {
      setForms((prev) => ({
        ...prev,
        [platformKey]: {
          ...prev[platformKey],
          saving: false,
          message: err instanceof Error ? err.message : "שגיאה בשמירה",
          messageType: "error",
        },
      }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const categories = [
    { key: "analytics", label: "אנליטיקס" },
    { key: "social", label: "רשתות חברתיות" },
    { key: "advertising", label: "פרסום" },
  ] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">פיקסלים וטראקינג</h1>
        <p className="text-sm text-gray-500 mt-1">
          הגדר פיקסלים לכל הפלטפורמות. הטוקנים מוצפנים AES-256-GCM ולעולם לא נשלחים ללקוח.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
          טוען הגדרות...
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((cat) => {
            const platforms = PLATFORMS.filter((p) => p.category === cat.key);
            return (
              <div key={cat.key}>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
                  {cat.label}
                </h2>
                <div className="space-y-4">
                  {platforms.map((platform) => (
                    <PlatformCard
                      key={platform.key}
                      platform={platform}
                      form={forms[platform.key]}
                      onFieldChange={(field, value) => setField(platform.key, field, value)}
                      onSave={() => savePlatform(platform.key)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PlatformCard — single platform editor
// ============================================================================

interface PlatformCardProps {
  platform: typeof PLATFORMS[number];
  form: FormState;
  onFieldChange: <K extends keyof FormState>(field: K, value: FormState[K]) => void;
  onSave: () => void;
}

/**
 * Renders a collapsible card for a single pixel platform.
 * Shows a toggle to enable/disable, plus inputs for pixel ID, token, and extras.
 */
function PlatformCard({ platform, form, onFieldChange, onSave }: PlatformCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card className={`border transition-all ${form.is_enabled ? "border-gray-300" : "border-gray-200 opacity-75"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {/* Left: icon + name + enabled badge */}
          <button
            className="flex items-center gap-3 text-start"
            onClick={() => setOpen((o) => !o)}
            type="button"
          >
            <span className="text-2xl">{platform.icon}</span>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {platform.name}
                {form.is_enabled && form.pixel_id && (
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-normal">
                    ● פעיל
                  </span>
                )}
                {form.is_enabled && !form.pixel_id && (
                  <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5 font-normal">
                    ⚠ חסר Pixel ID
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-gray-400 mt-0.5">
                {form.pixel_id ? (
                  <span className="font-mono text-gray-500">{form.pixel_id}</span>
                ) : (
                  "לא מוגדר"
                )}
              </CardDescription>
            </div>
          </button>

          {/* Right: toggle + expand arrow */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_enabled}
              onCheckedChange={(v) => onFieldChange("is_enabled", v)}
              aria-label={`${form.is_enabled ? "כבה" : "הפעל"} ${platform.name}`}
            />
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-gray-400 hover:text-gray-600 transition-transform"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </CardHeader>

      {/* Expanded form */}
      {open && (
        <>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            {/* Pixel ID */}
            <div className="space-y-1.5">
              <Label htmlFor={`${platform.key}-pixel-id`} className="text-sm font-medium">
                {platform.pixelLabel}
              </Label>
              <Input
                id={`${platform.key}-pixel-id`}
                value={form.pixel_id}
                onChange={(e) => onFieldChange("pixel_id", e.target.value)}
                placeholder={platform.pixelPlaceholder}
                dir="ltr"
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-400">{platform.pixelHelp}</p>
            </div>

            {/* Access Token (CAPI platforms only) */}
            {platform.hasToken && (
              <div className="space-y-1.5">
                <Label htmlFor={`${platform.key}-token`} className="text-sm font-medium">
                  {platform.tokenLabel}
                </Label>
                <div className="relative">
                  <Input
                    id={`${platform.key}-token`}
                    type="password"
                    value={form.new_token}
                    onChange={(e) => onFieldChange("new_token", e.target.value)}
                    placeholder={form.has_saved_token ? "••••••••••••  (שמור — הזן חדש כדי לשנות)" : "הזן את הטוקן"}
                    dir="ltr"
                    className="font-mono text-sm pr-10"
                    autoComplete="off"
                  />
                  {form.has_saved_token && !form.new_token && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-green-600">✓</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {platform.tokenHelp} —{" "}
                  <a
                    href={platform.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    מדריך →
                  </a>
                </p>
                {form.new_token && (
                  <p className="text-xs text-amber-600">
                    ⚠ הטוקן יוצפן AES-256-GCM לפני השמירה
                  </p>
                )}
              </div>
            )}

            {/* Test Event Code (Meta only) */}
            {"hasTestCode" in platform && platform.hasTestCode && (
              <div className="space-y-1.5">
                <Label htmlFor={`${platform.key}-test-code`} className="text-sm font-medium">
                  {platform.testCodeLabel}{" "}
                  <span className="text-gray-400 font-normal">(אופציונלי — רק לסביבת בדיקות)</span>
                </Label>
                <Input
                  id={`${platform.key}-test-code`}
                  value={form.test_event_code}
                  onChange={(e) => onFieldChange("test_event_code", e.target.value)}
                  placeholder="TEST12345"
                  dir="ltr"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400">{platform.testCodeHelp}</p>
              </div>
            )}

            {/* Conversion Label (Google Ads only) */}
            {"hasConversionLabel" in platform && platform.hasConversionLabel && (
              <div className="space-y-1.5">
                <Label htmlFor={`${platform.key}-conv-label`} className="text-sm font-medium">
                  Conversion Label
                </Label>
                <Input
                  id={`${platform.key}-conv-label`}
                  value={form.conversion_label}
                  onChange={(e) => onFieldChange("conversion_label", e.target.value)}
                  placeholder="AbCdEfGhIjKlMnOpQrSt"
                  dir="ltr"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-400">{platform.conversionLabelHelp}</p>
              </div>
            )}

            {/* Save button + status */}
            <div className="flex items-center justify-between pt-2">
              {form.message ? (
                <span className={`text-xs ${form.messageType === "success" ? "text-green-600" : "text-red-500"}`}>
                  {form.message}
                </span>
              ) : (
                <a
                  href={platform.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline"
                >
                  מדריך הגדרה →
                </a>
              )}
              <Button
                size="sm"
                onClick={onSave}
                disabled={form.saving}
                className="min-w-[90px]"
              >
                {form.saving ? "שומר..." : "שמור"}
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}
