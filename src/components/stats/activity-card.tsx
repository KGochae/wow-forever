"use client";

import type { Member } from "@/lib/wow";
import type { RankStats } from "@/lib/use-rank-data";

/**
 * 접속 현황 (WEB_PROJECT stats.js _buildActActivityCard)
 * - 마지막 접속일(KST 날짜 차이)로 4구간: 3일 이내 / 7일 이내 / 14일 이내 / 14일 초과
 * - 데이터: rank.json last_login (추가 요청 없음) · 접속 시각이 없는 멤버는 제외
 * - 색: 선택한 직업 색 (없으면 WEB_PROJECT '전체' 초록), 구간이 멀수록 흐리게
 */
const BASE = "#7ec8a0";
const KST = 9 * 3600e3;
const dayNo = (ms: number) => Math.floor((ms + KST) / 86400e3);

const rgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

export function ActivityBars({ members, stats, color }: { members: Member[]; stats: RankStats; color?: string }) {
  const col = color ?? BASE;
  const tiers = [
    { label: "3일 이내", max: 3, c: rgba(col, 1) },
    { label: "7일 이내", max: 7, c: rgba(col, 0.75) },
    { label: "14일 이내", max: 14, c: rgba(col, 0.5) },
    { label: "14일 초과", max: Infinity, c: "rgba(120,120,120,1)" },
  ];

  const today = dayNo(Date.now());
  const counts = [0, 0, 0, 0];
  let known = 0;
  members.forEach((m) => {
    const ts = stats.get(m.id)?.last_login;
    if (!ts) return;
    known++;
    const d = today - dayNo(ts);
    counts[tiers.findIndex((t) => d <= t.max)]++;
  });

  const sig = `${counts.join(",")}|${col}`; // 바뀌면 막대 채움 연출 다시 재생

  if (!known) {
    return (
      <div className="flex h-40 items-center justify-center text-center text-fl-sm text-white/60">
        접속 기록이 아직 없습니다 · 다음 수집 때 표시됩니다
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[clamp(10px,1vw,16px)]">
      {tiers.map((t, i) => {
        const pct = Math.round((counts[i] / known) * 100);
        const inside = pct >= 85; // 막대가 거의 꽉 차면 % 글자를 막대 안쪽 오른쪽에
        return (
          <div key={t.label}>
            <div className="mb-[.35em] flex items-center justify-between text-fl-sm">
              <span className="font-bold text-white/80">{t.label}</span>
              <span className="font-black tabular-nums" style={{ color: t.c }}>{counts[i]}명</span>
            </div>
            <div className="relative flex h-[clamp(26px,2vw,36px)] items-center rounded-[4px] bg-white/[.06]">
              <div
                key={sig}
                className="h-full shrink-0 origin-left rounded-[4px] opacity-70 motion-safe:animate-[barGrow_.8s_cubic-bezier(.2,.7,.2,1)_both]"
                style={{ width: `${Math.max(pct, 4)}%`, background: t.c, animationDelay: `${i * 0.08}s` }}
              />
              <span
                className={inside ? "absolute right-[6px] text-fl-base font-extrabold text-white" : "whitespace-nowrap pl-[6px] text-fl-base font-extrabold tabular-nums"}
                style={inside ? undefined : { color: t.c }}
              >
                {pct}%
              </span>
            </div>
          </div>
        );
      })}
      <div className="text-right text-fl-2xs text-white/45">마지막 접속 기준 · 접속 기록 있는 {known}명</div>
    </div>
  );
}
