"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/types/database";

interface StatItem {
  value: string;
  label_he: string;
  label_en?: string;
  label_ar?: string;
  suffix?: string;
}

interface StatsSectionProps {
  content: Record<string, unknown>;
  language: Language;
}

function AnimatedStat({ item, language, inView, index }: { item: StatItem; language: Language; inView: boolean; index: number }) {
  const label = (item[`label_${language}` as keyof StatItem] as string) || item.label_he || "";
  const [displayValue, setDisplayValue] = useState("0");
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    const numeric = parseInt(item.value.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) {
      setDisplayValue(item.value);
      return;
    }

    const duration = 1800;
    const steps = 50;
    const stepTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      const eased = 1 - Math.pow(1 - progress, 4);
      const val = Math.round(eased * numeric);
      setDisplayValue(val.toLocaleString());

      if (current >= steps) {
        clearInterval(timer);
        setDisplayValue(item.value);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [inView, item.value]);

  return (
    <div
      className="flex flex-col items-center text-center p-6 md:p-8 opacity-0"
      style={{
        animation: inView ? `scale-in 0.5s ease-out ${index * 0.12}s forwards` : "none",
      }}
    >
      <span className="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-[#B8D900] tabular-nums leading-none">
        {displayValue}
        {item.suffix && <span className="text-3xl md:text-4xl">{item.suffix}</span>}
      </span>
      <div className="w-10 h-0.5 bg-[#B8D900]/30 rounded-full my-3" />
      <span className="text-sm md:text-base text-white/70 font-medium">{label}</span>
    </div>
  );
}

export function StatsSection({ content, language }: StatsSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const items: StatItem[] = (content.items as StatItem[]) || [];
  const bgImage = (content.background_image_url as string) || "";
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <section ref={ref} className="relative py-16 md:py-24 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {bgImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bgImage} alt="" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-[#2a2628]/92" />
          </>
        ) : (
          <div className="w-full h-full bg-[#2a2628]">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `radial-gradient(circle, #B8D900 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5">
        <div
          className="grid gap-6 md:gap-8"
          style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
        >
          {items.map((item, index) => (
            <AnimatedStat key={index} item={item} language={language} inView={inView} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
