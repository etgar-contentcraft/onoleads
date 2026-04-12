// UTM Builder - generate and manage campaign links for landing pages
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Copy,
  Check,
  Save,
  Loader2,
  Plus,
  Link2,
  Trash2,
  ExternalLink,
  Globe2,
  Camera,
  Briefcase,
  Mail,
  MessageCircle,
  QrCode,
  Smartphone,
  Megaphone,
  Search,
  MousePointerClick,
  Users,
  Tag,
  Bookmark,
  Star,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Base URL prefix for all landing page links */
const BASE_URL_PREFIX = "https://onoleads.vercel.app/lp/";

/** System-defined UTM source presets shown in the quick-fill bar */
const SYSTEM_PRESETS: SystemPreset[] = [
  { name: "Facebook Ads", icon: "facebook", utm_source: "facebook", utm_medium: "cpc", utm_campaign: "" },
  { name: "Google Ads", icon: "google", utm_source: "google", utm_medium: "cpc", utm_campaign: "" },
  { name: "Instagram", icon: "instagram", utm_source: "instagram", utm_medium: "social", utm_campaign: "" },
  { name: "TikTok Ads", icon: "tiktok", utm_source: "tiktok", utm_medium: "cpc", utm_campaign: "" },
  { name: "Newsletter", icon: "email", utm_source: "email", utm_medium: "email", utm_campaign: "" },
  { name: "LinkedIn", icon: "linkedin", utm_source: "linkedin", utm_medium: "social", utm_campaign: "" },
  { name: "WhatsApp", icon: "whatsapp", utm_source: "whatsapp", utm_medium: "social", utm_campaign: "" },
  { name: "QR Code", icon: "qr", utm_source: "qr", utm_medium: "offline", utm_campaign: "" },
  { name: "SMS", icon: "sms", utm_source: "sms", utm_medium: "sms", utm_campaign: "" },
];

/** Available UTM source options for the dropdown */
const SOURCE_OPTIONS = [
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "qr", label: "QR Code" },
  { value: "custom", label: "מותאם אישית..." },
];

/** Available UTM medium options for the dropdown */
const MEDIUM_OPTIONS = [
  { value: "cpc", label: "CPC (מודעות)" },
  { value: "social", label: "Social (רשתות חברתיות)" },
  { value: "email", label: "Email (דוא\"ל)" },
  { value: "referral", label: "Referral (הפנייה)" },
  { value: "organic", label: "Organic (אורגני)" },
  { value: "banner", label: "Banner (באנר)" },
  { value: "sms", label: "SMS" },
  { value: "offline", label: "Offline (אופליין)" },
  { value: "custom", label: "מותאם אישית..." },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** System preset shape used for the quick-fill buttons */
interface SystemPreset {
  name: string;
  icon: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
}

/** User-saved preset from the utm_presets table */
interface UserPreset {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

/** Saved UTM link from the utm_links table */
interface UtmLink {
  id: string;
  page_id: string;
  created_by: string;
  label: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  utm_term: string | null;
  full_url: string;
  created_at: string;
}

/** UTM link with aggregated click/lead counts */
interface UtmLinkWithStats extends UtmLink {
  clicks: number;
  leads: number;
}

/** Form state for all UTM fields */
interface UtmFormState {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Initial empty form values */
const EMPTY_FORM: UtmFormState = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_content: "",
  utm_term: "",
  label: "",
};

/**
 * Build the full URL with UTM parameters from the form state.
 * Omits empty parameters to keep the URL clean.
 * @param slug - the page slug
 * @param form - current form state
 * @returns the complete UTM-tagged URL
 */
function buildFullUrl(slug: string, form: UtmFormState): string {
  const base = `${BASE_URL_PREFIX}${slug}`;
  const params = new URLSearchParams();

  if (form.utm_source) params.set("utm_source", form.utm_source);
  if (form.utm_medium) params.set("utm_medium", form.utm_medium);
  if (form.utm_campaign) params.set("utm_campaign", form.utm_campaign);
  if (form.utm_content) params.set("utm_content", form.utm_content);
  if (form.utm_term) params.set("utm_term", form.utm_term);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Return an icon component for a given platform identifier.
 * @param icon - platform string key
 * @param className - optional CSS classes
 * @returns JSX icon element
 */
function getPlatformIcon(icon: string, className = "size-4") {
  const iconMap: Record<string, React.ReactNode> = {
    facebook: <Globe2 className={className} />,
    google: <Search className={className} />,
    instagram: <Camera className={className} />,
    tiktok: <Megaphone className={className} />,
    email: <Mail className={className} />,
    linkedin: <Briefcase className={className} />,
    whatsapp: <MessageCircle className={className} />,
    qr: <QrCode className={className} />,
    sms: <Smartphone className={className} />,
  };
  return iconMap[icon] || <Link2 className={className} />;
}

/**
 * Format an ISO date string as a Hebrew-friendly short date.
 * @param iso - ISO 8601 date string
 * @returns formatted date string dd/mm/yyyy
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Detect the icon key for a given utm_source value.
 * @param source - utm_source string
 * @returns icon key matching the platform
 */
function detectIcon(source: string): string {
  const lower = source.toLowerCase();
  const map: Record<string, string> = {
    facebook: "facebook", google: "google", instagram: "instagram",
    tiktok: "tiktok", email: "email", linkedin: "linkedin",
    whatsapp: "whatsapp", qr: "qr", sms: "sms",
  };
  return map[lower] || "link";
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

/**
 * UTM Builder page — allows users to create, save, and manage
 * campaign-tagged URLs for a specific landing page.
 */
export default function UtmBuilderPage() {
  const params = useParams();
  const pageId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  // Page data
  const [pageSlug, setPageSlug] = useState<string>("");
  const [pageName, setPageName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState<UtmFormState>({ ...EMPTY_FORM });
  const [sourceMode, setSourceMode] = useState<"preset" | "custom">("preset");
  const [mediumMode, setMediumMode] = useState<"preset" | "custom">("preset");
  const [customSource, setCustomSource] = useState("");
  const [customMedium, setCustomMedium] = useState("");

  // Saved links
  const [links, setLinks] = useState<UtmLinkWithStats[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);

  // User presets
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGenerated, setCopiedGenerated] = useState(false);
  const [copiedParams, setCopiedParams] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /** The effective source value combining dropdown and custom modes */
  const effectiveSource = sourceMode === "custom" ? customSource : form.utm_source;

  /** The effective medium value combining dropdown and custom modes */
  const effectiveMedium = mediumMode === "custom" ? customMedium : form.utm_medium;

  /** The fully generated URL based on current form values */
  const generatedUrl = useMemo(() => {
    if (!pageSlug) return "";
    return buildFullUrl(pageSlug, {
      ...form,
      utm_source: effectiveSource,
      utm_medium: effectiveMedium,
    });
  }, [pageSlug, form, effectiveSource, effectiveMedium]);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  /**
   * Fetch the landing page slug and name from Supabase.
   * Runs once on mount.
   */
  const fetchPage = useCallback(async () => {
    const { data, error } = await supabase
      .from("pages")
      .select("slug, title_he")
      .eq("id", pageId)
      .single();

    if (!error && data) {
      setPageSlug(data.slug || "");
      setPageName(data.title_he || "");
    }
    setLoading(false);
  }, [pageId, supabase]);

  /**
   * Fetch all saved UTM links for this page, then enrich with click/lead counts.
   */
  const fetchLinks = useCallback(async () => {
    setLinksLoading(true);

    const { data: linksData, error } = await supabase
      .from("utm_links")
      .select("*")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false });

    if (error || !linksData) {
      setLinksLoading(false);
      return;
    }

    // Enrich each link with click and lead counts
    const enriched: UtmLinkWithStats[] = await Promise.all(
      linksData.map(async (link: UtmLink) => {
        // Count clicks from analytics_events (page_view events with matching UTMs)
        const { count: clickCount } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("page_id", pageId)
          .eq("utm_source", link.utm_source)
          .eq("utm_medium", link.utm_medium)
          .eq("utm_campaign", link.utm_campaign);

        // Count form submissions from analytics_events (PII not stored — leads go to webhook only)
        const { count: leadCount } = await supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .eq("page_id", pageId)
          .eq("event_type", "form_submit")
          .eq("utm_source", link.utm_source)
          .eq("utm_medium", link.utm_medium)
          .eq("utm_campaign", link.utm_campaign);

        return {
          ...link,
          clicks: clickCount ?? 0,
          leads: leadCount ?? 0,
        };
      })
    );

    setLinks(enriched);
    setLinksLoading(false);
  }, [pageId, supabase]);

  /**
   * Fetch user-saved presets from utm_presets table.
   */
  const fetchUserPresets = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("utm_presets")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_system", false)
      .order("sort_order", { ascending: true });

    if (data) setUserPresets(data);
  }, [supabase]);

  useEffect(() => {
    fetchPage();
    fetchLinks();
    fetchUserPresets();
  }, [fetchPage, fetchLinks, fetchUserPresets]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  /**
   * Apply a preset's UTM values to the form fields.
   * @param preset - the preset object (system or user)
   */
  function applyPreset(preset: { utm_source: string; utm_medium: string; utm_campaign: string; utm_content?: string | null; utm_term?: string | null }) {
    const isKnownSource = SOURCE_OPTIONS.some((o) => o.value === preset.utm_source && o.value !== "custom");
    const isKnownMedium = MEDIUM_OPTIONS.some((o) => o.value === preset.utm_medium && o.value !== "custom");

    if (isKnownSource) {
      setSourceMode("preset");
      setForm((f) => ({ ...f, utm_source: preset.utm_source }));
    } else {
      setSourceMode("custom");
      setCustomSource(preset.utm_source);
      setForm((f) => ({ ...f, utm_source: "custom" }));
    }

    if (isKnownMedium) {
      setMediumMode("preset");
      setForm((f) => ({ ...f, utm_medium: preset.utm_medium }));
    } else {
      setMediumMode("custom");
      setCustomMedium(preset.utm_medium);
      setForm((f) => ({ ...f, utm_medium: "custom" }));
    }

    setForm((f) => ({
      ...f,
      utm_campaign: preset.utm_campaign || "",
      utm_content: preset.utm_content || "",
      utm_term: preset.utm_term || "",
    }));
  }

  /**
   * Copy a text string to the clipboard and show a checkmark briefly.
   * @param text - text to copy
   * @param id - unique identifier for the copy state (link id or "generated")
   */
  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      if (id === "generated") {
        setCopiedGenerated(true);
        setTimeout(() => setCopiedGenerated(false), 2000);
      } else if (id === "params") {
        setCopiedParams(true);
        setTimeout(() => setCopiedParams(false), 2000);
      } else {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch {
      // Fallback: some browsers block clipboard in non-secure contexts
    }
  }

  /**
   * Save the current form as a new UTM link in the database.
   */
  async function handleSaveLink() {
    if (!effectiveSource || !effectiveMedium || !form.utm_campaign || !form.label) return;

    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const fullUrl = buildFullUrl(pageSlug, {
      ...form,
      utm_source: effectiveSource,
      utm_medium: effectiveMedium,
    });

    const { error } = await supabase.from("utm_links").insert({
      page_id: pageId,
      created_by: user.id,
      label: form.label,
      utm_source: effectiveSource,
      utm_medium: effectiveMedium,
      utm_campaign: form.utm_campaign,
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
      full_url: fullUrl,
    });

    if (!error) {
      setForm({ ...EMPTY_FORM });
      setCustomSource("");
      setCustomMedium("");
      setSourceMode("preset");
      setMediumMode("preset");
      await fetchLinks();
    }

    setSaving(false);
  }

  /**
   * Save the current form values as a new user preset.
   */
  async function handleSavePreset() {
    if (!presetName || !effectiveSource || !effectiveMedium) return;

    setSavingPreset(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingPreset(false);
      return;
    }

    const { error } = await supabase.from("utm_presets").insert({
      user_id: user.id,
      name: presetName,
      icon: detectIcon(effectiveSource),
      utm_source: effectiveSource,
      utm_medium: effectiveMedium,
      utm_campaign: form.utm_campaign || "",
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
      is_system: false,
      sort_order: userPresets.length,
    });

    if (!error) {
      setPresetName("");
      setPresetDialogOpen(false);
      await fetchUserPresets();
    }

    setSavingPreset(false);
  }

  /**
   * Delete a saved UTM link by ID.
   * @param linkId - the link id to delete
   */
  async function handleDeleteLink(linkId: string) {
    const { error } = await supabase.from("utm_links").delete().eq("id", linkId);
    if (!error) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
    setDeleteConfirmId(null);
  }

  /**
   * Delete a user preset by ID.
   * @param presetId - the preset id to delete
   */
  async function handleDeletePreset(presetId: string) {
    const { error } = await supabase.from("utm_presets").delete().eq("id", presetId);
    if (!error) {
      setUserPresets((prev) => prev.filter((p) => p.id !== presetId));
    }
  }

  /**
   * Check whether the save button should be disabled.
   * @returns true if required fields are missing
   */
  const isSaveDisabled = !effectiveSource || !effectiveMedium || !form.utm_campaign || !form.label;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <Loader2 className="size-8 animate-spin text-[#B8D900]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8" dir="rtl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/pages/${pageId}/builder`)}
            className="gap-1 text-[#9A969A] hover:text-[#4A4648]"
          >
            <ArrowRight className="size-4" />
            חזרה לבונה
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-xl font-bold text-[#2A2628]">בונה UTM</h1>
            <p className="text-sm text-[#9A969A]">{pageName}</p>
          </div>
        </div>
        <Badge variant="outline" className="border-[#B8D900]/30 text-[#B8D900]">
          <Link2 className="ml-1 size-3" />
          {links.length} קישורים שמורים
        </Badge>
      </div>

      {/* ── Base URL (locked) ── */}
      <Card className="border-[#E5E5E5] bg-white">
        <CardContent className="pt-4">
          <Label className="text-xs text-[#9A969A]">כתובת בסיס (נעולה)</Label>
          <div className="mt-1 flex items-center gap-2 rounded-md border border-[#E5E5E5] bg-[#F3F4F6] px-3 py-2">
            <Link2 className="size-4 shrink-0 text-[#B8D900]" />
            <span className="font-mono text-sm text-[#9A969A]">
              {BASE_URL_PREFIX}{pageSlug}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Presets Section ── */}
      <Card className="border-[#E5E5E5] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[#2A2628]">
            <Star className="size-4 text-[#B8D900]" />
            תבניות מהירות
          </CardTitle>
          <CardDescription className="text-[#9A969A]">
            לחצו על תבנית למילוי אוטומטי של השדות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* System presets */}
          <div className="flex flex-wrap gap-2">
            {SYSTEM_PRESETS.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className="gap-1.5 border-[#E5E5E5] bg-transparent text-[#9A969A] hover:border-[#B8D900]/50 hover:bg-[#B8D900]/10 hover:text-[#4A4648]"
              >
                {getPlatformIcon(preset.icon, "size-3.5")}
                {preset.name}
              </Button>
            ))}
          </div>

          {/* User presets */}
          {userPresets.length > 0 && (
            <>
              <Separator className="bg-[#716C70]/20" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9A969A]">התבניות שלי:</span>
                <div className="flex flex-wrap gap-2">
                  {userPresets.map((preset) => (
                    <div key={preset.id} className="group relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyPreset(preset)}
                        className="gap-1.5 border-[#B8D900]/20 bg-[#B8D900]/5 text-[#B8D900] hover:border-[#B8D900]/50 hover:bg-[#B8D900]/10"
                      >
                        {getPlatformIcon(preset.icon, "size-3.5")}
                        {preset.name}
                      </Button>
                      <button
                        onClick={() => handleDeletePreset(preset.id)}
                        className="absolute -left-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-red-500 text-[#2A2628] group-hover:flex"
                        title="מחק תבנית"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── UTM Form ── */}
      <Card className="border-[#E5E5E5] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[#2A2628]">
            <Tag className="size-4 text-[#B8D900]" />
            פרמטרים של הקמפיין
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-sm text-[#9A969A]">
              שם הקישור <span className="text-red-400">*</span>
            </Label>
            <Input
              placeholder='לדוגמה: "קמפיין פייסבוק - מרץ 2026"'
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              className="border-[#E5E5E5] bg-white text-[#2A2628] placeholder:text-[#9A969A]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* utm_source */}
            <div className="space-y-1.5">
              <Label className="text-sm text-[#9A969A]">
                utm_source <span className="text-red-400">*</span>
              </Label>
              <Select
                value={sourceMode === "custom" ? "custom" : form.utm_source}
                onValueChange={(val: string | null) => {
                  if (!val) return;
                  if (val === "custom") {
                    setSourceMode("custom");
                  } else {
                    setSourceMode("preset");
                    setForm((f) => ({ ...f, utm_source: val }));
                  }
                }}
              >
                <SelectTrigger className="w-full border-[#E5E5E5] bg-white text-[#2A2628]">
                  <SelectValue placeholder="בחרו מקור" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceMode === "custom" && (
                <Input
                  placeholder="הזינו מקור מותאם"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  className="mt-1.5 border-[#E5E5E5] bg-white text-[#2A2628] placeholder:text-[#9A969A]"
                />
              )}
            </div>

            {/* utm_medium */}
            <div className="space-y-1.5">
              <Label className="text-sm text-[#9A969A]">
                utm_medium <span className="text-red-400">*</span>
              </Label>
              <Select
                value={mediumMode === "custom" ? "custom" : form.utm_medium}
                onValueChange={(val: string | null) => {
                  if (!val) return;
                  if (val === "custom") {
                    setMediumMode("custom");
                  } else {
                    setMediumMode("preset");
                    setForm((f) => ({ ...f, utm_medium: val }));
                  }
                }}
              >
                <SelectTrigger className="w-full border-[#E5E5E5] bg-white text-[#2A2628]">
                  <SelectValue placeholder="בחרו מדיום" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIUM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mediumMode === "custom" && (
                <Input
                  placeholder="הזינו מדיום מותאם"
                  value={customMedium}
                  onChange={(e) => setCustomMedium(e.target.value)}
                  className="mt-1.5 border-[#E5E5E5] bg-white text-[#2A2628] placeholder:text-[#9A969A]"
                />
              )}
            </div>
          </div>

          {/* utm_campaign */}
          <div className="space-y-1.5">
            <Label className="text-sm text-[#9A969A]">
              utm_campaign <span className="text-red-400">*</span>
            </Label>
            <Input
              placeholder="שם הקמפיין, לדוגמה: spring_2026_open_day"
              value={form.utm_campaign}
              onChange={(e) => setForm((f) => ({ ...f, utm_campaign: e.target.value }))}
              className="border-[#E5E5E5] bg-white text-[#2A2628] placeholder:text-[#9A969A]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* utm_content (optional) */}
            <div className="space-y-1.5">
              <Label className="text-sm text-[#9A969A]">
                utm_content <span className="text-xs text-[#716C70]">(אופציונלי)</span>
              </Label>
              <Input
                placeholder="וריאנט מודעה, לדוגמה: banner_v2"
                value={form.utm_content}
                onChange={(e) => setForm((f) => ({ ...f, utm_content: e.target.value }))}
                className="border-[#E5E5E5] bg-white text-[#2A2628] placeholder:text-[#9A969A]"
              />
            </div>

            {/* utm_term (optional) */}
            <div className="space-y-1.5">
              <Label className="text-sm text-[#9A969A]">
                utm_term <span className="text-xs text-[#716C70]">(אופציונלי)</span>
              </Label>
              <Input
                placeholder="מילת מפתח, לדוגמה: MBA_online"
                value={form.utm_term}
                onChange={(e) => setForm((f) => ({ ...f, utm_term: e.target.value }))}
                className="border-[#E5E5E5] bg-white text-[#2A2628] placeholder:text-[#9A969A]"
              />
            </div>
          </div>

          {/* Generated URL preview */}
          {generatedUrl && effectiveSource && effectiveMedium && form.utm_campaign && (
            <div className="space-y-1.5">
              <Label className="text-xs text-[#9A969A]">כתובת שנוצרה</Label>
              <div className="flex items-center gap-2 rounded-md border border-[#B8D900]/30 bg-[#B8D900]/5 p-3">
                <code className="flex-1 break-all text-xs text-[#B8D900]" dir="ltr">
                  {generatedUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedUrl, "generated")}
                  className="shrink-0 text-[#B8D900] hover:bg-[#B8D900]/10"
                >
                  {copiedGenerated ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              onClick={handleSaveLink}
              disabled={isSaveDisabled || saving}
              className="gap-1.5 bg-[#B8D900] text-[#2A2628] hover:bg-[#B8D900]/90 disabled:opacity-40"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              שמירת קישור
            </Button>

            <Button
              variant="outline"
              onClick={() => copyToClipboard(generatedUrl, "generated")}
              disabled={!generatedUrl || !effectiveSource || !effectiveMedium || !form.utm_campaign}
              className="gap-1.5 border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50 hover:text-[#2A2628] disabled:opacity-40"
            >
              {copiedGenerated ? <Check className="size-4" /> : <Copy className="size-4" />}
              העתקת URL
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const qs = generatedUrl.split("?")[1] || "";
                copyToClipboard(qs ? `?${qs}` : "", "params");
              }}
              disabled={!generatedUrl || !effectiveSource || !effectiveMedium || !form.utm_campaign}
              className="gap-1.5 border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50 hover:text-[#2A2628] disabled:opacity-40"
            >
              {copiedParams ? <Check className="size-4" /> : <Copy className="size-4" />}
              העתקת פרמטרים
            </Button>

            <Button
              variant="outline"
              onClick={() => setPresetDialogOpen(true)}
              disabled={!effectiveSource || !effectiveMedium}
              className="gap-1.5 border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50 hover:text-[#2A2628] disabled:opacity-40"
            >
              <Bookmark className="size-4" />
              שמירה כתבנית
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setForm({ ...EMPTY_FORM });
                setCustomSource("");
                setCustomMedium("");
                setSourceMode("preset");
                setMediumMode("preset");
              }}
              className="text-[#716C70] hover:text-[#9A969A]"
            >
              איפוס טופס
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Saved Links Table ── */}
      <Card className="border-[#E5E5E5] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[#2A2628]">
            <Link2 className="size-4 text-[#B8D900]" />
            קישורים שמורים
          </CardTitle>
          <CardDescription className="text-[#9A969A]">
            כל הקישורים המתויגים שנשמרו לעמוד זה
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-[#B8D900]" />
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link2 className="mb-3 size-10 text-[#716C70]" />
              <p className="text-sm text-[#9A969A]">
                עדיין לא נשמרו קישורים. צרו את הקישור הראשון למעלה.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#716C70]/20 hover:bg-transparent">
                    <TableHead className="text-right text-[#9A969A]">שם</TableHead>
                    <TableHead className="text-right text-[#9A969A]">פלטפורמה</TableHead>
                    <TableHead className="text-right text-[#9A969A]">כתובת URL</TableHead>
                    <TableHead className="text-center text-[#9A969A]">
                      <span className="flex items-center justify-center gap-1">
                        <MousePointerClick className="size-3" />
                        קליקים
                      </span>
                    </TableHead>
                    <TableHead className="text-center text-[#9A969A]">
                      <span className="flex items-center justify-center gap-1">
                        <Users className="size-3" />
                        לידים
                      </span>
                    </TableHead>
                    <TableHead className="text-right text-[#9A969A]">תאריך</TableHead>
                    <TableHead className="text-center text-[#9A969A]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id} className="border-[#716C70]/10 hover:bg-[#F9FAFB]">
                      <TableCell className="font-medium text-[#2A2628]">
                        {link.label}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {getPlatformIcon(detectIcon(link.utm_source), "size-4 text-[#B8D900]")}
                          <span className="text-xs text-[#9A969A]">{link.utm_source}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <code className="block truncate text-xs text-[#716C70]" dir="ltr" title={link.full_url}>
                          {link.full_url}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-[#716C70]/20 text-[#9A969A]">
                          {link.clicks.toLocaleString("he-IL")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-[#B8D900]/20 text-[#B8D900]">
                          {link.leads.toLocaleString("he-IL")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#716C70]">
                        {formatDate(link.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(link.full_url, link.id)}
                            className="size-8 p-0 text-[#9A969A] hover:text-[#B8D900]"
                            title="העתקה"
                          >
                            {copiedId === link.id ? (
                              <Check className="size-3.5" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(link.full_url, "_blank")}
                            className="size-8 p-0 text-[#9A969A] hover:text-[#4A4648]"
                            title="פתיחה בחלון חדש"
                          >
                            <ExternalLink className="size-3.5" />
                          </Button>
                          {deleteConfirmId === link.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLink(link.id)}
                                className="size-8 p-0 text-red-400 hover:text-red-300"
                                title="אישור מחיקה"
                              >
                                <Check className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(null)}
                                className="size-8 p-0 text-[#9A969A] hover:text-[#4A4648]"
                                title="ביטול"
                              >
                                <X className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(link.id)}
                              className="size-8 p-0 text-[#9A969A] hover:text-red-400"
                              title="מחיקה"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Save as Preset Dialog ── */}
      <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
        <DialogContent className="border-[#E5E5E5] bg-white sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A2628]">שמירה כתבנית</DialogTitle>
            <DialogDescription className="text-[#9A969A]">
              שמרו את ערכי ה-UTM הנוכחיים כתבנית לשימוש חוזר
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-[#9A969A]">שם התבנית</Label>
              <Input
                placeholder='לדוגמה: "קמפיין פייסבוק כללי"'
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="border-[#E5E5E5] bg-white text-[#2A2628] placeholder:text-[#9A969A]"
              />
            </div>

            <div className="rounded-md border border-[#716C70]/20 p-3 text-xs text-[#9A969A]">
              <p><strong>Source:</strong> {effectiveSource || "—"}</p>
              <p><strong>Medium:</strong> {effectiveMedium || "—"}</p>
              {form.utm_campaign && <p><strong>Campaign:</strong> {form.utm_campaign}</p>}
              {form.utm_content && <p><strong>Content:</strong> {form.utm_content}</p>}
              {form.utm_term && <p><strong>Term:</strong> {form.utm_term}</p>}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setPresetDialogOpen(false)}
                className="text-[#9A969A] hover:text-[#4A4648]"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSavePreset}
                disabled={!presetName || savingPreset}
                className="gap-1.5 bg-[#B8D900] text-[#2A2628] hover:bg-[#B8D900]/90 disabled:opacity-40"
              >
                {savingPreset ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                שמירה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
