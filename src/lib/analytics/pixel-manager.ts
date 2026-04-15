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
import { sanitizePixelIdForInlineScript } from "@/lib/capi/validate-pixel";

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
  linkedInConversionId?: string | null;  // LinkedIn conversion rule ID for lintrk("track")
  outbrainAccountId?: string | null;
  taboolaAccountId?: string | null;
  twitterPixelId?: string | null;
  clarityProjectId?: string | null;     // Microsoft Clarity project ID
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
    clarity: (...args: unknown[]) => void;
  }
}

let initialized = false;
let consentGranted = false;
const pendingEvents: QueuedEvent[] = [];

// ============================================================================
// Consent Mode v2
// ============================================================================

/**
 * Initializes Google Consent Mode v2 with default consent state.
 * analytics_storage defaults to "granted" — basic analytics (pageviews, sessions)
 * is considered legitimate interest under Israeli Privacy Protection Law 5741-1981.
 * Marketing consent (ad_storage, ad_user_data, ad_personalization) defaults to "denied"
 * and requires explicit user consent via the cookie banner.
 *
 * Idempotent — safe to call multiple times (only the first call has effect).
 * MUST be called before any gtag/GTM loads.
 */
let consentDefaultsSet = false;
export function initConsentModeDefaults(): void {
  if (typeof window === "undefined") return;
  if (consentDefaultsSet) return;
  consentDefaultsSet = true;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    // CRITICAL: Must push `arguments` (Arguments object), NOT rest args (Array).
    // Google's gtag.js only processes Arguments objects from the dataLayer queue.
    // eslint-disable-next-line prefer-rest-params
    window.gtag = function () { window.dataLayer.push(arguments); };
  }
  window.gtag("consent", "default", {
    analytics_storage: "granted",
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
    // eslint-disable-next-line prefer-rest-params
    window.gtag = function () { window.dataLayer.push(arguments); };
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
  if (!config.ga4Id) {
    console.debug("[pixel] initializeGA4Early: no ga4Id in config, skipping");
    return;
  }
  ga4Initialized = true;
  initGA4(config.ga4Id);
}

/**
 * Initializes Microsoft Clarity immediately (regardless of marketing consent).
 * Clarity is a behavioral analytics tool (session recordings + heatmaps) —
 * NOT an advertising platform. It has no CAPI, no conversion tracking.
 * Like GA4, it loads under legitimate interest for analytics purposes.
 * Safe to call multiple times — only initializes once.
 */
let clarityInitialized = false;
export function initializeClarityEarly(config: PixelConfig): void {
  if (typeof window === "undefined") return;
  if (clarityInitialized) return;
  if (!config.clarityProjectId) {
    console.debug("[pixel] initializeClarityEarly: no clarityProjectId in config, skipping");
    return;
  }
  clarityInitialized = true;
  initClarity(config.clarityProjectId);
}

/**
 * Initializes all configured marketing pixels.
 * Safe to call multiple times — only initializes once.
 * Must only be called when consent is granted.
 * @param config - Pixel IDs and page context
 */
/** Delay between staggered pixel script injections (ms).
 * Prevents main thread congestion from loading all pixels simultaneously. */
const PIXEL_STAGGER_MS = 150;

export function initializePixels(config: PixelConfig): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  initialized = true;
  consentGranted = true;

  updateConsentGranted();

  /* Priority: GA4 + Meta + Google Ads load immediately (essential for measurement).
   * Google Ads needs gtag('config') to initialize the conversion linker cookie (_gcl_aw). */
  if (config.ga4Id) initGA4(config.ga4Id);
  if (config.googleAdsId) {
    window.gtag("config", config.googleAdsId, { allow_enhanced_conversions: true });
  }
  if (config.metaPixelId) initMetaPixel(config.metaPixelId);

  /* Stagger lower-priority pixels via requestIdleCallback (or setTimeout fallback).
   * Each platform loads after a small delay so the main thread stays responsive. */
  const deferredPixels: Array<() => void> = [];
  if (config.tikTokPixelId) deferredPixels.push(() => initTikTokPixel(config.tikTokPixelId!));
  if (config.linkedInPartnerId) deferredPixels.push(() => initLinkedInInsight(config.linkedInPartnerId!));
  if (config.outbrainAccountId) deferredPixels.push(() => initOutbrain(config.outbrainAccountId!));
  if (config.taboolaAccountId) deferredPixels.push(() => initTaboola(config.taboolaAccountId!));
  if (config.twitterPixelId) deferredPixels.push(() => initTwitterPixel(config.twitterPixelId!));

  const scheduleIdle = typeof requestIdleCallback !== "undefined"
    ? (fn: () => void, delay: number) => setTimeout(() => requestIdleCallback(fn), delay)
    : (fn: () => void, delay: number) => setTimeout(fn, delay);

  deferredPixels.forEach((fn, i) => scheduleIdle(fn, (i + 1) * PIXEL_STAGGER_MS));

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

function initGA4(measurementIdRaw: string): void {
  const measurementId = sanitizePixelIdForInlineScript(measurementIdRaw);
  if (!measurementId) return;
  if (document.getElementById("gtag-js")) {
    console.debug("[pixel] GA4 already loaded, skipping init");
    return;
  }
  console.debug("[pixel] Initializing GA4 with measurement ID:", measurementId);
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, "gtag-js");

  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: true,
    anonymize_ip: true,
  });
}

function initMetaPixel(pixelIdRaw: string): void {
  const pixelId = sanitizePixelIdForInlineScript(pixelIdRaw);
  if (!pixelId) return;
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

function initTikTokPixel(pixelIdRaw: string): void {
  const pixelId = sanitizePixelIdForInlineScript(pixelIdRaw);
  if (!pixelId) return;
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

function initLinkedInInsight(partnerIdRaw: string): void {
  const partnerId = sanitizePixelIdForInlineScript(partnerIdRaw);
  if (!partnerId) return;
  injectInlineScript(`
    _linkedin_partner_id = "${partnerId}";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(_linkedin_partner_id);
  `, "linkedin-insight-config");
  injectScript("https://snap.licdn.com/li.lms-analytics/insight.min.js", "linkedin-insight-js");
}

function initOutbrain(accountIdRaw: string): void {
  const accountId = sanitizePixelIdForInlineScript(accountIdRaw);
  if (!accountId) return;
  injectInlineScript(`
    !function(_window, _document) {
      var OB_ADV_ID='${accountId}';
      if (_window.obApi) { var toArray = function(object) { return Object.prototype.toString.call(object) === '[object Array]' ? object : [object]; };
      _window.obApi.marketerId = toArray(_window.obApi.marketerId).concat(toArray(OB_ADV_ID)); return; }
      var api = _window.obApi = function() { api.dispatch ? api.dispatch.apply(api, arguments) : api.queue.push(arguments); };
      api.version = '1.1'; api.loaded = true; api.marketerId = OB_ADV_ID; api.queue = [];
      var tag = _document.createElement('script'); tag.async = true; tag.src = 'https://amplify.outbrain.com/cp/obtp.js';
      var script = _document.getElementsByTagName('script')[0]; script.parentNode.insertBefore(tag, script);
    }(window, document);
  `.trim(), "outbrain-pixel-base");
  window.obApi?.("track", "PAGE_VIEW");
}

function initTaboola(accountIdRaw: string): void {
  const accountId = sanitizePixelIdForInlineScript(accountIdRaw);
  if (!accountId) return;
  injectInlineScript(`
    window._tfa = window._tfa || [];
    window._tfa.push({notify: 'event', name: 'page_view', id: '${accountId}'});
    !function (t, f, a, x) {
      if (!document.getElementById(x)) {
        t.async = 1; t.src = a; t.id = x;
        f.parentNode.insertBefore(t, f);
      }
    }(document.createElement('script'), document.getElementsByTagName('script')[0],
    'https://cdn.taboola.com/libtrc/unip/${accountId}/tfa.js', 'tb_tfa_script');
  `.trim(), "taboola-pixel-base");
}

function initTwitterPixel(pixelIdRaw: string): void {
  const pixelId = sanitizePixelIdForInlineScript(pixelIdRaw);
  if (!pixelId) return;
  injectInlineScript(`
    !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):
    s.queue.push(arguments)},s.version='1.1',s.queue=[],u=t.createElement(n),
    u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
    a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}
    (window,document,'script');twq('config','${pixelId}');twq('track','PageView');
  `.trim(), "twitter-pixel-base");
}

/**
 * Microsoft Clarity — behavioral analytics (session recordings + heatmaps).
 * Standard Clarity tag snippet. The script self-initializes when loaded.
 * No CAPI or conversion events — purely observational analytics.
 */
function initClarity(projectIdRaw: string): void {
  const projectId = sanitizePixelIdForInlineScript(projectIdRaw);
  if (!projectId) return;
  if (document.getElementById("ms-clarity-base")) return;
  console.debug("[pixel] Initializing Microsoft Clarity with project ID:", projectId);
  injectInlineScript(`
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window,document,"clarity","script","${projectId}");
  `.trim(), "ms-clarity-base");
}

// ============================================================================
// Event firing
// ============================================================================

/**
 * Fires an event on all active platforms, or queues it if consent not yet given.
 *
 * GA4 engagement events (scroll, time-on-page, form_interact) are sent immediately
 * regardless of marketing consent because GA4 runs under legitimate interest
 * (analytics_storage defaults to "granted"). Only marketing platform events are queued.
 */
export function firePixelEvent(
  eventName: string,
  params: Record<string, unknown>,
  config: PixelConfig
): void {
  /* GA4 engagement events fire immediately under legitimate interest — no consent needed.
   * GA4 was initialized early via initializeGA4Early() before any consent check. */
  const isEngagement = ["scroll_depth_reached", "engaged_visitor", "form_interact", "video_play"].includes(eventName);
  if (isEngagement && ga4Initialized && config.ga4Id && typeof window !== "undefined" && typeof window.gtag === "function") {
    const cookieId = getOrCreateCookieId();
    const pageId = config.pageId || "unknown";
    const eventId = (params.event_id as string) || generateEventId(eventName, pageId, cookieId);
    fireEngagementEvent(eventName, eventId, params, config);
  }

  if (!consentGranted || !initialized) {
    // Queue the event — will be replayed once consent is granted (marketing pixels only)
    if (!isEngagement) {
      pendingEvents.push({ name: eventName, params: { ...params, _config: config } });
    }
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
      /* Already fired above under the legitimate-interest path — no double-fire here. */
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

  // LinkedIn Lead conversion (conversion_id from Campaign Manager, eventId for CAPI dedup)
  if (config.linkedInPartnerId && config.linkedInConversionId && window.lintrk) {
    window.lintrk("track", { conversion_id: config.linkedInConversionId });
  }

  // Outbrain conversion (orderId enables S2S deduplication — must match CAPI's orderid)
  if (config.outbrainAccountId && window.obApi) {
    window.obApi("track", "CONVERSION", { orderId: eventId });
  }

  // Taboola conversion (orderid enables S2S deduplication)
  if (config.taboolaAccountId && window._tfa) {
    window._tfa.push({
      notify: "event",
      name: "complete_registration",
      id: config.taboolaAccountId,
      orderid: eventId,
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
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  var consent = typeof localStorage !== 'undefined' && localStorage.getItem('ono_cookie_consent');
  if (consent === 'all') {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    });
  }
`.trim();
