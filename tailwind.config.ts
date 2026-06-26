import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SF Mono",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        ui: ["13px", { lineHeight: "1.45" }],
        micro: ["11px", { lineHeight: "1.4" }],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },
      colors: {
        bg: "var(--bg)",
        workspace: "var(--workspace)",
        sidebar: {
          DEFAULT: "var(--sidebar)",
          hover: "var(--sidebar-hover)",
        },
        panel: {
          DEFAULT: "var(--panel)",
          raised: "var(--panel-raised)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        fg: {
          DEFAULT: "var(--fg)",
          muted: "var(--fg-muted)",
          subtle: "var(--fg-subtle)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
          glow: "var(--accent-glow)",
        },
        level: {
          error: "var(--red)",
          warn: "var(--yellow)",
          info: "var(--blue)",
          debug: "var(--fg-subtle)",
        },
      },
      boxShadow: {
        accent: "0 0 12px var(--accent-glow)",
      },
    },
  },
  plugins: [],
};

export default config;
