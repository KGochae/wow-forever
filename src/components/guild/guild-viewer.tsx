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
  const [tab, setTab] = useState("viewer");
  const [filters, setFilters] = useState<Filters>({ rank: "all", classId: "all", spec: "all" });
  const [collapsed, setCollapsed] = useState(false);

  // 레벨 → 등급 순 정렬
  const members: Member[] = useMemo(
    () => [...(index?.members ?? [])].sort((a, b) => b.level - a.level || a.rank - b.rank),
    [index]
  );

  // 선택 = URL ?c=slug (없으면 선택 안 함 — 기본 캐릭터 없음)
  const slug = params.get("c");
  const member = slug ? members.find((m) => m.slug === slug) : undefined;
  const select = (m: Member) => router.replace(`/viewer?c=${encodeURIComponent(m.slug)}`, { scroll: false });
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

  return (
    <ItemTooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <TopNav active={tab} onTab={(k) => (k === "stats" ? router.push("/stats") : setTab(k))} members={index?.members ?? null} onPick={select} />

        <div className="flex min-h-0 flex-1">
          {/*
            사이드바 — 성능:
            ① 접어도 목록(247행·아바타)을 언마운트하지 않고 숨김만 → 다시 열 때 재렌더·이미지 재디코딩 없음
            ③ width 애니메이션 제거(메인 영역 매 프레임 재배치 방지) → 폭은 한 번에 전환, 보이는 효과는 transform/opacity(GPU)로만
            내부는 고정 330px 폭이라 접힘/펼침 중에도 목록 레이아웃 재계산 없음
          */}
          {/* 사이드바는 캐릭터 뷰어 탭에서만 (레이드 구성 등 다른 탭은 숨김) */}
          <aside
            className={cn(
              "relative shrink-0 overflow-hidden border-r border-line bg-white/[.025]",
              tab !== "viewer" && "hidden",
              collapsed ? "w-8" : "w-[330px]"
            )}
          >
            <div
              aria-hidden={collapsed}
              className={cn(
                "flex h-full w-[330px] flex-col transition-[opacity,transform] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] will-change-transform",
                collapsed ? "pointer-events-none -translate-x-3 opacity-0" : "translate-x-0 opacity-100"
              )}
            >
              <MemberListHeader onCollapse={() => setCollapsed(true)} />
              <div className="flex min-h-0 flex-1">
                <FilterRail ranks={ranks} classes={classes} rankLabel={RANK_LABEL} specs={specChips} hasUnknown={hasUnknown} value={filters} onChange={setFilters} />
                <MemberList members={filtered} selectedId={selectedId ?? undefined} avatars={avatars} missing={missing} specs={specMap} onSelect={select} />
              </div>
            </div>
            {collapsed && (
              <button
                onClick={() => setCollapsed(false)}
                className="anim-fade absolute inset-0 flex w-8 flex-col items-center gap-2 pt-3 text-tx3 transition-colors hover:text-tx1"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="text-[11px] font-bold [writing-mode:vertical-rl]">길드원 목록</span>
              </button>
            )}
          </aside>

          {/* 뷰어 */}
          <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto px-6 py-4 [contain:layout_paint]">
            {error ? (
              <Center>데이터를 불러오지 못했습니다 · {error}</Center>
            ) : loading ? (
              <Center><div className="spin" /><span className="mt-2">길드 데이터 불러오는 중…</span></Center>
            ) : tab !== "viewer" ? (
              <Center>준비 중인 탭입니다</Center>
            ) : member ? (
              <div
                key={member.id}
                className="anim-up mx-auto max-w-[1180px] overflow-hidden rounded-lg border border-[var(--glass-border)] shadow-[0_25px_50px_-12px_rgba(0,0,0,.4)]"
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
                    collectedAt={(detail as { collectedAt?: string } | null)?.collectedAt}
                  />
                </div>
                {charLoading ? (
                  <div className="glass-panel flex h-[480px] flex-col items-center justify-center gap-2 text-[13px] text-tx3">
                    <div className="spin" />캐릭터 정보 불러오는 중…
                  </div>
                ) : (
                /* WEB_PROJECT panel-left(2) / panel-center(3) / panel-right(2) */
                <div className="grid grid-cols-1 gap-px bg-white/[.04] lg:grid-cols-[minmax(320px,2fr)_minmax(380px,2.3fr)] 2xl:grid-cols-[minmax(330px,2fr)_minmax(380px,2.3fr)_minmax(300px,2fr)]">
                  <StatColumn c={detail ?? undefined} />
                  <GearColumn c={detail ?? undefined} />
                  <div className="relative h-[620px] lg:col-span-2 2xl:col-span-1 2xl:h-auto">
                    <TalentColumn c={detail ?? undefined} />
                  </div>
                </div>
                )}
              </div>
            ) : (
              <Center>{slug ? "해당 길드원을 찾을 수 없습니다" : "왼쪽 목록이나 상단 검색에서 길드원을 선택하세요"}</Center>
            )}
          </main>
        </div>

        <footer className="flex h-7 shrink-0 items-center justify-center gap-6 overflow-hidden whitespace-nowrap border-t border-line px-4 text-[10.5px] text-tx3/50">
          <span>© 2026 WOW.FOREVER</span>
          <span className="hidden md:inline">{FAN_NOTICE}</span>
          {index && <span className="hidden sm:inline">수집 {new Date(index.collectedAt).toLocaleString("ko-KR")}</span>}
        </footer>
      </div>
    </ItemTooltipProvider>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="anim-fade flex h-64 flex-col items-center justify-center text-sm text-tx3">{children}</div>;
}
