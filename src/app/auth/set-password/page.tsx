/**
 * Set password page — shown to invited users after clicking the invitation link.
 * Allows them to set their password for the first time.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import Image from "next/image";

/** Minimum password length required by the system */
const MIN_PASSWORD_LENGTH = 8;

/**
 * SetPasswordPage — renders a form for invited users to set their password.
 * After successful password set, redirects to the dashboard.
 */
export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  /**
   * Handles form submission — validates passwords match and updates user password.
   * @param e - Form submit event
   */
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    /* Validate password length */
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`);
      return;
    }

    /* Validate passwords match */
    if (password !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError("שגיאה בהגדרת הסיסמה. נסה שנית.");
      setLoading(false);
      return;
    }

    setSuccess(true);

    /* Redirect to dashboard after short delay */
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]" dir="rtl">
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
              <Image
                src="https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png"
                alt="Ono Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-bold text-[#B8D900]">OnoLeads</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2a2628] mb-2">הגדרת סיסמה</h2>
          <p className="text-[#716C70]">הוזמנת למערכת. הגדר סיסמה כדי להתחיל.</p>
        </div>

        <Card className="border-0 shadow-2xl shadow-black/10 bg-white">
          <CardContent className="p-8">
            {success ? (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#2a2628] mb-2">הסיסמה נקבעה בהצלחה!</h3>
                <p className="text-[#716C70]">מעביר אותך למערכת...</p>
              </div>
            ) : (
              <form onSubmit={handleSetPassword} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-xl border border-red-100 text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#4A4648] font-medium text-sm">
                    סיסמה חדשה
                  </Label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      dir="ltr"
                      className="pr-11 h-12 text-left bg-[#f8f9fa] border-[#e5e7eb] rounded-xl focus-visible:border-[#B8D900] focus-visible:ring-[#B8D900]/20"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm" className="text-[#4A4648] font-medium text-sm">
                    אימות סיסמה
                  </Label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="הקלד שוב את הסיסמה"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      dir="ltr"
                      className="pr-11 h-12 text-left bg-[#f8f9fa] border-[#e5e7eb] rounded-xl focus-visible:border-[#B8D900] focus-visible:ring-[#B8D900]/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#B8D900] text-[#2a2628] font-bold text-base rounded-xl hover:bg-[#a8c400] transition-all duration-300 shadow-lg shadow-[#B8D900]/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      שומר...
                    </>
                  ) : (
                    "הגדר סיסמה והיכנס"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
