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
        peru: {
          DEFAULT: "#cd853f",
          dark: "#b57232",
          light: "#dfa060",
        },
        cream: {
          DEFAULT: "#eecbad",
          soft: "#f7e6d5",
          bg: "#faf8f5",
        },
        cyanHighlight: {
          DEFAULT: "#97ffff",
          muted: "#d4ffff",
        },
        slateText: {
          dark: "#0f172a",
          primary: "#1e293b",
          secondary: "#475569",
        },
      },
      boxShadow: {
        premium: "0 4px 20px -2px rgba(205, 133, 63, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)",
        "premium-hover": "0 10px 28px -4px rgba(205, 133, 63, 0.14), 0 4px 10px -2px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
