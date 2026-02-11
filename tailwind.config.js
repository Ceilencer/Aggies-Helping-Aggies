/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-login": "hsl(var(--background-login))",
        foreground: "hsl(var(--foreground))",
        "button-bg": {
          DEFAULT: "hsl(var(--button-bg))",
        },
        "button-text": "hsl(var(--button-text))",
        "header-bg": {
          DEFAULT: "hsl(var(--header-bg))",
        },
        "dash-header-bg": "hsl(var(--dash-header-bg))",
        "dash-header-text": "hsl(var(--dash-header-text))",
        "footer-bg": {
          DEFAULT: "hsl(var(--footer-bg))",
        },
        "header-text": {
          DEFAULT: "hsl(var(--header-text))",
        },
        "footer-text": {
          DEFAULT: "hsl(var(--footer-text))",
        },
        "page-heading": {
          DEFAULT: "hsl(var(--page-heading-text))",
        },
        "page-heading-text": "hsl(var(--page-heading-text))",
        "page-subtext": {
          DEFAULT: "hsl(var(--page-subtext))",
        },
        "steps-text": "hsl(var(--steps-text))",
        icon: {
          DEFAULT: "hsl(var(--icon))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
