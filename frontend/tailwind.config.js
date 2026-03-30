/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 18px 50px rgba(14, 116, 144, 0.18)",
      },
    },
  },
  plugins: [],
};
