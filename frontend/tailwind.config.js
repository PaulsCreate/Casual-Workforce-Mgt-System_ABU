/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "on-tertiary-container": "#ffa8b1",
        "secondary-fixed": "#b7ecef",
        "on-error-container": "#93000a",
        "on-tertiary-fixed-variant": "#75313b",
        "inverse-surface": "#2e312d",
        "on-background": "#191d19",
        "secondary-fixed-dim": "#9cd0d3",
        "secondary-container": "#b7ecef",
        "surface-container-high": "#e6e9e3",
        "on-secondary": "#ffffff",
        "on-surface-variant": "#404941",
        "surface-variant": "#e0e3dd",
        "surface-bright": "#f8faf4",
        "outline-variant": "#c0c9be",
        "on-error": "#ffffff",
        "primary-container": "#145a32",
        "tertiary-fixed-dim": "#ffb2b9",
        "surface": "#f8faf4",
        "surface-container-highest": "#e0e3dd",
        "outline": "#707970",
        "inverse-primary": "#91d6a3",
        "surface-container-low": "#f2f4ee",
        "on-secondary-container": "#396c6f",
        "on-secondary-fixed": "#002021",
        "on-surface": "#191d19",
        "on-tertiary-fixed": "#3c0512",
        "surface-container": "#ecefe9",
        "tertiary-fixed": "#ffd9dc",
        "tertiary": "#61222c",
        "on-primary-fixed": "#00210d",
        "primary": "#004120",
        "surface-tint": "#286b41",
        "on-primary-container": "#8bcf9d",
        "on-primary": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "primary-fixed": "#adf2bd",
        "inverse-on-surface": "#eff2eb",
        "primary-fixed-dim": "#91d6a3",
        "tertiary-container": "#7e3842",
        "error": "#ba1a1a",
        "background": "#f8faf4",
        "secondary": "#336669",
        "surface-dim": "#d8dbd5",
        "on-tertiary": "#ffffff",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#07522b",
        "on-secondary-fixed-variant": "#174e51"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "unit": "4px",
        "margin-desktop": "32px",
        "container-max": "1280px",
        "margin-mobile": "16px",
        "gutter": "16px"
      },
      fontFamily: {
        "headline-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "title-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "data-mono": ["Inter", "monospace"],
        "headline-sm": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"]
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-up": "slide-up 0.25s ease-out",
      }
    },
  },
  plugins: [],
}
