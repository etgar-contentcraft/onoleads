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

function AnimatedStat({ item, language, inView }: { item: StatItem; language: Language; inView: boolean }) {
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
    <div className="flex flex-col items-center text-center p-6">
      <span className="text-4xl md:text-5xl font-extrabold text-[#B8D900] tabular-nums">
        {displayValue}
        {item.suffix && <span className="text-2xl md:text-3xl">{item.suffix}</span>}
      </span>
      <span className="text-sm md:text-base text-[#716C70] mt-2 font-medium">{label}</span>
    </div>
  );
}

export function StatsSection({ content, language }: StatsSectionProps) {
  const isRtl = language === "he" || language === "ar";
  const items: StatItem[] = (content.items as StatItem[]) || [];
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
    <section ref={ref} className="py-12 md:py-16 bg-[#4A4648]" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-5">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))` }}
        >
          {items.map((item, index) => (
            <AnimatedStat key={index} item={item} language={language} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
