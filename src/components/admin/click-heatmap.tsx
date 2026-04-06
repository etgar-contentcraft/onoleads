/**
 * Click Heatmap — scrollable landing page preview with click density overlay.
 *
 * Rendering strategy (avoids the vh circular dependency):
 *   1. iframe loads at INITIAL_VIEWPORT (800px) — same as a real browser
 *   2. Page renders normally: 100vh = 800px, hero is normal size
 *   3. After load, inject CSS into iframe to FREEZE vh-based classes at 800px values
 *   4. Read scrollHeight (the full page height with correct proportions)
 *   5. Expand iframe to scrollHeight — vh classes stay frozen so layout doesn't change
 *   6. Overlay canvas at the correct height — dots align perfectly
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Smartphone,
  Layers,
  MousePointerClick,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

/* ─── Types ──────────────────────────────────── */

interface ClickPoint {
  x_pct: number;
  y_pct: number;
  viewport_w: number;
  element: string;
  device_type: string;
}

interface ClickHeatmapProps {
  pageId: string;
  pageSlug: string;
  startDate: string;
  endDate: string;
}

/* ─── Constants ──────────────────────────────── */

const DOT_RADIUS = 22;
const MAX_CLICK_EVENTS = 5000;
const SCROLL_VIEWPORT = 650;
const MOBILE_WIDTH = 390;

/**
 * Initial iframe viewport height — simulates a real browser window.
 * 100vh inside the iframe = this value, so hero sections render correctly.
 */
const INITIAL_VIEWPORT = 800;

/**
 * CSS injected into the iframe BEFORE expanding it to full page height.
 * Freezes all Tailwind vh-based utility classes at their 800px-equivalent values
 * so they don't re-compute when the iframe grows to scrollHeight.
 */
const VH_FREEZE_CSS = `
  .min-h-screen, .md\\:min-h-screen, .lg\\:min-h-screen { min-height: ${INITIAL_VIEWPORT}px !important; }
  .min-h-\\[80vh\\], .md\\:min-h-\\[80vh\\] { min-height: ${Math.round(INITIAL_VIEWPORT * 0.8)}px !important; }
  .min-h-\\[90vh\\], .md\\:min-h-\\[90vh\\] { min-height: ${Math.round(INITIAL_VIEWPORT * 0.9)}px !important; }
  .min-h-\\[70vh\\], .md\\:min-h-\\[70vh\\] { min-height: ${Math.round(INITIAL_VIEWPORT * 0.7)}px !important; }
  .h-screen, .md\\:h-screen { height: ${INITIAL_VIEWPORT}px !important; }
  .h-\\[100vh\\] { height: ${INITIAL_VIEWPORT}px !important; }
  .h-\\[80vh\\] { height: ${Math.round(INITIAL_VIEWPORT * 0.8)}px !important; }
  .h-\\[90vh\\] { height: ${Math.round(INITIAL_VIEWPORT * 0.9)}px !important; }
  .max-h-screen { max-height: ${INITIAL_VIEWPORT}px !important; }
  html, body { overflow: visible !important; height: auto !important; }
  * { animation-duration: 0s !important; transition-duration: 0s !important; }
  [style*="position: fixed"] { position: absolute !important; }
`;

/* ─── Heatmap drawing ────────────────────────── */

function drawHeatmap(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[],
  width: number,
  height: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || width < 1 || height < 1) return;

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
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

  const imageData = ctx.getImageData(0, 0, width, height);
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
}

/* ─── Component ──────────────────────────────── */

export function ClickHeatmap({ pageId, pageSlug, startDate, endDate }: ClickHeatmapProps) {
  const [clicks, setClicks] = useState<ClickPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);

  /** Phase: "loading-page" → "measuring" → "ready" */
  const [phase, setPhase] = useState<"loading-page" | "measuring" | "ready">("loading-page");

  /** Full page height after measuring — iframe will expand to this */
  const [pageHeight, setPageHeight] = useState(INITIAL_VIEWPORT);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();
  const isMobile = viewMode === "mobile";

  /* ── Data fetching ── */

  const fetchClicks = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [pageId, startDate, endDate]);

  useEffect(() => { fetchClicks(); }, [fetchClicks]);

  /* ── Click filtering ── */

  const filteredClicks = clicks.filter((c) => {
    if (isMobile) return c.device_type === "mobile";
    return c.device_type === "desktop" || c.device_type === "tablet";
  });

  const desktopCount = clicks.filter((c) => c.device_type === "desktop" || c.device_type === "tablet").length;
  const mobileCount = clicks.filter((c) => c.device_type === "mobile").length;

  /* ── Iframe lifecycle ── */

  /** Reset when switching device modes */
  useEffect(() => {
    setPhase("loading-page");
    setPageHeight(INITIAL_VIEWPORT);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [viewMode]);

  /**
   * After iframe loads at INITIAL_VIEWPORT height:
   * 1. Wait for dynamic content (lazy sections, images)
   * 2. Inject CSS to freeze vh-based classes
   * 3. Read scrollHeight
   * 4. Expand iframe to full page height
   */
  const handleIframeLoad = useCallback(() => {
    setPhase("measuring");

    /* Give the page time to load dynamic sections, images, fonts */
    const measureAndExpand = (attempt: number) => {
      try {
        const doc = iframeRef.current?.contentDocument
          ?? iframeRef.current?.contentWindow?.document;
        if (!doc?.body) return;

        /* Step 1: Inject vh-freeze CSS (only once) */
        if (!doc.getElementById("__heatmap_vh_freeze")) {
          const style = doc.createElement("style");
          style.id = "__heatmap_vh_freeze";
          style.textContent = VH_FREEZE_CSS;
          doc.head.appendChild(style);
        }

        /* Step 2: Read the full scroll height */
        const h = Math.max(
          doc.documentElement?.scrollHeight ?? 0,
          doc.body?.scrollHeight ?? 0
        );

        if (h > 500) {
          setPageHeight((prev) => Math.max(prev, h));
        }

        /* After the last attempt, mark as ready */
        if (attempt >= 4) {
          setPhase("ready");
        }
      } catch {
        /* Cross-origin — can't inject, use fallback */
        setPageHeight(5000);
        setPhase("ready");
      }
    };

    /* Multiple attempts to catch lazy-loaded content */
    const delays = [100, 500, 1500, 3000, 5000];
    const timers = delays.map((d, i) => setTimeout(() => measureAndExpand(i), d));

    return () => timers.forEach(clearTimeout);
  }, []);

  /* ── Canvas rendering ── */

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || phase !== "ready" || !showHeatmap) return;

    const width = containerRef.current.offsetWidth;
    const height = pageHeight;

    const points = filteredClicks.map((c) => ({
      x: (c.x_pct / 100) * width,
      y: (c.y_pct / 100) * height,
    }));

    drawHeatmap(canvasRef.current, points, width, height);
  }, [filteredClicks, phase, showHeatmap, pageHeight, viewMode]);

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

  const topElements = (() => {
    const counts = new Map<string, number>();
    for (const c of filteredClicks) {
      if (!c.element) continue;
      counts.set(c.element, (counts.get(c.element) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([element, count]) => ({ element, count }));
  })();

  const iframeUrl = `/lp/${pageSlug}?_heatmap=1`;

  const scrollTo = (pos: "top" | "bottom") => {
    scrollRef.current?.scrollTo({
      top: pos === "top" ? 0 : scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  /** The iframe height: starts at INITIAL_VIEWPORT, expands to pageHeight after measuring */
  const iframeHeight = phase === "loading-page" ? INITIAL_VIEWPORT : pageHeight;

  /* ── Render ── */

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-[#9A969A]" />
              מפת חום — לחיצות
            </CardTitle>
            <CardDescription className="text-xs">
              {loading ? "טוען..." : `${filteredClicks.length.toLocaleString("he-IL")} לחיצות (${isMobile ? "נייד" : "מחשב"})`}
              {!loading && clicks.length === 0 && " — אין נתונים עדיין"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Device toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("desktop")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  !isMobile ? "bg-white text-[#2a2628] shadow-sm" : "text-[#9A969A] hover:text-[#716C70]"
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                מחשב
                <span className="text-[10px] opacity-60">({desktopCount})</span>
              </button>
              <button
                onClick={() => setViewMode("mobile")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isMobile ? "bg-white text-[#2a2628] shadow-sm" : "text-[#9A969A] hover:text-[#716C70]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                נייד
                <span className="text-[10px] opacity-60">({mobileCount})</span>
              </button>
            </div>

            <Button
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="h-8 text-xs gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              {showHeatmap ? "הסתר" : "הצג"}
            </Button>

            <Button variant="outline" size="sm" onClick={fetchClicks} className="h-8 w-8 p-0" title="רענון">
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
              טוען נתוני לחיצות...
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
                    {phase === "loading-page" ? "טוען עמוד..." : "מודד גובה..."}
                  </span>
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
                  {/* Mobile phone frame */}
                  {isMobile && (
                    <div className="sticky top-0 z-10 bg-[#1a1a1a] rounded-t-2xl px-4 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">9:41</span>
                      <div className="w-20 h-4 bg-[#333] rounded-full" />
                      <div className="w-4 h-2.5 border border-gray-500 rounded-sm" />
                    </div>
                  )}

                  {/* Page container — clips to pageHeight */}
                  <div
                    ref={containerRef}
                    className={`relative ${isMobile ? "bg-white" : ""}`}
                    style={{
                      width: isMobile ? `${MOBILE_WIDTH}px` : "100%",
                      height: `${pageHeight}px`,
                      overflow: "hidden",
                    }}
                  >
                    {/* Iframe: starts at INITIAL_VIEWPORT, expands after measuring */}
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

                    {/* Canvas overlay — only shown when ready */}
                    {showHeatmap && phase === "ready" && (
                      <canvas
                        ref={canvasRef}
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
                    {filteredClicks.length === 0 && phase === "ready" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                        <div className="text-center space-y-2">
                          <MousePointerClick className="w-10 h-10 mx-auto text-[#E5E5E5]" />
                          <p className="text-sm text-[#9A969A]">
                            אין לחיצות {isMobile ? "מנייד" : "ממחשב"} לתקופה זו
                          </p>
                          <p className="text-xs text-[#CBCBCB]">
                            {isMobile && desktopCount > 0
                              ? `יש ${desktopCount} לחיצות ממחשב — נסה לעבור`
                              : !isMobile && mobileCount > 0
                                ? `יש ${mobileCount} לחיצות מנייד — נסה לעבור`
                                : "נתונים יופיעו לאחר שמבקרים ילחצו בדף"
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

              {/* Scroll buttons */}
              {pageHeight > SCROLL_VIEWPORT && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                  <button onClick={() => scrollTo("top")} className="w-7 h-7 rounded-full bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50" title="לראש העמוד">
                    <ChevronUp className="w-3.5 h-3.5 text-[#716C70]" />
                  </button>
                  <button onClick={() => scrollTo("bottom")} className="w-7 h-7 rounded-full bg-white/90 border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50" title="לתחתית העמוד">
                    <ChevronDown className="w-3.5 h-3.5 text-[#716C70]" />
                  </button>
                </div>
              )}
            </div>

            {pageHeight > SCROLL_VIEWPORT && (
              <p className="text-[10px] text-[#CBCBCB] text-center -mt-1">
                ↕ גלול בתוך המפה כדי לראות את כל העמוד
              </p>
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
