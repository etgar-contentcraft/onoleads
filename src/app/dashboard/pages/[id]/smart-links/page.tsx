/**
 * Smart Links management page — Bitly-style short trackable links per landing page.
 * Allows creating, viewing, toggling, and deleting smart links with full analytics.
 * Each link redirects through /go/{slug} and tracks clicks, devices, and referrers.
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Plus,
  Copy,
  Trash2,
  BarChart3,
  QrCode,
  Pause,
  Play,
  Loader2,
  ExternalLink,
  Link2,
  MousePointerClick,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Calendar,
  X,
  Check,
  Download,
  Pencil,
  Save,
} from "lucide-react";
import QRCodeLib from "qrcode";

/* ─── Constants ─── */

/** Base URL for short links */
const SHORT_LINK_BASE = "https://onoleads.vercel.app/go/";

/** Length of auto-generated slug */
const AUTO_SLUG_LENGTH = 6;

/** Characters used for random slug generation */
const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Device type labels in Hebrew */
const DEVICE_LABELS: Record<string, string> = {
  mobile: "נייד",
  desktop: "מחשב",
  tablet: "טאבלט",
};

/** Device type icons mapped by device string */
const DEVICE_ICONS: Record<string, typeof Monitor> = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
};

/** Device type colors for percentage bars */
const DEVICE_COLORS: Record<string, string> = {
  mobile: "#B8D900",
  desktop: "#3B82F6",
  tablet: "#F59E0B",
};

/** Default QR style index */
const DEFAULT_QR_STYLE_INDEX = 0;

/* ─── Types ─── */

/** Smart link row from the database */
interface SmartLink {
  id: string;
  page_id: string;
  created_by: string;
  slug: string;
  label: string;
  target_url: string;
  expires_at: string | null;
  fallback_url: string | null;
  is_active: boolean;
  created_at: string;
}

/** Aggregated click stats for a single smart link */
interface LinkStats {
  totalClicks: number;
  uniqueVisitors: number;
  clicksToday: number;
  leads: number;
  devices: { type: string; count: number; percentage: number }[];
  referrers: { domain: string; count: number }[];
  dailyClicks: { date: string; count: number }[];
}

/** Form state for creating a new smart link */
interface NewLinkForm {
  label: string;
  slug: string;
  utmParams: string;
  expiresAt: string;
  fallbackUrl: string;
}

/* ─── Helpers ─── */

/**
 * Generates a random alphanumeric slug of given length.
 * @param length - Number of characters (default AUTO_SLUG_LENGTH)
 * @returns Random slug string
 */
function generateRandomSlug(length: number = AUTO_SLUG_LENGTH): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += SLUG_CHARS.charAt(Math.floor(Math.random() * SLUG_CHARS.length));
  }
  return result;
}

/**
 * Copies text to the clipboard and returns true on success.
 * @param text - The string to copy
 * @returns Promise resolving to success boolean
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a date string to a localized Hebrew short date.
 * @param dateStr - ISO date string
 * @returns Formatted date like "05/04/2026"
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("he-IL");
}

/**
 * Determines the status of a smart link based on its properties.
 * @param link - The smart link object
 * @returns "active" | "expired" | "paused"
 */
function getLinkStatus(link: SmartLink): "active" | "expired" | "paused" {
  if (!link.is_active) return "paused";
  if (link.expires_at && new Date(link.expires_at) < new Date()) return "expired";
  return "active";
}

/**
 * Returns Hebrew label and color for a link status.
 * @param status - The link status string
 * @returns Object with label and color class
 */
function getStatusDisplay(status: "active" | "expired" | "paused"): { label: string; color: string } {
  switch (status) {
    case "active":
      return { label: "פעיל", color: "bg-green-500/20 text-green-400 border-green-500/30" };
    case "expired":
      return { label: "פג תוקף", color: "bg-red-500/20 text-red-400 border-red-500/30" };
    case "paused":
      return { label: "מושהה", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  }
}

/* ─── QR Code Generation ─── */

/** Branded QR style presets using Ono Academic College brand colors */
interface QrStyle {
  id: string;
  name: string;
  dark: string;
  light: string;
}

/** Available QR code color themes */
/**
 * QR style presets based on Ono Academic College brand book (Pantone 382U / 431U).
 * Brand Green: #B8D900 (Pantone 382U, C28 M0 Y100 K0, R184 G217 B0)
 * Brand Gray:  #716C70 (Pantone 431U, C9 M9 Y0 K62, R113 G108 B112)
 */
const QR_STYLES: QrStyle[] = [
  { id: "classic", name: "קלאסי", dark: "#000000", light: "#FFFFFF" },
  { id: "ono_green", name: "ירוק אונו", dark: "#B8D900", light: "#FFFFFF" },
  { id: "ono_gray", name: "אפור אונו", dark: "#716C70", light: "#FFFFFF" },
  { id: "green_on_gray", name: "ירוק על אפור", dark: "#B8D900", light: "#716C70" },
  { id: "gray_on_green", name: "אפור על ירוק", dark: "#716C70", light: "#D4ED6E" },
  { id: "dark_green", name: "ירוק כהה", dark: "#4A7A00", light: "#FFFFFF" },
  { id: "ono_elegant", name: "אלגנטי", dark: "#716C70", light: "#F5F5F0" },
  { id: "ono_fresh", name: "רענן", dark: "#6B9B00", light: "#F0F7D4" },
];

/**
 * Generates a real scannable QR code as a data URL using the 'qrcode' library.
 * @param url - The URL to encode into the QR code
 * @param style - Color style preset (default: classic black/white)
 * @param size - Canvas width in pixels (default 512 for high-quality print)
 * @returns Promise resolving to a PNG data URL string
 */
async function generateQRCodeDataURL(
  url: string,
  style: QrStyle = QR_STYLES[0],
  size: number = 512,
): Promise<string> {
  try {
    return await QRCodeLib.toDataURL(url, {
      width: size,
      margin: 2,
      color: { dark: style.dark, light: style.light },
      errorCorrectionLevel: "M",
    });
  } catch (err) {
    console.error("QR code generation error:", err);
    return "";
  }
}

/* ─── Main Page Component ─── */

/**
 * SmartLinksPage — manages short trackable links for a specific landing page.
 * Fetches links from Supabase, allows CRUD operations, and shows per-link analytics.
 */
export default function SmartLinksPage() {
  const params = useParams();
  const pageId = params.id as string;
  const supabase = createClient();

  /* ── State ── */
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [clickCounts, setClickCounts] = useState<Record<string, { total: number; unique: number }>>({});
  const [pageSlug, setPageSlug] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* Analytics dialog state */
  const [analyticsLink, setAnalyticsLink] = useState<SmartLink | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<LinkStats | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  /* QR dialog state */
  const [qrLink, setQrLink] = useState<SmartLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrStyleIndex, setQrStyleIndex] = useState(DEFAULT_QR_STYLE_INDEX);
  const [pendingQrLink, setPendingQrLink] = useState<SmartLink | null>(null);

  /* Edit link dialog state */
  const [editLink, setEditLink] = useState<SmartLink | null>(null);
  const [editForm, setEditForm] = useState({ label: "", expiresAt: "", fallbackUrl: "" });
  const [editSaving, setEditSaving] = useState(false);

  /* New link form */
  const [form, setForm] = useState<NewLinkForm>({
    label: "",
    slug: generateRandomSlug(),
    utmParams: "",
    expiresAt: "",
    fallbackUrl: "",
  });
  const [formError, setFormError] = useState("");

  /* ── Data Fetching ── */

  /**
   * Loads all smart links for the current page and their aggregated click counts.
   * Also fetches the page slug to construct target URLs.
   */
  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      /* Fetch page slug */
      const { data: pageData } = await supabase
        .from("pages")
        .select("slug")
        .eq("id", pageId)
        .single();

      if (pageData) setPageSlug(pageData.slug);

      /* Fetch all smart links for this page */
      const { data: linksData, error } = await supabase
        .from("smart_links")
        .select("*")
        .eq("page_id", pageId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching smart links:", error);
        return;
      }

      const fetchedLinks = (linksData || []) as SmartLink[];
      setLinks(fetchedLinks);

      /* Fetch click counts for all links */
      if (fetchedLinks.length > 0) {
        const linkIds = fetchedLinks.map((l) => l.id);
        const { data: clicks } = await supabase
          .from("smart_link_clicks")
          .select("link_id, ip_hash")
          .in("link_id", linkIds);

        const counts: Record<string, { total: number; unique: number }> = {};
        if (clicks) {
          for (const link of fetchedLinks) {
            const linkClicks = clicks.filter((c) => c.link_id === link.id);
            const uniqueIps = new Set(linkClicks.map((c) => c.ip_hash));
            counts[link.id] = { total: linkClicks.length, unique: uniqueIps.size };
          }
        }
        setClickCounts(counts);
      }
    } finally {
      setLoading(false);
    }
  }, [pageId, supabase]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  /* ── Create Link ── */

  /**
   * Creates a new smart link in the database.
   * Validates the slug for uniqueness and constructs the target URL.
   */
  const handleCreateLink = useCallback(async () => {
    if (!form.label.trim()) {
      setFormError("יש להזין שם לקישור");
      return;
    }
    if (!form.slug.trim()) {
      setFormError("יש להזין קוד קצר");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setFormError("הקוד הקצר יכול להכיל רק אותיות באנגלית קטנות, מספרים ומקפים");
      return;
    }

    setCreating(true);
    setFormError("");

    try {
      /* Check slug uniqueness */
      const { data: existing } = await supabase
        .from("smart_links")
        .select("id")
        .eq("slug", form.slug)
        .maybeSingle();

      if (existing) {
        setFormError("הקוד הקצר הזה כבר בשימוש. נסה קוד אחר.");
        setCreating(false);
        return;
      }

      /* Build target URL */
      let targetUrl = `https://onoleads.vercel.app/lp/${pageSlug}`;
      if (form.utmParams.trim()) {
        const separator = targetUrl.includes("?") ? "&" : "?";
        targetUrl += separator + form.utmParams.trim();
      }

      /* Get current user */
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("smart_links").insert({
        page_id: pageId,
        created_by: user?.id || "",
        slug: form.slug,
        label: form.label.trim(),
        target_url: targetUrl,
        expires_at: form.expiresAt || null,
        fallback_url: form.fallbackUrl.trim() || null,
        is_active: true,
      });

      if (error) {
        console.error("Error creating smart link:", error);
        setFormError("שגיאה ביצירת הקישור. נסה שוב.");
        return;
      }

      /* Save the created link info for QR dialog */
      const createdSlug = form.slug;
      const createdLabel = form.label.trim();

      /* Reset form and refresh */
      setForm({
        label: "",
        slug: generateRandomSlug(),
        utmParams: "",
        expiresAt: "",
        fallbackUrl: "",
      });
      setShowCreateForm(false);
      await fetchLinks();

      /* Auto-open QR code dialog for the newly created link */
      const newLink: SmartLink = {
        id: "",
        page_id: pageId,
        created_by: "",
        slug: createdSlug,
        label: createdLabel,
        target_url: targetUrl,
        is_active: true,
        expires_at: form.expiresAt || null,
        fallback_url: form.fallbackUrl.trim() || null,
        created_at: new Date().toISOString(),
      };
      setPendingQrLink(newLink);
    } finally {
      setCreating(false);
    }
  }, [form, pageId, pageSlug, supabase, fetchLinks]);

  /* ── Toggle Active ── */

  /**
   * Toggles the is_active state of a smart link.
   * @param link - The smart link to toggle
   */
  const handleToggleActive = useCallback(async (link: SmartLink) => {
    setTogglingId(link.id);
    try {
      await supabase
        .from("smart_links")
        .update({ is_active: !link.is_active })
        .eq("id", link.id);
      await fetchLinks();
    } finally {
      setTogglingId(null);
    }
  }, [supabase, fetchLinks]);

  /* ── Delete Link ── */

  /**
   * Deletes a smart link and all its associated click records.
   * @param linkId - The ID of the link to delete
   */
  const handleDelete = useCallback(async (linkId: string) => {
    setDeletingId(linkId);
    try {
      /* Delete clicks first (foreign key) */
      await supabase.from("smart_link_clicks").delete().eq("link_id", linkId);
      await supabase.from("smart_links").delete().eq("id", linkId);
      await fetchLinks();
    } finally {
      setDeletingId(null);
    }
  }, [supabase, fetchLinks]);

  /* ── Copy Short URL ── */

  /**
   * Copies the full short URL to clipboard and shows a brief confirmation.
   * @param slug - The link slug to build the URL from
   */
  const handleCopy = useCallback(async (slug: string) => {
    const success = await copyToClipboard(`${SHORT_LINK_BASE}${slug}`);
    if (success) {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    }
  }, []);

  /* ── Analytics Dialog ── */

  /**
   * Opens the analytics dialog for a specific link and loads its click data.
   * @param link - The smart link to show analytics for
   */
  const handleOpenAnalytics = useCallback(async (link: SmartLink) => {
    setAnalyticsLink(link);
    setAnalyticsLoading(true);
    setAnalyticsStats(null);

    try {
      const { data: clicks } = await supabase
        .from("smart_link_clicks")
        .select("*")
        .eq("link_id", link.id)
        .order("clicked_at", { ascending: false });

      if (!clicks || clicks.length === 0) {
        setAnalyticsStats({
          totalClicks: 0,
          uniqueVisitors: 0,
          clicksToday: 0,
          leads: 0,
          devices: [],
          referrers: [],
          dailyClicks: [],
        });
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const uniqueIps = new Set(clicks.map((c) => c.ip_hash));
      const clicksToday = clicks.filter((c) => c.clicked_at?.startsWith(today)).length;

      /* Device breakdown */
      const deviceMap: Record<string, number> = {};
      for (const click of clicks) {
        const device = click.device_type || "desktop";
        deviceMap[device] = (deviceMap[device] || 0) + 1;
      }
      const devices = Object.entries(deviceMap).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / clicks.length) * 100),
      }));

      /* Top referrers */
      const refMap: Record<string, number> = {};
      for (const click of clicks) {
        if (click.referrer) {
          try {
            const domain = new URL(click.referrer).hostname || click.referrer;
            refMap[domain] = (refMap[domain] || 0) + 1;
          } catch {
            refMap[click.referrer] = (refMap[click.referrer] || 0) + 1;
          }
        }
      }
      const referrers = Object.entries(refMap)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      /* Daily clicks (last 7 days) */
      const dailyMap: Record<string, number> = {};
      const DAYS_TO_SHOW = 7;
      for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyMap[d.toISOString().split("T")[0]] = 0;
      }
      for (const click of clicks) {
        const day = click.clicked_at?.split("T")[0];
        if (day && day in dailyMap) {
          dailyMap[day]++;
        }
      }
      const dailyClicks = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

      setAnalyticsStats({
        totalClicks: clicks.length,
        uniqueVisitors: uniqueIps.size,
        clicksToday,
        leads: 0, /* Can be connected to form submissions later */
        devices,
        referrers,
        dailyClicks,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [supabase]);

  /* ── QR Code Dialog ── */

  /**
   * Opens the QR code dialog and generates a scannable QR code for the link.
   * @param link - The smart link to generate QR for
   */
  const handleOpenQR = useCallback(async (link: SmartLink) => {
    setQrLink(link);
    setQrStyleIndex(DEFAULT_QR_STYLE_INDEX);
    const dataUrl = await generateQRCodeDataURL(
      `${SHORT_LINK_BASE}${link.slug}`,
      QR_STYLES[DEFAULT_QR_STYLE_INDEX],
    );
    setQrDataUrl(dataUrl);
  }, []);

  /* Auto-open QR dialog after creating a new link */
  useEffect(() => {
    if (pendingQrLink) {
      handleOpenQR(pendingQrLink);
      setPendingQrLink(null);
    }
  }, [pendingQrLink, handleOpenQR]);

  /**
   * Changes the QR code style and regenerates the image.
   * @param index - Index of the style in QR_STYLES
   */
  const handleQrStyleChange = useCallback(async (index: number) => {
    if (!qrLink) return;
    setQrStyleIndex(index);
    const dataUrl = await generateQRCodeDataURL(
      `${SHORT_LINK_BASE}${qrLink.slug}`,
      QR_STYLES[index],
    );
    setQrDataUrl(dataUrl);
  }, [qrLink]);

  /**
   * Opens the edit dialog for a smart link.
   * @param link - The smart link to edit
   */
  const handleOpenEdit = useCallback((link: SmartLink) => {
    setEditLink(link);
    setEditForm({
      label: link.label,
      expiresAt: link.expires_at ? link.expires_at.slice(0, 16) : "",
      fallbackUrl: link.fallback_url || "",
    });
  }, []);

  /**
   * Saves edited smart link fields to the database.
   */
  const handleSaveEdit = useCallback(async () => {
    if (!editLink || !editForm.label.trim()) return;
    setEditSaving(true);
    try {
      await supabase
        .from("smart_links")
        .update({
          label: editForm.label.trim(),
          expires_at: editForm.expiresAt || null,
          fallback_url: editForm.fallbackUrl.trim() || null,
        })
        .eq("id", editLink.id);
      setEditLink(null);
      await fetchLinks();
    } finally {
      setEditSaving(false);
    }
  }, [editLink, editForm, supabase, fetchLinks]);

  /**
   * Downloads the QR code image as a PNG file.
   */
  const handleDownloadQR = useCallback(() => {
    if (!qrDataUrl || !qrLink) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${qrLink.slug}.png`;
    a.click();
  }, [qrDataUrl, qrLink]);

  /* ── Render ── */

  return (
    <div dir="rtl" className="min-h-screen bg-[#F9FAFB] text-[#2A2628] p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/pages/${pageId}/builder`}>
              <Button variant="ghost" size="sm" className="text-[#9A969A] hover:text-[#2A2628]">
                <ArrowRight className="w-4 h-4 ml-1" />
                חזרה לבילדר
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Link2 className="w-6 h-6 text-[#B8D900]" />
                קישורים חכמים
              </h1>
              <p className="text-[#9A969A] text-sm mt-1">
                צרו קישורים קצרים עם מעקב לדף הנחיתה שלכם
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-[#B8D900] text-[#2A2628] hover:bg-[#a8c800] font-semibold"
          >
            <Plus className="w-4 h-4 ml-1" />
            קישור חדש
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="bg-white border-[#E5E5E5] mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-[#2A2628]">יצירת קישור חכם חדש</CardTitle>
              <CardDescription className="text-[#9A969A]">
                הקישור יפנה אל: onoleads.vercel.app/lp/{pageSlug}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Label */}
              <div className="space-y-2">
                <Label className="text-[#9A969A]">שם הקישור</Label>
                <Input
                  placeholder='למשל: "קמפיין קיץ פייסבוק"'
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="bg-white border-[#E5E5E5] text-[#2A2628] placeholder:text-[#C4C4C4]"
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label className="text-[#9A969A]">קוד קצר</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[#716C70] text-sm shrink-0">onoleads.vercel.app/go/</span>
                  <Input
                    placeholder="law26"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="bg-white border-[#E5E5E5] text-[#2A2628] font-mono placeholder:text-[#C4C4C4] max-w-[200px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setForm({ ...form, slug: generateRandomSlug() })}
                    className="border-[#E5E5E5] text-[#9A969A] hover:text-[#2A2628] shrink-0"
                  >
                    קוד אקראי
                  </Button>
                </div>
              </div>

              {/* UTM Params */}
              <div className="space-y-2">
                <Label className="text-[#9A969A]">פרמטרי UTM (אופציונלי)</Label>
                <Input
                  placeholder="utm_source=facebook&utm_medium=cpc&utm_campaign=summer"
                  value={form.utmParams}
                  onChange={(e) => setForm({ ...form, utmParams: e.target.value })}
                  className="bg-white border-[#E5E5E5] text-[#2A2628] font-mono text-sm placeholder:text-[#C4C4C4]"
                  dir="ltr"
                />
              </div>

              {/* Expires At */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#9A969A]">תאריך תפוגה (אופציונלי)</Label>
                  <Input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="bg-white border-[#E5E5E5] text-[#2A2628]"
                    dir="ltr"
                  />
                </div>

                {/* Fallback URL */}
                <div className="space-y-2">
                  <Label className="text-[#9A969A]">כתובת חלופית לאחר תפוגה (אופציונלי)</Label>
                  <Input
                    placeholder="https://example.com/expired"
                    value={form.fallbackUrl}
                    onChange={(e) => setForm({ ...form, fallbackUrl: e.target.value })}
                    className="bg-white border-[#E5E5E5] text-[#2A2628] font-mono text-sm placeholder:text-[#C4C4C4]"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Error message */}
              {formError && (
                <p className="text-red-400 text-sm">{formError}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleCreateLink}
                  disabled={creating}
                  className="bg-[#B8D900] text-[#2A2628] hover:bg-[#a8c800] font-semibold"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 ml-1" />
                  )}
                  צור קישור
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormError("");
                  }}
                  className="text-[#9A969A] hover:text-[#2A2628]"
                >
                  ביטול
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#B8D900]" />
          </div>
        )}

        {/* Empty state */}
        {!loading && links.length === 0 && (
          <Card className="bg-white border-[#E5E5E5]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Link2 className="w-12 h-12 text-[#716C70] mb-4" />
              <h3 className="text-lg font-semibold text-[#2A2628] mb-2">אין קישורים חכמים עדיין</h3>
              <p className="text-[#9A969A] text-sm mb-4">
                צרו את הקישור הראשון כדי לעקוב אחרי הקלקות ותנועה
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-[#B8D900] text-[#2A2628] hover:bg-[#a8c800] font-semibold"
              >
                <Plus className="w-4 h-4 ml-1" />
                צור קישור ראשון
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Links Table */}
        {!loading && links.length > 0 && (
          <div className="space-y-3">
            {links.map((link) => {
              const status = getLinkStatus(link);
              const statusDisplay = getStatusDisplay(status);
              const counts = clickCounts[link.id] || { total: 0, unique: 0 };
              const shortUrl = `${SHORT_LINK_BASE}${link.slug}`;

              return (
                <Card key={link.id} className="bg-white border-[#E5E5E5] hover:border-[#B8D900]/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Link info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#2A2628] truncate">{link.label}</h3>
                          <Badge className={`text-xs ${statusDisplay.color} border`}>
                            {statusDisplay.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-[#B8D900] font-mono truncate" dir="ltr">
                            {shortUrl}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-[#9A969A] hover:text-[#2A2628]"
                            onClick={() => handleCopy(link.slug)}
                          >
                            {copiedSlug === link.slug ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                        {link.expires_at && (
                          <p className="text-[#716C70] text-xs mt-1">
                            <Calendar className="w-3 h-3 inline ml-1" />
                            תפוגה: {formatDate(link.expires_at)}
                          </p>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 text-center shrink-0">
                        <div>
                          <p className="text-lg font-bold text-[#2A2628]">{counts.total}</p>
                          <p className="text-[#9A969A] text-xs">הקלקות</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-[#2A2628]">{counts.unique}</p>
                          <p className="text-[#9A969A] text-xs">מבקרים</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#9A969A] hover:text-[#2A2628]"
                          onClick={() => handleOpenAnalytics(link)}
                          title="אנליטיקס"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#9A969A] hover:text-[#2A2628]"
                          onClick={() => handleOpenQR(link)}
                          title="QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#9A969A] hover:text-[#2A2628]"
                          onClick={() => handleOpenEdit(link)}
                          title="עריכה"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#9A969A] hover:text-[#2A2628]"
                          onClick={() => handleToggleActive(link)}
                          disabled={togglingId === link.id}
                          title={link.is_active ? "השהה" : "הפעל"}
                        >
                          {togglingId === link.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : link.is_active ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          onClick={() => handleDelete(link.id)}
                          disabled={deletingId === link.id}
                          title="מחק"
                        >
                          {deletingId === link.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Analytics Dialog */}
      <Dialog open={!!analyticsLink} onOpenChange={() => setAnalyticsLink(null)}>
        <DialogContent className="bg-white border-[#E5E5E5] text-[#2A2628] max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#B8D900]" />
              אנליטיקס — {analyticsLink?.label}
            </DialogTitle>
            <DialogDescription className="text-[#9A969A]">
              נתוני הקלקות ומבקרים עבור הקישור
            </DialogDescription>
          </DialogHeader>

          {analyticsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#B8D900]" />
            </div>
          )}

          {analyticsStats && !analyticsLoading && (
            <div className="space-y-6 mt-4">
              {/* Top metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard
                  icon={<MousePointerClick className="w-4 h-4" />}
                  label="הקלקות"
                  value={analyticsStats.totalClicks}
                />
                <MetricCard
                  icon={<Users className="w-4 h-4" />}
                  label="מבקרים ייחודיים"
                  value={analyticsStats.uniqueVisitors}
                />
                <MetricCard
                  icon={<Calendar className="w-4 h-4" />}
                  label="הקלקות היום"
                  value={analyticsStats.clicksToday}
                />
                <MetricCard
                  icon={<Globe className="w-4 h-4" />}
                  label="לידים"
                  value={analyticsStats.leads}
                />
              </div>

              {/* Device breakdown */}
              {analyticsStats.devices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#9A969A] mb-3">התפלגות מכשירים</h4>
                  <div className="space-y-2">
                    {analyticsStats.devices.map((device) => {
                      const DeviceIcon = DEVICE_ICONS[device.type] || Monitor;
                      const color = DEVICE_COLORS[device.type] || "#9A969A";
                      return (
                        <div key={device.type} className="flex items-center gap-3">
                          <DeviceIcon className="w-4 h-4 shrink-0" style={{ color }} />
                          <span className="text-sm text-[#9A969A] w-16 shrink-0">
                            {DEVICE_LABELS[device.type] || device.type}
                          </span>
                          <div className="flex-1 bg-white rounded-full h-5 overflow-hidden">
                            <div
                              className="h-full rounded-full flex items-center justify-end px-2 text-xs font-bold transition-all"
                              style={{
                                width: `${Math.max(device.percentage, 8)}%`,
                                backgroundColor: color,
                                color: "#2A2628",
                              }}
                            >
                              {device.percentage}%
                            </div>
                          </div>
                          <span className="text-xs text-[#716C70] w-10 text-left shrink-0" dir="ltr">
                            ({device.count})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top referrers */}
              {analyticsStats.referrers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#9A969A] mb-3">מקורות תנועה</h4>
                  <div className="space-y-1">
                    {analyticsStats.referrers.map((ref) => (
                      <div key={ref.domain} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white">
                        <span className="text-sm text-[#2A2628] truncate" dir="ltr">{ref.domain}</span>
                        <Badge variant="secondary" className="bg-white text-[#B8D900] text-xs">
                          {ref.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily clicks (last 7 days) */}
              {analyticsStats.dailyClicks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-[#9A969A] mb-3">הקלקות לפי יום (7 ימים אחרונים)</h4>
                  <div className="space-y-1">
                    {analyticsStats.dailyClicks.map((day) => (
                      <div key={day.date} className="flex items-center justify-between py-1 px-2 rounded hover:bg-white">
                        <span className="text-sm text-[#9A969A]" dir="ltr">{day.date}</span>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 rounded bg-[#B8D900]"
                            style={{
                              width: `${Math.max(
                                (day.count / Math.max(...analyticsStats.dailyClicks.map((d) => d.count), 1)) * 120,
                                4
                              )}px`,
                            }}
                          />
                          <span className="text-xs text-[#2A2628] w-8 text-left" dir="ltr">{day.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty analytics state */}
              {analyticsStats.totalClicks === 0 && (
                <div className="text-center py-8">
                  <BarChart3 className="w-10 h-10 text-[#716C70] mx-auto mb-3" />
                  <p className="text-[#9A969A]">אין נתונים עדיין. שתפו את הקישור כדי להתחיל לעקוב.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog with branded style picker */}
      <Dialog open={!!qrLink} onOpenChange={() => setQrLink(null)}>
        <DialogContent className="bg-white border-[#E5E5E5] text-[#2A2628] max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#B8D900]" />
              QR Code — {qrLink?.label}
            </DialogTitle>
            <DialogDescription className="text-[#9A969A]">
              סרקו את הקוד כדי לפתוח את הקישור
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${qrLink?.slug}`}
                className="w-56 h-56 rounded-lg p-2 border border-[#E5E5E5]"
              />
            )}
            <p className="text-[#B8D900] font-mono text-sm" dir="ltr">
              {SHORT_LINK_BASE}{qrLink?.slug}
            </p>

            {/* Style picker */}
            <div className="w-full">
              <Label className="text-xs text-[#9A969A] mb-2 block">סגנון QR</Label>
              <div className="grid grid-cols-3 gap-2">
                {QR_STYLES.map((style, i) => (
                  <button
                    key={style.id}
                    onClick={() => handleQrStyleChange(i)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      qrStyleIndex === i
                        ? "border-[#B8D900] bg-[#B8D900]/10 text-[#2A2628]"
                        : "border-[#E5E5E5] text-[#9A969A] hover:border-[#B8D900]/50"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-sm border border-[#E5E5E5] shrink-0"
                      style={{ background: `linear-gradient(135deg, ${style.dark} 50%, ${style.light} 50%)` }}
                    />
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <Button
                onClick={handleDownloadQR}
                className="flex-1 bg-[#B8D900] text-[#2A2628] hover:bg-[#a8c800] font-semibold"
              >
                <Download className="w-4 h-4 ml-1" />
                הורד PNG
              </Button>
              <Button
                variant="outline"
                onClick={() => qrLink && handleCopy(qrLink.slug)}
                className="border-[#E5E5E5] text-[#9A969A] hover:text-[#2A2628]"
              >
                {copiedSlug === qrLink?.slug ? (
                  <Check className="w-4 h-4 ml-1 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 ml-1" />
                )}
                העתק URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Link Dialog */}
      <Dialog open={!!editLink} onOpenChange={() => setEditLink(null)}>
        <DialogContent className="bg-white border-[#E5E5E5] text-[#2A2628] max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#B8D900]" />
              עריכת קישור
            </DialogTitle>
            <DialogDescription className="text-[#9A969A]">
              ערכו את פרטי הקישור
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[#2A2628] text-sm font-medium">שם הקישור</Label>
              <Input
                value={editForm.label}
                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                className="mt-1 bg-white border-[#E5E5E5] text-[#2A2628] placeholder:text-[#C4C4C4]"
              />
            </div>
            <div>
              <Label className="text-[#2A2628] text-sm font-medium">תאריך תפוגה (אופציונלי)</Label>
              <Input
                type="datetime-local"
                value={editForm.expiresAt}
                onChange={(e) => setEditForm({ ...editForm, expiresAt: e.target.value })}
                className="mt-1 bg-white border-[#E5E5E5] text-[#2A2628]"
              />
            </div>
            <div>
              <Label className="text-[#2A2628] text-sm font-medium">URL חלופי (אם פג תוקף)</Label>
              <Input
                value={editForm.fallbackUrl}
                onChange={(e) => setEditForm({ ...editForm, fallbackUrl: e.target.value })}
                placeholder="https://..."
                className="mt-1 bg-white border-[#E5E5E5] text-[#2A2628] placeholder:text-[#C4C4C4]"
                dir="ltr"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveEdit}
                disabled={editSaving || !editForm.label.trim()}
                className="flex-1 bg-[#B8D900] text-[#2A2628] hover:bg-[#a8c800] font-semibold"
              >
                {editSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                ) : (
                  <Save className="w-4 h-4 ml-1" />
                )}
                שמור
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditLink(null)}
                className="border-[#E5E5E5] text-[#9A969A]"
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Sub-components ─── */

/**
 * Small metric card used in the analytics dialog.
 * @param props.icon - React node for the icon
 * @param props.label - Hebrew label text
 * @param props.value - Numeric value to display
 */
function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg p-3 text-center">
      <div className="flex items-center justify-center text-[#B8D900] mb-1">
        {icon}
      </div>
      <p className="text-xl font-bold text-[#2A2628]">{value.toLocaleString()}</p>
      <p className="text-[#9A969A] text-xs">{label}</p>
    </div>
  );
}
