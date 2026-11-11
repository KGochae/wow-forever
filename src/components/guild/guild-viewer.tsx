"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CLASS_INFO, RANK_LABEL, specsOf, type Member } from "@/lib/wow";
import { cn } from "@/lib/utils";
import { FAN_NOTICE } from "@/lib/config";
import { useCharacter, useGuildIndex } from "@/lib/use-guild-data";
import { TopNav } from "@/components/layout/top-nav";
import { FilterRail, type Filters } from "@/components/guild/filter-rail";
import { MemberList, MemberListHeader } from "@/components/guild/member-list";
import { CharacterHeader } from "@/components/character/character-header";
import { StatColumn } from "@/components/character/stat-column";
import { GearColumn } from "@/components/character/gear-column";
import { TalentColumn } from "@/components/character/talent-column";
import { ItemTooltipProvider } from "@/components/common/item-tooltip";

/**
 * 뷰어 (/viewer?c={slug})
 * - 사이드바: index.json (길드원 전체, 경량)
 * - 본문: 선택된 1명만 chars/{id}.json 로드
 */
export function GuildViewer() {
  const router = useRouter();
  const params = useSearchParams();
  const { index, loading, error } = useGuildIndex();
  const tab = params.get("tab") === "raid" ? "raid" : "viewer"; // /viewer?tab=raid — 다른 페이지에서도 바로 진입
  const [filters, setFilters] = useState<Filters>({ rank: "all", classId: "all", spec: "all" });
  const [collapsed, setCollapsed] = useState(false); // 데스크톱(lg+) 사이드바 접기
  const [drawer, setDrawer] = useState(false); // 모바일·태블릿 길드원 목록 패널
  // 목록 헤더의 접기 버튼: 데스크톱은 접기, 그 아래는 패널 닫기
  const closeList = () => (window.matchMedia("(min-width: 1024px)").matches ? setCollapsed(true) : setDrawer(false));
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  // 레벨 → 등급 순 정렬
  const members: Member[] = useMemo(
    () => [...(index?.members ?? [])].sort((a, b) => b.level - a.level || a.rank - b.rank),
    [index]
  );

  // 선택 = URL ?c=slug (없으면 선택 안 함 — 기본 캐릭터 없음)
  const slug = params.get("c");
  const member = slug ? members.find((m) => m.slug === slug) : undefined;
  const select = (m: Member) => {
    setDrawer(false);
    router.replace(`/viewer?c=${encodeURIComponent(m.slug)}`, { scroll: false });
  };
  const { data: detail, loading: charLoading } = useCharacter(member?.id, member?.has ?? false);

  // 선택된 캐릭터가 목록 필터에 가려지면 필터 해제
  useEffect(() => {
    if (!member) return;
    setFilters((f) => (f.classId !== "all" && f.classId !== member.classId ? { rank: "all", classId: "all", spec: "all" } : f));
  }, [member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranks = useMemo(() => [...new Set(members.map((m) => m.rank))].sort((a, b) => a - b), [members]);
  const classes = useMemo(
    () => [...new Set(members.map((m) => m.classId))].sort((a, b) => a - b)
      .map((id) => ({ id, ...(CLASS_INFO[id] ?? { name: String(id), color: "#aaa" }) })),
    [members]
  );

  // 대표 특성 · 아바타 · 데이터 유무 — 모두 index.json에서
  const specMap = useMemo(() => new Map(members.map((m) => [m.id, m.spec ?? null])), [members]);
  const avatars = useMemo(() => Object.fromEntries(members.filter((m) => m.avatar).map((m) => [m.id, m.avatar!])), [members]);
  const missing = useMemo(() => new Set(members.filter((m) => !m.has).map((m) => m.id)), [members]);
  const specChips = filters.classId === "all" ? [] : specsOf(filters.classId);
  const hasUnknown = filters.classId !== "all" && members.some((m) => m.classId === filters.classId && (!m.spec || !specChips.includes(m.spec)));

  const filtered = members.filter((m) =>
    (filters.rank === "all" || m.rank === filters.rank) &&
    (filters.classId === "all" || m.classId === filters.classId) &&
    (filters.spec === "all" || (filters.spec === "none" ? !specMap.get(m.id) : specMap.get(m.id) === filters.spec))
  );
  const selectedId = member?.id;

  const onTab = (k: string) => {
    if (k === "stats") return router.push("/stats");
    const q = new URLSearchParams(params); // 선택한 캐릭터(c)는 유지
    if (k === "raid") q.set("tab", "raid");
    else q.delete("tab");
    const s = q.toString();
    router.replace(s ? `/viewer?${s}` : "/viewer", { scroll: false });
  };

  return (
    <ItemTooltipProvider>
      <div className="flex h-dvh flex-col overflow-hidden">
        <TopNav active={tab} onTab={onTab} members={index?.members ?? null} onPick={select} onMembers={tab === "viewer" ? () => setDrawer(true) : undefined} />

        <div className="flex min-h-0 flex-1">
          {/*
            길드원 목록 — 성능:
            ① 접어도 목록(247행·아바타)을 언마운트하지 않고 숨김만 → 다시 열 때 재렌더·이미지 재디코딩 없음
            ③ width 애니메이션 제거(메인 영역 매 프레임 재배치 방지) → 폭은 한 번에 전환, 보이는 효과는 transform/opacity(GPU)로만
            내부는 고정 폭(--sb-w)이라 접힘/펼침 중에도 목록 레이아웃 재계산 없음
            반응형: lg 미만 = 화면 왼쪽에서 밀려 나오는 패널(drawer, 상단바 "길드원" 버튼) / lg 이상 = 고정 사이드바(접기 가능)
          */}
          {/* 사이드바는 캐릭터 뷰어 탭에서만 (레이드 구성 등 다른 탭은 숨김) */}
          {tab === "viewer" && drawer && (
            <div className="anim-fade fixed inset-0 z-[65] bg-black/60 lg:hidden" onClick={() => setDrawer(false)} />
          )}
          <aside
            className={cn(
              "shrink-0 overflow-hidden border-r border-line",
              // 모바일·태블릿: 떠 있는 패널
              "fixed inset-y-0 left-0 z-[70] w-[var(--sb-w)] bg-[rgba(12,14,21,.97)] shadow-[8px_0_40px_rgba(0,0,0,.6)] transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)]",
              drawer ? "translate-x-0" : "-translate-x-full",
              // 데스크톱: 고정 사이드바
              "lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:bg-white/[.025] lg:shadow-none lg:transition-none",
              collapsed ? "lg:w-8" : "lg:w-[var(--sb-w)]",
              tab !== "viewer" && "hidden"
            )}
          >
            <div
              aria-hidden={collapsed}
              className={cn(
                "flex h-full w-[var(--sb-w)] flex-col transition-[opacity,transform] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] will-change-transform",
                collapsed && "lg:pointer-events-none lg:-translate-x-3 lg:opacity-0"
              )}
            >
              <MemberListHeader onCollapse={closeList} />
              <div className="flex min-h-0 flex-1">
                <FilterRail ranks={ranks} classes={classes} rankLabel={RANK_LABEL} specs={specChips} hasUnknown={hasUnknown} value={filters} onChange={setFilters} />
                <MemberList members={filtered} selectedId={selectedId ?? undefined} avatars={avatars} missing={missing} specs={specMap} onSelect={select} />
              </div>
            </div>
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="anim-fade absolute inset-0 hidden w-8 flex-col items-center gap-2 pt-3 text-tx3 transition-colors hover:text-tx1 lg:flex"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="text-fl-2xs font-bold [writing-mode:vertical-rl]">길드원 목록</span>
              </button>
            )}
          </aside>

          {/* 뷰어 */}
          <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-[clamp(6px,1.4vw,28px)] py-[clamp(8px,1vw,20px)] [contain:layout_paint]">
            {error ? (
              <Center>데이터를 불러오지 못했습니다 · {error}</Center>
            ) : loading ? (
              <Center><div className="spin" /><span className="mt-2">길드 데이터 불러오는 중…</span></Center>
            ) : tab !== "viewer" ? (
              <Center>준비 중인 탭입니다</Center>
            ) : member ? (
              <div
                key={member.id}
                className="anim-up mx-auto max-w-[clamp(1180px,84vw,1680px)] overflow-hidden rounded-lg border border-[var(--glass-border)] shadow-[0_25px_50px_-12px_rgba(0,0,0,.4)]"
              >
                <div className="glass-panel">
                  <CharacterHeader
                    name={member.name}
                    surname={member.surname}
                    level={detail?.level ?? member.level}
                    classId={member.classId}
                    specName={specMap.get(member.id) ?? undefined}
                    avatar={/* index 아바타(스트리머 사진) 우선 */ member.avatar ?? detail?.avatar ?? undefined}
                    lastLogin={detail?.lastLogin}
                    seed={member.id}
                    slug={member.slug}
                    soop={member.streamer?.soop}
                  />
                </div>
                {charLoading ? (
                  <div className="glass-panel flex h-[480px] flex-col items-center justify-center gap-2 text-fl-sm text-tx3">
                    <div className="spin" />캐릭터 정보 불러오는 중…
                  </div>
                ) : (
                /* WEB_PROJECT panel-left(2) / panel-center(3) / panel-right(2) */
                <div className="grid grid-cols-1 gap-px bg-white/[.04] lg:grid-cols-[minmax(320px,2fr)_minmax(380px,2.3fr)] 2xl:grid-cols-[minmax(330px,2fr)_minmax(380px,2.3fr)_minmax(300px,2fr)]">
                  <StatColumn c={detail ?? undefined} />
                  <GearColumn c={detail ?? undefined} />
                  <div className="relative h-[clamp(520px,64vh,800px)] lg:col-span-2 2xl:col-span-1 2xl:h-auto">
                    <TalentColumn c={detail ?? undefined} />
                  </div>
                </div>
                )}
              </div>
            ) : (
              <Center>
                {slug ? "해당 길드원을 찾을 수 없습니다" : <><span className="hidden lg:inline">왼쪽 목록이나 상단 검색에서 길드원을 선택하세요</span><span className="lg:hidden">길드원 목록이나 상단 검색에서 길드원을 선택하세요</span></>}
                <button onClick={() => setDrawer(true)} className="mt-3 rounded-md border border-white/15 bg-white/[.06] px-4 py-2 text-fl-sm font-bold text-tx1 transition-colors hover:bg-white/[.12] lg:hidden">
                  길드원 목록 열기
                </button>
              </Center>
            )}
          </main>
        </div>

        <footer className="flex h-7 shrink-0 items-center justify-center gap-6 overflow-hidden whitespace-nowrap border-t border-line px-4 text-[10.5px] text-tx3/50">
          <span>© 2026 WOW.FOREVER</span>
          <span className="hidden text-[7px] md:inline">{FAN_NOTICE}</span>
          {index && <span className="hidden sm:inline">수집 {new Date(index.collectedAt).toLocaleString("ko-KR")}</span>}
        </footer>
      </div>
    </ItemTooltipProvider>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="anim-fade flex h-64 flex-col items-center justify-center px-4 text-center text-fl-sm text-tx3">{children}</div>;
}
