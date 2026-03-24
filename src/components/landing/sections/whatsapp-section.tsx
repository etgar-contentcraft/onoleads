"use client";

import { useState, useEffect } from "react";
import type { Language } from "@/lib/types/database";

interface WhatsappSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

export function WhatsappSection({ content, language }: WhatsappSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const phone = (content.phone as string) || "";
  const message = (content[`message_${language}`] as string) || (content.message_he as string) || "";
  const tooltip = (content[`tooltip_${language}`] as string) || (content.tooltip_he as string) || (isRtl ? "שלחו לנו הודעה" : "Send us a message");
  const [showTooltip, setShowTooltip] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay appearance for a smooth entrance
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!phone) return null;

  const waUrl = `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;

  return (
    <div
      className={`fixed bottom-6 z-50 transition-all duration-700 ${isRtl ? "left-6" : "right-6"} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div
          className={`absolute bottom-full mb-3 ${
            isRtl ? "left-0" : "right-0"
          } whitespace-nowrap px-4 py-2.5 rounded-xl bg-[#2a2628] text-white text-sm font-medium shadow-xl animate-fade-in-up`}
        >
          {tooltip}
          <div
            className={`absolute top-full ${
              isRtl ? "left-7" : "right-7"
            } w-3 h-3 bg-[#2a2628] transform rotate-45 -mt-1.5`}
          />
        </div>
      )}

      {/* Pulse rings */}
      <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
      <div className="absolute inset-[-4px] rounded-full bg-[#25D366] animate-pulse opacity-10" />

      {/* Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative flex items-center justify-center w-16 h-16 rounded-full bg-[#25D366] text-white shadow-[0_4px_25px_rgba(37,211,102,0.5)] hover:shadow-[0_4px_35px_rgba(37,211,102,0.7)] hover:scale-110 transition-all duration-300 active:scale-95"
        aria-label="WhatsApp"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
