"use client";

/**
 * AI Import Page — Dashboard tool for generating landing page content with AI.
 * Three-step flow:
 *   1. Enter program info + reference URLs
 *   2. Generate AI prompt + copy to clipboard (user runs it in ChatGPT/Claude)
 *   3. Paste the AI output JSON and import it as a new page
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Wand2,
  Copy,
  Check,
  Upload,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Loader2,
  ExternalLink,
  Paperclip,
  X,
  FileText,
} from "lucide-react";
import { generateAiPrompt, SECTION_SCHEMAS, validateImportedContent } from "@/lib/ai-import/content-schema";

/** Available degree types */
const DEGREE_OPTIONS = ["B.A.", "M.A.", "B.Sc.", "M.Sc.", "LL.B.", "LL.M.", "B.Ed.", "M.Ed.", "MBA", "Ph.D."];

export default function AiImportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Program info
  const [programName, setProgramName] = useState("");
  const [degreeType, setDegreeType] = useState("B.A.");
  const [faculty, setFaculty] = useState("");
  const [campuses, setCampuses] = useState("קמפוס קריית אונו");
  const [duration, setDuration] = useState("");
  const [language, setLanguage] = useState("he");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [referenceUrls, setReferenceUrls] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(SECTION_SCHEMAS.filter((s) => s.recommended).map((s) => s.type))
  );

  // File attachments (text content extracted from uploaded files)
  const [attachments, setAttachments] = useState<{ name: string; content: string }[]>([]);

  // Step 2: Generated prompt
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  // Step 3: Import
  const [jsonInput, setJsonInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{ page_id: string; slug: string; builder_url: string } | null>(null);

  /**
   * Handles file upload — reads text content from uploaded files.
   * Supports .txt, .csv, .md, .json, .docx (text only), .pdf (text only).
   */
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setAttachments((prev) => [...prev, { name: file.name, content }]);
      };
      reader.readAsText(file);
    });

    /* Reset input so the same file can be re-selected */
    e.target.value = "";
  }, []);

  /** Remove an attachment by index */
  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** Generate the AI prompt from Step 1 inputs */
  const handleGenerate = useCallback(() => {
    const urls = referenceUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    let generated = generateAiPrompt(
      { programName, degreeType, faculty, campuses, duration, language, additionalInfo },
      urls,
      Array.from(selectedSections),
    );

    /* Append file attachments to the prompt */
    if (attachments.length > 0) {
      generated += "\n\n---\n\n## קבצים מצורפים (מידע נוסף לעיון)\n\n";
      attachments.forEach((att) => {
        generated += `### קובץ: ${att.name}\n\`\`\`\n${att.content}\n\`\`\`\n\n`;
      });
    }

    setPrompt(generated);
    setStep(2);
  }, [programName, degreeType, faculty, campuses, duration, language, additionalInfo, referenceUrls, selectedSections, attachments]);

  /** Copy prompt to clipboard */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may fail */ }
  }, [prompt]);

  /** Toggle section selection */
  const toggleSection = (type: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  /** Import the pasted JSON */
  const handleImport = useCallback(async () => {
    setImportError("");
    setImportResult(null);

    let parsed: unknown;
    try {
      let raw = jsonInput.trim();
      // Strip markdown code fences (```json ... ``` or ``` ... ```)
      const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) raw = fenceMatch[1].trim();
      // Strip leading/trailing non-JSON text (some AIs add explanation around JSON)
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        raw = raw.substring(firstBrace, lastBrace + 1);
      }
      // Fix common JSON issues: trailing commas before } or ]
      raw = raw.replace(/,\s*([}\]])/g, "$1");
      parsed = JSON.parse(raw);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setImportError(`JSON לא חוקי — ודאו שהפלט מ-AI הוא JSON תקין.\n${msg ? `שגיאה: ${msg}` : ""}`);
      return;
    }

    // Client-side validation
    const errors = validateImportedContent(parsed);
    if (errors.length > 0) {
      setImportError(errors.join("\n"));
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/import-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const result = await res.json();
      if (!res.ok) {
        setImportError(result.error + (result.details ? `\n${Array.isArray(result.details) ? result.details.join("\n") : result.details}` : ""));
        return;
      }

      setImportResult(result);
    } catch (err) {
      setImportError("שגיאת רשת — נסו שוב");
    } finally {
      setImporting(false);
    }
  }, [jsonInput]);

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#B8D900]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#B8D900]" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-[#2A2628]">ייבוא עמוד עם AI</h1>
        </div>
        <p className="text-[#716C70] text-sm">
          צרו עמוד נחיתה שלם בשלושה צעדים: הזינו פרטים, העתיקו פרומפט ל-AI, הדביקו את התוצאה.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: "פרטי התוכנית" },
          { num: 2, label: "פרומפט AI" },
          { num: 3, label: "ייבוא תוכן" },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => s.num < step && setStep(s.num)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              step === s.num
                ? "bg-[#B8D900] text-[#2a2628] shadow-md"
                : step > s.num
                  ? "bg-[#B8D900]/20 text-[#2a2628] cursor-pointer hover:bg-[#B8D900]/30"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= s.num ? "bg-[#2a2628] text-white" : "bg-gray-300 text-gray-500"
            }`}>
              {step > s.num ? "✓" : s.num}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Program Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">שם התוכנית *</Label>
              <Input value={programName} onChange={(e) => setProgramName(e.target.value)} placeholder="משפטים" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">סוג תואר *</Label>
              <select
                value={degreeType}
                onChange={(e) => setDegreeType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {DEGREE_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">פקולטה *</Label>
              <Input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="הפקולטה למשפטים" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">קמפוסים</Label>
              <Input value={campuses} onChange={(e) => setCampuses(e.target.value)} placeholder="קמפוס קריית אונו" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">משך לימודים</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3 שנים (6 סמסטרים)" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">שפת עמוד</Label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="he">עברית</option>
                <option value="en">English</option>
                <option value="ar">عربي</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">מידע נוסף (אופציונלי)</Label>
            <Textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="פרטים נוספים שחשוב ש-AI יידע — הישגים ייחודיים, שיתופי פעולה, תעסוקה..."
              dir="rtl"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">קישורים לעיון (שורה לכל קישור)</Label>
            <Textarea
              value={referenceUrls}
              onChange={(e) => setReferenceUrls(e.target.value)}
              placeholder={"https://www.ono.ac.il/law/\nhttps://www.ono.ac.il/programs/law-ba/"}
              dir="ltr"
              rows={3}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-[#9A969A]">
              הוסיפו קישורים לעמודי התוכנית באתר ono.ac.il כדי ש-AI יוכל להתבסס על מידע אמיתי
            </p>
          </div>

          {/* File attachments */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              קבצים מצורפים (אופציונלי)
            </Label>
            <p className="text-[10px] text-[#9A969A] mb-2">
              העלו ידיעונים, מסמכי מידע, או כל קובץ טקסט שיעזור ל-AI לייצר תוכן מדויק יותר
            </p>

            {/* Uploaded files list */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#B8D900]/5 border border-[#B8D900]/20 text-xs"
                  >
                    <FileText className="w-4 h-4 text-[#B8D900] shrink-0" />
                    <span className="flex-1 truncate text-[#2A2628] font-medium">{att.name}</span>
                    <span className="text-[#9A969A] shrink-0">
                      {(att.content.length / 1024).toFixed(1)}KB
                    </span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-[#9A969A] hover:text-red-400 transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[#E5E5E5] text-[#9A969A] text-xs cursor-pointer hover:border-[#B8D900] hover:text-[#2A2628] transition-all">
              <Upload className="w-4 h-4" />
              העלו קובץ
              <input
                type="file"
                multiple
                accept=".txt,.csv,.md,.json,.rtf,.html,.xml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Section selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">סקשנים לייצר</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SECTION_SCHEMAS.map((s) => (
                <button
                  key={s.type}
                  onClick={() => toggleSection(s.type)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-right transition-all ${
                    selectedSections.has(s.type)
                      ? "border-[#B8D900] bg-[#B8D900]/5"
                      : "border-gray-200 text-gray-400"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selectedSections.has(s.type) ? "bg-[#B8D900] border-[#B8D900]" : "border-gray-300"
                  }`}>
                    {selectedSections.has(s.type) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={selectedSections.has(s.type) ? "text-[#2a2628] font-semibold" : ""}>
                    {s.label_he}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!programName || !faculty}
            className="w-full bg-[#B8D900] text-[#2a2628] hover:bg-[#c8e920] font-bold py-6 text-base gap-2"
          >
            <Wand2 className="w-5 h-5" />
            צור פרומפט AI
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Generated Prompt */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#B8D900]/5 border border-[#B8D900]/20">
            <p className="font-semibold text-[#2a2628] mb-2">מה לעשות?</p>
            <ol className="space-y-1.5 text-sm text-[#716C70] list-decimal pr-5">
              <li>לחצו <strong>&quot;העתק פרומפט&quot;</strong> למטה</li>
              <li>פתחו את <strong>ChatGPT</strong> או <strong>Claude</strong></li>
              <li>הדביקו את הפרומפט ושלחו</li>
              <li>העתיקו את התשובה (JSON) והדביקו בשלב 3</li>
            </ol>
          </div>

          <div className="relative">
            <Textarea
              value={prompt}
              readOnly
              dir="rtl"
              rows={16}
              className="font-mono text-xs bg-[#2a2628] text-white border-none resize-none"
            />
            <div className="absolute top-3 left-3 flex gap-2">
              <Button
                size="sm"
                onClick={handleCopy}
                className="h-8 gap-1.5 bg-[#B8D900] text-[#2a2628] hover:bg-[#c8e920]"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "הועתק!" : "העתק פרומפט"}
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
              <ArrowRight className="w-4 h-4" />
              חזרה
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1 bg-[#B8D900] text-[#2a2628] hover:bg-[#c8e920] font-bold gap-2"
            >
              <Upload className="w-4 h-4" />
              קיבלתי תשובה מ-AI — להמשך ייבוא
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Import */}
      {step === 3 && !importResult && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#B8D900]/5 border border-[#B8D900]/20">
            <p className="font-semibold text-[#2a2628] mb-1">הדביקו את התשובה מ-AI</p>
            <p className="text-sm text-[#716C70]">
              העתיקו את כל ה-JSON שקיבלתם מ-ChatGPT/Claude והדביקו כאן
            </p>
          </div>

          <Textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"page": {"title_he": "..."}, "sections": [...]}'
            dir="ltr"
            rows={16}
            className="font-mono text-xs"
          />

          {importError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 whitespace-pre-wrap">{importError}</div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-1">
              <ArrowRight className="w-4 h-4" />
              חזרה
            </Button>
            <Button
              onClick={handleImport}
              disabled={!jsonInput.trim() || importing}
              className="flex-1 bg-[#B8D900] text-[#2a2628] hover:bg-[#c8e920] font-bold gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מייבא...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  ייבא ויצור עמוד
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Success state */}
      {importResult && (
        <div className="text-center py-12 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#B8D900]/10 flex items-center justify-center">
            <Check className="w-10 h-10 text-[#B8D900]" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-[#2a2628] mb-2">העמוד נוצר בהצלחה!</h2>
            <p className="text-[#716C70]">
              העמוד נוצר כ-<strong>טיוטה</strong> — עברו לבילדר כדי לערוך ולפרסם.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button
              onClick={() => router.push(importResult.builder_url)}
              className="bg-[#B8D900] text-[#2a2628] hover:bg-[#c8e920] font-bold gap-2 px-8 py-5"
            >
              <ExternalLink className="w-4 h-4" />
              פתח בבילדר
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setJsonInput("");
                setImportResult(null);
                setProgramName("");
                setFaculty("");
              }}
            >
              ייבוא עמוד נוסף
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
