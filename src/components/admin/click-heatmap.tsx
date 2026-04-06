/**
 * Click Heatmap — renders an iframe of the landing page with a canvas overlay
 * showing click density as a gradient heatmap.
 *
 * Features:
 * - Device filter (desktop/mobile/all)
 * - Date range from parent analytics page
 * - Canvas overlay with gaussian-blur heat dots
 * - Click count + top clicked elements summary
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Monitor, Smartphone, Layers, MousePointerClick, RefreshCw } from "lucide-react";

/** A single click data point from analytics_events */
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

/** Radius of each heat dot in CSS pixels */
const DOT_RADIUS = 20;

/** Maximum number of click events to fetch */
const MAX_CLICK_EVENTS = 5000;

/**
 * Draws a heatmap overlay on a canvas element.
 * Uses additive blending of semi-transparent circles, then colorizes.
 */
function drawHeatmap(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[],
  width: number,
  height: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  if (points.length === 0) return;

  /* Pass 1: draw semi-transparent circles to build intensity map */
  ctx.globalCompositeOperation = "source-over";
  const alpha = Math.max(0.02, Math.min(0.15, 5 / points.length));

  for (const pt of points) {
    const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, DOT_RADIUS);
    gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha * 3})`);
    gradient.addColorStop(0.5, `rgba(255, 0, 0, ${alpha})`);
    gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(pt.x - DOT_RADIUS, pt.y - DOT_RADIUS, DOT_RADIUS * 2, DOT_RADIUS * 2);
  }

  /* Pass 2: colorize the intensity map using getImageData */
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const intensity = data[i]; // red channel = intensity

    if (intensity === 0) {
      data[i + 3] = 0; // fully transparent
      continue;
    }

    /* Map intensity to a blue → green → yellow → red gradient */
    const t = intensity / 255;
    if (t < 0.25) {
      // Blue → Cyan
      const lt = t / 0.25;
      data[i] = 0;
      data[i + 1] = Math.round(lt * 200);
      data[i + 2] = 255;
    } else if (t < 0.5) {
      // Cyan → Green
      const lt = (t - 0.25) / 0.25;
      data[i] = 0;
      data[i + 1] = 200 + Math.round(lt * 55);
      data[i + 2] = Math.round(255 * (1 - lt));
    } else if (t < 0.75) {
      // Green → Yellow
      const lt = (t - 0.5) / 0.25;
      data[i] = Math.round(lt * 255);
      data[i + 1] = 255;
      data[i + 2] = 0;
    } else {
      // Yellow → Red
      const lt = (t - 0.75) / 0.25;
      data[i] = 255;
      data[i + 1] = Math.round(255 * (1 - lt));
      data[i + 2] = 0;
    }
    data[i + 3] = Math.min(200, intensity + 60); // alpha
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Click Heatmap component.
 * Fetches click events for a page and renders an iframe + overlay.
 */
export function ClickHeatmap({ pageId, pageSlug, startDate, endDate }: ClickHeatmapProps) {
  const [clicks, setClicks] = useState<ClickPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile">("all");
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  /** Fetch click events from analytics_events */
  const fetchClicks = useCallback(async () => {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let allClicks: ClickPoint[] = [];
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

  useEffect(() => {
    fetchClicks();
  }, [fetchClicks]);

  /** Filter clicks by device */
  const filteredClicks = deviceFilter === "all"
    ? clicks
    : clicks.filter((c) => c.device_type === deviceFilter);

  /** Render heatmap overlay when data or iframe changes */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !iframeLoaded || !showHeatmap) return;

    const container = containerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const points = filteredClicks.map((c) => ({
      x: (c.x_pct / 100) * width,
      y: (c.y_pct / 100) * height,
    }));

    drawHeatmap(canvasRef.current, points, width, height);
  }, [filteredClicks, iframeLoaded, showHeatmap]);

  /** Top clicked elements breakdown */
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

  /** Build the iframe URL — use the live page */
  const iframeUrl = `/lp/${pageSlug}`;

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-bold text-[#2a2628] flex items-center gap-2">
              <MousePointerClick className="w-4 h-4 text-[#9A969A]" />
              מפת חום — לחיצות
            </CardTitle>
            <CardDescription className="text-xs">
              {loading ? "טוען..." : `${filteredClicks.length.toLocaleString("he-IL")} לחיצות`}
              {!loading && clicks.length === 0 && " — אין נתונים עדיין. לחיצות ייאספו לאחר פרסום הדף."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showHeatmap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="h-8 text-xs gap-1"
            >
              <Layers className="w-3.5 h-3.5" />
              {showHeatmap ? "הסתר שכבה" : "הצג שכבה"}
            </Button>
            <Select
              value={deviceFilter}
              onValueChange={(val) => setDeviceFilter(val as "all" | "desktop" | "mobile")}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> הכל</span>
                </SelectItem>
                <SelectItem value="desktop">
                  <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> מחשב</span>
                </SelectItem>
                <SelectItem value="mobile">
                  <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> נייד</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchClicks}
              className="h-8 w-8 p-0"
              title="רענון"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-[500px] text-[#9A969A] text-sm">
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              טוען נתוני לחיצות...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Heatmap iframe + overlay */}
            <div className="lg:col-span-3">
              <div
                ref={containerRef}
                className="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50"
                style={{ height: "600px" }}
              >
                <iframe
                  src={iframeUrl}
                  title="מפת חום — תצוגה מקדימה"
                  className="w-full h-full border-0"
                  style={{ pointerEvents: "none" }}
                  onLoad={() => setIframeLoaded(true)}
                  sandbox="allow-same-origin allow-scripts"
                />
                {showHeatmap && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ mixBlendMode: "multiply" }}
                  />
                )}
                {/* Empty state overlay */}
                {filteredClicks.length === 0 && !loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <div className="text-center space-y-2">
                      <MousePointerClick className="w-10 h-10 mx-auto text-[#E5E5E5]" />
                      <p className="text-sm text-[#9A969A]">אין לחיצות לתקופה זו</p>
                      <p className="text-xs text-[#CBCBCB]">נתונים יופיעו לאחר שמבקרים ילחצו בדף</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top clicked elements sidebar */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#2a2628]">אלמנטים פופולריים</h4>
              {topElements.length === 0 ? (
                <p className="text-xs text-[#9A969A]">אין נתונים</p>
              ) : (
                <div className="space-y-2">
                  {topElements.map((item, i) => {
                    const maxCount = topElements[0].count;
                    const width = Math.round((item.count / maxCount) * 100);
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-[#716C70] truncate max-w-[160px]" title={item.element}>
                            {item.element}
                          </span>
                          <span className="text-xs font-bold text-[#2a2628] tabular-nums shrink-0">
                            {item.count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#B8D900] transition-all duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick stats */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#9A969A]">סה״כ לחיצות</span>
                  <span className="font-bold text-[#2a2628]">{filteredClicks.length.toLocaleString("he-IL")}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#9A969A]">מחשב</span>
                  <span className="font-bold text-[#2a2628]">{clicks.filter(c => c.device_type === "desktop").length.toLocaleString("he-IL")}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#9A969A]">נייד</span>
                  <span className="font-bold text-[#2a2628]">{clicks.filter(c => c.device_type === "mobile").length.toLocaleString("he-IL")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
