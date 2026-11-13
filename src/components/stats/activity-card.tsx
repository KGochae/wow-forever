"use client";

import type { Member } from "@/lib/wow";
import { cn } from "@/lib/utils";
import { ChartTip, useChartTip } from "@/components/stats/chart-tip";
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

/**
 * 길드 KPI 한 줄 (리더보드 위) — 길드원 · 평균 레벨 · 접속현황 · 와접률(예상)
 * - 와접률(예상): 마지막 로그아웃 후 3일 이상 지난 멤버 비율 (와우 접음 추정)
 * - 마지막 접속(KST 날짜 차이) 구간: 1일 이내 / 3일 이내 / 7일 이내 / 7일 초과(휴면) · % 분모 = 접속 기록 있는 인원
 * - 접속 카드: 4구간을 하나의 막대로 나눠 표시 + 아래 범례(인원) · 구간에 마우스를 올리면 툴팁
 */
export function GuildKpis({ members, stats }: { members: Member[]; stats: RankStats | null }) {
  const { tip, show, hide } = useChartTip();
  const total = members.length;
  const avg = total ? members.reduce((a, m) => a + m.level, 0) / total : 0;
  const noData = stats ? members.filter((m) => !stats.has(m.id)).length : 0;

  const today = dayNo(Date.now());
  const counts = [0, 0, 0, 0];
  let known = 0, quit = 0;
  if (stats) {
    members.forEach((m) => {
      const ts = stats.get(m.id)?.last_login;
      if (!ts) return;
      known++;
      const d = today - dayNo(ts);
      counts[d <= 1 ? 0 : d <= 3 ? 1 : d <= 7 ? 2 : 3]++;
      if (d >= 3) quit++;
    });
  }
  const pct = (n: number) => (known ? Math.round((n / known) * 100) : 0);
  const week = counts[0] + counts[1] + counts[2];
  const seg = [
    { label: "1일 이내", tip: "1일 이내 접속", n: counts[0], c: rgba(BASE, 1) },
    { label: "3일 이내", tip: "3일 이내 접속", n: counts[1], c: rgba(BASE, 0.62) },
    { label: "7일 이내", tip: "7일 이내 접속", n: counts[2], c: rgba(BASE, 0.32) },
    { label: "7일 초과", tip: "7일 넘게 미접속", n: counts[3], c: "rgba(120,120,120,.6)" },
  ];
  const tipOf = (s: (typeof seg)[number]) => (
    <>
      <div className="mb-1 text-fl-xs text-white/80">{s.tip}</div>
      <div className="text-fl-base font-extrabold text-white">{s.n}명 <span className="text-fl-xs font-bold text-white/60">{pct(s.n)}%</span></div>
    </>
  );

  return (
    <div className="grid grid-cols-2 gap-[clamp(8px,.8vw,14px)] md:grid-cols-[1fr_1fr_2.2fr_1fr]">
      <Kpi label="길드원" value={`${total}명`} sub={noData > 0 ? `데이터 수집 불가 ${noData}명` : undefined} />
      <Kpi label="평균 레벨" value={`Lv ${avg.toFixed(1)}`} />
      <Kpi
        label="접속현황"
        value={known ? <>{week}명 <span className="text-fl-base font-bold text-white/60">· {pct(week)}%</span></> : "-"}
        className="col-span-2 md:col-span-1"
      >
        {known > 0 && (
          <>
            {/* 하나의 막대를 구간별로 나눔 (구간 사이 1px 틈) */}
            <div className="mt-[.55em] flex h-[clamp(10px,.8vw,14px)] gap-px overflow-hidden rounded-[4px] bg-white/[.06]" onPointerLeave={hide}>
              {seg.map((s, i) =>
                s.n ? (
                  <div
                    key={s.label}
                    className="h-full origin-left motion-safe:animate-[barGrow_.8s_cubic-bezier(.2,.7,.2,1)_both]"
                    style={{ width: `${(s.n / known) * 100}%`, background: s.c, animationDelay: `${i * 0.08}s` }}
                    onPointerMove={(e) => show(e, tipOf(s))}
                  />
                ) : null
              )}
            </div>
            <div className="mt-[.45em] flex flex-wrap gap-x-[1em] gap-y-[.2em] text-fl-2xs font-semibold text-white/70">
              {seg.map((s) => (
                <span key={s.label} className="inline-flex items-center gap-[.35em] whitespace-nowrap">
                  <i className="h-[.7em] w-[.7em] rounded-[2px]" style={{ background: s.c }} />
                  {s.label} <b className="tabular-nums text-white">{s.n}</b>
                </span>
              ))}
            </div>
          </>
        )}
      </Kpi>
      <Kpi
        label="와접률(예상)"
        value={known ? <>{pct(quit)}% <span className="text-fl-base font-bold text-white/60">· {quit}명</span></> : "-"}
        sub="마지막 로그아웃 후 3일 이상 지난 멤버"
      />
      <ChartTip tip={tip} />
    </div>
  );
}

function Kpi({ label, value, sub, className, children }: { label: string; value: React.ReactNode; sub?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("anim-count relative flex flex-col justify-center overflow-hidden rounded-xl border border-white/[.07] bg-[rgba(10,12,18,.9)] px-[clamp(12px,1.1vw,20px)] py-[clamp(10px,.9vw,16px)]", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="text-fl-xs font-bold tracking-[1px] text-white/60">{label}</div>
      <div className="mt-[.15em] text-fl-xl font-extrabold tracking-[-.5px] text-white tabular-nums">{value}</div>
      {sub && <div className="mt-[.2em] text-fl-2xs font-medium text-white/45">{sub}</div>}
      {children}
    </div>
  );
}
