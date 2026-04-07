/**
 * Enhanced Analytics Dashboard — Google Analytics-inspired.
 * Features: landing page filter (single/multi), GA-style date picker with period
 * comparison, session vs user view, attribution models (first/last/linear/U-shaped),
 * bounce rate, avg session duration, hourly heatmap, and more.
 * All charts are CSS-only (no external chart libraries).
 */

"use client";

import { Suspense, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Users,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  MapPin,
  Send,
  AlertTriangle,
  Calendar,
  Filter,
  X,
  BarChart3,
  Clock,
  MousePointerClick,
  Layers,
  Activity,
  ChevronDown,
  RefreshCw,
  Search,
  Check,
} from "lucide-react";
import Link from "next/link";

import type {
  AnalyticsEvent,
  PageInfo,
  AnalyticsData,
  AttributionModel,
  ViewMode,
  PeriodPreset,
  AnalyticsFilters,
} from "@/lib/analytics/types";
import { EMPTY_FILTERS } from "@/lib/analytics/types";
import {
  computeAllAnalytics,
  getDateRange,
  formatDuration,
  pctChange,
  applyFilters,
  getUniqueValues,
} from "@/lib/analytics/compute";

/* ============================================================================ */
/*  Constants                                                                   */
/* ============================================================================ */

/** Maximum number of rows fetched from Supabase per query */
const MAX_ROWS = 50000;

/** Time period presets for the date range picker */
const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "היום" },
  { value: "yesterday", label: "אתמול" },
  { value: "7d", label: "7 ימים אחרונים" },
  { value: "14d", label: "14 ימים אחרונים" },
  { value: "30d", label: "30 ימים אחרונים" },
  { value: "90d", label: "90 ימים אחרונים" },
  { value: "custom", label: "טווח מותאם" },
];

/** Attribution model options */
const ATTRIBUTION_MODELS: { value: AttributionModel; label: string; description: string }[] = [
  { value: "last_touch", label: "נגיעה אחרונה", description: "100% למקור האחרון לפני ההמרה" },
  { value: "first_touch", label: "נגיעה ראשונה", description: "100% למקור הראשון של המבקר" },
  { value: "linear", label: "לינארי", description: "חלוקה שווה בין כל נקודות המגע" },
  { value: "u_shaped", label: "U-Shaped", description: "40% ראשון, 40% אחרון, 20% לאמצע" },
];

/** Device type labels in Hebrew */
const DEVICE_LABELS: Record<string, string> = {
  mobile: "נייד",
  desktop: "מחשב",
  tablet: "טאבלט",
};

/** Device type colors */
const DEVICE_COLORS: Record<string, string> = {
  mobile: "#B8D900",
  desktop: "#3B82F6",
  tablet: "#F59E0B",
};

/** Color palette for bar charts */
const BAR_COLORS = ["#B8D900", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#EC4899", "#10B981"];

/** ISO-2 country code → Hebrew display name (the most common visitor locales) */
const COUNTRY_NAMES_HE: Record<string, string> = {
  IL: "ישראל",
  US: "ארצות הברית",
  GB: "בריטניה",
  DE: "גרמניה",
  FR: "צרפת",
  RU: "רוסיה",
  CA: "קנדה",
  AU: "אוסטרליה",
  IT: "איטליה",
  ES: "ספרד",
  NL: "הולנד",
  BE: "בלגיה",
  CH: "שווייץ",
  AT: "אוסטריה",
  SE: "שוודיה",
  NO: "נורווגיה",
  DK: "דנמרק",
  FI: "פינלנד",
  PL: "פולין",
  BR: "ברזיל",
  AR: "ארגנטינה",
  MX: "מקסיקו",
  IN: "הודו",
  CN: "סין",
  JP: "יפן",
  KR: "דרום קוריאה",
  TR: "טורקיה",
  AE: "איחוד האמירויות",
  SA: "ערב הסעודית",
  EG: "מצרים",
  ZA: "דרום אפריקה",
};

/** Country code → flag emoji helper for the geo breakdown card */
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  /* Convert ISO-2 → regional indicator symbols (flag emoji) */
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(A + (code.charCodeAt(0) - a)) + String.fromCodePoint(A + (code.charCodeAt(1) - a));
}

/* ============================================================================ */
/*  UI Helper Components                                                        */
/* ============================================================================ */

/**
 * Renders a percentage-change badge with arrow icon and color.
 */
function ChangeBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[#9A969A]">
        <Minus size={12} /> 0%
      </span>
    );
  }
  const positive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
      {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(value)}%
    </span>
  );
}

/**
 * Metric card used in the top KPI row.
 */
function MetricCard({
  label, value, change, icon, color, subtitle,
}: {
  label: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[#9A969A] font-medium">{label}</p>
            <p className="text-3xl font-bold text-[#2a2628] tabular-nums">
              {typeof value === "number" ? value.toLocaleString("he-IL") : value}
            </p>
            <div className="flex items-center gap-2">
              <ChangeBadge value={change} />
              {subtitle && (
                <span className="text-[10px] text-[#9A969A]">{subtitle}</span>
              )}
            </div>
          </div>
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================================ */
/*  Page Filter Dropdown                                                        */
/* ============================================================================ */

/**
 * Multi-select dropdown for filtering by landing pages.
 * Shows a searchable list with checkboxes.
 */
function PageFilterDropdown({
  pages,
  selectedPageIds,
  onSelectionChange,
}: {
  pages: PageInfo[];
  selectedPageIds: string[];
  onSelectionChange: (ids: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  /* Close on click outside */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const togglePage = (pageId: string) => {
    if (selectedPageIds.includes(pageId)) {
      onSelectionChange(selectedPageIds.filter((id) => id !== pageId));
    } else {
      onSelectionChange([...selectedPageIds, pageId]);
    }
  };

  const clearAll = () => onSelectionChange([]);
  const selectAll = () => onSelectionChange(pages.map((p) => p.id));

  const buttonLabel = selectedPageIds.length === 0
    ? "כל הדפים"
    : selectedPageIds.length === 1
      ? pages.find((p) => p.id === selectedPageIds[0])?.title || "דף אחד"
      : `${selectedPageIds.length} דפים נבחרו`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50 transition-colors min-w-[180px]"
      >
        <Filter size={14} className="text-[#9A969A] shrink-0" />
        <span className="truncate text-[#2a2628]">{buttonLabel}</span>
        <ChevronDown size={14} className={`text-[#9A969A] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {selectedPageIds.length > 0 && (
        <button
          onClick={clearAll}
          className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
        >
          <X size={10} />
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9A969A]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש דף נחיתה..."
                className="w-full h-8 pr-8 pl-2 text-sm rounded-lg border border-gray-200 focus:border-[#B8D900] focus:outline-none"
                dir="rtl"
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100">
            <button onClick={selectAll} className="text-xs text-[#3B82F6] hover:underline">
              בחר הכל
            </button>
            <span className="text-[#9A969A]">·</span>
            <button onClick={clearAll} className="text-xs text-[#3B82F6] hover:underline">
              נקה הכל
            </button>
            <span className="text-xs text-[#9A969A] mr-auto">
              {selectedPageIds.length}/{pages.length}
            </span>
          </div>

          {/* Page list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredPages.length === 0 ? (
              <p className="text-center text-sm text-[#9A969A] py-4">לא נמצאו דפים</p>
            ) : (
              filteredPages.map((page) => {
                const isSelected = selectedPageIds.includes(page.id);
                return (
                  <button
                    key={page.id}
                    onClick={() => togglePage(page.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-[#B8D900]/5" : ""
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-[#B8D900] border-[#B8D900]" : "border-gray-300"
                    }`}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="truncate text-[#2a2628]">{page.title || "ללא שם"}</p>
                      <p className="text-[10px] text-[#9A969A] truncate">/{page.slug}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================ */
/*  Generic Multi-Select Filter Dropdown                                        */
/* ============================================================================ */

/**
 * Generic multi-select filter dropdown — used for source/medium/campaign/device/country.
 * Same UX as PageFilterDropdown but accepts an arbitrary string list of options.
 *
 * @param label - Hebrew label shown when nothing is selected (e.g. "מקורות")
 * @param icon - Lucide icon shown in the trigger button
 * @param options - Array of available values to choose from
 * @param selected - Currently selected values
 * @param onChange - Called when selection changes
 * @param displayName - Optional transformer for display labels (e.g. country code → name)
 */
function MultiSelectFilter({
  label,
  icon,
  options,
  selected,
  onChange,
  displayName,
  width = 160,
}: {
  label: string;
  icon: React.ReactNode;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  displayName?: (raw: string) => string;
  width?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  /* Close on click outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const display = displayName || ((s: string) => s);
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()) ||
    display(o).toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  const buttonLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? display(selected[0])
        : `${selected.length} ${label}`;

  /* Hide entirely when no options exist (keeps the bar tidy on small datasets) */
  if (options.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ minWidth: width }}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50 transition-colors"
      >
        <span className="text-[#9A969A] shrink-0">{icon}</span>
        <span className="truncate text-[#2a2628]">{buttonLabel}</span>
        <ChevronDown size={14} className={`text-[#9A969A] shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          aria-label="נקה"
        >
          <X size={10} />
        </button>
      )}

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9A969A]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש..."
                className="w-full h-8 pr-8 pl-2 text-sm rounded-lg border border-gray-200 focus:border-[#B8D900] focus:outline-none"
                dir="rtl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100">
            <button onClick={() => onChange(options)} className="text-xs text-[#3B82F6] hover:underline">
              בחר הכל
            </button>
            <span className="text-[#9A969A]">·</span>
            <button onClick={() => onChange([])} className="text-xs text-[#3B82F6] hover:underline">
              נקה הכל
            </button>
            <span className="text-xs text-[#9A969A] mr-auto">
              {selected.length}/{options.length}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-[#9A969A] py-4">לא נמצאו תוצאות</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(opt)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-[#B8D900]/5" : ""
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-[#B8D900] border-[#B8D900]" : "border-gray-300"
                    }`}>
                      {isSelected && <Check size={10} className="text-white" />}
                    </div>
                    <span className="truncate text-[#2a2628] text-right flex-1">{display(opt)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================ */
/*  Main Page Component                                                         */
/* ============================================================================ */

/** Wrapper with Suspense boundary for useSearchParams */
export default function AnalyticsDashboardWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" /></div>}>
      <AnalyticsDashboardPage />
    </Suspense>
  );
}

function AnalyticsDashboardPage() {
  /* ─── URL query params (for deep-linking from page list) ─── */
  const searchParams = useSearchParams();
  const initialPageId = searchParams.get("page");

  /* ─── State ─── */
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /* Filters */
  const [period, setPeriod] = useState<PeriodPreset>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showComparison, setShowComparison] = useState(true);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    initialPageId ? [initialPageId] : []
  );
  const [viewMode, setViewMode] = useState<ViewMode>("users");
  const [attributionModel, setAttributionModel] = useState<AttributionModel>("last_touch");
  /** Cross-dimension filters (UTM, device, geo, referrer) */
  const [filters, setFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS);
  /** Raw events kept in memory so filter changes don't refetch */
  const [rawCurrent, setRawCurrent] = useState<AnalyticsEvent[]>([]);
  const [rawPrev, setRawPrev] = useState<AnalyticsEvent[]>([]);
  const [rawPageInfoMap, setRawPageInfoMap] = useState<Map<string, PageInfo>>(new Map());

  /* Page list for filter */
  const [allPages, setAllPages] = useState<PageInfo[]>([]);

  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

  /* ─── Fetch page list on mount ─── */
  useEffect(() => {
    async function loadPages() {
      const { data: pagesData } = await supabase
        .from("pages")
        .select("id, title_he, slug")
        .order("title_he");
      if (pagesData) {
        setAllPages(
          pagesData.map((p: { id: string; title_he: string | null; slug: string }) => ({
            id: p.id,
            title: p.title_he || p.slug,
            slug: p.slug,
          }))
        );
      }
    }
    loadPages();
  }, []);

  /* ─── Fetch analytics data ─── */
  /**
   * Fetches raw events from Supabase. Note: filters (UTM/device/geo/referrer)
   * are applied client-side AFTER the fetch — this lets the user toggle
   * filters without re-querying the database, and keeps the filter dropdowns
   * populated with the full list of available values for the date range.
   */
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const range = getDateRange(period, dateFrom, dateTo);

      /** Columns selected from analytics_events. Includes geo + section. */
      const cols =
        "id, event_type, page_id, cookie_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, " +
        "referrer_domain, device_type, webhook_status, scroll_depth, time_on_page, country, region, city, created_at";

      /* Build query — filter by selected pages if any */
      let currentQuery = supabase
        .from("analytics_events")
        .select(cols)
        .gte("created_at", range.startISO)
        .lte("created_at", range.endISO)
        .limit(MAX_ROWS);

      let prevQuery = supabase
        .from("analytics_events")
        .select(cols)
        .gte("created_at", range.prevStartISO)
        .lte("created_at", range.prevEndISO)
        .limit(MAX_ROWS);

      if (selectedPageIds.length > 0) {
        currentQuery = currentQuery.in("page_id", selectedPageIds);
        prevQuery = prevQuery.in("page_id", selectedPageIds);
      }

      const [currentRes, prevRes] = await Promise.all([currentQuery, prevQuery]);

      /* Log errors but don't crash — treat missing table/columns as empty data */
      if (currentRes.error) console.warn("[analytics] current query error:", currentRes.error.message);
      if (prevRes.error) console.warn("[analytics] prev query error:", prevRes.error.message);

      const currentEvents = (currentRes.data ?? []) as unknown as AnalyticsEvent[];
      const prevEvents = (prevRes.data ?? []) as unknown as AnalyticsEvent[];

      /* Build page info map */
      const pageIds = new Set<string>();
      for (const e of [...currentEvents, ...prevEvents]) {
        if (e.page_id) pageIds.add(e.page_id);
      }
      const pageInfoMap = new Map<string, PageInfo>();
      if (pageIds.size > 0) {
        const { data: pagesData } = await supabase
          .from("pages")
          .select("id, title_he, slug")
          .in("id", Array.from(pageIds));
        if (pagesData) {
          for (const p of pagesData) {
            pageInfoMap.set(p.id, { id: p.id, title: p.title_he || p.slug, slug: p.slug });
          }
        }
      }

      /* Stash raw events so we can re-compute when filters change */
      setRawCurrent(currentEvents);
      setRawPrev(prevEvents);
      setRawPageInfoMap(pageInfoMap);
    } catch (err) {
      console.error("[analytics] fetchAnalytics error:", err);
      setFetchError("שגיאה בטעינת נתוני האנליטיקס. נסו לרענן את הדף.");
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo, selectedPageIds]);

  /* ─── Re-compute when filters / attribution change ───
   * This is fast (no network) — purely in-memory aggregation. */
  useEffect(() => {
    if (rawCurrent.length === 0 && rawPrev.length === 0) {
      setData(null);
      return;
    }
    const filteredCurrent = applyFilters(rawCurrent, filters);
    const filteredPrev = applyFilters(rawPrev, filters);
    const analytics = computeAllAnalytics(filteredCurrent, filteredPrev, rawPageInfoMap, attributionModel);
    setData(analytics);
  }, [rawCurrent, rawPrev, rawPageInfoMap, filters, attributionModel]);

  /* ─── Derived: filter dropdown options from current dataset ───
   * Recomputed only when raw data changes; the dropdowns stay populated even
   * after the user filters the dataset. */
  const availableFilterOptions = useMemo(
    () => ({
      sources: getUniqueValues(rawCurrent, "utm_source"),
      mediums: getUniqueValues(rawCurrent, "utm_medium"),
      campaigns: getUniqueValues(rawCurrent, "utm_campaign"),
      devices: getUniqueValues(rawCurrent, "device_type"),
      countries: getUniqueValues(rawCurrent, "country"),
      referrers: getUniqueValues(rawCurrent, "referrer_domain"),
    }),
    [rawCurrent]
  );

  /** True if any cross-dimension filter is active */
  const hasActiveFilters =
    filters.sources.length > 0 ||
    filters.mediums.length > 0 ||
    filters.campaigns.length > 0 ||
    filters.devices.length > 0 ||
    filters.countries.length > 0 ||
    filters.referrers.length > 0;

  /* Fetch on mount and when filters change */
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  /* Realtime subscription */
  useEffect(() => {
    const channel = supabase
      .channel("realtime-analytics-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analytics_events" },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAnalytics]);

  /* ─── Error state ─── */
  if (fetchError) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">אנליטיקס</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">ניתוח אירועים וביצועים</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-sm text-[#716C70]">{fetchError}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 rounded-lg bg-[#B8D900] text-white text-sm font-medium hover:bg-[#a8c400] transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  /* ─── Loading state ─── */
  if (loading || !data) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-xl font-bold text-[#2a2628]">אנליטיקס</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">ניתוח אירועים וביצועים</p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
        </div>
      </div>
    );
  }

  /* ─── Derived values ─── */
  const m = data.metrics;
  const pm = data.prevMetrics;
  const maxDailyValue = Math.max(
    ...data.dailyTimeline.map((d) => Math.max(d.views, d.submissions)),
    1
  );
  const totalDevices = data.deviceBreakdown.reduce((s, d) => s + d.count, 0);
  const maxUtm = Math.max(...data.utmSources.map((s) => s.count), 1);
  const maxHourly = Math.max(...data.hourlyHeatmap.map((h) => h.count), 1);
  const totalWebhooks = data.webhookSent + data.webhookFailed;

  /* Determine which metrics to show based on view mode */
  const primaryMetric = viewMode === "sessions" ? m.totalSessions : m.uniqueVisitors;
  const prevPrimaryMetric = viewMode === "sessions" ? pm.totalSessions : pm.uniqueVisitors;
  const primaryLabel = viewMode === "sessions" ? "סשנים" : "מבקרים ייחודיים";
  const primaryIcon = viewMode === "sessions" ? <Layers size={18} /> : <Users size={18} />;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ================================================================== */}
      {/* Header + Filters Bar                                               */}
      {/* ================================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#2a2628]">אנליטיקס</h1>
            <p className="text-sm text-[#9A969A] mt-0.5">ניתוח אירועים וביצועים</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics()}
            className="gap-1.5"
          >
            <RefreshCw size={14} />
            רענן
          </Button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          {/* Page filter — MOST IMPORTANT */}
          <PageFilterDropdown
            pages={allPages}
            selectedPageIds={selectedPageIds}
            onSelectionChange={setSelectedPageIds}
          />

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#9A969A]" />
            <Select value={period} onValueChange={(val: string | null) => { if (val) setPeriod(val as PeriodPreset); }}>
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_PRESETS.map((tp) => (
                  <SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {period === "custom" && (
              <>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-[130px]" />
                <span className="text-[#9A969A] text-sm">עד</span>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-[130px]" />
              </>
            )}
          </div>

          {/* Comparison toggle */}
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`h-9 px-3 rounded-lg text-sm border transition-colors ${
              showComparison
                ? "bg-[#B8D900]/10 border-[#B8D900]/30 text-[#8BA300]"
                : "bg-white border-gray-200 text-[#9A969A] hover:bg-gray-50"
            }`}
          >
            השוואת תקופות
          </button>

          <div className="w-px h-6 bg-gray-200 hidden sm:block" />

          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("users")}
              className={`h-8 px-3 rounded-md text-sm font-medium transition-all ${
                viewMode === "users"
                  ? "bg-white shadow-sm text-[#2a2628]"
                  : "text-[#9A969A] hover:text-[#716C70]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users size={13} /> מבקרים
              </span>
            </button>
            <button
              onClick={() => setViewMode("sessions")}
              className={`h-8 px-3 rounded-md text-sm font-medium transition-all ${
                viewMode === "sessions"
                  ? "bg-white shadow-sm text-[#2a2628]"
                  : "text-[#9A969A] hover:text-[#716C70]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers size={13} /> סשנים
              </span>
            </button>
          </div>

          {/* Attribution model */}
          <Select value={attributionModel} onValueChange={(val: string | null) => { if (val) setAttributionModel(val as AttributionModel); }}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTION_MODELS.map((am) => (
                <SelectItem key={am.value} value={am.value}>
                  <div>
                    <span>{am.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cross-dimension filters bar (UTM / device / geo / referrer) */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
          <span className="text-xs font-semibold text-[#716C70] flex items-center gap-1.5 ml-1">
            <Filter size={12} /> סינון מתקדם:
          </span>
          <MultiSelectFilter
            label="מקור (source)"
            icon={<Globe size={13} />}
            options={availableFilterOptions.sources}
            selected={filters.sources}
            onChange={(v) => setFilters({ ...filters, sources: v })}
          />
          <MultiSelectFilter
            label="ערוץ (medium)"
            icon={<Send size={13} />}
            options={availableFilterOptions.mediums}
            selected={filters.mediums}
            onChange={(v) => setFilters({ ...filters, mediums: v })}
          />
          <MultiSelectFilter
            label="קמפיין"
            icon={<MousePointerClick size={13} />}
            options={availableFilterOptions.campaigns}
            selected={filters.campaigns}
            onChange={(v) => setFilters({ ...filters, campaigns: v })}
            width={180}
          />
          <MultiSelectFilter
            label="מכשיר"
            icon={<Layers size={13} />}
            options={availableFilterOptions.devices}
            selected={filters.devices}
            onChange={(v) => setFilters({ ...filters, devices: v })}
            displayName={(d) => DEVICE_LABELS[d] || d}
            width={120}
          />
          <MultiSelectFilter
            label="מדינה"
            icon={<Globe size={13} />}
            options={availableFilterOptions.countries}
            selected={filters.countries}
            onChange={(v) => setFilters({ ...filters, countries: v })}
            displayName={(c) => COUNTRY_NAMES_HE[c.toUpperCase()] || c}
            width={140}
          />
          <MultiSelectFilter
            label="הפניה"
            icon={<Activity size={13} />}
            options={availableFilterOptions.referrers}
            selected={filters.referrers}
            onChange={(v) => setFilters({ ...filters, referrers: v })}
            width={150}
          />
          {hasActiveFilters && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-xs text-red-500 hover:text-red-600 hover:underline mr-auto"
            >
              נקה סינון מתקדם
            </button>
          )}
        </div>

        {/* Active filter badges */}
        {selectedPageIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedPageIds.map((id) => {
              const page = allPages.find((p) => p.id === id);
              return (
                <Badge key={id} variant="secondary" className="gap-1 text-xs bg-[#B8D900]/10 text-[#8BA300] border-0">
                  {page?.title || "דף"}
                  <button onClick={() => setSelectedPageIds(selectedPageIds.filter((pid) => pid !== id))}>
                    <X size={10} />
                  </button>
                </Badge>
              );
            })}
            <button
              onClick={() => setSelectedPageIds([])}
              className="text-xs text-[#9A969A] hover:text-red-500 transition-colors"
            >
              נקה הכל
            </button>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* Key Metric Cards                                                   */}
      {/* ================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="צפיות דף"
          value={m.totalPageViews}
          change={showComparison ? pctChange(m.totalPageViews, pm.totalPageViews) : 0}
          icon={<Eye size={18} />}
          color="bg-[#B8D900]/10 text-[#8BA300]"
        />
        <MetricCard
          label={primaryLabel}
          value={primaryMetric}
          change={showComparison ? pctChange(primaryMetric, prevPrimaryMetric) : 0}
          icon={primaryIcon}
          color="bg-blue-500/10 text-blue-600"
        />
        <MetricCard
          label="שליחות טופס"
          value={m.formSubmissions}
          change={showComparison ? pctChange(m.formSubmissions, pm.formSubmissions) : 0}
          icon={<FileText size={18} />}
          color="bg-violet-500/10 text-violet-600"
        />
        <MetricCard
          label="אחוז המרה"
          value={`${m.conversionRate}%`}
          change={showComparison ? pctChange(m.conversionRate, pm.conversionRate) : 0}
          icon={<TrendingUp size={18} />}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <MetricCard
          label="Bounce Rate"
          value={`${m.bounceRate}%`}
          change={showComparison ? pctChange(m.bounceRate, pm.bounceRate) : 0}
          icon={<Activity size={18} />}
          color="bg-orange-500/10 text-orange-600"
          subtitle={m.bounceRate > 70 ? "גבוה" : m.bounceRate < 30 ? "מצוין" : ""}
        />
        <MetricCard
          label="זמן סשן ממוצע"
          value={formatDuration(m.avgSessionDuration)}
          change={showComparison ? pctChange(m.avgSessionDuration, pm.avgSessionDuration) : 0}
          icon={<Clock size={18} />}
          color="bg-cyan-500/10 text-cyan-600"
        />
      </div>

      {/* ================================================================== */}
      {/* Daily Timeline Chart                                               */}
      {/* ================================================================== */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#2a2628]">
                מגמות יומיות
              </CardTitle>
              <CardDescription className="text-xs">
                {viewMode === "sessions" ? "סשנים + שליחות לפי יום" : "צפיות + שליחות לפי יום"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#B8D900]" />
                <span className="text-xs text-[#716C70]">{viewMode === "sessions" ? "סשנים" : "צפיות"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                <span className="text-xs text-[#716C70]">שליחות</span>
              </div>
              {viewMode === "users" && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#8B5CF6]/40 border border-[#8B5CF6]" />
                  <span className="text-xs text-[#716C70]">מבקרים</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.dailyTimeline.length === 0 ? (
            <p className="text-center text-[#9A969A] py-8">אין נתונים לתקופה זו</p>
          ) : (
            <div className="flex items-end gap-1 h-52 overflow-x-auto pb-6">
              {data.dailyTimeline.map((day, idx) => {
                const primaryVal = viewMode === "sessions" ? day.sessions : day.views;
                const maxVal = Math.max(
                  ...data.dailyTimeline.map((d) => Math.max(viewMode === "sessions" ? d.sessions : d.views, d.submissions)),
                  1
                );
                const primaryHeight = (primaryVal / maxVal) * 100;
                const subHeight = (day.submissions / maxVal) * 100;
                const dateObj = new Date(day.date);
                const label = dateObj.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });

                return (
                  <div key={day.date} className="flex-1 min-w-[24px] flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-14 bg-[#2a2628] text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      <div className="font-medium">{dateObj.toLocaleDateString("he-IL", { day: "numeric", month: "long" })}</div>
                      <div>{viewMode === "sessions" ? "סשנים" : "צפיות"}: {primaryVal} | שליחות: {day.submissions}</div>
                      {viewMode === "users" && <div>מבקרים: {day.uniqueVisitors}</div>}
                    </div>
                    <div className="w-full flex gap-[2px] items-end h-44">
                      {/* Primary bar */}
                      <div className="flex-1 relative h-full">
                        <div
                          className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#B8D900] to-[#d4f040] transition-all duration-500 ease-out hover:from-[#a8c400]"
                          style={{ height: mounted ? `${Math.max(primaryHeight, 2)}%` : "0%", transitionDelay: `${idx * 20}ms` }}
                        />
                      </div>
                      {/* Submissions bar */}
                      <div className="flex-1 relative h-full">
                        <div
                          className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#3B82F6] to-[#60A5FA] transition-all duration-500 ease-out hover:from-[#2563EB]"
                          style={{ height: mounted ? `${Math.max(subHeight, 2)}%` : "0%", transitionDelay: `${idx * 20 + 10}ms` }}
                        />
                      </div>
                    </div>
                    <span className="text-[9px] text-[#9A969A] -rotate-45 origin-center whitespace-nowrap">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Top Landing Pages + Hourly Heatmap                                 */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top pages table */}
        <Card className="lg:col-span-2 border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">דפי נחיתה מובילים</CardTitle>
            <CardDescription className="text-xs">ביצועי דפים עם צפיות, המרות ו-Bounce Rate</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topPages.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-right py-2 px-2 text-[#9A969A] font-medium">#</th>
                      <th className="text-right py-2 px-2 text-[#9A969A] font-medium">שם הדף</th>
                      <th className="text-right py-2 px-2 text-[#9A969A] font-medium">צפיות</th>
                      <th className="text-right py-2 px-2 text-[#9A969A] font-medium">מבקרים</th>
                      <th className="text-right py-2 px-2 text-[#9A969A] font-medium">שליחות</th>
                      <th className="text-right py-2 px-2 text-[#9A969A] font-medium">המרה</th>
                      <th className="text-right py-2 px-2 text-[#9A969A] font-medium">Bounce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((page, idx) => (
                      <tr key={page.pageId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 px-2 text-[#9A969A] font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-2">
                          <Link
                            href={`/dashboard/pages/${page.pageId}/analytics`}
                            className="text-[#2a2628] hover:text-[#B8D900] transition-colors font-medium"
                          >
                            {page.title}
                          </Link>
                        </td>
                        <td className="py-2.5 px-2 text-[#2a2628] tabular-nums">{page.views.toLocaleString("he-IL")}</td>
                        <td className="py-2.5 px-2 text-[#2a2628] tabular-nums">{page.uniqueVisitors.toLocaleString("he-IL")}</td>
                        <td className="py-2.5 px-2 text-[#2a2628] font-bold tabular-nums">{page.submissions.toLocaleString("he-IL")}</td>
                        <td className="py-2.5 px-2 tabular-nums">
                          <span className={page.conversionRate > 5 ? "text-emerald-600 font-bold" : "text-[#2a2628]"}>
                            {page.conversionRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 tabular-nums">
                          <span className={page.bounceRate > 70 ? "text-red-500" : page.bounceRate < 30 ? "text-emerald-600" : "text-[#2a2628]"}>
                            {page.bounceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly heatmap */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">פעילות לפי שעה</CardTitle>
            <CardDescription className="text-xs">שעות פיק בצפיות דף</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-1">
              {data.hourlyHeatmap.map((h) => {
                const intensity = maxHourly > 0 ? h.count / maxHourly : 0;
                const bg = intensity === 0
                  ? "bg-gray-100"
                  : intensity < 0.25
                    ? "bg-[#B8D900]/20"
                    : intensity < 0.5
                      ? "bg-[#B8D900]/40"
                      : intensity < 0.75
                        ? "bg-[#B8D900]/70"
                        : "bg-[#B8D900]";
                return (
                  <div
                    key={h.hour}
                    className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-medium transition-all hover:scale-110 cursor-default ${bg} ${
                      intensity > 0.5 ? "text-white" : "text-[#716C70]"
                    }`}
                    title={`${h.hour}:00 — ${h.count} צפיות | ${h.submissions} לידים`}
                  >
                    {h.hour}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-[#9A969A]">פחות</span>
              <div className="flex gap-0.5">
                {["bg-gray-100", "bg-[#B8D900]/20", "bg-[#B8D900]/40", "bg-[#B8D900]/70", "bg-[#B8D900]"].map((c, i) => (
                  <div key={i} className={`w-4 h-4 rounded ${c}`} />
                ))}
              </div>
              <span className="text-[10px] text-[#9A969A]">יותר</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Device Breakdown + Attribution Model                               */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device donut */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">פילוח מכשירים</CardTitle>
            <CardDescription className="text-xs">נייד, מחשב וטאבלט</CardDescription>
          </CardHeader>
          <CardContent>
            {data.deviceBreakdown.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="flex items-center gap-8">
                {/* SVG donut */}
                <div className="relative w-36 h-36 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {(() => {
                      let offset = 0;
                      return data.deviceBreakdown.map((device) => {
                        const pct = totalDevices > 0 ? (device.count / totalDevices) * 100 : 0;
                        const color = DEVICE_COLORS[device.type] || "#9CA3AF";
                        const dashArray = `${pct} ${100 - pct}`;
                        const currentOffset = offset;
                        offset += pct;
                        return (
                          <circle
                            key={device.type}
                            cx="18" cy="18" r="15.91549431"
                            fill="transparent" stroke={color} strokeWidth="3.5"
                            strokeDasharray={dashArray}
                            strokeDashoffset={-currentOffset}
                            className="transition-all duration-700"
                          />
                        );
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-[#2a2628]">{totalDevices.toLocaleString("he-IL")}</span>
                    <span className="text-[10px] text-[#9A969A]">אירועים</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-3 flex-1">
                  {data.deviceBreakdown.map((device) => {
                    const pct = totalDevices > 0 ? Math.round((device.count / totalDevices) * 100) : 0;
                    return (
                      <div key={device.type} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DEVICE_COLORS[device.type] || "#9CA3AF" }} />
                            <span className="text-sm text-[#716C70]">{DEVICE_LABELS[device.type] || device.type}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-[#9A969A]">{device.submissions} לידים · {device.conversion}%</span>
                            <span className="text-sm font-bold text-[#2a2628] tabular-nums">{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: mounted ? `${pct}%` : "0%",
                              backgroundColor: DEVICE_COLORS[device.type] || "#9CA3AF",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attribution model results */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-[#2a2628]">שיוך המרות</CardTitle>
                <CardDescription className="text-xs">
                  {ATTRIBUTION_MODELS.find((a) => a.value === attributionModel)?.description}
                </CardDescription>
              </div>
              <MousePointerClick size={18} className="text-[#9A969A]" />
            </div>
          </CardHeader>
          <CardContent>
            {data.attribution.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין המרות לשיוך</p>
            ) : (
              <div className="space-y-3">
                {data.attribution.map((attr, idx) => {
                  const maxW = Math.max(...data.attribution.map((a) => a.weightedConversions), 1);
                  const pct = Math.round((attr.weightedConversions / maxW) * 100);
                  return (
                    <div key={attr.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#716C70] truncate">{attr.source}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#9A969A]">{attr.conversions} מגעים</span>
                          <span className="font-bold text-[#2a2628] tabular-nums">{attr.weightedConversions}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                            transitionDelay: `${idx * 80}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* UTM Sources + Campaigns + Referrers                                */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UTM Sources */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">מקורות תנועה</CardTitle>
            <CardDescription className="text-xs">פילוח לפי UTM source</CardDescription>
          </CardHeader>
          <CardContent>
            {data.utmSources.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-3">
                {data.utmSources.map((source, idx) => {
                  const pct = Math.round((source.count / maxUtm) * 100);
                  return (
                    <div key={source.source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#716C70]">{source.source}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#9A969A]">{source.submissions} לידים · {source.conversion}%</span>
                          <span className="font-bold text-[#2a2628] tabular-nums">{source.count.toLocaleString("he-IL")}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            backgroundColor: BAR_COLORS[idx % BAR_COLORS.length],
                            transitionDelay: `${idx * 100}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* UTM Campaigns */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">קמפיינים</CardTitle>
            <CardDescription className="text-xs">פילוח לפי UTM campaign</CardDescription>
          </CardHeader>
          <CardContent>
            {data.utmCampaigns.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-2.5">
                {data.utmCampaigns.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[#2a2628] truncate font-medium">{c.name}</p>
                      <p className="text-[10px] text-[#9A969A]">{c.views} צפיות · {c.submissions} שליחות</p>
                    </div>
                    <span className={`text-sm font-bold tabular-nums mr-2 ${c.conversion > 5 ? "text-emerald-600" : "text-[#2a2628]"}`}>
                      {c.conversion}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referrers */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">מפנים</CardTitle>
            <CardDescription className="text-xs">דומיינים מפנים מובילים</CardDescription>
          </CardHeader>
          <CardContent>
            {data.referrerDomains.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-2.5">
                {data.referrerDomains.map((ref, idx) => (
                  <div key={ref.domain} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-[#9A969A] w-5 text-center">{idx + 1}</span>
                    <Globe size={14} className="text-[#9A969A] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#2a2628] truncate">{ref.domain}</p>
                      <p className="text-[10px] text-[#9A969A]">{ref.submissions} לידים · {ref.conversion}% המרה</p>
                    </div>
                    <span className="text-sm font-bold text-[#2a2628] tabular-nums">{ref.count.toLocaleString("he-IL")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* UTM Mediums + Webhook Funnel                                       */}
      {/* ================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UTM Mediums */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">ערוצי תנועה</CardTitle>
            <CardDescription className="text-xs">פילוח לפי UTM medium</CardDescription>
          </CardHeader>
          <CardContent>
            {data.utmMediums.length === 0 ? (
              <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
            ) : (
              <div className="space-y-3">
                {data.utmMediums.map((med, idx) => {
                  const maxMed = Math.max(...data.utmMediums.map((m) => m.count), 1);
                  const pct = Math.round((med.count / maxMed) * 100);
                  return (
                    <div key={med.medium} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#716C70]">{med.medium}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#9A969A]">{med.submissions} לידים · {med.conversion}%</span>
                          <span className="font-bold text-[#2a2628] tabular-nums">{med.count.toLocaleString("he-IL")}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: mounted ? `${pct}%` : "0%",
                            backgroundColor: BAR_COLORS[(idx + 2) % BAR_COLORS.length],
                            transitionDelay: `${idx * 100}ms`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook funnel */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2a2628]">משפך Webhook</CardTitle>
            <CardDescription className="text-xs">סטטוס שליחת Webhook עבור שליחות טופס</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <FileText size={18} className="text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-[#9A969A]">סה&quot;כ שליחות</p>
                  <p className="text-xl font-bold text-[#2a2628] tabular-nums">{m.formSubmissions.toLocaleString("he-IL")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Send size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-[#9A969A]">נשלח בהצלחה</p>
                  <p className="text-xl font-bold text-[#2a2628] tabular-nums">{data.webhookSent.toLocaleString("he-IL")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-[#9A969A]">נכשל</p>
                  <p className="text-xl font-bold text-[#2a2628] tabular-nums">{data.webhookFailed.toLocaleString("he-IL")}</p>
                </div>
              </div>
            </div>
            {totalWebhooks > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-xs text-[#716C70]">
                  <span>נשלח</span>
                  <span className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 rounded-r-full transition-all duration-700"
                      style={{ width: mounted ? `${Math.round((data.webhookSent / totalWebhooks) * 100)}%` : "0%" }}
                    />
                    <div
                      className="h-full bg-red-400 rounded-l-full transition-all duration-700"
                      style={{ width: mounted ? `${Math.round((data.webhookFailed / totalWebhooks) * 100)}%` : "0%" }}
                    />
                  </span>
                  <span>נכשל</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ================================================================== */}
      {/* Geo breakdown — countries / regions / cities                       */}
      {/* Only rendered when there is at least one country-tagged event so   */}
      {/* pre-geo-migration data doesn't show empty cards.                   */}
      {/* ================================================================== */}
      {data.geoCountries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Countries */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
                <Globe size={16} className="text-blue-500" />
                מדינות
              </CardTitle>
              <CardDescription className="text-xs">פילוח גאוגרפי לפי מדינת המבקר</CardDescription>
            </CardHeader>
            <CardContent>
              {data.geoCountries.length === 0 ? (
                <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
              ) : (
                <div className="space-y-2.5">
                  {data.geoCountries.slice(0, 8).map((entry, idx) => {
                    const maxCount = Math.max(...data.geoCountries.map((c) => c.count), 1);
                    const pct = Math.round((entry.count / maxCount) * 100);
                    const displayName =
                      COUNTRY_NAMES_HE[entry.code.toUpperCase()] || entry.name;
                    return (
                      <div key={entry.code} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#4A4648] flex items-center gap-2">
                            <span className="text-base leading-none">{countryFlag(entry.code)}</span>
                            {displayName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#9A969A]">
                              {entry.submissions} לידים · {entry.conversion}%
                            </span>
                            <span className="font-bold text-[#2a2628] tabular-nums">
                              {entry.count.toLocaleString("he-IL")}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-400 transition-all duration-500"
                            style={{
                              width: mounted ? `${pct}%` : "0%",
                              transitionDelay: `${idx * 60}ms`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regions / states */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
                <MapPin size={16} className="text-purple-500" />
                מחוזות / מדינות-משנה
              </CardTitle>
              <CardDescription className="text-xs">פילוח לפי אזור (ארה&quot;ב, אירופה וכו&apos;)</CardDescription>
            </CardHeader>
            <CardContent>
              {data.geoRegions.length === 0 ? (
                <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
              ) : (
                <div className="space-y-2.5">
                  {data.geoRegions.slice(0, 8).map((entry, idx) => {
                    const maxCount = Math.max(...data.geoRegions.map((r) => r.count), 1);
                    const pct = Math.round((entry.count / maxCount) * 100);
                    return (
                      <div key={entry.code} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#4A4648] truncate" title={entry.name}>
                            {entry.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#9A969A]">
                              {entry.submissions} לידים
                            </span>
                            <span className="font-bold text-[#2a2628] tabular-nums">
                              {entry.count.toLocaleString("he-IL")}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-400 transition-all duration-500"
                            style={{
                              width: mounted ? `${pct}%` : "0%",
                              transitionDelay: `${idx * 60}ms`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cities */}
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
                <MapPin size={16} className="text-emerald-500" />
                ערים
              </CardTitle>
              <CardDescription className="text-xs">8 הערים המובילות בתקופה הנבחרת</CardDescription>
            </CardHeader>
            <CardContent>
              {data.geoCities.length === 0 ? (
                <p className="text-center text-[#9A969A] py-4 text-sm">אין נתונים</p>
              ) : (
                <div className="space-y-2.5">
                  {data.geoCities.slice(0, 8).map((entry, idx) => {
                    const maxCount = Math.max(...data.geoCities.map((c) => c.count), 1);
                    const pct = Math.round((entry.count / maxCount) * 100);
                    return (
                      <div key={entry.code} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#4A4648] truncate" title={entry.name}>
                            {entry.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#9A969A]">
                              {entry.submissions} לידים
                            </span>
                            <span className="font-bold text-[#2a2628] tabular-nums">
                              {entry.count.toLocaleString("he-IL")}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                            style={{
                              width: mounted ? `${pct}%` : "0%",
                              transitionDelay: `${idx * 60}ms`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* Pages per session + Session stats (shown in session view)          */}
      {/* ================================================================== */}
      {viewMode === "sessions" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <BarChart3 size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-[#9A969A]">דפים לסשן (ממוצע)</p>
                  <p className="text-2xl font-bold text-[#2a2628] tabular-nums">{m.avgPagesPerSession}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Clock size={18} className="text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-[#9A969A]">זמן סשן ממוצע</p>
                  <p className="text-2xl font-bold text-[#2a2628]">{formatDuration(m.avgSessionDuration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Activity size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-[#9A969A]">Bounce Rate</p>
                  <p className="text-2xl font-bold text-[#2a2628] tabular-nums">{m.bounceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
