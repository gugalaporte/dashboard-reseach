import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Finacap (obrigatoria)
        ink: "#090502",
        navy: "#030A1E",
        brand: {
          DEFAULT: "#1B61B6",
          soft: "#4492CC",
        },
        line: "#D8D8D8",
        surface: {
          DEFAULT: "#E8E8E8",
          soft: "#F1F1F1",
        },
        // Tokens genericos usados por shadcn
        background: "#F1F1F1",
        foreground: "#090502",
        border: "#D8D8D8",
        input: "#D8D8D8",
        ring: "#4492CC",
        popover: {
          DEFAULT: "#F1F1F1",
          foreground: "#090502",
        },
        card: {
          DEFAULT: "#F1F1F1",
          foreground: "#090502",
        },
        muted: {
          DEFAULT: "#E8E8E8",
          foreground: "#090502",
        },
        accent: {
          DEFAULT: "#E8E8E8",
          foreground: "#090502",
        },
        primary: {
          DEFAULT: "#1B61B6",
          foreground: "#F1F1F1",
        },
        secondary: {
          DEFAULT: "#E8E8E8",
          foreground: "#090502",
        },
        destructive: {
          DEFAULT: "#B6321B",
          foreground: "#F1F1F1",
        },
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-in-right": "slide-in-right 240ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
