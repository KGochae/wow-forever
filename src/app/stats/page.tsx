import { Suspense } from "react";
import { GuildStatsDashboard } from "@/components/stats/guild-stats-dashboard";

// /stats — 길드 통계 대시보드 (index.json만 사용 · 추가 요청 0)
export default function StatsPage() {
  return (
    <Suspense>
      <GuildStatsDashboard />
    </Suspense>
  );
}
