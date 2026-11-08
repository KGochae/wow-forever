import type { NextConfig } from "next";

// 3D 모델 리소스: 같은 도메인(/mv/...)으로 받아 Cloudflare Worker(zamimg 프록시 + R2 캐시)로 전달
// → 브라우저 CORS 문제 없음, WEB_PROJECT Worker 수정 불필요
const MODEL_PROXY = "https://wow-proxy.wowak.workers.dev/modelviewer";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/mv/:path*", destination: `${MODEL_PROXY}/:path*` }];
  },
};

export default nextConfig;
