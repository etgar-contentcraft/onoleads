"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail, Lock, GraduationCap, Shield, Sparkles, BarChart3 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("שם המשתמש או הסיסמה שגויים. נסה שנית.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" dir="rtl">
      {/* Left Side - Dark Branding Panel (hidden on mobile, shown as background) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1729]">
        {/* Background image overlay */}
        <div className="absolute inset-0 opacity-15">
          <Image
            src="https://www.ono.ac.il/wp-content/uploads/2022/11/31_10_2022_ONO_0080.jpg"
            alt="קמפוס אונו"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#B8D900]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#B8D900]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-500/5 rounded-full blur-[80px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Top: Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Image
                src="https://www.ono.ac.il/wp-content/uploads/2025/12/לוגו-אונו.png"
                alt="Ono Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <div>
              <span className="text-xl font-bold text-[#B8D900] tracking-tight">OnoLeads</span>
              <p className="text-xs text-white/40">Enterprise Platform</p>
            </div>
          </div>

          {/* Middle: Tagline */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                מערכת ניהול לידים
                <br />
                <span className="text-gradient-green">ועמודי נחיתה</span>
              </h1>
              <p className="text-lg text-white/50 max-w-md leading-relaxed">
                הפלטפורמה המתקדמת לניהול קמפיינים, עמודי נחיתה ולידים של הקריה האקדמית אונו
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              {[
                { icon: BarChart3, text: "אנליטיקס מתקדמת בזמן אמת" },
                { icon: Sparkles, text: "בונה דפי נחיתה חכם" },
                { icon: Shield, text: "אבטחה ופרטיות ברמה הגבוהה ביותר" },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.text} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#B8D900]/10 border border-[#B8D900]/20">
                      <Icon className="w-4 h-4 text-[#B8D900]" />
                    </div>
                    <span className="text-sm text-white/60">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom: Footer */}
          <div className="flex items-center justify-between text-xs text-white/30">
            <span>הקריה האקדמית אונו - המכללה המומלצת בישראל</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center relative min-h-screen lg:min-h-0">
        {/* Mobile background */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f1729]" />
          <div className="absolute inset-0 opacity-10">
            <Image
              src="https://www.ono.ac.il/wp-content/uploads/2022/11/31_10_2022_ONO_0080.jpg"
              alt="קמפוס אונו"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        {/* Desktop background */}
        <div className="hidden lg:block absolute inset-0 bg-[#f8f9fa]">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#B8D900]/8 rounded-full blur-[100px]" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#B8D900]/5 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md px-6 py-12 relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
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
            <p className="text-sm text-white/50">מערכת ניהול לידים ועמודי נחיתה</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-[#2a2628] mb-2">ברוכים הבאים</h2>
            <p className="text-[#716C70]">התחבר למערכת הניהול</p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-2xl shadow-black/10 bg-white/95 backdrop-blur-xl lg:bg-white lg:backdrop-blur-none">
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-xl border border-red-100 text-center animate-fade-in">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#4A4648] font-medium text-sm">
                    דוא״ל
                  </Label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@ono.ac.il"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="pr-11 h-12 text-left bg-[#f8f9fa] border-[#e5e7eb] rounded-xl focus-visible:border-[#B8D900] focus-visible:ring-[#B8D900]/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[#4A4648] font-medium text-sm">
                      סיסמה
                    </Label>
                    <button type="button" className="text-xs text-[#B8D900] hover:text-[#9AB800] transition-colors">
                      שכחתי סיסמה
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A969A]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      dir="ltr"
                      className="pr-11 h-12 text-left bg-[#f8f9fa] border-[#e5e7eb] rounded-xl focus-visible:border-[#B8D900] focus-visible:ring-[#B8D900]/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#B8D900] text-[#2a2628] font-bold text-base rounded-xl hover:bg-[#a8c400] transition-all duration-300 shadow-lg shadow-[#B8D900]/25 hover:shadow-xl hover:shadow-[#B8D900]/30 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin ml-2" />
                      מתחבר...
                    </>
                  ) : (
                    "התחברות"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[#9A969A] lg:text-[#9A969A]">
              <span className="lg:hidden text-white/40">
                OnoLeads &copy; {new Date().getFullYear()} &middot; הקריה האקדמית אונו
              </span>
              <span className="hidden lg:inline">
                OnoLeads &copy; {new Date().getFullYear()} &middot; הקריה האקדמית אונו
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
