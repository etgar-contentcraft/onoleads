import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        heebo: ["var(--font-heebo)", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-heebo)", "sans-serif"],
        sans: ["var(--font-heebo)", "sans-serif"],
      },
      keyframes: {
        "slide-in-bar": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-in-bar": "slide-in-bar 0.35s ease-out forwards",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
