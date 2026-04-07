/**
 * Dual-layer Heatmap — scrollable landing page preview with two overlays:
 *   Layer 1: Click dots (red spectrum) — WHERE users clicked
 *   Layer 2: Dwell time bands (purple→gold) — WHERE users spent TIME
 *
 * Rendering strategy:
 *   1. iframe loads at 800px (real viewport) → 100vh = 800px
 *   2. Inject CSS to freeze vh classes at 800px values
 *   3. Read scrollHeight, expand iframe to full page
 *   4. Draw overlays — dots & gradient bands align with content
 */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Monitor, Smartphone, MousePointerClick, RefreshCw,
  ChevronDown, ChevronUp, Eye, MousePointer,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

interface ClickPoint {
  x_pct: number;
  y_pct: number;
  viewport_w: number;
  element: string;
  device_type: string;
}

/** A single dwell-time band entry from viewport_time events */
interface DwellBand {
  /** Band start position as % of page height (0, 5, 10, ... 95) */
  b: number;
  /** Average seconds visitors spent looking at this band */
  s: number;
}

/** Raw viewport_time row as stored in the database — used for client-side device filtering */
interface RawDwellRow {
  device_type: string;
  bands: Array<{ b: number; s: number }>;
}

interface ClickHeatmapProps {
  pageId: string;
  pageSlug: string;
  startDate: string;
  endDate: string;
}

/** Which overlay layers are visible */
type LayerMode = "clicks" | "dwell" | "both";

/* ═══════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════ */

const DOT_RADIUS = 22;
const MAX_CLICK_EVENTS = 5000;
const SCROLL_VIEWPORT = 650;
const MOBILE_WIDTH = 390;
const INITIAL_VIEWPORT = 800;

/** vh-freeze CSS injected into iframe after measuring */
const VH_FREEZE_CSS = `
  .min-h-screen,.md\\:min-h-screen,.lg\\:min-h-screen{min-height:${INITIAL_VIEWPORT}px!important}
  .min-h-\\[80vh\\],.md\\:min-h-\\[80vh\\]{min-height:${Math.round(INITIAL_VIEWPORT * 0.8)}px!important}
  .min-h-\\[90vh\\],.md\\:min-h-\\[90vh\\]{min-height:${Math.round(INITIAL_VIEWPORT * 0.9)}px!important}
  .min-h-\\[70vh\\],.md\\:min-h-\\[70vh\\]{min-height:${Math.round(INITIAL_VIEWPORT * 0.7)}px!important}
  .h-screen,.md\\:h-screen{height:${INITIAL_VIEWPORT}px!important}
  .h-\\[100vh\\]{height:${INITIAL_VIEWPORT}px!important}
  .h-\\[80vh\\]{height:${Math.round(INITIAL_VIEWPORT * 0.8)}px!important}
  .max-h-screen{max-height:${INITIAL_VIEWPORT}px!important}
  html,body{overflow:visible!important;height:auto!important}
  *{animation-duration:0s!important;transition-duration:0s!important}
  [style*="position: fixed"]{position:absolute!important}
`;

/** Dwell time gradient: purple → magenta → orange → gold */
const DWELL_COLORS = [
  { t: 0.0, r: 27, g: 10, b: 60 },     // deep purple
  { t: 0.25, r: 91, g: 45, b: 142 },    // purple
  { t: 0.50, r: 196, g: 79, b: 201 },   // magenta
  { t: 0.75, r: 245, g: 158, b: 66 },   // orange
  { t: 1.0, r: 255, g: 215, b: 0 },     // gold
];

/* ═══════════════════════════════════════════════════════════════
   Drawing functions
   ═══════════════════════════════════════════════════════════════ */

/** Interpolate the dwell color from the gradient stops */
function getDwellColor(t: number): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < DWELL_COLORS.length - 1; i++) {
    const a = DWELL_COLORS[i], b = DWELL_COLORS[i + 1];
    if (clamped >= a.t && clamped <= b.t) {
      const lt = (clamped - a.t) / (b.t - a.t);
      return {
        r: Math.round(a.r + (b.r - a.r) * lt),
        g: Math.round(a.g + (b.g - a.g) * lt),
        b: Math.round(a.b + (b.b - a.b) * lt),
      };
    }
  }
  const last = DWELL_COLORS[DWELL_COLORS.length - 1];
  return { r: last.r, g: last.g, b: last.b };
}

/** Draw click dots on a canvas */
function drawClicks(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[],
  w: number, h: number,
  withOutline: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || w < 1 || h < 1) return;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  if (points.length === 0) return;

  ctx.globalCompositeOperation = "source-over";
  const alpha = Math.max(0.02, Math.min(0.15, 5 / points.length));

  for (const pt of points) {
    const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, DOT_RADIUS);
    g.addColorStop(0, `rgba(255, 0, 0, ${alpha * 3})`);
    g.addColorStop(0.5, `rgba(255, 0, 0, ${alpha})`);
    g.addColorStop(1, "rgba(255, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(pt.x - DOT_RADIUS, pt.y - DOT_RADIUS, DOT_RADIUS * 2, DOT_RADIUS * 2);
  }

  /* Colorize intensity map: blue → cyan → green → yellow → red */
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const intensity = d[i];
    if (intensity === 0) { d[i + 3] = 0; continue; }
    const t = intensity / 255;
    if (t < 0.25) {
      const lt = t / 0.25;
      d[i] = 0; d[i + 1] = Math.round(lt * 200); d[i + 2] = 255;
    } else if (t < 0.5) {
      const lt = (t - 0.25) / 0.25;
      d[i] = 0; d[i + 1] = 200 + Math.round(lt * 55); d[i + 2] = Math.round(255 * (1 - lt));
    } else if (t < 0.75) {
      const lt = (t - 0.5) / 0.25;
      d[i] = Math.round(lt * 255); d[i + 1] = 255; d[i + 2] = 0;
    } else {
      const lt = (t - 0.75) / 0.25;
      d[i] = 255; d[i + 1] = Math.round(255 * (1 - lt)); d[i + 2] = 0;
    }
    d[i + 3] = Math.min(200, intensity + 60);
  }
  ctx.putImageData(imageData, 0, 0);

  /* Optional white outline on dots for combined mode readability */
  if (withOutline && points.length < 200) {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, DOT_RADIUS * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * Draw dwell-time gradient bands on a canvas.
 * Uses a single vertical createLinearGradient covering the full canvas height
 * instead of 1250+ individual fillRect calls — dramatically faster on tall pages.
 * The side minimap strip (10px) uses a separate strip gradient for full opacity.
 */
function drawDwell(
  canvas: HTMLCanvasElement,
  bands: DwellBand[],
  w: number, h: number,
  opacity: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || w < 1 || h < 1 || bands.length === 0) {
    if (canvas.getContext("2d")) {
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.clearRect(0, 0, w, h);
    }
    return;
  }
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);

  /* Find max dwell time for normalization (relative scale) */
  const maxS = Math.max(...bands.map((b) => b.s), 1);

  /* Sort bands by y-position so gradient stops are in ascending order */
  const sorted = [...bands].sort((a, b) => a.b - b.b);

  /* ── Main overlay gradient — one fillRect instead of ~1250 ── */
  const STRIP_W = 10;
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  for (const band of sorted) {
    const yStop = Math.max(0, Math.min(1, band.b / 100));
    const intensity = band.s / maxS;
    if (intensity < 0.05) continue; // skip near-zero bands
    const c = getDwellColor(intensity);
    const a = opacity * intensity;
    gradient.addColorStop(yStop, `rgba(${c.r},${c.g},${c.b},${a})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  /* ── Side minimap strip (10px left edge) — separate gradient at full opacity ── */
  const stripGradient = ctx.createLinearGradient(0, 0, 0, h);
  for (const band of sorted) {
    const yStop = Math.max(0, Math.min(1, band.b / 100));
    const intensity = band.s / maxS;
    if (intensity < 0.05) continue;
    const c = getDwellColor(intensity);
    stripGradient.addColorStop(yStop, `rgba(${c.r},${c.g},${c.b},0.85)`);
  }
  ctx.fillStyle = stripGradient;
  ctx.fillRect(0, 0, STRIP_W, h);
}

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export function ClickHeatmap({ pageId, pageSlug, startDate, endDate }: ClickHeatmapProps) {
  const [clicks, setClicks] = useState<ClickPoint[]>([]);
  /** Raw dwell rows fetched once — device filtering is applied client-side in filteredDwellBands */
  const [rawDwellRows, setRawDwellRows] = useState<RawDwellRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [layerMode, setLayerMode] = useState<LayerMode>("clicks");
  const [showStats, setShowStats] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [phase, setPhase] = useState<"loading-page" | "measuring" | "ready">("loading-page");
  const [pageHeight, setPageHeight] = useState(INITIAL_VIEWPORT);

  const clickCanvasRef = useRef<HTMLCanvasElement>(null);
  const dwellCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const isMobile = viewMode === "mobile";
  const showClicks = layerMode === "clicks" || layerMode === "both";
  const showDwell = layerMode === "dwell" || layerMode === "both";

  /* ── Data fetching ── */

  const fetchData = useCallback(async () => {
    setLoading(true);

    /* Fetch clicks */
    const PAGE_SIZE = 1000;
    const allClicks: ClickPoint[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && allClicks.length < MAX_CLICK_EVENTS) {
      const { data: batch, error } = await supabase
        .from("analytics_events")
        .select("event_data, device_type")
        .eq("page_id", pageId)
        .eq("event_type", "click")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error || !batch) break;
      for (const row of batch) {
        const ed = row.event_data as Record<string, unknown> | null;
        if (!ed || typeof ed.x_pct !== "number" || typeof ed.y_pct !== "number") continue;
        allClicks.push({
          x_pct: ed.x_pct as number,
          y_pct: ed.y_pct as number,
          viewport_w: (ed.viewport_w as number) || 0,
          element: (ed.element as string) || "",
          device_type: (row.device_type as string) || "desktop",
        });
      }
      hasMore = batch.length === PAGE_SIZE;
      offset += PAGE_SIZE;
    }
    setClicks(allClicks);

    /* Fetch viewport_time events for dwell bands */
    const { data: dwellRows } = await supabase
      .from("analytics_events")
      .select("event_data, device_type")
      .eq("page_id", pageId)
      .eq("event_type", "viewport_time")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (dwellRows && dwellRows.length > 0) {
      /* Store all raw rows — device filtering happens client-side in filteredDwellBands memo */
      const parsed: RawDwellRow[] = [];
      for (const row of dwellRows) {
        const ed = row.event_data as { bands?: Array<{ b: number; s: number }> } | null;
        if (!ed?.bands) continue;
        parsed.push({
          device_type: (row.device_type as string) || "desktop",
          bands: ed.bands,
        });
      }
      setRawDwellRows(parsed);
    } else {
      setRawDwellRows([]);
    }

    setLoading(false);
  }, [pageId, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Click/dwell filtering ── */

  const filteredClicks = useMemo(() => clicks.filter((c) => {
    if (isMobile) return c.device_type === "mobile";
    return c.device_type === "desktop" || c.device_type === "tablet";
  }), [clicks, isMobile]);

  const desktopCount = clicks.filter((c) => c.device_type === "desktop" || c.device_type === "tablet").length;
  const mobileCount = clicks.filter((c) => c.device_type === "mobile").length;

  /**
   * Aggregate raw dwell rows for the currently selected device type.
   * Client-side filtering avoids a full Supabase re-fetch on device toggle.
   */
  const filteredDwellBands = useMemo((): DwellBand[] => {
    if (rawDwellRows.length === 0) return [];
    const bandTotals = new Map<number, { sum: number; count: number }>();
    for (const row of rawDwellRows) {
      const matchesDevice = isMobile
        ? row.device_type === "mobile"
        : row.device_type === "desktop" || row.device_type === "tablet";
      if (!matchesDevice) continue;
      for (const band of row.bands) {
        const existing = bandTotals.get(band.b) ?? { sum: 0, count: 0 };
        existing.sum += band.s;
        existing.count += 1;
        bandTotals.set(band.b, existing);
      }
    }
    const avgBands: DwellBand[] = [];
    bandTotals.forEach((val, key) => {
      avgBands.push({ b: key, s: Math.round((val.sum / val.count) * 10) / 10 });
    });
    return avgBands;
  }, [rawDwellRows, isMobile]);

  /* Peak dwell time for legend */
  const peakDwell = useMemo(() => {
    if (filteredDwellBands.length === 0) return 0;
    return Math.max(...filteredDwellBands.map((b) => b.s));
  }, [filteredDwellBands]);

  /* ── Iframe lifecycle ── */

  useEffect(() => {
    setPhase("loading-page");
    setPageHeight(INITIAL_VIEWPORT);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [viewMode]);

  const handleIframeLoad = useCallback(() => {
    setPhase("measuring");
    const measureAndExpand = (attempt: number) => {
      try {
        const doc = iframeRef.current?.contentDocument ?? iframeRef.current?.contentWindow?.document;
        if (!doc?.body) return;
        if (!doc.getElementById("__heatmap_vh_freeze")) {
          const style = doc.createElement("style");
          style.id = "__heatmap_vh_freeze";
          style.textContent = VH_FREEZE_CSS;
          doc.head.appendChild(style);
        }
        const h = Math.max(doc.documentElement?.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
        if (h > 500) setPageHeight((prev) => Math.max(prev, h));
        if (attempt >= 4) setPhase("ready");
      } catch {
        setPageHeight(5000);
        setPhase("ready");
      }
    };
    const delays = [100, 500, 1500, 3000, 5000];
    const timers = delays.map((d, i) => setTimeout(() => measureAndExpand(i), d));
    return () => timers.forEach(clearTimeout);
  }, []);

  /* ── Canvas rendering ── */

  useEffect(() => {
    if (phase !== "ready" || !containerRef.current) return;
    const w = containerRef.current.offsetWidth;
    const h = pageHeight;

    /* Click layer */
    if (clickCanvasRef.current) {
      if (showClicks) {
        const pts = filteredClicks.map((c) => ({
          x: (c.x_pct / 100) * w,
          y: (c.y_pct / 100) * h,
        }));
        drawClicks(clickCanvasRef.current, pts, w, h, layerMode === "both");
      } else {
        clickCanvasRef.current.width = w;
        clickCanvasRef.current.height = h;
        clickCanvasRef.current.getContext("2d")?.clearRect(0, 0, w, h);
      }
    }

    /* Dwell layer */
    if (dwellCanvasRef.current) {
      if (showDwell) {
        const opacity = layerMode === "both" ? 0.38 : 0.55;
        drawDwell(dwellCanvasRef.current, filteredDwellBands, w, h, opacity);
      } else {
        dwellCanvasRef.current.width = w;
        dwellCanvasRef.current.height = h;
        dwellCanvasRef.current.getContext("2d")?.clearRect(0, 0, w, h);
      }
    }
  }, [filteredClicks, filteredDwellBands, phase, showClicks, showDwell, layerMode, pageHeight, viewMode]);

  /* ── Scroll indicator ── */

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [phase, pageHeight]);

  /* ── Stats ── */

  const topElements = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filteredClicks) {
      if (!c.element) continue;
      counts.set(c.element, (counts.get(c.element) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([element, count]) => ({ element, count }));
  }, [filteredClicks]);

  const iframeUrl = `/lp/${pageSlug}?_heatmap=1`;
  const iframeHeight = phase === "loading-page" ? INITIAL_VIEWPORT : pageHeight;

  const scrollTo = (pos: "top" | "bottom") => {
    scrollRef.current?.scrollTo({
      top: pos === "top" ? 0 : scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  /* ── Layer mode labels ── */

  const LAYERS: { mode: LayerMode; label: string; icon: typeof MousePointer }[] = [
    { mode: "clicks", label: "לחיצות", icon: MousePointer },
    { mode: "dwell", label: "זמן שהייה", icon: Eye },
    { mode: "both", label: "שניהם", icon: MousePointerClick },
  ];

  /* ── Render ── */

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-[#9A969A]" />
              מפת חום
            </CardTitle>
            <CardDescription className="text-xs">
              {loading ? "טוען..." : (
                <>
                  {filteredClicks.length.toLocaleString("he-IL")} לחיצות
                  {filteredDwellBands.length > 0 && ` · ${peakDwell} שנ׳ שיא שהייה`}
                  {` (${isMobile ? "נייד" : "מחשב"})`}
                </>
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Device toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  !isMobile ? "bg-white text-[#2a2628] shadow-sm" : "text-[#9A969A] hover:text-[#716C70]"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">מחשב</span>
                <span className="text-[10px] opacity-60">({desktopCount})</span>
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  isMobile ? "bg-white text-[#2a2628] shadow-sm" : "text-[#9A969A] hover:text-[#716C70]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">נייד</span>
                <span className="text-[10px] opacity-60">({mobileCount})</span>
              </button>
            </div>

            {/* Layer toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {LAYERS.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setLayerMode(mode)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
                    layerMode === mode
                      ? "bg-white text-[#2a2628] shadow-sm"
                      : "text-[#9A969A] hover:text-[#716C70]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={fetchData} className="h-8 w-8 p-0" title="רענון">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-[400px] text-[#9A969A] text-sm">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              טוען נתונים...
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              {/* Phase indicator */}
              {phase !== "ready" && (
                <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm border border-gray-200 flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5 text-[#B8D900]" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs text-[#716C70]">
                    {phase === "loading-page" ? "טוען עמוד..." : "מודד..."}
                  </span>
                </div>
              )}

              {/* Legend — bottom left */}
              {phase === "ready" && (showClicks || showDwell) && (
                <div
                  className="absolute bottom-4 left-4 z-20 rounded-xl px-3 py-2.5 space-y-2 pointer-events-none"
                  style={{ background: "rgba(15,15,15,0.88)", backdropFilter: "blur(8px)", minWidth: 130 }}
                >
                  {showClicks && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-300">לחיצות</span>
                      <div className="h-2.5 rounded-full" style={{ background: "linear-gradient(to left, #FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF)" }} />
                      <div className="flex justify-between text-[9px] text-gray-500">
                        <span>גבוה</span><span>נמוך</span>
                      </div>
                    </div>
                  )}
                  {showDwell && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-gray-300">זמן שהייה</span>
                      <div className="h-2.5 rounded-full" style={{ background: "linear-gradient(to left, #FFD700, #F59E42, #C44FC9, #5B2D8E, #1B0A3C)" }} />
                      <div className="flex justify-between text-[9px] text-gray-500">
                        <span>{peakDwell > 0 ? `${peakDwell} שנ׳` : "גבוה"}</span><span>0</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scrollable viewport */}
              <div
                ref={scrollRef}
                className="rounded-xl border border-gray-200 bg-gray-100"
                style={{ height: `${SCROLL_VIEWPORT}px`, overflowY: "scroll", overflowX: "hidden" }}
              >
                <div
                  className={`relative ${isMobile ? "mx-auto" : "w-full"}`}
                  style={isMobile ? { width: `${MOBILE_WIDTH}px` } : undefined}
                >
                  {isMobile && (
                    <div className="sticky top-0 z-10 bg-[#1a1a1a] rounded-t-2xl px-4 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">9:41</span>
                      <div className="w-20 h-4 bg-[#333] rounded-full" />
                      <div className="w-4 h-2.5 border border-gray-500 rounded-sm" />
                    </div>
                  )}

                  <div
                    ref={containerRef}
                    className={`relative ${isMobile ? "bg-white" : ""}`}
                    style={{
                      width: isMobile ? `${MOBILE_WIDTH}px` : "100%",
                      height: `${pageHeight}px`,
                      overflow: "hidden",
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      key={viewMode}
                      src={iframeUrl}
                      title="מפת חום"
                      className="border-0 block"
                      style={{
                        width: isMobile ? `${MOBILE_WIDTH}px` : "100%",
                        height: `${iframeHeight}px`,
                        pointerEvents: "none",
                      }}
                      onLoad={handleIframeLoad}
                    />

                    {/* Dwell canvas — behind clicks (rendered first) */}
                    {phase === "ready" && (
                      <canvas
                        ref={dwellCanvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                          width: isMobile ? `${MOBILE_WIDTH}px` : "100%",
                          height: `${pageHeight}px`,
                          mixBlendMode: "multiply",
                        }}
                      />
                    )}

                    {/* Click canvas — on top of dwell */}
                    {phase === "ready" && (
                      <canvas
                        ref={clickCanvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                          width: isMobile ? `${MOBILE_WIDTH}px` : "100%",
                          height: `${pageHeight}px`,
                          mixBlendMode: "multiply",
                          opacity: 0.85,
                        }}
                      />
                    )}

                    {/* Empty state */}
                    {phase === "ready" && filteredClicks.length === 0 && filteredDwellBands.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                        <div className="text-center space-y-2">
                          <MousePointerClick className="w-10 h-10 mx-auto text-[#E5E5E5]" />
                          <p className="text-sm text-[#9A969A]">אין נתונים {isMobile ? "מנייד" : "ממחשב"} לתקופה זו</p>
                          <p className="text-xs text-[#CBCBCB]">
                            {isMobile && desktopCount > 0
                              ? `יש ${desktopCount} לחיצות ממחשב — נסה לעבור`
                              : !isMobile && mobileCount > 0
                                ? `יש ${mobileCount} לחיצות מנייד — נסה לעבור`
                                : "נתונים יופיעו לאחר שמבקרים יגלשו בדף"
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Scroll indicator */}
              {pageHeight > SCROLL_VIEWPORT && (
                <div className="absolute left-1.5 top-2 bottom-2 w-1.5 rounded-full bg-black/5 pointer-events-none">
                  <div
                    className="w-full rounded-full bg-[#B8D900] transition-all duration-150"
                    style={{
                      height: `${Math.max(10, (SCROLL_VIEWPORT / pageHeight) * 100)}%`,
                      marginTop: `${(scrollPct / 100) * (100 - Math.max(10, (SCROLL_VIEWPORT / pageHeight) * 100))}%`,
                    }}
                  />
                </div>
              )}

              {pageHeight > SCROLL_VIEWPORT && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                  <button onClick={() => scrollTo("top")} className="w-7 h-7 rounded-full bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50" title="לראש">
                    <ChevronUp className="w-3.5 h-3.5 text-[#716C70]" />
                  </button>
                  <button onClick={() => scrollTo("bottom")} className="w-7 h-7 rounded-full bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50" title="לתחתית">
                    <ChevronDown className="w-3.5 h-3.5 text-[#716C70]" />
                  </button>
                </div>
              )}
            </div>

            {pageHeight > SCROLL_VIEWPORT && (
              <p className="text-[10px] text-[#CBCBCB] text-center -mt-1">↕ גלול בתוך המפה כדי לראות את כל העמוד</p>
            )}

            {/* Expandable stats */}
            {topElements.length > 0 && (
              <div className="border-t border-gray-100 pt-2">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#716C70] hover:text-[#2a2628] transition-colors w-full"
                >
                  {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  אלמנטים פופולריים ({topElements.length})
                </button>
                {showStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {topElements.map((item, i) => {
                      const pct = Math.round((item.count / topElements[0].count) * 100);
                      return (
                        <div key={i} className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] text-[#716C70] truncate" title={item.element}>{item.element}</span>
                            <span className="text-[11px] font-bold text-[#2a2628] tabular-nums shrink-0">{item.count}</span>
                          </div>
                          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#B8D900] transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
