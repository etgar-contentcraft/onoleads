/**
 * Admin UI translation strings for Hebrew, English, and Arabic.
 * Add new keys here when adding new UI text to the dashboard.
 */

export type AdminLang = "he" | "en" | "ar";

const translations = {
  he: {
    // Nav labels
    nav_dashboard: "לוח בקרה",
    nav_programs: "תוכניות לימוד",
    nav_pages: "דפי נחיתה",
    nav_leads: "לידים",
    nav_media: "ספריית מדיה",
    nav_analytics: "אנליטיקס",
    nav_seo: "SEO",
    nav_settings: "הגדרות",
    nav_templates: "תבניות",
    nav_faculty: "מאגר מרצים",
    nav_campaigns: "פופאפים",
    nav_interest_areas: "תחומי עניין",
    nav_ai_import: "ייבוא AI",
    nav_shared_sections: "סקציות גלובליות",
    nav_audit: "יומן ביקורת",
    nav_changelog: "עדכוני מערכת",
    nav_help: "מרכז עזרה",
    nav_users: "משתמשים",
    nav_pixels: "פיקסלים",

    // Header
    search_placeholder: "חיפוש מהיר...",
    role_admin: "מנהל",
    menu_profile: "פרופיל",
    menu_settings: "הגדרות",
    menu_logout: "התנתקות",
    nav_title: "תפריט ניווט",

    // Breadcrumbs
    bc_dashboard: "לוח בקרה",
    bc_programs: "תוכניות לימוד",
    bc_pages: "דפי נחיתה",
    bc_builder: "בונה דפים",
    bc_leads: "לידים",
    bc_events: "אירועים",
    bc_media: "ספריית מדיה",
    bc_analytics: "אנליטיקס",
    bc_seo: "SEO",
    bc_settings: "הגדרות",
    bc_templates: "תבניות",
    bc_faculty: "מאגר מרצים",
    bc_shared_sections: "סקציות גלובליות",
    bc_audit: "יומן ביקורת",
    bc_changelog: "עדכוני מערכת",
    bc_help: "מרכז עזרה",
    bc_users: "משתמשים",

    // Sidebar footer
    sidebar_tagline: "ניהול לידים ודפי נחיתה",
    sidebar_powered_by: "Powered by",
  },
  en: {
    // Nav labels
    nav_dashboard: "Dashboard",
    nav_programs: "Programs",
    nav_pages: "Landing Pages",
    nav_leads: "Leads",
    nav_media: "Media Library",
    nav_analytics: "Analytics",
    nav_seo: "SEO",
    nav_settings: "Settings",
    nav_templates: "Templates",
    nav_faculty: "Faculty",
    nav_campaigns: "Popups",
    nav_interest_areas: "Interest Areas",
    nav_ai_import: "AI Import",
    nav_shared_sections: "Global Sections",
    nav_audit: "Audit Log",
    nav_changelog: "Release Notes",
    nav_help: "Help Center",
    nav_users: "Users",
    nav_pixels: "Pixels",

    // Header
    search_placeholder: "Quick search...",
    role_admin: "Admin",
    menu_profile: "Profile",
    menu_settings: "Settings",
    menu_logout: "Sign out",
    nav_title: "Navigation",

    // Breadcrumbs
    bc_dashboard: "Dashboard",
    bc_programs: "Programs",
    bc_pages: "Landing Pages",
    bc_builder: "Page Builder",
    bc_leads: "Leads",
    bc_events: "Events",
    bc_media: "Media Library",
    bc_analytics: "Analytics",
    bc_seo: "SEO",
    bc_settings: "Settings",
    bc_templates: "Templates",
    bc_faculty: "Faculty",
    bc_shared_sections: "Global Sections",
    bc_audit: "Audit Log",
    bc_changelog: "Release Notes",
    bc_help: "Help Center",
    bc_users: "Users",

    // Sidebar footer
    sidebar_tagline: "Leads & Landing Page Manager",
    sidebar_powered_by: "Powered by",
  },
  ar: {
    // Nav labels
    nav_dashboard: "لوحة التحكم",
    nav_programs: "البرامج الدراسية",
    nav_pages: "صفحات الهبوط",
    nav_leads: "العملاء المحتملون",
    nav_media: "مكتبة الوسائط",
    nav_analytics: "التحليلات",
    nav_seo: "SEO",
    nav_settings: "الإعدادات",
    nav_templates: "القوالب",
    nav_faculty: "أعضاء هيئة التدريس",
    nav_campaigns: "النوافذ المنبثقة",
    nav_interest_areas: "مجالات الاهتمام",
    nav_ai_import: "استيراد AI",
    nav_shared_sections: "الأقسام المشتركة",
    nav_audit: "سجل المراجعة",
    nav_changelog: "ملاحظات الإصدار",
    nav_help: "مركز المساعدة",
    nav_users: "المستخدمون",
    nav_pixels: "بيكسلات",

    // Header
    search_placeholder: "بحث سريع...",
    role_admin: "مدير",
    menu_profile: "الملف الشخصي",
    menu_settings: "الإعدادات",
    menu_logout: "تسجيل الخروج",
    nav_title: "قائمة التنقل",

    // Breadcrumbs
    bc_dashboard: "لوحة التحكم",
    bc_programs: "البرامج الدراسية",
    bc_pages: "صفحات الهبوط",
    bc_builder: "منشئ الصفحات",
    bc_leads: "العملاء المحتملون",
    bc_events: "الفعاليات",
    bc_media: "مكتبة الوسائط",
    bc_analytics: "التحليلات",
    bc_seo: "SEO",
    bc_settings: "الإعدادات",
    bc_templates: "القوالب",
    bc_faculty: "أعضاء هيئة التدريس",
    bc_shared_sections: "الأقسام المشتركة",
    bc_audit: "سجل المراجعة",
    bc_changelog: "ملاحظات الإصدار",
    bc_help: "مركز المساعدة",
    bc_users: "المستخدمون",

    // Sidebar footer
    sidebar_tagline: "إدارة العملاء وصفحات الهبوط",
    sidebar_powered_by: "مدعوم بواسطة",
  },
} as const;

export type TranslationKey = keyof typeof translations.he;

/** Returns a translation function for the given language */
export function createTranslator(lang: AdminLang) {
  return (key: TranslationKey): string => {
    return (translations[lang] as Record<string, string>)[key] ?? (translations.he as Record<string, string>)[key] ?? key;
  };
}

export { translations };
