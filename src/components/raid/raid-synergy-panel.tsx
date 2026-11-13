"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CLASS_INFO, type Member } from "@/lib/wow";
import { CATS, GROUPS, classIcon, synergiesOf, synergyTitle, type Groups, type SynergyState } from "@/lib/raid-synergy";
import { cn } from "@/lib/utils";
import { HoverTip } from "@/components/common/hover-tip";
import { SkillIcon } from "./skill-icon";

/** 보기 범위: all = 공대 전체 / 0~4 = 파티 번호 */
type View = "all" | number;

/** 범위에 맞춘 한 줄 상태 — 파티 보기(on)면 그 파티 전용 효과만, 제공자도 그 파티 안의 사람만 */
interface RowView {
  st: SynergyState;
  status: "raid" | "party" | "on" | "none";
  sources: SynergyState["sources"];
}

/**
 * 공대 스킬 요약 (오른쪽 패널 내용)
 * 분류별 38개 효과 — 상단 필터: 공대 전체(공대 전체 / 일부 파티 / 없음) · 파티 n(그 파티에만 적용되는 효과만)
 * 누르면 스킬 설명·제공자(길드원 사진, hover 시 이름 전체)
 */
export function RaidSynergyPanel({ states, groups }: { states: Map<string, SynergyState>; groups: Groups }) {
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");

  const all = [...states.values()];
  // 길드원 id → 파티 번호
  const groupOf = useMemo(() => {
    const m = new Map<number, number>();
    groups.forEach((g, gi) => g.forEach((s) => s && m.set(s.member.id, gi)));
    return m;
  }, [groups]);
  const filled = groups.map((g) => g.filter(Boolean).length);

  /** 파티 보기: 그 파티 안의 길드원이 그 파티에만 거는 효과(파티 범위 스킬)만 — 공대 전체 효과·없는 효과는 숨김 */
  const rowView = (st: SynergyState): RowView | null => {
    if (view === "all") return { st, status: st.status, sources: st.sources };
    const sources = st.sources
      .filter((x) => x.provider.scope === "party")
      .map((x) => ({ ...x, members: x.members.filter((m) => groupOf.get(m.id) === view) }))
      .filter((x) => x.members.length);
    return sources.length ? { st, status: "on", sources } : null;
  };
  const onCount = view === "all" ? all.filter((s) => s.status !== "none").length : all.filter((s) => rowView(s)).length;

  return (
    <div className="flex flex-col">
      {/* 범위 필터 */}
      <div className="sticky top-0 z-[2] flex flex-col gap-2 border-b border-white/[.06] bg-[rgba(16,18,27,.97)] px-4 py-2.5">
        <div className="flex flex-wrap gap-1 text-fl-2xs">
          <ViewChip on={view === "all"} onClick={() => setView("all")}>공대 전체</ViewChip>
          {Array.from({ length: GROUPS }, (_, gi) => (
            <ViewChip key={gi} on={view === gi} dim={!filled[gi]} onClick={() => setView(gi)}>
              파티 {gi + 1}
            </ViewChip>
          ))}
        </div>
        {/* 보기 요약 — 필터 버튼 아래 별도 줄 (라벨은 흰색, 개수는 초록 배지) */}
        <div className="flex items-center gap-2 rounded-md border border-white/[.08] bg-white/[.04] px-2.5 py-[.45em] text-fl-2xs">
          <span className="font-bold text-tx1">
            {view === "all" ? (
              <>공대 전체 <span className="font-semibold text-tx2">· WOW Forever 기준 {all.length}개 효과</span></>
            ) : (
              <><span className="text-[#ffd479]">파티 {view + 1}</span>에만 적용되는 효과</>
            )}
          </span>
          <span className="ml-auto rounded-[4px] bg-[#7ee0a1]/15 px-[.55em] py-[.1em] font-extrabold tabular-nums text-[#7ee0a1]">
            {view === "all" ? "적용 " : ""}{onCount}개
          </span>
        </div>
      </div>

      <div className="flex flex-col">
        {view !== "all" && !onCount && (
          <div className="px-4 py-8 text-center text-fl-2xs text-tx2">
            {filled[view] ? `파티 ${view + 1}에만 적용되는 효과가 없습니다` : `파티 ${view + 1}에 배치된 길드원이 없습니다`}
          </div>
        )}
        {CATS.map((cat) => {
          const rows = synergiesOf(cat.id).map((s) => rowView(states.get(s.id)!)).filter((r): r is RowView => !!r);
          if (!rows.length) return null;
          return (
            <div key={cat.id} className="border-b border-white/[.05] last:border-0">
              {/* 분류 제목 — 스킬 줄과 확실히 구분되게 골드 + 양옆 선 */}
              <div className="flex items-center gap-2 px-4 pb-1.5 pt-3 text-fl-2xs font-extrabold tracking-[1.5px] text-[#e6c56b] after:h-px after:flex-1 after:bg-[#e6c56b]/25">{cat.label}</div>
              <ul className="pb-1.5">
                {rows.map((rv) => {
                  const key = `${cat.id}:${rv.st.synergy.id}`;
                  return <Row key={key} rv={rv} open={open === key} onToggle={() => setOpen(open === key ? null : key)} />;
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ViewChip({ on, dim, onClick, children }: { on: boolean; dim?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-md border px-[.7em] py-[.3em] font-bold transition-colors",
        on
          ? "border-[#7bb899] bg-[rgba(20,60,40,.55)] text-[#a8d8b8]"
          : cn("border-white/15 text-tx2 hover:border-[#7bb899]/70 hover:bg-[rgba(20,60,40,.25)] hover:text-[#a8d8b8]", dim && "opacity-50")
      )}
    >
      {children}
    </button>
  );
}

function Row({ rv, open, onToggle }: { rv: RowView; open: boolean; onToggle: () => void }) {
  const { st, status, sources } = rv;
  const s = st.synergy;
  const iconP = sources[0]?.provider ?? s.providers[0];
  // 파티 보기: 공대 범위 스킬은 빼고 파티 범위 스킬만 표시
  const providers = status === "on" ? s.providers.filter((p) => p.scope === "party") : s.providers;
  const classes = [...new Set(providers.map((p) => p.classId))];
  const activeClasses = new Set(sources.map((x) => x.provider.classId));

  return (
    <li>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-[.32em] text-left text-fl-xs transition-colors hover:bg-white/[.04]"
      >
        <SkillIcon p={iconP} dim={status === "none"} className="h-[1.6em] w-[1.6em] shrink-0" />
        <span className={cn("min-w-0 flex-1 truncate font-semibold", status === "none" ? "text-tx2" : "text-tx1")}>
          {synergyTitle(s)}
          {s.core && status !== "raid" && status !== "on" && <span className="ml-1 text-[#ffb36b]">•</span>}
        </span>
        <span className="flex shrink-0 gap-[2px]">
          {classes.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={classIcon(id)}
              alt={CLASS_INFO[id]?.name}
              title={CLASS_INFO[id]?.name}
              loading="lazy"
              className={cn("h-[1.15em] w-[1.15em] rounded-[2px]", !activeClasses.has(id) && "opacity-30 grayscale")}
            />
          ))}
        </span>
        <Status rv={rv} />
        <ChevronDown className={cn("h-[1em] w-[1em] shrink-0 text-tx3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="anim-fade mx-4 mb-2 mt-1 flex flex-col gap-2.5 rounded-lg border border-white/[.08] bg-white/[.05] p-2.5 text-fl-2xs leading-relaxed">
          {providers.map((p) => {
            const src = sources.find((x) => x.provider === p);
            const c = CLASS_INFO[p.classId];
            return (
              <div key={p.name + p.classId} className="flex gap-2">
                <SkillIcon p={p} dim={!src} className="mt-[2px] h-[1.9em] w-[1.9em] shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-1.5">
                    <span className="font-bold text-tx1">{p.name}</span>
                    <span style={{ color: c?.color }} className="font-bold">{c?.name}{p.spec ? ` · ${p.spec}` : ""}</span>
                    {/* 적용 범위 배지 — 파티(노랑) · 공대(초록) */}
                    <span
                      className={cn(
                        "rounded-[3px] border px-[.4em] text-[.9em] font-bold leading-[1.5]",
                        p.scope === "party" ? "border-[#ffd479]/50 bg-[#ffd479]/10 text-[#ffd479]" : "border-[#7ee0a1]/50 bg-[#7ee0a1]/10 text-[#7ee0a1]"
                      )}
                    >
                      {p.scope === "party" ? "파티" : "공대"}
                    </span>
                    {p.share && (p.slot ?? 1) > 1 && <span className="font-semibold text-tx2">({c?.name} {p.slot}명부터)</span>}
                  </div>
                  <p className="mt-0.5 text-[#c9ccd6]">{p.desc}</p>
                  {src ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {src.members.map((m) => <MemberAvatar key={m.id} m={m} />)}
                    </div>
                  ) : (
                    <p className="mt-0.5 font-semibold text-[#e07b7b]">제공자 없음</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
}

/**
 * 제공자 사진 — 22px 원형, hover·포커스 시 이름 전체
 * 이미지 최적화: 목록·파티 카드와 같은 주소(축소 썸네일)라 브라우저 캐시 재사용 · 펼친 줄만 렌더 · lazy + async 디코딩 · 크기 고정(레이아웃 흔들림 없음)
 */
function MemberAvatar({ m }: { m: Member }) {
  const c = CLASS_INFO[m.classId];
  const full = `${m.name} ${m.surname ?? ""}`.trim();
  return (
    <HoverTip
      label={full}
      width={150}
      className="cursor-default rounded-full"
      tip={
        <span className="flex flex-col">
          <span className="font-bold text-tx1">{full}</span>
          <span className="text-fl-2xs font-semibold" style={{ color: c?.color }}>{c?.name} · Lv {m.level}</span>
        </span>
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.avatar ?? classIcon(m.classId)}
        alt={full}
        width={22}
        height={22}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-[22px] w-[22px] rounded-full border-[1.5px] object-cover object-top"
        style={{ borderColor: c?.color }}
      />
    </HoverTip>
  );
}

function Status({ rv }: { rv: RowView }) {
  const { status, st } = rv;
  if (status === "on") return null; // 파티 보기: 모두 그 파티 효과라 상태 표시 불필요
  if (status === "raid") return <span className="w-[4.6em] shrink-0 text-right text-fl-2xs font-bold text-[#7ee0a1]">공대 전체</span>;
  if (status === "party")
    return <span className="w-[4.6em] shrink-0 truncate text-right text-fl-2xs font-bold text-[#ffd479]">파티 {st.groups.map((g) => g + 1).join("·")}</span>;
  return <span className="w-[4.6em] shrink-0 text-right text-fl-2xs font-semibold text-tx3">없음</span>;
}
