/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0A0A0F",
          soft: "#111118",
          muted: "#1C1C26",
        },
        signal: {
          DEFAULT: "#FE2C55",
          dim: "#C4213F",
          glow: "rgba(254,44,85,0.18)",
        },
        cyan: {
          tik: "#69C9D0",
          dim: "#4AA8AE",
          glow: "rgba(105,201,208,0.15)",
        },
        zinc: {
          750: "#2D2D3A",
          850: "#1A1A24",
        },
      },
      backgroundImage: {
        "grid-ink": "linear-gradient(rgba(254,44,85,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(254,44,85,0.04) 1px, transparent 1px)",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      backgroundSize: {
        "grid": "32px 32px",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "pulse-signal": "pulseSignal 2s ease-in-out infinite",
        "scan": "scan 3s linear infinite",
        "ticker": "ticker 20s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSignal: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(254,44,85,0)" },
          "50%": { boxShadow: "0 0 0 8px rgba(254,44,85,0.15)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
