/**
 * Client-side pixel manager for multi-platform tracking.
 *
 * Responsibilities:
 * - Initialize tracking pixels (GA4, Meta, Google Ads, TikTok, LinkedIn, Outbrain, Taboola, Twitter)
 * - Gate all marketing pixel calls on explicit user consent
 * - Implement Google Consent Mode v2 (required since March 2024)
 * - Queue events fired before consent, flush when consent is granted
 * - Fire the 5 standard events: time_on_page, scroll_depth, video_play, form_interact, lead_submit
 *
 * Usage: See PixelTracker component in src/components/landing/pixel-tracker.tsx
 */

import { generateEventId } from "./event-id";
import { getOrCreateCookieId } from "@/hooks/use-page-tracking";

// ============================================================================
// Types
// ============================================================================

export interface PixelConfig {
  ga4Id?: string | null;
  metaPixelId?: string | null;
  googleAdsId?: string | null;          // AW-XXXXXXXXX
  googleAdsConversionLabel?: string | null;
  tikTokPixelId?: string | null;
  linkedInPartnerId?: string | null;
  outbrainAccountId?: string | null;
  taboolaAccountId?: string | null;
  twitterPixelId?: string | null;
  pageId?: string | null;
  pageSlug?: string | null;
}

interface QueuedEvent {
  name: string;
  params: Record<string, unknown>;
}

// ============================================================================
// Global state
// ============================================================================

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
    ttq: {
      track: (event: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void;
      load: (pixelId: string) => void;
      page: () => void;
    };
    lintrk: (action: string, params?: Record<string, unknown>) => void;
    obApi: (...args: unknown[]) => void;
    _tfa: unknown[];
    twq: (...args: unknown[]) => void;
  }
}

let initialized = false;
let consentGranted = false;
const pendingEvents: QueuedEvent[] = [];

// ============================================================================
// Consent Mode v2
// ============================================================================

/**
 * Initializes Google Consent Mode v2 with default-denied state.
 * MUST be called before any gtag/GTM loads.
 * Call this in a beforeInteractive script in the page <head>.
 */
export function initConsentModeDefaults(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }
  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

/**
 * Updates Consent Mode to granted state.
 * Call this when the user accepts marketing cookies.
 */
export function updateConsentGranted(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }
  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
  });
}

// ============================================================================
// Consent check
// ============================================================================

/**
 * Reads consent state from localStorage.
 * Returns true only when user has explicitly accepted all cookies.
 */
export function isMarketingConsentGranted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("ono_cookie_consent") === "all";
  } catch {
    return false;
  }
}

// ============================================================================
// Pixel initialization
// ============================================================================

/**
 * Initializes GA4 immediately (regardless of consent).
 * Google Consent Mode v2 handles data restrictions — GA4 sends
 * cookieless pings when consent is denied, which still register
 * as active users and pageviews in GA4 Realtime.
 * Safe to call multiple times — only initializes once.
 */
let ga4Initialized = false;
export function initializeGA4Early(config: PixelConfig): void {
  if (typeof window === "undefined") return;
  if (ga4Initialized) return;
  if (!config.ga4Id) return;
  ga4Initialized = true;
  initGA4(config.ga4Id);
}

/**
 * Initializes all configured marketing pixels.
 * Safe to call multiple times — only initializes once.
 * Must only be called when consent is granted.
 * @param config - Pixel IDs and page context
 */
export function initializePixels(config: PixelConfig): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  initialized = true;
  consentGranted = true;

  updateConsentGranted();

  // GA4 may already be loaded via initializeGA4Early; initGA4 is idempotent
  if (config.ga4Id) initGA4(config.ga4Id);
  if (config.metaPixelId) initMetaPixel(config.metaPixelId);
  if (config.tikTokPixelId) initTikTokPixel(config.tikTokPixelId);
  if (config.linkedInPartnerId) initLinkedInInsight(config.linkedInPartnerId);
  if (config.outbrainAccountId) initOutbrain(config.outbrainAccountId);
  if (config.taboolaAccountId) initTaboola(config.taboolaAccountId);
  if (config.twitterPixelId) initTwitterPixel(config.twitterPixelId);

  // Flush any queued events
  flushPendingEvents(config);
}

// ── Individual platform initializers ────────────────────────────────────────

function injectScript(src: string, id?: string): void {
  if (id && document.getElementById(id)) return;
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  if (id) script.id = id;
  document.head.appendChild(script);
}

function injectInlineScript(code: string, id: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.textContent = code;
  document.head.appendChild(script);
}

function initGA4(measurementId: string): void {
  if (document.getElementById("gtag-js")) return; // already loaded
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`, "gtag-js");

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function (...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: true,
    anonymize_ip: true,
  });
}

function initMetaPixel(pixelId: string): void {
  /* Standard Meta Pixel base code (minified) */
  injectInlineScript(`
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
  `.trim(), "meta-pixel-base");

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

function initTikTokPixel(pixelId: string): void {
  injectInlineScript(`
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify",
      "instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie",
      "holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){
      t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)
      ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;
      n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){
      var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
      ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,
      ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";
      n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];
      e.parentNode.insertBefore(n,e)};ttq.load('${pixelId}');ttq.page();}(window, document, 'ttq');
  `.trim(), "tiktok-pixel-base");
}

function initLinkedInInsight(partnerId: string): void {
  injectInlineScript(`
    _linkedin_partner_id = "${partnerId}";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(_linkedin_partner_id);
  `, "linkedin-insight-config");
  injectScript("https://snap.licdn.com/li.lms-analytics/insight.min.js", "linkedin-insight-js");
}

function initOutbrain(accountId: string): void {
  injectInlineScript(`
    !function(_window, _document) {
      var OB_ADV_ID='${accountId}';
      if (_window.obApi) { var toArray = function(object) { return Object.prototype.toString.call(object) === '[object Array]' ? object : [object]; };
      _window.obApi.marketerId = toArray(_window.obApi.marketerId).concat(toArray(OB_ADV_ID)); return; }
      var api = _window.obApi = function() { api.dispatch ? api.dispatch.apply(api, arguments) : api.queue.push(arguments); };
      api.version = '1.1'; api.loaded = true; api.marketerId = OB_ADV_ID; api.queue = [];
      var tag = _document.createElement('script'); tag.async = true; tag.src = '//amplify.outbrain.com/cp/obtp.js';
      var script = _document.getElementsByTagName('script')[0]; script.parentNode.insertBefore(tag, script);
    }(window, document);
  `.trim(), "outbrain-pixel-base");
  window.obApi?.("track", "PAGE_VIEW");
}

function initTaboola(accountId: string): void {
  injectInlineScript(`
    window._tfa = window._tfa || [];
    window._tfa.push({notify: 'event', name: 'page_view', id: ${accountId}});
    !function (t, f, a, x) {
      if (!document.getElementById(x)) {
        t.async = 1; t.src = a; t.id = x;
        f.parentNode.insertBefore(t, f);
      }
    }(document.createElement('script'), document.getElementsByTagName('script')[0],
    '//cdn.taboola.com/libtrc/unip/${accountId}/tfa.js', 'tb_tfa_script');
  `.trim(), "taboola-pixel-base");
}

function initTwitterPixel(pixelId: string): void {
  injectInlineScript(`
    !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):
    s.queue.push(arguments)},s.version='1.1',s.queue=[],u=t.createElement(n),
    u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
    a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}
    (window,document,'script');twq('config','${pixelId}');
  `.trim(), "twitter-pixel-base");
}

// ============================================================================
// Event firing
// ============================================================================

/**
 * Fires an event on all active platforms, or queues it if consent not yet given.
 */
export function firePixelEvent(
  eventName: string,
  params: Record<string, unknown>,
  config: PixelConfig
): void {
  if (!consentGranted || !initialized) {
    // Queue the event — will be replayed once consent is granted
    pendingEvents.push({ name: eventName, params: { ...params, _config: config } });
    return;
  }

  const cookieId = typeof window !== "undefined" ? getOrCreateCookieId() : "unknown";
  const pageId = config.pageId || "unknown";
  const eventId = (params.event_id as string) || generateEventId(eventName, pageId, cookieId);

  switch (eventName) {
    case "lead_submit":
      fireLeadSubmit(eventId, params, config);
      break;
    case "scroll_depth_reached":
    case "engaged_visitor":
    case "form_interact":
    case "video_play":
      fireEngagementEvent(eventName, eventId, params, config);
      break;
    default:
      fireGA4Event(eventName, params, config);
  }
}

function fireLeadSubmit(
  eventId: string,
  params: Record<string, unknown>,
  config: PixelConfig
): void {
  // GA4: fire an engagement event, NOT generate_lead.
  // generate_lead is fired server-side via Measurement Protocol (sendGA4CAPI).
  // Firing it here too would create duplicate conversions since GA4 has no
  // event-level deduplication for custom events (unlike Meta's eventID dedup).
  // We fire "lead_form_submit" as a non-conversion engagement signal instead.
  if (config.ga4Id && window.gtag) {
    window.gtag("event", "lead_form_submit", {
      transaction_id: eventId,
      value: 1,
      currency: "ILS",
      // Enhanced Conversions — gtag auto-hashes these for Google Ads
      user_data: params.user_data,
    });
    // Google Ads conversion (if configured) — only browser-side, no server dedup needed
    if (config.googleAdsId && config.googleAdsConversionLabel) {
      window.gtag("event", "conversion", {
        send_to: `${config.googleAdsId}/${config.googleAdsConversionLabel}`,
        transaction_id: eventId,
        value: 1,
        currency: "ILS",
        user_data: params.user_data,
      });
    }
  }

  // Meta Pixel Lead event
  if (config.metaPixelId && window.fbq) {
    window.fbq("track", "Lead", {}, { eventID: eventId });
  }

  // TikTok CompleteRegistration (standard lead gen event — better campaign optimization than SubmitForm)
  if (config.tikTokPixelId && window.ttq) {
    window.ttq.track("CompleteRegistration", {}, { event_id: eventId });
  }

  // Outbrain conversion
  if (config.outbrainAccountId && window.obApi) {
    window.obApi("track", "CONVERSION");
  }

  // Taboola conversion
  if (config.taboolaAccountId && window._tfa) {
    window._tfa.push({
      notify: "event",
      name: "complete_registration",
      id: config.taboolaAccountId,
    });
  }

  // Twitter conversion
  if (config.twitterPixelId && window.twq) {
    window.twq("event", "tw-lead", { conversion_id: eventId });
  }
}

function fireEngagementEvent(
  eventName: string,
  eventId: string,
  params: Record<string, unknown>,
  config: PixelConfig
): void {
  // Map our event names to GA4 standard names
  const ga4EventMap: Record<string, string> = {
    scroll_depth_reached: "scroll",
    engaged_visitor: "engaged_session",
    form_interact: "form_start",
    video_play: "video_start",
  };

  if (config.ga4Id && window.gtag) {
    window.gtag("event", ga4EventMap[eventName] || eventName, {
      ...params,
      event_id: eventId,
    });
  }
}

function fireGA4Event(
  eventName: string,
  params: Record<string, unknown>,
  config: PixelConfig
): void {
  if (config.ga4Id && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

function flushPendingEvents(config: PixelConfig): void {
  while (pendingEvents.length > 0) {
    const event = pendingEvents.shift();
    if (event) {
      const { _config: _, ...cleanParams } = event.params as Record<string, unknown>;
      firePixelEvent(event.name, cleanParams, config);
    }
  }
}

// ============================================================================
// Consent Mode v2 inline script (for <head> injection)
// ============================================================================

/**
 * Returns the inline script content for Consent Mode v2 initialization.
 * This must be injected as a `beforeInteractive` script in the page <head>
 * BEFORE any gtag/GTM script loads.
 */
export const CONSENT_MODE_INIT_SCRIPT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  var consent = typeof localStorage !== 'undefined' && localStorage.getItem('ono_cookie_consent');
  if (consent === 'all') {
    gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
  }
`.trim();
