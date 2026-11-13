"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, HelpCircle, RefreshCw, Shield } from "lucide-react";
import { CLASS_INFO, specsOf, type Member } from "@/lib/wow";
import { cn } from "@/lib/utils";
import { FAN_NOTICE, RAID_ENABLED } from "@/lib/config";
import { useGuildIndex } from "@/lib/use-guild-data";
import { TopNav } from "@/components/layout/top-nav";
import { ClassTreemap, LevelDistChart } from "@/components/stats/level-charts";
import { StatLeaderboard } from "@/components/stats/stat-leaderboard";
import { ActivityBars, GuildKpis } from "@/components/stats/activity-card";

/** 접속 현황 카드 — 접속 시각(rank.json last_login) 수집 전까지 숨김. 다시 보이려면 true */
const SHOW_ACTIVITY = false;
import { dataVer, useRankData } from "@/lib/use-rank-data";

/**
 * 길드 통계 (/stats) — WEB_PROJECT 길드 대시보드(직업 비율 + 분포도) 구성
 * - 데이터: index.json 하나 (직업·특성·레벨 포함) → 추가 Worker 요청 0
 * - 직업 비율 칸 클릭 → 분포도에 해당 직업 겹쳐 표시 → 특성 칩으로 좁히기
 */
export function GuildStatsDashboard() {
  const router = useRouter();
  const { index, loading, error } = useGuildIndex();
  const { rank, error: rankError } = useRankData(index ? dataVer(index) : undefined);
  const [cls, setCls] = useState<number | null>(null);
  const [spec, setSpec] = useState<string>("all"); // "all" | 특성명 | "none"

  const members = useMemo(() => index?.members ?? [], [index]);
  const total = members.length;
  const noData = useMemo(() => (rank ? members.filter((m) => !rank.stats.has(m.id)) : []), [members, rank]);

  const levels = useMemo(() => {
    if (!total) return [];
    const lv = members.map((m) => m.level);
    const lo = Math.min(...lv), hi = Math.max(...lv);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [members, total]);

  const classData = useMemo(() => {
    const c = new Map<number, number>();
    members.forEach((m) => c.set(m.classId, (c.get(m.classId) ?? 0) + 1));
    return [...c.entries()].map(([classId, cnt]) => ({ classId, cnt })).sort((a, b) => b.cnt - a.cnt);
  }, [members]);

  const specs = cls != null ? specsOf(cls) : [];
  const hasUnknown = cls != null && members.some((m) => m.classId === cls && (!m.spec || !specs.includes(m.spec)));
  // 특성 칩 인원 (선택한 직업 안에서)
  const specCount = (k: string) =>
    members.filter((m) => m.classId === cls && (k === "all" || (k === "none" ? !m.spec || !specs.includes(m.spec) : m.spec === k))).length;
  const selected = useMemo(() => {
    if (cls == null) return null;
    return members.filter((m) => m.classId === cls && (spec === "all" || (spec === "none" ? !m.spec || !specs.includes(m.spec) : m.spec === spec)));
  }, [members, cls, spec]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => countBy(members), [members]);
  const selCounts = useMemo(() => (selected ? countBy(selected) : null), [selected]);
  const avg = (ms: Member[]) => (ms.length ? ms.reduce((a, m) => a + m.level, 0) / ms.length : 0);

  const c = cls != null ? CLASS_INFO[cls] : undefined;
  const selLabel = c ? (spec === "all" ? c.name : `${c.name} · ${spec === "none" ? "알 수 없음" : spec}`) : undefined;

  const selectClass = (id: number) => {
    setCls((p) => (p === id ? null : id));
    setSpec("all");
  };
  const pick = (m: Member) => router.push(`/viewer?id=${m.id}`);
  const onTab = (k: string) => k !== "stats" && (k !== "raid" || RAID_ENABLED) && router.push(k === "raid" ? "/viewer?tab=raid" : "/viewer");

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopNav active="stats" onTab={onTab} members={index?.members ?? null} onPick={pick} />

      <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto p-[clamp(10px,1.4vw,28px)]">
        {error ? (
          <Center>데이터를 불러오지 못했습니다 · {error}</Center>
        ) : loading ? (
          <Center><div className="spin" /><span className="mt-2">길드 데이터 불러오는 중…</span></Center>
        ) : (
          <div className="anim-up mx-auto flex w-full max-w-[1800px] flex-col gap-[clamp(12px,1.2vw,22px)]">
          <GuildKpis members={members} stats={rank?.stats ?? null} />
          <Card
            eyebrow="Leaderboard"
            title="직업별 스탯 리더보드"
            titleExtra={noData.length > 0 ? <NoDataNote members={noData} /> : undefined}
            note={
              rank ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <InfoChip icon={Shield}>로그아웃 시점 최종수치 <span className="text-white/50">· 장비·특성·버프 포함</span></InfoChip>
                  <InfoChip icon={Clock}>{fmtTime(rank.collectedAt)} 기준</InfoChip>
                  <InfoChip icon={RefreshCw}>한시간 마다 갱신</InfoChip>
                </div>
              ) : undefined
            }
          >
            {rankError ? (
              <div className="py-8 text-center text-fl-sm text-white/60">리더보드 데이터를 불러오지 못했습니다</div>
            ) : rank ? (
              <StatLeaderboard members={members} stats={rank.stats} onPick={pick} />
            ) : (
              <div className="flex h-40 items-center justify-center"><div className="spin" /></div>
            )}
          </Card>
          <div className="grid gap-[clamp(12px,1.2vw,22px)] lg:grid-cols-[1fr_2fr]">
            <Card eyebrow="Class Share" title="직업 비율" note={`총 ${total}명`}>
              <div className="h-[clamp(260px,24vw,440px)] p-[3px]">
                <ClassTreemap data={classData} total={total} selected={cls} onSelect={selectClass} />
              </div>
            </Card>

            <Card
              eyebrow="Level Distribution"
              title="레벨 분포도"
              note={selected ? `${selLabel} ${selected.length}명 · 평균 Lv ${avg(selected).toFixed(1)}` : `평균 Lv ${avg(members).toFixed(1)}`}
            >
              {/* 특성 칩: 직업 선택 시에만 */}
              {cls != null && (
                <div key={cls} className="anim-fade flex flex-wrap gap-[.35em] text-fl-sm">
                  {[{ k: "all", l: "전체" }, ...specs.map((s) => ({ k: s, l: s })), ...(hasUnknown ? [{ k: "none", l: "알 수 없음" }] : [])].map(({ k, l }) => (
                    <button
                      key={k}
                      onClick={() => setSpec(k)}
                      style={spec === k ? { color: c?.color, borderColor: c?.color, backgroundColor: `${c?.color}24` } : undefined}
                      className={cn(
                        "rounded-md border px-[.85em] py-[.35em] font-bold transition-colors",
                        spec !== k && "border-white/20 text-white hover:bg-white/[.08]"
                      )}
                    >
                      {l}
                      <span className="ml-[.45em] text-[.85em] font-semibold tabular-nums opacity-60">{specCount(k)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="h-[clamp(240px,22vw,400px)] lg:h-auto lg:min-h-[clamp(240px,20vw,400px)] lg:flex-1">
                <LevelDistChart levels={levels} all={all} sel={selCounts} selColor={c?.color} selLabel={selLabel} />
              </div>
            </Card>
          </div>
          {SHOW_ACTIVITY && <Card
            eyebrow="Activity"
            title="접속 현황"
            note={selLabel ? `${selLabel} ${selected?.length ?? 0}명` : `전체 ${total}명`}
          >
            {rank ? (
              <ActivityBars members={selected ?? members} stats={rank.stats} color={c?.color} />
            ) : (
              <div className="flex h-40 items-center justify-center"><div className="spin" /></div>
            )}
          </Card>}
          </div>
        )}
      </main>

      <footer className="flex h-7 shrink-0 items-center justify-center gap-6 overflow-hidden whitespace-nowrap border-t border-line px-4 text-[10.5px] text-tx3/50">
        <span>© 2026 WOW.FOREVER</span>
        <span className="hidden text-[7px] md:inline">{FAN_NOTICE}</span>
        {index && <span className="hidden sm:inline">수집 {new Date(index.collectedAt).toLocaleString("ko-KR")}</span>}
      </footer>
    </div>
  );
}

function countBy(ms: Member[]) {
  const m = new Map<number, number>();
  ms.forEach((x) => m.set(x.level, (m.get(x.level) ?? 0) + 1));
  return m;
}

/** WEB_PROJECT .gd-card / .gd-ch / .gd-ct */
/**
 * 패널 카드 — 어두운 반투명 면 + 얇은 테두리, 상단 하이라이트 라인, 헤더/본문 구분선
 * eyebrow: 사이트 로고와 같은 Cinzel 영문 소제목
 */
function Card({ eyebrow, title, titleExtra, note, children }: { eyebrow?: string; title: string; titleExtra?: React.ReactNode; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="relative flex flex-col overflow-hidden rounded-xl border border-white/[.07] bg-[rgba(10,12,18,.9)]">
      {/* 상단 하이라이트 라인 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-white/[.06] px-[clamp(14px,1.4vw,28px)] pb-[clamp(10px,.9vw,16px)] pt-[clamp(12px,1.1vw,20px)]">
        <div className="min-w-0">
          {eyebrow && <div className="font-display text-fl-2xs font-bold uppercase tracking-[3px] text-white/45">{eyebrow}</div>}
          {/* relative: titleExtra 말풍선의 기준 — 좁은 화면에서도 카드 밖으로 잘리지 않도록 제목 왼쪽에 맞춤 */}
          <div className="relative mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-fl-xl font-extrabold tracking-[.2px] text-white">{title}</h2>
            {titleExtra}
          </div>
        </div>
        {note != null && (typeof note === "string" ? <span className="truncate pb-0.5 text-fl-sm font-medium text-white/60">{note}</span> : note)}
      </header>
      <div className="flex flex-1 flex-col gap-[clamp(10px,1vw,18px)] p-[clamp(12px,1.4vw,28px)]">{children}</div>
    </section>
  );
}

/** 데이터 수집 불가능 멤버 — 물음표 hover/포커스 시 이름과 사유 표시 */
function NoDataNote({ members }: { members: Member[] }) {
  return (
    <span className="inline-flex items-center gap-1 text-fl-xs font-medium text-white/60">
      데이터 수집 불가능 멤버 {members.length}명
      <span tabIndex={0} aria-label="데이터 수집 불가능 멤버 안내" className="group inline-flex cursor-help rounded-full outline-none">
        <HelpCircle className="h-[1em] w-[1em] transition-colors group-hover:text-white group-focus:text-white" />
        <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-[min(420px,calc(100vw-5rem))] rounded-md border border-white/15 bg-[#171a23] px-3 py-2.5 text-fl-xs leading-relaxed text-white shadow-lg group-hover:block group-focus:block">
          <span className="block font-bold">{members.map((m) => `${m.name} ${m.surname}`).join(", ")}</span>
          <span className="mt-2 block border-t border-white/10 pt-2 text-white/70">
            ※ 블리자드 계정 옵션 - [게임 데이터 및 프로필 공개 설정] 체크가 안 되어 있는 유저는 데이터 수집이 불가능합니다.
          </span>
        </span>
      </span>
    </span>
  );
}

/** 카드 헤더 정보 칩 (아이콘 + 짧은 문구) */
function InfoChip({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 bg-white/[.04] px-[.85em] py-[.3em] text-fl-xs font-semibold text-white/85">
      <Icon className="h-[1em] w-[1em] text-white/55" />
      {children}
    </span>
  );
}

/** "11월 7일 오후 3:16" */
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

function Center({ children }: { children: React.ReactNode }) {
  return <div className="anim-fade flex h-64 flex-col items-center justify-center text-sm text-tx3">{children}</div>;
}
