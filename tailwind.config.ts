import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
      // DESIGN.md의 radius 스케일(8/12/16px)은 Tailwind 기본값(rounded-lg=8px, rounded-xl=12px)과
      // 한 단계씩 어긋난다 — rounded-md/lg/xl을 명시적으로 재정의해서 코드에 쓴 클래스명이
      // DESIGN.md 문서의 의도와 실제 렌더링 픽셀이 일치하게 만든다.
      borderRadius: {
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: "#111111",
        body: "#374151",
        muted: "#6b7280",
        "surface-card": "#f5f5f5",
        "surface-soft": "#f8f9fa",
        hairline: "#e5e7eb",
        badge: {
          orange: "#fb923c",
          pink: "#ec4899",
          violet: "#8b5cf6",
          emerald: "#34d399",
        },
      },
    },
  },
  plugins: [],
};
export default config;
