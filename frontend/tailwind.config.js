/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",
        neonCyan: "#00F2FE",
        neonGreen: "#10B981",
        neonYellow: "#FBBF24",
        neonRed: "#EF4444",
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
}
