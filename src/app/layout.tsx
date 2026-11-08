import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WOW FOREVER — 전투정보실",
  description: "WoW Forever 길드 캐릭터 뷰어",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* WEB_PROJECT와 동일 폰트: Pretendard(본문) + Cinzel(로고/영문 타이틀) */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
