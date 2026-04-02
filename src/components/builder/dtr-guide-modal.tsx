"use client";

/**
 * DTR Generator Modal — auto-generates dynamic text replacement templates.
 * Two tabs: "Generator" (interactive builder) and "Reference" (syntax guide).
 * The generator lets users pick a field, a UTM parameter, set values for each
 * source, and outputs the ready-to-paste DTR template.
 */

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Wand2, BookOpen } from "lucide-react";

interface DtrGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback when user wants to insert a generated template into a field */
  onInsert?: (template: string) => void;
}

/** Available UTM parameters for DTR */
const UTM_PARAMS = [
  { key: "utm_source", label: "מקור התנועה (utm_source)", hint: "Facebook, Google, Instagram" },
  { key: "utm_medium", label: "ערוץ שיווק (utm_medium)", hint: "cpc, social, email" },
  { key: "utm_campaign", label: "שם קמפיין (utm_campaign)", hint: "spring_2026, law_ma" },
  { key: "utm_content", label: "תוכן מודעה (utm_content)", hint: "banner_1, video_ad" },
  { key: "utm_term", label: "מילת מפתח (utm_term)", hint: "לימודי משפטים, MBA" },
] as const;

/** Preset scenario configurations for common use cases */
const PRESETS = [
  {
    name: "כותרת לפי מקור",
    desc: "הציגו כותרת שונה לכל מקור תנועה",
    param: "utm_source",
    prefix: "הצטרפו ללימודים ב",
    suffix: "",
    fallback: "הקריה האקדמית אונו",
    scenarios: [
      { value: "Facebook", display: "מומלץ על ידי Facebook" },
      { value: "Google", display: "הקריה האקדמית אונו" },
    ],
  },
  {
    name: "כותרת לפי מילת מפתח",
    desc: "התאימו כותרת לחיפוש של המבקר",
    param: "utm_term",
    prefix: "לימודי ",
    suffix: " באונו",
    fallback: "תואר",
    scenarios: [
      { value: "משפטים", display: "משפטים" },
      { value: "חשבונאות", display: "חשבונאות" },
    ],
  },
  {
    name: "שם קמפיין בכותרת",
    desc: "הציגו את שם הקמפיין או מבצע",
    param: "utm_campaign",
    prefix: "מבצע ",
    suffix: " — הרשמה פתוחה!",
    fallback: "הרשמה מוקדמת",
    scenarios: [
      { value: "Spring2026", display: "Spring2026" },
      { value: "scholarship", display: "scholarship" },
    ],
  },
];

/**
 * DTR Generator + Reference Modal.
 * Tab 1 (Generator): Interactive builder that creates DTR templates step-by-step.
 * Tab 2 (Reference): Quick syntax reference for advanced users.
 */
export function DtrGuideModal({ open, onOpenChange, onInsert }: DtrGuideModalProps) {
  const [tab, setTab] = useState<"generator" | "reference">("generator");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[98vw] h-[95vh] max-h-[95vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-bold text-[#2A2628]">
            כותרות דינמיות (DTR)
          </DialogTitle>
        </DialogHeader>

        {/* Tab selector */}
        <div className="flex gap-2 border-b pb-3">
          <button
            onClick={() => setTab("generator")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "generator" ? "bg-[#B8D900] text-[#2a2628]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Wand2 className="w-4 h-4" />
            מחולל אוטומטי
          </button>
          <button
            onClick={() => setTab("reference")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === "reference" ? "bg-[#B8D900] text-[#2a2628]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            מדריך מהיר
          </button>
        </div>

        {tab === "generator" ? (
          <DtrGenerator onInsert={onInsert} />
        ) : (
          <DtrReference />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Generator Tab ──────────────────────────────────────────────────────────

function DtrGenerator({ onInsert }: { onInsert?: (template: string) => void }) {
  const [param, setParam] = useState("utm_source");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [fallback, setFallback] = useState("");
  const [copied, setCopied] = useState(false);

  /** Build the template string from current inputs */
  const template = `${prefix}{{${param}${fallback ? `|${fallback}` : ""}}}${suffix}`;

  /** Simulate what the output looks like with a given UTM value */
  const preview = (utmValue: string) => `${prefix}${utmValue || fallback || ""}${suffix}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may fail in non-https */ }
  }, [template]);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setParam(preset.param);
    setPrefix(preset.prefix);
    setSuffix(preset.suffix);
    setFallback(preset.fallback);
  };

  return (
    <div className="space-y-6 text-sm">
      {/* Quick presets */}
      <div>
        <Label className="text-xs font-semibold text-[#9A969A] mb-2 block">תבניות מוכנות — לחצו לטעינה</Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-[#B8D900] hover:bg-[#B8D900]/5 transition-colors text-xs"
            >
              <span className="font-semibold text-[#2a2628]">{p.name}</span>
              <span className="block text-[#9A969A] text-[10px] mt-0.5">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1: Choose parameter */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">
          שלב 1: באיזה פרמטר להשתמש?
        </Label>
        <div className="flex flex-wrap gap-2">
          {UTM_PARAMS.map((p) => (
            <button
              key={p.key}
              onClick={() => setParam(p.key)}
              className={`flex flex-col p-2.5 rounded-lg border text-right transition-all min-w-[140px] flex-1 ${
                param === p.key
                  ? "border-[#B8D900] bg-[#B8D900]/5 shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="font-semibold text-[#2a2628] text-xs">{p.label}</span>
              <span className="text-[10px] text-[#9A969A] mt-0.5">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Build the template */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">
          שלב 2: בנו את הכותרת
        </Label>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-[#9A969A]">טקסט לפני</Label>
            <Input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="לימודי "
              dir="rtl"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-[#9A969A]">ברירת מחדל (fallback)</Label>
            <Input
              value={fallback}
              onChange={(e) => setFallback(e.target.value)}
              placeholder="משפטים"
              dir="rtl"
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-[#9A969A]">טקסט אחרי</Label>
            <Input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value)}
              placeholder=" באונו"
              dir="rtl"
              className="text-sm"
            />
          </div>
        </div>
      </div>

      {/* Step 3: Output — the generated template */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">
          שלב 3: התוצאה — העתיקו לשדה הכותרת
        </Label>

        <div className="relative p-4 rounded-xl bg-[#2a2628] text-white font-mono text-sm break-all" dir="ltr">
          {template}
          <div className="absolute top-2 left-2 flex gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              title="העתק"
            >
              {copied ? <Check className="w-4 h-4 text-[#B8D900]" /> : <Copy className="w-4 h-4" />}
            </button>
            {onInsert && (
              <Button
                size="sm"
                onClick={() => onInsert(template)}
                className="h-7 text-xs bg-[#B8D900] text-[#2a2628] hover:bg-[#c8e920]"
              >
                הכנס לכותרת
              </Button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <Label className="text-[10px] text-[#9A969A]">תצוגה מקדימה — כך תיראה הכותרת:</Label>
          <div className="space-y-1.5">
            <PreviewRow label="מפייסבוק" param={param} value="Facebook" result={preview("Facebook")} />
            <PreviewRow label="מגוגל" param={param} value="Google" result={preview("Google")} />
            <PreviewRow label="ללא UTM" param={param} value="" result={preview("")} />
          </div>
        </div>
      </div>

      {/* How to use instructions */}
      <div className="p-4 rounded-xl bg-[#B8D900]/5 border border-[#B8D900]/20">
        <p className="font-semibold text-[#2a2628] mb-2">איך להשתמש?</p>
        <ol className="space-y-1.5 text-[#716C70] list-decimal pr-5">
          <li>בחרו פרמטר ובנו את הכותרת למעלה</li>
          <li>לחצו על <strong>&quot;העתק&quot;</strong> או <strong>&quot;הכנס לכותרת&quot;</strong></li>
          <li>הדביקו בשדה הכותרת של הסקשן שלכם</li>
          <li>בפרסום — הוסיפו פרמטר UTM לקישור: <code className="text-[#B8D900] font-mono text-xs" dir="ltr">?utm_source=Facebook</code></li>
        </ol>
      </div>
    </div>
  );
}

/** Single preview row showing parameter → result mapping */
function PreviewRow({ label, param, value, result }: { label: string; param: string; value: string; result: string }) {
  return (
    <div className="flex items-center gap-3 text-xs p-2 rounded-lg bg-gray-50">
      <span className="shrink-0 w-16 text-[#9A969A]">{label}</span>
      {value ? (
        <Badge variant="outline" className="font-mono text-[10px] shrink-0" dir="ltr">
          {param}={value}
        </Badge>
      ) : (
        <span className="text-[#9A969A] text-[10px] shrink-0">(ללא פרמטר)</span>
      )}
      <span className="text-[#716C70] mx-1">&larr;</span>
      <span className="font-semibold text-[#2a2628] truncate">&ldquo;{result}&rdquo;</span>
    </div>
  );
}

// ─── Reference Tab ──────────────────────────────────────────────────────────

function DtrReference() {
  return (
    <div className="space-y-5 text-sm">
      {/* Syntax quick ref */}
      <div>
        <h3 className="font-heading font-bold text-[#2A2628] mb-2">תחביר</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Badge variant="outline" className="font-mono shrink-0 mt-0.5" dir="ltr">{"{{variable}}"}</Badge>
            <p className="text-[#716C70]">מוחלף בערך הפרמטר מה-URL. אם חסר — ריק.</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Badge variant="outline" className="font-mono shrink-0 mt-0.5" dir="ltr">{"{{variable|fallback}}"}</Badge>
            <p className="text-[#716C70]">מוחלף בערך הפרמטר. אם חסר — מוצג הטקסט שאחרי ה-<code>|</code>.</p>
          </div>
        </div>
      </div>

      {/* Available variables table */}
      <div>
        <h3 className="font-heading font-bold text-[#2A2628] mb-2">פרמטרים זמינים</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-right py-2 px-3 font-semibold text-[#2A2628]">פרמטר</th>
                <th className="text-right py-2 px-3 font-semibold text-[#2A2628]">תיאור</th>
                <th className="text-right py-2 px-3 font-semibold text-[#2A2628]">דוגמאות</th>
              </tr>
            </thead>
            <tbody>
              {UTM_PARAMS.map((v) => (
                <tr key={v.key} className="border-t">
                  <td className="py-2 px-3 font-mono text-xs text-[#B8D900]" dir="ltr">{`{{${v.key}}}`}</td>
                  <td className="py-2 px-3 text-[#716C70]">{v.label.split("(")[0].trim()}</td>
                  <td className="py-2 px-3 text-[#9A969A] text-xs">{v.hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Testing */}
      <div className="p-4 rounded-lg bg-[#B8D900]/5 border border-[#B8D900]/20">
        <h3 className="font-heading font-bold text-[#2A2628] mb-2">בדיקה</h3>
        <p className="text-[#716C70] mb-2">הוסיפו פרמטרים ל-URL של העמוד:</p>
        <div className="p-2 rounded bg-[#2A2628] text-white font-mono text-xs break-all" dir="ltr">
          https://onoleads.vercel.app/lp/law-ba?utm_source=Facebook&utm_term=משפטים
        </div>
      </div>

      {/* Tips */}
      <div>
        <h3 className="font-heading font-bold text-[#2A2628] mb-2">טיפים</h3>
        <ul className="space-y-1.5 text-[#716C70]">
          <li className="flex gap-2">
            <span className="text-[#B8D900] shrink-0">&#10003;</span>
            <span>תמיד הגדירו fallback כדי שהכותרת תיראה טוב גם בלי UTM</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#B8D900] shrink-0">&#10003;</span>
            <span>החליפו רק מילה אחת-שתיים — לא את כל הכותרת</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#B8D900] shrink-0">&#10003;</span>
            <span>בדקו גם עם וגם בלי פרמטרים</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
