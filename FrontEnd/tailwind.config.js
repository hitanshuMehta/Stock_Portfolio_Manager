/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ECEEFF",
        coralRed: "#FF6452",
      },
    },
  },
  plugins: [],
};
