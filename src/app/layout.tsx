import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/config";
import "./globals.css";

const TITLE = "같이와포하자 전투정보실 — WOW FOREVER";
const DESC = "WoW Forever 길드 '같이와포하자' 길드원 캐릭터 뷰어 · 장비 · 능력치 · 특성 · 3D 모델";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  // 공유 미리보기 (카카오톡·디스코드 등) — 이미지: app/opengraph-image.jpg 자동 연결
  openGraph: { type: "website", siteName: "WOW FOREVER", locale: "ko_KR", title: TITLE, description: DESC, url: "/" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
};

export const viewport: Viewport = { themeColor: "#0a0b12" };

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
