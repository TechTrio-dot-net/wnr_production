/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          berry: "#6E2234",
          berry900: "#4B1420",
          berry700: "#8A2C42",
          cream: "#EFE6DE",
          sand: "#E1D7C8",
          orange: "#D96D27",
          pink: "#F2B3B3",
          green: "#8BBF6F",
          text: "#3B2A2F",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      borderRadius: { "2xl": "1.25rem" },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.06)",
      },

      /* === ADD FROM HERE === */
      keyframes: {
        // corner flowers
        inTR: {
          "0%":   { opacity: "0", transform: "translate(20%,-20%) scale(0.85)" },
          "100%": { opacity: "0.2", transform: "translate(0,0) scale(1)" },
        },
        inBL: {
          "0%":   { opacity: "0", transform: "translate(-20%,20%) scale(0.85)" },
          "100%": { opacity: "0.2", transform: "translate(0,0) scale(1)" },
        },

        // box-burst flowers (relative to corners)
        burstTL: {
          "0%":   { opacity: "0", transform: "translate(calc(-50% - 25%), calc(-50% - 25%)) scale(0.85)" },
          "60%":  { opacity: "0.4" },
          "100%": { opacity: "var(--burstOpacity,0.12)", transform: "translate(-50%,-50%) scale(1)" },
        },
        burstTR: {
          "0%":   { opacity: "0", transform: "translate(calc(-50% + 25%), calc(-50% - 25%)) scale(0.85)" },
          "60%":  { opacity: "0.4" },
          "100%": { opacity: "var(--burstOpacity,0.12)", transform: "translate(-50%,-50%) scale(1)" },
        },
        burstBL: {
          "0%":   { opacity: "0", transform: "translate(calc(-50% - 25%), calc(-50% + 25%)) scale(0.85)" },
          "60%":  { opacity: "0.4" },
          "100%": { opacity: "var(--burstOpacity,0.12)", transform: "translate(-50%,-50%) scale(1)" },
        },
        burstBR: {
          "0%":   { opacity: "0", transform: "translate(calc(-50% + 25%), calc(-50% + 25%)) scale(0.85)" },
          "60%":  { opacity: "0.4" },
          "100%": { opacity: "var(--burstOpacity,0.12)", transform: "translate(-50%,-50%) scale(1)" },
        },

        // background poster titles
        posterIn: {
          "0%":   { opacity: "0", transform: "translateY(1.5vh) scale(0.98)" },
          "100%": { opacity: "var(--posterOpacity,1)", transform: "translateY(0) scale(1)" },
        },
        posterInSoft: {
          "0%":   { opacity: "0", transform: "translateY(2vh) scale(0.98)" },
          "100%": { opacity: "var(--posterOpacitySoft,1)", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        // corner flowers
        "in-tr": "inTR 0.7s cubic-bezier(.2,.8,.2,1) both",
        "in-bl": "inBL 0.7s cubic-bezier(.2,.8,.2,1) both",

        // box-burst flowers
        "burst-tl": "burstTL 0.7s ease-out forwards",
        "burst-tr": "burstTR 0.7s ease-out forwards",
        "burst-bl": "burstBL 0.7s ease-out forwards",
        "burst-br": "burstBR 0.7s ease-out forwards",

        // background titles
        "poster-in": "posterIn 0.6s cubic-bezier(.2,.8,.2,1) both",
        "poster-in-soft": "posterInSoft 0.7s cubic-bezier(.2,.8,.2,1) both",
      },
      /* === ADD UNTIL HERE === */
    },
  },
  plugins: [],
};
