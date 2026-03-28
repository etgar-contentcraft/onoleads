/**
 * Popup campaign orchestrator for landing pages.
 * Receives an array of PopupCampaign objects and manages trigger logic,
 * frequency gating, device filtering, and conflict resolution.
 * Only one popup overlay is shown at a time; sticky bars are independent.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  PopupCampaign,
  PopupContent,
  StickyBarContent,
  ExitIntentTrigger,
  TimedTrigger,
  ScrollTrigger,
  StickyBarTrigger,
} from "@/lib/types/popup-campaigns";
import { PopupOverlay } from "./popup-overlay";
import { StickyCtaBar } from "./sticky-cta-bar";
import type { Language } from "@/lib/types/database";

// ============================================================================
// Constants
// ============================================================================

/** Minimum mobile viewport width breakpoint (px) */
const MOBILE_BREAKPOINT = 768;

/** localStorage key prefix for frequency gating */
const STORAGE_PREFIX = "popup_campaign_";

/** Milliseconds in one day — used for "once_per_day" frequency */
const MS_PER_DAY = 86_400_000;

// ============================================================================
// Props
// ============================================================================

interface PopupManagerProps {
  campaigns: PopupCampaign[];
  language: Language;
  whatsappNumber?: string;
  pageId?: string;
  programId?: string;
  pageSlug?: string;
}

// ============================================================================
// Helpers — frequency gating
// ============================================================================

/**
 * Checks whether a campaign should be suppressed based on its frequency setting.
 * Returns true if the campaign has already been shown and should NOT display again.
 */
function isFrequencySuppressed(campaignId: string, frequency: string): boolean {
  if (typeof window === "undefined") return true;
  if (frequency === "every_visit") return false;

  const key = `${STORAGE_PREFIX}${campaignId}`;

  if (frequency === "once_per_session") {
    return sessionStorage.getItem(key) === "1";
  }

  if (frequency === "once_per_day") {
    const ts = localStorage.getItem(key);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < MS_PER_DAY;
  }

  if (frequency === "once_ever") {
    return localStorage.getItem(key) === "1";
  }

  return false;
}

/**
 * Records that a campaign was shown, persisting the value per its frequency type.
 */
function markCampaignShown(campaignId: string, frequency: string): void {
  if (typeof window === "undefined") return;
  const key = `${STORAGE_PREFIX}${campaignId}`;

  if (frequency === "once_per_session") {
    sessionStorage.setItem(key, "1");
  } else if (frequency === "once_per_day") {
    localStorage.setItem(key, String(Date.now()));
  } else if (frequency === "once_ever") {
    localStorage.setItem(key, "1");
  }
}

// ============================================================================
// Helpers — device detection
// ============================================================================

/**
 * Returns true when the current viewport qualifies as mobile.
 */
function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Checks whether a campaign should display on the current device.
 */
function isDeviceAllowed(campaign: PopupCampaign): boolean {
  const mobile = isMobileViewport();
  if (mobile && !campaign.show_on_mobile) return false;
  if (!mobile && !campaign.show_on_desktop) return false;
  return true;
}

// ============================================================================
// Helpers — analytics
// ============================================================================

/**
 * Fires an analytics event to the popup-events API endpoint.
 */
function trackEvent(campaignId: string, pageId: string | undefined, eventType: string): void {
  const deviceType = isMobileViewport() ? "mobile" : "desktop";
  fetch("/api/popup-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaign_id: campaignId,
      page_id: pageId || null,
      event_type: eventType,
      device_type: deviceType,
    }),
  }).catch(() => {
    /* Analytics failures are non-critical — silently ignore */
  });
}

// ============================================================================
// Component
// ============================================================================

/**
 * Orchestrates all popup campaigns for a landing page.
 * Manages trigger registration, frequency gating, device filtering,
 * and ensures only one popup overlay is visible at a time.
 */
export function PopupManager({
  campaigns,
  language,
  whatsappNumber,
  pageId,
  programId,
  pageSlug,
}: PopupManagerProps) {
  /** ID of the currently-visible popup overlay (null when none is shown) */
  const [activePopupId, setActivePopupId] = useState<string | null>(null);

  /** IDs of sticky bars that should be visible */
  const [visibleStickyIds, setVisibleStickyIds] = useState<Set<string>>(new Set());

  /** Tracks which campaigns have already been triggered this session (dedup) */
  const triggeredRef = useRef<Set<string>>(new Set());

  // ── Categorize campaigns ──────────────────────────────────────────────

  const popupCampaigns = campaigns.filter(
    (c) => c.campaign_type !== "sticky_bar" && isDeviceAllowed(c) && !isFrequencySuppressed(c.id, c.frequency)
  );

  const stickyBarCampaigns = campaigns.filter(
    (c) => c.campaign_type === "sticky_bar" && isDeviceAllowed(c) && !isFrequencySuppressed(c.id, c.frequency)
  );

  // ── Trigger a popup (respects single-popup-at-a-time rule) ────────────

  const triggerPopup = useCallback(
    (campaign: PopupCampaign) => {
      if (triggeredRef.current.has(campaign.id)) return;
      triggeredRef.current.add(campaign.id);
      markCampaignShown(campaign.id, campaign.frequency);
      setActivePopupId(campaign.id);
      trackEvent(campaign.id, pageId, "view");
    },
    [pageId]
  );

  // ── Exit Intent triggers ──────────────────────────────────────────────

  useEffect(() => {
    const exitCampaigns = popupCampaigns.filter((c) => c.campaign_type === "exit_intent");
    if (exitCampaigns.length === 0) return;

    /** Desktop: mouse leaves toward the top of the viewport */
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY > 0) return;
      const campaign = exitCampaigns.find((c) => !triggeredRef.current.has(c.id));
      if (campaign) triggerPopup(campaign);
    };

    /** Mobile: user scrolls back up after reaching a depth threshold */
    let lastScrollY = 0;
    const handleScroll = () => {
      const cur = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight;
      const depth = max > 0 ? cur / max : 0;
      const DEPTH_THRESHOLD = 0.4;
      const SCROLL_DELTA = 80;

      if (depth > DEPTH_THRESHOLD && cur < lastScrollY - SCROLL_DELTA) {
        const campaign = exitCampaigns.find(
          (c) => !triggeredRef.current.has(c.id) && (c.trigger_config as ExitIntentTrigger).sensitivity !== "subtle"
        );
        if (campaign) triggerPopup(campaign);
      }
      lastScrollY = cur;
    };

    /** Aggressive: timed fallback after 20 seconds */
    const AGGRESSIVE_DELAY_MS = 20_000;
    const aggressiveCampaign = exitCampaigns.find(
      (c) => (c.trigger_config as ExitIntentTrigger).sensitivity === "aggressive" && !triggeredRef.current.has(c.id)
    );
    const timer = aggressiveCampaign ? setTimeout(() => triggerPopup(aggressiveCampaign), AGGRESSIVE_DELAY_MS) : null;

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupCampaigns.length, triggerPopup]);

  // ── Timed triggers ────────────────────────────────────────────────────

  useEffect(() => {
    const timedCampaigns = popupCampaigns.filter((c) => c.campaign_type === "timed");
    if (timedCampaigns.length === 0) return;

    const timers = timedCampaigns.map((campaign) => {
      const delay = ((campaign.trigger_config as TimedTrigger).delay_seconds || 15) * 1000;
      return setTimeout(() => {
        if (!triggeredRef.current.has(campaign.id)) {
          triggerPopup(campaign);
        }
      }, delay);
    });

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupCampaigns.length, triggerPopup]);

  // ── Scroll triggers ───────────────────────────────────────────────────

  useEffect(() => {
    const scrollCampaigns = popupCampaigns.filter((c) => c.campaign_type === "scroll_triggered");
    if (scrollCampaigns.length === 0) return;

    const handleScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const percent = (window.scrollY / max) * 100;

      for (const campaign of scrollCampaigns) {
        const threshold = (campaign.trigger_config as ScrollTrigger).scroll_percent || 50;
        if (percent >= threshold && !triggeredRef.current.has(campaign.id)) {
          triggerPopup(campaign);
          break; // Only one popup at a time
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupCampaigns.length, triggerPopup]);

  // ── Sticky bar visibility (scroll-based show) ─────────────────────────

  useEffect(() => {
    if (stickyBarCampaigns.length === 0) return;

    /** Show sticky bars that should appear immediately */
    const immediateIds = stickyBarCampaigns
      .filter((c) => ((c.trigger_config as StickyBarTrigger).show_after_scroll_px || 0) === 0)
      .map((c) => c.id);

    if (immediateIds.length > 0) {
      setVisibleStickyIds((prev) => {
        const next = new Set(prev);
        immediateIds.forEach((id) => next.add(id));
        return next;
      });
    }

    /** Register scroll listener for bars that appear after a scroll threshold */
    const scrollBars = stickyBarCampaigns.filter(
      (c) => ((c.trigger_config as StickyBarTrigger).show_after_scroll_px || 0) > 0
    );

    if (scrollBars.length === 0) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const newIds: string[] = [];

      for (const bar of scrollBars) {
        const threshold = (bar.trigger_config as StickyBarTrigger).show_after_scroll_px || 0;
        if (scrollY >= threshold) {
          newIds.push(bar.id);
        }
      }

      if (newIds.length > 0) {
        setVisibleStickyIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const id of newIds) {
            if (!next.has(id)) {
              next.add(id);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickyBarCampaigns.length]);

  // ── Dismiss handler ───────────────────────────────────────────────────

  const handleDismiss = useCallback(
    (campaignId: string) => {
      trackEvent(campaignId, pageId, "dismiss");
      setActivePopupId(null);
    },
    [pageId]
  );

  const handleCtaClick = useCallback(
    (campaignId: string) => {
      trackEvent(campaignId, pageId, "cta_click");
      setActivePopupId(null);
    },
    [pageId]
  );

  const handleStickyCtaClick = useCallback(
    (campaignId: string) => {
      trackEvent(campaignId, pageId, "cta_click");
    },
    [pageId]
  );

  const handleStickyShow = useCallback(
    (campaignId: string) => {
      markCampaignShown(campaignId, "once_per_session");
      trackEvent(campaignId, pageId, "view");
    },
    [pageId]
  );

  // ── Render ────────────────────────────────────────────────────────────

  const activeCampaign = activePopupId ? campaigns.find((c) => c.id === activePopupId) : null;

  return (
    <>
      {/* Popup overlay — only one at a time */}
      {activeCampaign && activeCampaign.campaign_type !== "sticky_bar" && (
        <PopupOverlay
          content={activeCampaign.content as PopupContent}
          language={language}
          whatsappNumber={whatsappNumber}
          pageId={pageId}
          programId={programId}
          pageSlug={pageSlug}
          onDismiss={() => handleDismiss(activeCampaign.id)}
          onCtaClick={() => handleCtaClick(activeCampaign.id)}
        />
      )}

      {/* Sticky bars — can show independently */}
      {stickyBarCampaigns
        .filter((c) => visibleStickyIds.has(c.id))
        .map((campaign) => (
          <StickyCtaBar
            key={campaign.id}
            content={campaign.content as StickyBarContent}
            language={language}
            onCtaClick={() => handleStickyCtaClick(campaign.id)}
            onShow={() => handleStickyShow(campaign.id)}
          />
        ))}
    </>
  );
}
