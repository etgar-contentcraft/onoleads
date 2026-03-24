"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Program } from "@/lib/types/database";
import { ProgramForm } from "@/components/admin/program-form";
import { Loader2 } from "lucide-react";

export default function EditProgramPage() {
  const params = useParams<{ id: string }>();
  const programId = params.id;
  const supabase = createClient();

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProgram() {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from("programs")
          .select("*")
          .eq("id", programId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) throw new Error("תוכנית לא נמצאה");

        setProgram(data as Program);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "שגיאה בטעינת התוכנית";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (programId) {
      loadProgram();
    }
  }, [programId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="mr-2 text-muted-foreground">טוען תוכנית...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-4 text-center" dir="rtl">
        {error}
      </div>
    );
  }

  return <ProgramForm program={program} programId={programId} />;
}
