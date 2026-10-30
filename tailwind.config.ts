import type { Config } from "tailwindcss";

/**
 * Los colores salen de variables CSS (src/app/globals.css) para que el modo
 * oscuro cambie toda la app sin duplicar clases. `slate` y `white` se
 * redefinen como neutros cálidos que se invierten en oscuro.
 */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix: string) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => [s, v(`${prefix}-${s}`)]));

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: v("surface"),
        slate: scale("n"),
        brand: scale("b"),
        ink: v("ink"),
        canvas: v("canvas"),
        surface: v("surface"),
        sunken: v("sunken"),
        line: v("line"),
        positive: v("positive"),
        negative: v("negative"),
        warning: v("warning"),
      },
      fontFamily: { sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"] },
      fontSize: { "2xs": ["0.6875rem", { lineHeight: "1rem" }] },
      transitionTimingFunction: { out: "cubic-bezier(0.23, 1, 0.32, 1)", drawer: "cubic-bezier(0.32, 0.72, 0, 1)" },
      borderRadius: { xl: "0.75rem" },
    },
  },
  plugins: [],
} satisfies Config;
