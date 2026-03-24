"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Phone,
  Mail,
  User,
  Globe,
  Monitor,
  Clock,
  MapPin,
  Tag,
  Link2,
  Cookie,
  Fingerprint,
  Webhook,
  BookOpen,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface Lead {
  id: string;
  page_id: string | null;
  program_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  program_interest: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  cookie_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  language: string | null;
  device_type: string | null;
  extra_data: Record<string, unknown> | null;
  webhook_status: "pending" | "sent" | "failed";
  webhook_response: Record<string, unknown> | null;
  created_at: string;
}

const WEBHOOK_STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "ממתין", className: "bg-yellow-50 text-yellow-700 border-0" },
  sent: { label: "נשלח", className: "bg-green-50 text-green-700 border-0" },
  failed: { label: "נכשל", className: "bg-red-50 text-red-700 border-0" },
};

function InfoRow({ label, value, dir, mono }: { label: string; value: string | null | undefined; dir?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-[#9A969A] shrink-0">{label}</span>
      <span
        className={`text-sm text-[#4A4648] text-left max-w-[60%] break-all ${mono ? "font-mono text-xs" : ""}`}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [programName, setProgramName] = useState<string | null>(null);
  const [pageName, setPageName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLead() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setLead(data);

      // Fetch related program name
      if (data.program_id) {
        const { data: prog } = await supabase
          .from("programs")
          .select("name_he")
          .eq("id", data.program_id)
          .single();
        if (prog) setProgramName(prog.name_he);
      }

      // Fetch related page name
      if (data.page_id) {
        const { data: pg } = await supabase
          .from("pages")
          .select("title_he")
          .eq("id", data.page_id)
          .single();
        if (pg) setPageName(pg.title_he);
      }

      setLoading(false);
    }

    fetchLead();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8D900]" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-24">
        <p className="text-lg text-[#9A969A]">ליד לא נמצא</p>
        <Link href="/dashboard/leads">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowRight className="w-4 h-4" />
            חזרה ללידים
          </Button>
        </Link>
      </div>
    );
  }

  const createdDate = new Date(lead.created_at);
  const statusInfo = WEBHOOK_STATUS_MAP[lead.webhook_status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="sm" className="gap-2 text-[#9A969A] hover:text-[#4A4648]">
            <ArrowRight className="w-4 h-4" />
            חזרה ללידים
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#4A4648]">{lead.full_name}</h1>
          <p className="text-sm text-[#9A969A] mt-0.5">
            {createdDate.toLocaleDateString("he-IL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Badge className={statusInfo.className + " text-sm px-3 py-1"}>
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#4A4648] flex items-center gap-2">
              <User className="w-4 h-4" />
              פרטי קשר
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#F0F0F0]">
              <InfoRow label="שם מלא" value={lead.full_name} />
              <InfoRow label="טלפון" value={lead.phone} dir="ltr" mono />
              <InfoRow label="אימייל" value={lead.email} dir="ltr" mono />
            </div>
          </CardContent>
        </Card>

        {/* Program / Page Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#4A4648] flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              תוכנית ודף נחיתה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#F0F0F0]">
              <InfoRow label="תוכנית (טקסט חופשי)" value={lead.program_interest} />
              <InfoRow label="תוכנית מקושרת" value={programName} />
              <InfoRow label="דף נחיתה" value={pageName} />
            </div>
          </CardContent>
        </Card>

        {/* UTM Parameters */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#4A4648] flex items-center gap-2">
              <Tag className="w-4 h-4" />
              פרמטרי UTM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#F0F0F0]">
              <InfoRow label="utm_source" value={lead.utm_source} dir="ltr" />
              <InfoRow label="utm_medium" value={lead.utm_medium} dir="ltr" />
              <InfoRow label="utm_campaign" value={lead.utm_campaign} dir="ltr" />
              <InfoRow label="utm_content" value={lead.utm_content} dir="ltr" />
              <InfoRow label="utm_term" value={lead.utm_term} dir="ltr" />
              <InfoRow label="referrer" value={lead.referrer} dir="ltr" mono />
            </div>
            {!lead.utm_source && !lead.utm_medium && !lead.utm_campaign && (
              <p className="text-sm text-[#9A969A] text-center py-4">אין נתוני UTM</p>
            )}
          </CardContent>
        </Card>

        {/* Technical Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-[#4A4648] flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              מידע טכני
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-[#F0F0F0]">
              <InfoRow label="מכשיר" value={lead.device_type} />
              <InfoRow label="שפה" value={lead.language} dir="ltr" />
              <InfoRow label="IP" value={lead.ip_address} dir="ltr" mono />
              <InfoRow label="Cookie ID" value={lead.cookie_id} dir="ltr" mono />
            </div>
          </CardContent>
        </Card>

        {/* User Agent */}
        {lead.user_agent && (
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-[#4A4648] flex items-center gap-2">
                <Globe className="w-4 h-4" />
                User Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs font-mono text-[#716C70] bg-[#F5F5F5] rounded-lg p-3 break-all" dir="ltr">
                {lead.user_agent}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Webhook Info */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base text-[#4A4648] flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-[#9A969A]">סטטוס:</span>
              <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
            </div>
            {lead.webhook_response && (
              <div>
                <p className="text-sm text-[#9A969A] mb-2">תגובת Webhook:</p>
                <pre
                  className="text-xs font-mono text-[#716C70] bg-[#F5F5F5] rounded-lg p-3 overflow-x-auto max-h-48"
                  dir="ltr"
                >
                  {JSON.stringify(lead.webhook_response, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Extra Data */}
        {lead.extra_data && Object.keys(lead.extra_data).length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-[#4A4648] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                נתונים נוספים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre
                className="text-xs font-mono text-[#716C70] bg-[#F5F5F5] rounded-lg p-3 overflow-x-auto max-h-48"
                dir="ltr"
              >
                {JSON.stringify(lead.extra_data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
