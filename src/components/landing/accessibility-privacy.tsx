"use client";

import { useState, useEffect } from "react";

/**
 * Israeli Privacy Protection Act (חוק הגנת הפרטיות) compliance banner
 * + WCAG 2.1 AA accessibility features
 */

// Cookie consent banner - required by Israeli Privacy Protection Act
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("onoleads_cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem("onoleads_cookie_consent", "accepted");
    localStorage.setItem("onoleads_cookie_consent_date", new Date().toISOString());
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("onoleads_cookie_consent", "declined");
    localStorage.setItem("onoleads_cookie_consent_date", new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="הסכמה לשימוש בעוגיות"
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-white border-t border-gray-200 shadow-lg"
      style={{ direction: "rtl" }}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-gray-700 font-heebo leading-relaxed">
            אתר זה משתמש בעוגיות (cookies) לצורך שיפור חוויית הגלישה, ניתוח תנועת
            גולשים ושיפור שירותינו. בהמשך גלישתכם באתר, אתם מסכימים לשימוש בעוגיות
            בהתאם ל
            <a href="https://www.ono.ac.il/privacy-policy-2/" target="_blank" rel="noopener noreferrer" className="text-[#B8D900] underline hover:text-[#a0c200] mx-1">
              מדיניות הפרטיות
            </a>
            שלנו. ניתן לשנות את הגדרות העוגיות בכל עת.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={accept}
            className="px-6 py-2 bg-[#B8D900] text-[#2a2628] rounded-lg text-sm font-semibold hover:bg-[#a0c200] transition-colors"
            aria-label="אישור שימוש בעוגיות"
          >
            אישור
          </button>
          <button
            onClick={decline}
            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            aria-label="דחיית שימוש בעוגיות"
          >
            דחייה
          </button>
        </div>
      </div>
    </div>
  );
}

// Accessibility toolbar toggle - Israeli Standard SI 5568
export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState({
    fontSize: 0, // 0 = normal, 1 = large, 2 = extra large
    highContrast: false,
    reduceMotion: false,
    linkHighlight: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem("onoleads_a11y");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("onoleads_a11y", JSON.stringify(settings));
    const html = document.documentElement;

    // Font size
    html.style.fontSize =
      settings.fontSize === 0 ? "" : settings.fontSize === 1 ? "110%" : "125%";

    // High contrast
    if (settings.highContrast) {
      html.classList.add("high-contrast");
    } else {
      html.classList.remove("high-contrast");
    }

    // Reduce motion
    if (settings.reduceMotion) {
      html.classList.add("reduce-motion");
    } else {
      html.classList.remove("reduce-motion");
    }

    // Link highlight
    if (settings.linkHighlight) {
      html.classList.add("highlight-links");
    } else {
      html.classList.remove("highlight-links");
    }
  }, [settings]);

  return (
    <>
      {/* Accessibility button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-1/2 left-0 z-[90] -translate-y-1/2 bg-[#2a2628] text-white p-2 rounded-r-lg shadow-lg hover:bg-[#3a3638] transition-colors"
        aria-label="תפריט נגישות"
        title="נגישות"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="4" r="2" />
          <path d="M12 6v6m0 0l-4 6m4-6l4 6" />
          <path d="M6 10h12" />
        </svg>
      </button>

      {/* Accessibility panel */}
      {open && (
        <div
          role="dialog"
          aria-label="הגדרות נגישות"
          className="fixed top-1/2 left-12 z-[90] -translate-y-1/2 bg-white rounded-xl shadow-2xl border p-4 w-64"
          style={{ direction: "rtl" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#2a2628]">הגדרות נגישות</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="סגור תפריט נגישות"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={() =>
                setSettings((s) => ({ ...s, fontSize: (s.fontSize + 1) % 3 }))
              }
              className="w-full text-right px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm flex items-center justify-between"
              aria-label="הגדל טקסט"
            >
              <span>גודל טקסט</span>
              <span className="text-xs text-gray-500">
                {settings.fontSize === 0
                  ? "רגיל"
                  : settings.fontSize === 1
                  ? "גדול"
                  : "גדול מאוד"}
              </span>
            </button>

            <button
              onClick={() =>
                setSettings((s) => ({ ...s, highContrast: !s.highContrast }))
              }
              className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                settings.highContrast
                  ? "bg-[#B8D900] text-[#2a2628]"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              aria-label="ניגודיות גבוהה"
            >
              <span>ניגודיות גבוהה</span>
              <span className="text-xs">{settings.highContrast ? "פעיל" : "כבוי"}</span>
            </button>

            <button
              onClick={() =>
                setSettings((s) => ({ ...s, reduceMotion: !s.reduceMotion }))
              }
              className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                settings.reduceMotion
                  ? "bg-[#B8D900] text-[#2a2628]"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              aria-label="הפחת אנימציות"
            >
              <span>הפחת אנימציות</span>
              <span className="text-xs">{settings.reduceMotion ? "פעיל" : "כבוי"}</span>
            </button>

            <button
              onClick={() =>
                setSettings((s) => ({ ...s, linkHighlight: !s.linkHighlight }))
              }
              className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                settings.linkHighlight
                  ? "bg-[#B8D900] text-[#2a2628]"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
              aria-label="הדגש קישורים"
            >
              <span>הדגש קישורים</span>
              <span className="text-xs">{settings.linkHighlight ? "פעיל" : "כבוי"}</span>
            </button>

            <button
              onClick={() =>
                setSettings({
                  fontSize: 0,
                  highContrast: false,
                  reduceMotion: false,
                  linkHighlight: false,
                })
              }
              className="w-full text-center px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              aria-label="אפס הגדרות נגישות"
            >
              איפוס הגדרות
            </button>
          </div>
        </div>
      )}
    </>
  );
}
