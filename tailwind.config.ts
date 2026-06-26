import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SF Mono",
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
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      colors: {
        canvas: "var(--canvas)",
        bg: "var(--bg)",
        workspace: "var(--workspace)",
        rail: "var(--rail)",
        glass: "var(--glass)",
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
          active: "var(--accent-active)",
          bright: "var(--accent-bright)",
          soft: "var(--accent-soft)",
          glow: "var(--accent-glow)",
        },
        link: "var(--link)",
        level: {
          error: "var(--red)",
          warn: "var(--orange)",
          info: "var(--blue)",
          debug: "var(--fg-subtle)",
        },
      },
      boxShadow: {
        accent: "0 0 16px var(--accent-glow)",
        glass: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      },
      backdropBlur: {
        glass: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
