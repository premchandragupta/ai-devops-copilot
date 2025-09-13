import type { Config } from "tailwindcss"
import animate from "tailwindcss-animate"
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(0,0,0,0.08)"
      }
    },
  },
  plugins: [animate],
};
export default config;
