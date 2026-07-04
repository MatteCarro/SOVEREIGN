import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(220 18% 7%)",
        surface: "hsl(220 16% 10%)",
        panel: "hsl(220 15% 12%)",
        raised: "hsl(220 14% 16%)",
        border: "hsl(220 12% 20%)",
        "border-strong": "hsl(220 12% 28%)",
        foreground: "hsl(40 18% 92%)",
        muted: "hsl(220 8% 58%)",
        faint: "hsl(220 8% 40%)",
        accent: {
          DEFAULT: "hsl(38 65% 58%)",
          dim: "hsl(38 45% 42%)",
          fg: "hsl(220 20% 8%)",
        },
        danger: "hsl(0 62% 55%)",
        warning: "hsl(28 80% 58%)",
        success: "hsl(150 45% 48%)",
        info: "hsl(205 65% 58%)",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        sans: [
          "'Segoe UI'",
          "-apple-system",
          "BlinkMacSystemFont",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
        mono: ["'SF Mono'", "'Cascadia Code'", "Consolas", "monospace"],
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.6)", opacity: "0.9" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.2, 0.6, 0.4, 1) infinite",
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
