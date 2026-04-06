/**
 * Accessibility widget component.
 * Complies with Israeli Equal Rights for People with Disabilities Law
 * and WCAG 2.1 AA / Israeli Standard SI 5568.
 * Provides font size, contrast, grayscale, link highlighting, and readable font controls.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

/** Supported language codes */
type Lang = "he" | "en" | "ar";

/** Localized strings for the accessibility widget */
const A11Y_LABELS: Record<Lang, {
  buttonAriaLabel: string;
  buttonTitle: string;
  panelAriaLabel: string;
  heading: string;
  closeAriaLabel: string;
  fontSize: string;
  decreaseFont: string;
  increaseFont: string;
  highContrast: string;
  highContrastDesc: string;
  grayscale: string;
  grayscaleDesc: string;
  highlightLinks: string;
  highlightLinksDesc: string;
  readableFont: string;
  readableFontDesc: string;
  reset: string;
  compliance: string;
}> = {
  he: {
    buttonAriaLabel: "הגדרות נגישות",
    buttonTitle: "נגישות",
    panelAriaLabel: "תפריט נגישות",
    heading: "הגדרות נגישות",
    closeAriaLabel: "סגור תפריט נגישות",
    fontSize: "גודל טקסט",
    decreaseFont: "הקטן טקסט",
    increaseFont: "הגדל טקסט",
    highContrast: "ניגודיות גבוהה",
    highContrastDesc: "הגברת ניגודיות הצבעים",
    grayscale: "גווני אפור",
    grayscaleDesc: "הצגת האתר בשחור-לבן",
    highlightLinks: "הדגשת קישורים",
    highlightLinksDesc: "סימון כל הקישורים באתר",
    readableFont: "גופן קריא",
    readableFontDesc: "החלפה לגופן Arial קריא",
    reset: "איפוס הגדרות",
    compliance: "בהתאם לתקן ישראלי 5568 ו-WCAG 2.1 AA",
  },
  en: {
    buttonAriaLabel: "Accessibility settings",
    buttonTitle: "Accessibility",
    panelAriaLabel: "Accessibility menu",
    heading: "Accessibility Settings",
    closeAriaLabel: "Close accessibility menu",
    fontSize: "Font size",
    decreaseFont: "Decrease font size",
    increaseFont: "Increase font size",
    highContrast: "High contrast",
    highContrastDesc: "Increase color contrast",
    grayscale: "Grayscale",
    grayscaleDesc: "Display site in black and white",
    highlightLinks: "Highlight links",
    highlightLinksDesc: "Highlight all links on the page",
    readableFont: "Readable font",
    readableFontDesc: "Switch to readable Arial font",
    reset: "Reset settings",
    compliance: "Compliant with WCAG 2.1 AA",
  },
  ar: {
    buttonAriaLabel: "إعدادات إمكانية الوصول",
    buttonTitle: "إمكانية الوصول",
    panelAriaLabel: "قائمة إمكانية الوصول",
    heading: "إعدادات إمكانية الوصول",
    closeAriaLabel: "إغلاق قائمة إمكانية الوصول",
    fontSize: "حجم الخط",
    decreaseFont: "تصغير الخط",
    increaseFont: "تكبير الخط",
    highContrast: "تباين عالي",
    highContrastDesc: "زيادة تباين الألوان",
    grayscale: "تدرج الرمادي",
    grayscaleDesc: "عرض الموقع بالأبيض والأسود",
    highlightLinks: "تمييز الروابط",
    highlightLinksDesc: "تمييز جميع الروابط في الموقع",
    readableFont: "خط مقروء",
    readableFontDesc: "التبديل إلى خط Arial المقروء",
    reset: "إعادة تعيين الإعدادات",
    compliance: "متوافق مع WCAG 2.1 AA",
  },
};

/** localStorage key prefix for accessibility preferences */
const A11Y_PREFIX = "ono_a11y_";

/** Available accessibility feature toggles */
interface A11yPreferences {
  fontSize: number;
  highContrast: boolean;
  grayscale: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
}

/** Default accessibility preferences */
const DEFAULT_PREFS: A11yPreferences = {
  fontSize: 100,
  highContrast: false,
  grayscale: false,
  highlightLinks: false,
  readableFont: false,
};

/** Minimum and maximum font size percentages */
const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 150;
const FONT_SIZE_STEP = 10;

/**
 * Loads accessibility preferences from localStorage.
 * @returns Stored preferences merged with defaults
 */
function loadPreferences(): A11yPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;

  try {
    const stored = localStorage.getItem(`${A11Y_PREFIX}prefs`);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    /* Ignore parse errors */
  }
  return DEFAULT_PREFS;
}

/**
 * Saves accessibility preferences to localStorage.
 * @param prefs - Preferences to persist
 */
function savePreferences(prefs: A11yPreferences): void {
  try {
    localStorage.setItem(`${A11Y_PREFIX}prefs`, JSON.stringify(prefs));
  } catch {
    /* Ignore storage errors */
  }
}

/**
 * Applies accessibility preferences to the document.
 * @param prefs - Current accessibility settings
 */
function applyPreferences(prefs: A11yPreferences): void {
  const html = document.documentElement;

  /* Font size */
  html.style.fontSize = `${prefs.fontSize}%`;

  /* High contrast */
  html.classList.toggle("high-contrast", prefs.highContrast);

  /* Grayscale */
  if (prefs.grayscale) {
    html.style.filter = prefs.highContrast
      ? "contrast(1.4) grayscale(1)"
      : "grayscale(1)";
  } else if (prefs.highContrast) {
    html.style.filter = "contrast(1.4)";
  } else {
    html.style.filter = "";
  }

  /* Link highlighting */
  html.classList.toggle("highlight-links", prefs.highlightLinks);

  /* Readable font */
  if (prefs.readableFont) {
    html.style.fontFamily = "Arial, Helvetica, sans-serif";
  } else {
    html.style.fontFamily = "";
  }
}

/**
 * Floating accessibility button and settings panel.
 * Renders a fixed button (wheelchair icon) that opens an accessibility panel.
 */
export function AccessibilityWidget({ language = "he" }: { language?: Lang }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefs, setPrefs] = useState<A11yPreferences>(DEFAULT_PREFS);

  /* Load and apply preferences on mount */
  useEffect(() => {
    const stored = loadPreferences();
    setPrefs(stored);
    applyPreferences(stored);
  }, []);

  /**
   * Updates a single preference and re-applies all settings.
   */
  const updatePref = useCallback(
    <K extends keyof A11yPreferences>(key: K, value: A11yPreferences[K]) => {
      setPrefs((prev) => {
        const updated = { ...prev, [key]: value };
        savePreferences(updated);
        applyPreferences(updated);
        return updated;
      });
    },
    []
  );

  /**
   * Resets all preferences to defaults.
   */
  const resetAll = useCallback(() => {
    setPrefs(DEFAULT_PREFS);
    savePreferences(DEFAULT_PREFS);
    applyPreferences(DEFAULT_PREFS);
  }, []);

  const l = A11Y_LABELS[language] || A11Y_LABELS.he;
  const isRtl = language === "he" || language === "ar";

  return (
    <>
      {/* Floating accessibility button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-[80] w-12 h-12 rounded-full bg-[#2a2628] text-white shadow-lg hover:bg-[#3a3638] transition-all duration-300 flex items-center justify-center group"
        aria-label={l.buttonAriaLabel}
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        title={l.buttonTitle}
      >
        <svg
          className="w-6 h-6 group-hover:scale-110 transition-transform"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          {/* Wheelchair icon */}
          <circle cx="12" cy="4" r="2" fill="currentColor" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0l-4 6m4-6l4 6M8 12h8" />
        </svg>
      </button>

      {/* Accessibility panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[81] bg-black/30 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Panel — font-size isolated in px so it's unaffected by the root fontSize override */}
          <div
            id="accessibility-panel"
            role="dialog"
            aria-label={l.panelAriaLabel}
            className="fixed bottom-20 left-6 z-[82] max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200 animate-fade-in-up"
            style={{ fontSize: "16px", width: "min(320px, calc(100vw - 3rem))" }}
            dir={isRtl ? "rtl" : "ltr"}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#B8D900]/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#B8D900]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <circle cx="12" cy="4" r="2" fill="currentColor" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0l-4 6m4-6l4 6M8 12h8" />
                  </svg>
                </div>
                <h2 className="font-bold text-[#2a2628] text-base">{l.heading}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                aria-label={l.closeAriaLabel}
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Controls */}
            <div className="p-4 space-y-4">
              {/* Font size control */}
              <div>
                <label className="block text-sm font-medium text-[#2a2628] mb-2">
                  {l.fontSize} ({prefs.fontSize}%)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updatePref(
                        "fontSize",
                        Math.max(MIN_FONT_SIZE, prefs.fontSize - FONT_SIZE_STEP)
                      )
                    }
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-lg font-bold hover:bg-gray-50 transition-colors"
                    aria-label={l.decreaseFont}
                    disabled={prefs.fontSize <= MIN_FONT_SIZE}
                  >
                    {isRtl ? "א-" : "A-"}
                  </button>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#B8D900] rounded-full transition-all duration-200"
                      style={{
                        width: `${((prefs.fontSize - MIN_FONT_SIZE) / (MAX_FONT_SIZE - MIN_FONT_SIZE)) * 100}%`,
                      }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      updatePref(
                        "fontSize",
                        Math.min(MAX_FONT_SIZE, prefs.fontSize + FONT_SIZE_STEP)
                      )
                    }
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-lg font-bold hover:bg-gray-50 transition-colors"
                    aria-label={l.increaseFont}
                    disabled={prefs.fontSize >= MAX_FONT_SIZE}
                  >
                    {isRtl ? "א+" : "A+"}
                  </button>
                </div>
              </div>

              {/* Toggle controls */}
              <ToggleControl
                label={l.highContrast}
                description={l.highContrastDesc}
                active={prefs.highContrast}
                onToggle={() => updatePref("highContrast", !prefs.highContrast)}
                isRtl={isRtl}
              />

              <ToggleControl
                label={l.grayscale}
                description={l.grayscaleDesc}
                active={prefs.grayscale}
                onToggle={() => updatePref("grayscale", !prefs.grayscale)}
                isRtl={isRtl}
              />

              <ToggleControl
                label={l.highlightLinks}
                description={l.highlightLinksDesc}
                active={prefs.highlightLinks}
                onToggle={() => updatePref("highlightLinks", !prefs.highlightLinks)}
                isRtl={isRtl}
              />

              <ToggleControl
                label={l.readableFont}
                description={l.readableFontDesc}
                active={prefs.readableFont}
                onToggle={() => updatePref("readableFont", !prefs.readableFont)}
                isRtl={isRtl}
              />

              {/* Reset button */}
              <button
                onClick={resetAll}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors"
              >
                {l.reset}
              </button>

              {/* Compliance notice */}
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                {l.compliance}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/**
 * Reusable toggle control for boolean accessibility settings.
 */
function ToggleControl({
  label,
  description,
  active,
  onToggle,
  isRtl = true,
}: {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
  isRtl?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
        active
          ? "border-[#B8D900] bg-[#B8D900]/5"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
      role="switch"
      aria-checked={active}
      aria-label={label}
    >
      <div className={isRtl ? "text-right" : "text-left"}>
        <span className="block text-sm font-medium text-[#2a2628]">{label}</span>
        <span className="block text-xs text-gray-500">{description}</span>
      </div>
      <div
        className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${isRtl ? "mr-3" : "ml-3"} ${
          active ? "bg-[#B8D900]" : "bg-gray-200"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            active ? "right-0.5" : "right-[22px]"
          }`}
        />
      </div>
    </button>
  );
}
