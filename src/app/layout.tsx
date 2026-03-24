import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "OnoLeads - מערכת ניהול לידים",
  description: "מערכת ניהול לידים ודפי נחיתה - הקריה האקדמית אונו",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={cn(
          "min-h-screen bg-background antialiased",
          "font-sans"
        )}
        style={{
          fontFamily: "'Segoe UI', 'Arial', 'Helvetica Neue', sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
