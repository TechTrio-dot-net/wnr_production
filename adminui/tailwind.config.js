module.exports = {
  darkMode: "class", // ← needed for next-themes
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1rem",
        md: "1.25rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "2.5rem",
      },
    },
    extend: {
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },

      // 🎨 Brand colors
      colors: {
        // Primary = your requested brand color #b34725 with shades
        primary: {
          DEFAULT: "#b34725",
          50:  "#fbf2ef",
          100: "#f6e5de",
          200: "#e9c4b7",
          300: "#dca390",
          400: "#cf835f",
          500: "#b34725",
          600: "#8f391e",
          700: "#6b2b16",
          800: "#471d0f",
          900: "#230e07",
        },
        // Keep your “deep wine” as secondary
        secondary: "#8b1538",
        // Your previous accents (kept as-is)
        accent: "#b91c1c",
        wine: "#800020",
      },

      // ✨ Animations (unchanged)
      animation: {
        fadeInUp: "fadeInUp 0.6s ease-out",
        slideInLeft: "slideInLeft 0.5s ease-out",
        slideInRight: "slideInRight 0.5s ease-out",
        scaleIn: "scaleIn 0.4s ease-out",
        bounceIn: "bounceIn 0.6s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translate3d(0, 30px, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translate3d(-30px, 0, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translate3d(30px, 0, 0)" },
          "100%": { opacity: "1", transform: "translate3d(0, 0, 0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "calc(200px + 100%) 0" },
        },
      },
    },
  },
  plugins: [],
};
