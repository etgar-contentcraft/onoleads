"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  CalendarDays,
  Megaphone,
  Check,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Template {
  id: string;
  name: string;
  type: "degree_program" | "event" | "sales_event" | "specialization";
  description: string | null;
  section_schema: unknown[];
}

interface Program {
  id: string;
  name_he: string;
  degree_type: string;
  faculty?: { name_he: string } | null;
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  degree_program: GraduationCap,
  event: CalendarDays,
  sales_event: Megaphone,
  specialization: GraduationCap,
};

const TEMPLATE_COLORS: Record<string, string> = {
  degree_program: "border-[#B8D900] bg-[#F0F7CC]",
  event: "border-[#3B82F6] bg-[#EFF6FF]",
  sales_event: "border-[#F59E0B] bg-[#FFF3E0]",
  specialization: "border-[#8B5CF6] bg-[#F5F3FF]",
};

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  degree_program: "תוכנית לימוד",
  event: "אירוע",
  sales_event: "אירוע מכירות",
  specialization: "התמחות",
};

export default function NewPageWizard() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("standalone");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [language, setLanguage] = useState("he");

  useEffect(() => {
    async function fetchData() {
      const [templatesRes, programsRes] = await Promise.all([
        supabase
          .from("templates")
          .select("*")
          .eq("is_active", true)
          .order("type"),
        supabase
          .from("programs")
          .select("id, name_he, degree_type, faculty:faculties(name_he)")
          .eq("is_active", true)
          .order("name_he"),
      ]);

      if (templatesRes.data) setTemplates(templatesRes.data);
      if (programsRes.data) setPrograms(programsRes.data as unknown as Program[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Auto-generate slug from title
  useEffect(() => {
    if (title) {
      const generated = title
        .toLowerCase()
        .replace(/[^\w\u0590-\u05FF\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setSlug(generated || `page-${Date.now()}`);
    }
  }, [title]);

  const handleCreate = async () => {
    if (!selectedTemplate || !title || !slug) return;

    setCreating(true);

    // Map template type to page_type
    const pageTypeMap: Record<string, string> = {
      degree_program: "degree",
      event: "event",
      sales_event: "sales",
      specialization: "specialization",
    };

    const pageData: Record<string, unknown> = {
      template_id: selectedTemplate.id,
      title_he: language === "he" ? title : null,
      title_en: language === "en" ? title : null,
      title_ar: language === "ar" ? title : null,
      slug,
      language,
      status: "draft",
      page_type: pageTypeMap[selectedTemplate.type] || "degree",
    };

    if (selectedProgram && selectedProgram !== "standalone") {
      pageData.program_id = selectedProgram;
    }

    const { data: newPage, error } = await supabase
      .from("pages")
      .insert(pageData)
      .select()
      .single();

    if (error) {
      console.error("Error creating page:", error);
      setCreating(false);
      return;
    }

    // Create default sections from template
    if (newPage && selectedTemplate.section_schema && Array.isArray(selectedTemplate.section_schema)) {
      const sections = (selectedTemplate.section_schema as Record<string, unknown>[]).map((section, index) => ({
        page_id: newPage.id,
        section_type: (section as { type?: string }).type || "unknown",
        sort_order: index,
        is_visible: true,
        content: (section as { default_content?: unknown }).default_content || {},
        styles: (section as { default_styles?: unknown }).default_styles || {},
      }));

      if (sections.length > 0) {
        await supabase.from("page_sections").insert(sections);
      }
    }

    router.push(`/dashboard/builder?page=${newPage.id}`);
  };

  const canGoToStep2 = selectedTemplate !== null;
  const canGoToStep3 =
    selectedTemplate !== null &&
    (selectedTemplate.type !== "degree_program" || selectedProgram !== "");
  const canCreate = title.trim() !== "" && slug.trim() !== "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/pages">
          <Button variant="ghost" size="sm" className="gap-2 text-[#9A969A] hover:text-[#4A4648]">
            <ArrowRight className="w-4 h-4" />
            חזרה לדפי נחיתה
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-[#4A4648]">דף נחיתה חדש</h1>
        <p className="text-sm text-[#9A969A] mt-0.5">
          צור דף נחיתה חדש בשלושה שלבים פשוטים
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step === s
                  ? "bg-[#B8D900] text-[#4A4648]"
                  : step > s
                  ? "bg-[#B8D900]/20 text-[#B8D900]"
                  : "bg-[#F0F0F0] text-[#9A969A]"
              }`}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                step === s ? "text-[#4A4648] font-medium" : "text-[#9A969A]"
              }`}
            >
              {s === 1 ? "בחירת תבנית" : s === 2 ? "קישור לתוכנית" : "הגדרות"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-[#E5E5E5] mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Template */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[#4A4648]">בחר תבנית</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.length > 0 ? (
              templates.map((template) => {
                const Icon = TEMPLATE_ICONS[template.type] || GraduationCap;
                const colorClass = TEMPLATE_COLORS[template.type] || "";
                const isSelected = selectedTemplate?.id === template.id;

                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all border-2 ${
                      isSelected
                        ? colorClass
                        : "border-transparent hover:border-[#E5E5E5]"
                    } shadow-sm`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-white/50" : "bg-[#F5F5F5]"
                          }`}
                        >
                          <Icon className="w-5 h-5 text-[#4A4648]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#4A4648]">{template.name}</p>
                          <p className="text-xs text-[#9A969A] mt-0.5">
                            {template.description || TEMPLATE_TYPE_LABELS[template.type]}
                          </p>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {TEMPLATE_TYPE_LABELS[template.type]}
                          </Badge>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-[#B8D900] shrink-0 mr-auto" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              // Default template options if none in DB
              <>
                {(
                  [
                    { type: "degree_program", name: "תוכנית לימוד", desc: "דף נחיתה לתוכנית תואר" },
                    { type: "event", name: "אירוע", desc: "דף נחיתה לאירוע יום פתוח / וובינר" },
                    { type: "sales_event", name: "אירוע מכירות", desc: "דף נחיתה לקמפיין מכירות" },
                  ] as const
                ).map((t) => {
                  const Icon = TEMPLATE_ICONS[t.type];
                  const colorClass = TEMPLATE_COLORS[t.type];
                  const isSelected = selectedTemplate?.type === t.type;

                  return (
                    <Card
                      key={t.type}
                      className={`cursor-pointer transition-all border-2 ${
                        isSelected
                          ? colorClass
                          : "border-transparent hover:border-[#E5E5E5]"
                      } shadow-sm`}
                      onClick={() =>
                        setSelectedTemplate({
                          id: t.type,
                          name: t.name,
                          type: t.type,
                          description: t.desc,
                          section_schema: [],
                        })
                      }
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-white/50" : "bg-[#F5F5F5]"
                            }`}
                          >
                            <Icon className="w-5 h-5 text-[#4A4648]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#4A4648]">{t.name}</p>
                            <p className="text-xs text-[#9A969A] mt-0.5">{t.desc}</p>
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-[#B8D900] shrink-0 mr-auto" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!canGoToStep2}
              className="gap-2 bg-[#B8D900] text-[#4A4648] hover:bg-[#9AB800]"
            >
              הבא
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Link to Program */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[#4A4648]">קישור לתוכנית</h2>
          <p className="text-sm text-[#9A969A]">
            {selectedTemplate?.type === "degree_program"
              ? "בחר את תוכנית הלימוד שהדף יקושר אליה"
              : "ניתן לקשר דף לתוכנית או ליצור דף עצמאי"}
          </p>

          <Card
            className={`cursor-pointer border-2 transition-all ${
              selectedProgram === "standalone"
                ? "border-[#B8D900] bg-[#F0F7CC]"
                : "border-transparent hover:border-[#E5E5E5]"
            } shadow-sm`}
            onClick={() => setSelectedProgram("standalone")}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-[#4A4648]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#4A4648]">דף עצמאי</p>
                  <p className="text-xs text-[#9A969A]">ללא קישור לתוכנית</p>
                </div>
                {selectedProgram === "standalone" && (
                  <Check className="w-5 h-5 text-[#B8D900] mr-auto" />
                )}
              </div>
            </CardContent>
          </Card>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {programs.map((prog) => (
              <Card
                key={prog.id}
                className={`cursor-pointer border-2 transition-all ${
                  selectedProgram === prog.id
                    ? "border-[#B8D900] bg-[#F0F7CC]"
                    : "border-transparent hover:border-[#E5E5E5]"
                } shadow-sm`}
                onClick={() => setSelectedProgram(prog.id)}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4 text-[#716C70]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#4A4648] truncate">{prog.name_he}</p>
                      <p className="text-xs text-[#9A969A]">
                        {prog.degree_type}
                        {prog.faculty && ` | ${(prog.faculty as { name_he: string }).name_he}`}
                      </p>
                    </div>
                    {selectedProgram === prog.id && (
                      <Check className="w-5 h-5 text-[#B8D900] shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              הקודם
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!canGoToStep3}
              className="gap-2 bg-[#B8D900] text-[#4A4648] hover:bg-[#9AB800]"
            >
              הבא
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-[#4A4648]">הגדרות הדף</h2>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-[#4A4648]">כותרת הדף</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="למשל: תואר ראשון במשפטים - יום פתוח"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-[#4A4648]">Slug (כתובת URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#9A969A] shrink-0">/p/</span>
                  <Input
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9\u0590-\u05FF-]/g, "-")
                          .replace(/-+/g, "-")
                      )
                    }
                    placeholder="law-open-day"
                    dir="ltr"
                    className="h-10 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-[#4A4648]">שפה</Label>
                <Select value={language} onValueChange={(val) => setLanguage(val as string)}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="he">עברית</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">عربي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary */}
              <div className="bg-[#F5F5F5] rounded-lg p-4 space-y-2 mt-4">
                <p className="text-sm font-medium text-[#4A4648]">סיכום</p>
                <div className="text-xs text-[#716C70] space-y-1">
                  <p>
                    תבנית: <span className="text-[#4A4648] font-medium">{selectedTemplate?.name}</span>
                  </p>
                  <p>
                    קישור:{" "}
                    <span className="text-[#4A4648] font-medium">
                      {selectedProgram === "standalone"
                        ? "דף עצמאי"
                        : programs.find((p) => p.id === selectedProgram)?.name_he ?? "-"}
                    </span>
                  </p>
                  <p>
                    שפה: <span className="text-[#4A4648] font-medium">
                      {{ he: "עברית", en: "English", ar: "عربي" }[language]}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              הקודם
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!canCreate || creating}
              className="gap-2 bg-[#B8D900] text-[#4A4648] hover:bg-[#9AB800]"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  צור דף נחיתה
                  <Check className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
