"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ProgramWithFaculty } from "@/lib/types/database";

// ============================================================================
// Types
// ============================================================================

interface HomepageClientProps {
  programs: ProgramWithFaculty[];
}

interface QuizCategory {
  id: string;
  label: string;
  icon: string;
  facultyMatch?: string;
  filterFn?: (p: ProgramWithFaculty) => boolean;
}

// ============================================================================
// Constants
// ============================================================================

const QUIZ_CATEGORIES: QuizCategory[] = [
  {
    id: "business",
    label: "\u05E2\u05E1\u05E7\u05D9\u05DD \u05D5\u05DB\u05DC\u05DB\u05DC\u05D4",
    icon: "\uD83D\uDCBC",
    facultyMatch: "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05E0\u05D4\u05DC \u05E2\u05E1\u05E7\u05D9\u05DD",
  },
  {
    id: "law",
    label: "\u05DE\u05E9\u05E4\u05D8\u05D9\u05DD",
    icon: "\u2696\uFE0F",
    facultyMatch: "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05E9\u05E4\u05D8\u05D9\u05DD",
  },
  {
    id: "education",
    label: "\u05D7\u05D9\u05E0\u05D5\u05DA \u05D5\u05D7\u05D1\u05E8\u05D4",
    icon: "\uD83D\uDCDA",
    facultyMatch: "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05D3\u05E2\u05D9 \u05D4\u05E8\u05D5\u05D7 \u05D5\u05D4\u05D7\u05D1\u05E8\u05D4",
  },
  {
    id: "health",
    label: "\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA",
    icon: "\uD83E\uDE7A",
    facultyMatch: "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05E7\u05E6\u05D5\u05E2\u05D5\u05EA \u05D4\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA",
  },
  {
    id: "tech",
    label: "\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2\u05D9\u05D4 \u05D5\u05DE\u05D7\u05E9\u05D1\u05D9\u05DD",
    icon: "\uD83D\uDCBB",
    filterFn: (p) => {
      const name = (p.name_he + " " + (p.name_en || "") + " " + (p.degree_type || "")).toLowerCase();
      return (
        name.includes("b.sc") ||
        name.includes("computer") ||
        name.includes("info") ||
        name.includes("\u05DE\u05D7\u05E9\u05D1") ||
        name.includes("\u05DE\u05D9\u05D3\u05E2") ||
        name.includes("\u05E1\u05D9\u05D9\u05D1\u05E8") ||
        name.includes("cyber") ||
        name.includes("\u05D8\u05DB\u05E0\u05D5\u05DC\u05D5\u05D2")
      );
    },
  },
  {
    id: "international",
    label: "\u05DC\u05D9\u05DE\u05D5\u05D3\u05D9\u05DD \u05D1\u05D9\u05E0\u05DC\u05D0\u05D5\u05DE\u05D9\u05D9\u05DD",
    icon: "\uD83C\uDF0D",
    facultyMatch: "\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05D4\u05D1\u05D9\u05E0\u05DC\u05D0\u05D5\u05DE\u05D9",
  },
];

const FEATURED_SLUGS = [
  "computer-science-bsc",
  "llb",
  "finance-and-capital-markets-mba",
  "nursing",
  "education-and-society-ba",
  "mba-\u05E2\u05DD-\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA-\u05D1\u05E1\u05D9\u05D9\u05D1\u05E8",
];

const STATS = [
  { value: 40000, suffix: "+", label: "\u05D1\u05D5\u05D2\u05E8\u05D9\u05DD" },
  { value: 30, suffix: "+", label: "\u05E9\u05E0\u05D5\u05EA \u05DE\u05E6\u05D5\u05D9\u05E0\u05D5\u05EA \u05D0\u05E7\u05D3\u05DE\u05D9\u05EA" },
  { value: 6, suffix: "", label: "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D5\u05EA" },
  { value: 92, suffix: "%", label: "\u05E9\u05D9\u05E2\u05D5\u05E8 \u05D4\u05E9\u05DE\u05D4" },
];

// ============================================================================
// Utility: Animated Counter Hook
// ============================================================================

function useAnimatedCounter(target: number, duration: number, shouldStart: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, shouldStart]);

  return count;
}

// ============================================================================
// Sub-Components
// ============================================================================

function DegreeTypeBadge({ level }: { level: string }) {
  const ismaster = level === "master";
  return (
    <span
      className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
        ismaster
          ? "bg-[#2a2628] text-[#B8D900]"
          : "bg-[#B8D900]/15 text-[#5a7a00]"
      }`}
    >
      {ismaster ? "\u05EA\u05D5\u05D0\u05E8 \u05E9\u05E0\u05D9" : "\u05EA\u05D5\u05D0\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF"}
    </span>
  );
}

// ============================================================================
// Section 1: Hero + Smart Quiz
// ============================================================================

function HeroSection({ programs }: { programs: ProgramWithFaculty[] }) {
  const [quizStep, setQuizStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<"bachelor" | "master" | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const filteredPrograms = (() => {
    if (!selectedCategory) return [];
    let filtered = programs;

    // Filter by category
    if (selectedCategory.filterFn) {
      filtered = filtered.filter(selectedCategory.filterFn);
    } else if (selectedCategory.facultyMatch) {
      filtered = filtered.filter(
        (p) => p.faculty?.name_he === selectedCategory.facultyMatch
      );
    }

    // Filter by level
    if (selectedLevel) {
      filtered = filtered.filter((p) => p.level === selectedLevel);
    }

    return filtered;
  })();

  const handleCategorySelect = (cat: QuizCategory) => {
    setSelectedCategory(cat);
    setSelectedLevel(null);
    setQuizStep(1);
  };

  const handleLevelSelect = (level: "bachelor" | "master") => {
    setSelectedLevel(level);
    setQuizStep(2);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const handleReset = () => {
    setQuizStep(0);
    setSelectedCategory(null);
    setSelectedLevel(null);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2a2628] via-[#1a1718] to-[#111010]" />
      {/* Green glow accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#B8D900]/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-5 py-20 md:py-28">
        {/* Heading */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4 leading-tight">
            <span className="text-[#B8D900]">{"\u05D4\u05E7\u05E8\u05D9\u05D4 \u05D4\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA"}</span>{" "}
            {"\u05D0\u05D5\u05E0\u05D5"}
          </h1>
          <p className="text-xl md:text-2xl text-[#B8D900] font-semibold mb-2">
            {"\u05D4\u05DE\u05DB\u05DC\u05DC\u05D4 \u05D4\u05DE\u05D5\u05DE\u05DC\u05E6\u05EA \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC"}
          </p>
          <p className="text-lg md:text-xl text-gray-400 mt-4">
            {"\u05DE\u05E6\u05D0 \u05D0\u05EA \u05D4\u05EA\u05D5\u05D0\u05E8 \u05E9\u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05DA"}
          </p>
        </div>

        {/* Quiz container */}
        <div className="bg-white/[0.05] backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-10 max-w-3xl mx-auto">
          {/* Step 1: Category selection */}
          {quizStep >= 0 && (
            <div className={`transition-all duration-500 ${quizStep === 0 ? "opacity-100" : "opacity-60"}`}>
              <h3 className="text-white text-lg md:text-xl font-bold mb-6 text-center">
                {quizStep === 0 ? "\u05DE\u05D4 \u05DE\u05E2\u05E0\u05D9\u05D9\u05DF \u05D0\u05D5\u05EA\u05DA?" : `\u05D1\u05D7\u05E8\u05EA: ${selectedCategory?.label}`}
                {quizStep > 0 && (
                  <button
                    onClick={handleReset}
                    className="text-sm text-[#B8D900] hover:underline mr-3 font-normal"
                  >
                    (\u05E9\u05E0\u05D4)
                  </button>
                )}
              </h3>

              {quizStep === 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  {QUIZ_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat)}
                      className="group relative bg-white/[0.06] hover:bg-[#B8D900]/20 border border-white/10 hover:border-[#B8D900]/50 rounded-2xl p-5 md:p-6 text-center transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(184,217,0,0.15)]"
                    >
                      <div className="text-3xl md:text-4xl mb-3">{cat.icon}</div>
                      <div className="text-white text-sm md:text-base font-semibold group-hover:text-[#B8D900] transition-colors">
                        {cat.label}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Level selection */}
          {quizStep >= 1 && (
            <div
              className={`mt-8 transition-all duration-500 ${
                quizStep === 1 ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0"
              } ${quizStep < 1 ? "opacity-0 translate-y-4" : ""}`}
            >
              <h3 className="text-white text-lg md:text-xl font-bold mb-5 text-center">
                {"\u05D1\u05D0\u05D9\u05D6\u05D5 \u05E8\u05DE\u05D4?"}
              </h3>
              {quizStep === 1 && (
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleLevelSelect("bachelor")}
                    className="px-8 py-4 rounded-full bg-white/[0.06] hover:bg-[#B8D900] border border-white/10 hover:border-[#B8D900] text-white hover:text-[#2a2628] font-bold text-base md:text-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(184,217,0,0.3)]"
                  >
                    {"\u05EA\u05D5\u05D0\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF"}
                  </button>
                  <button
                    onClick={() => handleLevelSelect("master")}
                    className="px-8 py-4 rounded-full bg-white/[0.06] hover:bg-[#B8D900] border border-white/10 hover:border-[#B8D900] text-white hover:text-[#2a2628] font-bold text-base md:text-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(184,217,0,0.3)]"
                  >
                    {"\u05EA\u05D5\u05D0\u05E8 \u05E9\u05E0\u05D9"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {quizStep === 2 && (
            <div
              ref={resultsRef}
              className="mt-8 transition-all duration-500 animate-fade-in-up"
            >
              <h3 className="text-white text-lg font-bold mb-5 text-center">
                {filteredPrograms.length > 0
                  ? `\u05DE\u05E6\u05D0\u05E0\u05D5 ${filteredPrograms.length} \u05EA\u05D5\u05DB\u05E0\u05D9\u05D5\u05EA \u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA`
                  : "\u05DC\u05D0 \u05DE\u05E6\u05D0\u05E0\u05D5 \u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4"}
              </h3>

              {filteredPrograms.length > 0 ? (
                <div className="grid gap-3">
                  {filteredPrograms.map((p, i) => (
                    <a
                      key={p.id}
                      href={`/lp/${p.slug}`}
                      className="group flex items-center justify-between bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-[#B8D900]/40 rounded-xl p-4 transition-all duration-300"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <DegreeTypeBadge level={p.level} />
                        <div className="min-w-0">
                          <div className="text-white font-semibold text-sm md:text-base truncate">
                            {p.name_he}
                          </div>
                          {p.faculty?.name_he && (
                            <div className="text-gray-500 text-xs mt-0.5 truncate">
                              {p.faculty.name_he}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[#B8D900] text-sm font-semibold whitespace-nowrap group-hover:translate-x-[-4px] transition-transform duration-200 flex items-center gap-1">
                        {"\u05DC\u05DE\u05D9\u05D3\u05E2 \u05E0\u05D5\u05E1\u05E3"}
                        <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-400 mb-4">
                    {"\u05DC\u05D0 \u05DE\u05E6\u05D0\u05E0\u05D5 \u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4? \u05D4\u05E9\u05D0\u05D9\u05E8\u05D5 \u05E4\u05E8\u05D8\u05D9\u05DD \u05D5\u05E0\u05E2\u05D6\u05D5\u05E8 \u05DC\u05DB\u05DD"}
                  </p>
                  <a
                    href="#lead-form"
                    className="inline-block bg-[#B8D900] text-[#2a2628] font-bold px-8 py-3 rounded-full hover:bg-[#c8e920] transition-all"
                  >
                    {"\u05D4\u05E9\u05D0\u05D9\u05E8\u05D5 \u05E4\u05E8\u05D8\u05D9\u05DD"}
                  </a>
                </div>
              )}

              <div className="text-center mt-5">
                <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-[#B8D900] transition-colors underline"
                >
                  {"\u05D7\u05D9\u05E4\u05D5\u05E9 \u05DE\u05D7\u05D3\u05E9"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scroll hint */}
        {quizStep === 0 && (
          <div className="text-center mt-12 animate-bounce">
            <svg className="w-6 h-6 text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================================================
// Section 2: Featured Programs
// ============================================================================

function FeaturedProgramsSection({ programs }: { programs: ProgramWithFaculty[] }) {
  const featured = FEATURED_SLUGS.map((slug) =>
    programs.find((p) => p.slug === slug)
  ).filter(Boolean) as ProgramWithFaculty[];

  if (featured.length === 0) return null;

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#2a2628] mb-3">
            {"\u05EA\u05D5\u05DB\u05E0\u05D9\u05D5\u05EA \u05DC\u05D9\u05DE\u05D5\u05D3 \u05DE\u05D5\u05D1\u05D9\u05DC\u05D5\u05EA"}
          </h2>
          <p className="text-[#716C70] text-lg">
            {"\u05D4\u05EA\u05D5\u05DB\u05E0\u05D9\u05D5\u05EA \u05D4\u05DE\u05D1\u05D5\u05E7\u05E9\u05D5\u05EA \u05D1\u05D9\u05D5\u05EA\u05E8 \u05D1\u05E7\u05E8\u05D9\u05D4 \u05D4\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((p) => (
            <a
              key={p.id}
              href={`/lp/${p.slug}`}
              className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1"
            >
              {/* Green top accent */}
              <div className="h-1.5 bg-[#B8D900]" />
              <div className="p-6 md:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <DegreeTypeBadge level={p.level} />
                  {p.degree_type && (
                    <span className="text-xs text-[#716C70] font-medium">{p.degree_type}</span>
                  )}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#2a2628] mb-2 group-hover:text-[#5a7a00] transition-colors">
                  {p.name_he}
                </h3>
                {p.faculty?.name_he && (
                  <p className="text-sm text-[#716C70] mb-5">{p.faculty.name_he}</p>
                )}
                {p.description_he && (
                  <p className="text-sm text-[#716C70] mb-5 line-clamp-2">{p.description_he}</p>
                )}
                <div className="flex items-center gap-2 text-[#B8D900] font-bold text-sm group-hover:gap-3 transition-all">
                  <span>{"\u05DC\u05DE\u05D9\u05D3\u05E2 \u05E0\u05D5\u05E1\u05E3"}</span>
                  <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Section 3: Stats / Social Proof
// ============================================================================

function StatsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-[#2a2628] relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#B8D900]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
          {STATS.map((stat, i) => (
            <StatItem key={i} stat={stat} isVisible={isVisible} delay={i * 150} />
          ))}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-6 h-6 text-[#B8D900]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
          <p className="text-[#B8D900] text-xl md:text-2xl font-bold">
            {"\u05D4\u05E7\u05E8\u05D9\u05D4 \u05D4\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5 \u05D4\u05D9\u05D0 \u05D4\u05DE\u05DB\u05DC\u05DC\u05D4 \u05D4\u05DE\u05D5\u05DE\u05DC\u05E6\u05EA \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC"}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatItem({
  stat,
  isVisible,
  delay,
}: {
  stat: (typeof STATS)[number];
  isVisible: boolean;
  delay: number;
}) {
  const [started, setStarted] = useState(false);
  const count = useAnimatedCounter(stat.value, 1500, started);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay]);

  return (
    <div className="text-center">
      <div
        className={`text-3xl md:text-5xl font-extrabold text-white mb-2 transition-all duration-700 ${
          started ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        {started ? count.toLocaleString() : "0"}
        <span className="text-[#B8D900]">{stat.suffix}</span>
      </div>
      <div className="text-gray-400 text-sm md:text-base font-medium">{stat.label}</div>
    </div>
  );
}

// ============================================================================
// Section 4: Lead Capture Form
// ============================================================================

function LeadFormSection({ programs }: { programs: ProgramWithFaculty[] }) {
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    program_interest: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!document.cookie.includes("onoleads_id=")) {
      const cookieId = crypto.randomUUID();
      document.cookie = `onoleads_id=${cookieId}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    }
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.full_name.trim()) newErrors.full_name = "\u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4";
    if (!formData.phone.trim()) newErrors.phone = "\u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4";
    else if (!/^[\d\-+() ]{7,15}$/.test(formData.phone.trim())) newErrors.phone = "\u05D8\u05DC\u05E4\u05D5\u05DF \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const cookieId =
        document.cookie
          .split("; ")
          .find((c) => c.startsWith("onoleads_id="))
          ?.split("=")[1] || "";

      const urlParams = new URLSearchParams(window.location.search);

      const payload = {
        full_name: formData.full_name,
        phone: formData.phone || null,
        email: formData.email || null,
        page_id: null,
        program_id: null,
        program_interest: formData.program_interest || null,
        utm_source: urlParams.get("utm_source"),
        utm_medium: urlParams.get("utm_medium"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_content: urlParams.get("utm_content"),
        utm_term: urlParams.get("utm_term"),
        referrer: document.referrer || null,
        cookie_id: cookieId,
        device_type:
          window.innerWidth < 768
            ? "mobile"
            : window.innerWidth < 1024
            ? "tablet"
            : "desktop",
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) setSubmitted(true);
    } catch (err) {
      console.error("Form submission failed:", err);
    }

    setSubmitting(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  if (submitted) {
    return (
      <section id="lead-form" className="py-16 md:py-24 bg-gradient-to-b from-[#f6fbe2] to-white">
        <div className="max-w-lg mx-auto px-5 text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#B8D900]/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#B8D900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-[#2a2628] mb-3">
            {"\u05EA\u05D5\u05D3\u05D4! \u05E0\u05E6\u05D9\u05D2 \u05D9\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05DA \u05D1\u05D4\u05E7\u05D3\u05DD"}
          </h3>
          <p className="text-[#716C70]">
            {"\u05D4\u05E7\u05E8\u05D9\u05D4 \u05D4\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5 - \u05D4\u05DE\u05DB\u05DC\u05DC\u05D4 \u05D4\u05DE\u05D5\u05DE\u05DC\u05E6\u05EA \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="lead-form" className="py-16 md:py-24 bg-gradient-to-b from-[#f6fbe2] to-white">
      <div className="max-w-lg mx-auto px-5">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#2a2628] mb-3">
            {"\u05E8\u05D5\u05E6\u05D4 \u05DC\u05E9\u05DE\u05D5\u05E2 \u05E2\u05D5\u05D3?"}
          </h2>
          <p className="text-[#716C70] text-lg">{"\u05D4\u05E9\u05D0\u05D9\u05E8\u05D5 \u05E4\u05E8\u05D8\u05D9\u05DD \u05D5\u05E0\u05D7\u05D6\u05D5\u05E8 \u05D0\u05DC\u05D9\u05DB\u05DD"}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-[0_4px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-6 md:p-8 space-y-5"
        >
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-[#2a2628] mb-2">
              {"\u05E9\u05DD \u05DE\u05DC\u05D0"} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange("full_name", e.target.value)}
              className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 text-[#2a2628] text-base transition-all duration-200 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20"
              placeholder={"\u05D4\u05E9\u05DD \u05D4\u05DE\u05DC\u05D0 \u05E9\u05DC\u05DA"}
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.full_name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-[#2a2628] mb-2">
              {"\u05D8\u05DC\u05E4\u05D5\u05DF"} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              dir="ltr"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 text-[#2a2628] text-base transition-all duration-200 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20"
              placeholder="050-0000000"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-[#2a2628] mb-2">
              {"\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC"}
            </label>
            <input
              type="email"
              dir="ltr"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 text-[#2a2628] text-base transition-all duration-200 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20"
              placeholder="email@example.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email}</p>}
          </div>

          {/* Program Interest */}
          <div>
            <label className="block text-sm font-semibold text-[#2a2628] mb-2">
              {"\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05DE\u05E2\u05E0\u05D9\u05D9\u05E0\u05EA"}
            </label>
            <select
              value={formData.program_interest}
              onChange={(e) => handleChange("program_interest", e.target.value)}
              className="w-full h-12 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 text-[#2a2628] text-base transition-all duration-200 focus:border-[#B8D900] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8D900]/20"
            >
              <option value="">{"\u05D1\u05D7\u05E8\u05D5 \u05EA\u05D5\u05DB\u05E0\u05D9\u05EA..."}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.name_he}>
                  {p.name_he} ({p.degree_type})
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-[#B8D900] text-[#2a2628] font-bold text-lg transition-all duration-200 hover:bg-[#c8e920] hover:shadow-[0_4px_20px_rgba(184,217,0,0.3)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {"\u05E9\u05D5\u05DC\u05D7..."}
              </span>
            ) : (
              "\u05E9\u05DC\u05D7\u05D5 \u05DC\u05D9 \u05DE\u05D9\u05D3\u05E2"
            )}
          </button>

          <p className="text-center text-xs text-[#716C70] mt-3">
            {"\u05D4\u05E4\u05E8\u05D8\u05D9\u05DD \u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05D9\u05DD \u05D5\u05DC\u05D0 \u05D9\u05D5\u05E2\u05D1\u05E8\u05D5 \u05DC\u05E6\u05D3 \u05E9\u05DC\u05D9\u05E9\u05D9"}
          </p>
        </form>
      </div>
    </section>
  );
}

// ============================================================================
// Section 5: Footer
// ============================================================================

function FooterSection() {
  return (
    <footer className="bg-[#1a1718] text-gray-400 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Logo & Slogan */}
          <div>
            <h3 className="text-white text-2xl font-extrabold mb-2">
              {"\u05D4\u05E7\u05E8\u05D9\u05D4 \u05D4\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5"}
            </h3>
            <p className="text-[#B8D900] font-semibold mb-4">{"\u05D4\u05DE\u05DB\u05DC\u05DC\u05D4 \u05D4\u05DE\u05D5\u05DE\u05DC\u05E6\u05EA \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC"}</p>
            <p className="text-sm leading-relaxed">
              {"\u05D4\u05E7\u05E8\u05D9\u05D4 \u05D4\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5 \u05DE\u05E6\u05D9\u05E2\u05D4 \u05DE\u05D2\u05D5\u05D5\u05DF \u05E8\u05D7\u05D1 \u05E9\u05DC \u05EA\u05D5\u05DB\u05E0\u05D9\u05D5\u05EA \u05DC\u05D9\u05DE\u05D5\u05D3 \u05D0\u05E7\u05D3\u05DE\u05D9\u05D5\u05EA \u05DC\u05EA\u05D5\u05D0\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF \u05D5\u05E9\u05E0\u05D9."}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-lg mb-4">{"\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8"}</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#B8D900] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href="tel:*2899" className="hover:text-[#B8D900] transition-colors" dir="ltr">*2899</a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#B8D900] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:info@ono.ac.il" className="hover:text-[#B8D900] transition-colors" dir="ltr">info@ono.ac.il</a>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#B8D900] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{"\u05E8\u05D7' \u05E6\u05D4\u05DC 104, \u05E7\u05E8\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5"}</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-4">{"\u05E4\u05E7\u05D5\u05DC\u05D8\u05D5\u05EA"}</h4>
            <ul className="space-y-2 text-sm">
              {[
                "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05E0\u05D4\u05DC \u05E2\u05E1\u05E7\u05D9\u05DD",
                "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05E9\u05E4\u05D8\u05D9\u05DD",
                "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05D3\u05E2\u05D9 \u05D4\u05E8\u05D5\u05D7 \u05D5\u05D4\u05D7\u05D1\u05E8\u05D4",
                "\u05E4\u05E7\u05D5\u05DC\u05D8\u05D4 \u05DC\u05DE\u05E7\u05E6\u05D5\u05E2\u05D5\u05EA \u05D4\u05D1\u05E8\u05D9\u05D0\u05D5\u05EA",
                "\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05D4\u05D1\u05D9\u05E0\u05DC\u05D0\u05D5\u05DE\u05D9",
                "\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05DC\u05DE\u05E0\u05D4\u05DC",
              ].map((name) => (
                <li key={name}>
                  <span className="hover:text-[#B8D900] transition-colors cursor-pointer">
                    {name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-sm">
          <p>{"\u00A9 \u05D4\u05E7\u05E8\u05D9\u05D4 \u05D4\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA \u05D0\u05D5\u05E0\u05D5 - \u05DB\u05DC \u05D4\u05D6\u05DB\u05D5\u05D9\u05D5\u05EA \u05E9\u05DE\u05D5\u05E8\u05D5\u05EA"}</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
// Sticky Header
// ============================================================================

function StickyHeader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0"
      }`}
    >
      <div className="bg-[#2a2628]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="font-extrabold text-white text-lg">
            <span className="text-[#B8D900]">{"\u05D0\u05D5\u05E0\u05D5"}</span>{" "}
            {"\u05D0\u05E7\u05D3\u05DE\u05D9\u05EA"}
          </div>

          {/* CTA */}
          <a
            href="tel:*2899"
            className="flex items-center gap-2 bg-[#B8D900] text-[#2a2628] font-bold px-5 py-2.5 rounded-full text-sm hover:bg-[#c8e920] transition-all hover:shadow-[0_0_20px_rgba(184,217,0,0.3)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            *2899
          </a>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// Main Homepage Client
// ============================================================================

export function HomepageClient({ programs }: HomepageClientProps) {
  return (
    <>
      <StickyHeader />
      <main>
        <HeroSection programs={programs} />
        <FeaturedProgramsSection programs={programs} />
        <StatsSection />
        <LeadFormSection programs={programs} />
      </main>
      <FooterSection />
    </>
  );
}
