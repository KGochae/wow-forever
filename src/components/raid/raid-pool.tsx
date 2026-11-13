"use client";

import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { CLASS_INFO, RANK_COLOR, byClassName, type Member } from "@/lib/wow";
import { Cat, Group, RankName } from "@/components/guild/filter-rail";
import { ROLE_GROUPS, ROLE_GROUP_INFO, SPEC_OPTIONS, classIcon, roleGroup, specOption, type RoleGroup } from "@/lib/raid-synergy";
import { cn } from "@/lib/utils";

interface Props {
  members: Member[];
  /** 배치된 캐릭터 id → 파티 번호(0부터) */
  assigned: Map<number, number>;
  ranks: number[];
  rankLabel: (r: number) => string;
  /** 캐릭터별 현재 특성 키 */
  specOf: (m: Member) => string | undefined;
  onSpec: (m: Member, key: string) => void;
  /** 칸을 고른 상태 (길드원을 누르면 그 칸에 들어감) */
  placing: boolean;
  onPick: (m: Member) => void;
  onDragMember: (m: Member) => void;
  onDropBack: () => void;
  onCollapse: () => void;
}

/**
 * 레이드 멤버 (WEB_PROJECT .rb-pool-col)
 * ┌ 레이드 멤버 · [딜][힐][탱] · 닉네임 검색 · ‹
 * ├ 길드 등급 / 직업 세로 필터 │ 닉네임(이름 성·직업·Lv) · 특성 · 역할 표
 * 배치된 길드원은 흐리게 · 목록 아래로
 */
export function RaidPool({ members, assigned, ranks, rankLabel, specOf, onSpec, placing, onPick, onDragMember, onDropBack, onCollapse }: Props) {
  const [q, setQ] = useState("");
  const [rank, setRank] = useState<number | "all">("all");
  const [cls, setCls] = useState<number | "all">("all");
  const [roles, setRoles] = useState<Set<RoleGroup>>(new Set(ROLE_GROUPS));
  const [over, setOver] = useState(false);

  const classes = useMemo(() => [...new Set(members.map((m) => m.classId))].sort(byClassName), [members]);
  const roleOf = (m: Member) => roleGroup(specOption(m.classId, specOf(m))?.role);

  const s = q.trim().toLowerCase();
  const list = members
    .filter((m) => {
      if (s) return `${m.name} ${m.surname} ${m.streamer?.name ?? ""}`.toLowerCase().includes(s);
      if (rank !== "all" && m.rank !== rank) return false;
      if (cls !== "all" && m.classId !== cls) return false;
      const r = roleOf(m);
      return roles.size === ROLE_GROUPS.length || (r ? roles.has(r) : false);
    })
    .sort((a, b) => Number(assigned.has(a.id)) - Number(assigned.has(b.id)));

  const toggleRole = (r: RoleGroup) =>
    setRoles((p) => {
      const n = new Set(p);
      if (n.has(r)) n.delete(r);
      else n.add(r);
      return n.size ? n : new Set(ROLE_GROUPS);
    });

  return (
    <div
      className="flex h-full flex-col px-[clamp(10px,.85vw,16px)] py-[clamp(12px,.95vw,18px)]"
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDropBack(); }}
    >
      {/* 헤더 한 줄 */}
      <div className="mb-2 flex shrink-0 items-center gap-2 text-fl-2xs">
        <span className="shrink-0 text-fl-xs font-extrabold text-tx1">레이드 멤버</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {ROLE_GROUPS.map((r) => {
            const on = roles.has(r);
            const c = ROLE_GROUP_INFO[r].color;
            return (
              <button
                key={r}
                onClick={() => toggleRole(r)}
                style={on ? { color: c, borderColor: `${c}55`, backgroundColor: `${c}18` } : undefined}
                className={cn("rounded border px-[.55em] py-[.25em] font-bold transition-colors", !on && "border-line2 bg-bg3 text-tx3")}
              >
                {ROLE_GROUP_INFO[r].short}
              </button>
            );
          })}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="닉네임 검색"
          className="w-[clamp(96px,7vw,130px)] min-w-0 shrink rounded-md border border-line2 bg-bg3 px-[.8em] py-[.45em] text-tx2 outline-none placeholder:text-tx3 focus:border-white/25"
        />
        <button
          onClick={onCollapse}
          aria-label="사이드바 접기"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line2 bg-bg3 text-tx2 transition-colors hover:bg-bg4 hover:text-tx1"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-2">
        {/* 세로 필터 (WEB_PROJECT .rb-filter-area) */}
        {/* 캐릭터 뷰어 사이드바(FilterRail)와 같은 버튼·섹션 사용 */}
        <div className="no-scrollbar my-1.5 flex w-[clamp(74px,5vw,96px)] shrink-0 flex-col gap-1.5 overflow-y-auto text-fl-2xs">
          <Group title="길드">
            <Cat active={rank === "all"} onClick={() => setRank("all")}>전체</Cat>
            {ranks.map((r) => (
              <Cat key={r} color={RANK_COLOR[r]} gold={r === 0} legacy={r === 2} active={rank === r} onClick={() => setRank(r)}>
                <RankName r={r} label={rankLabel(r)} />
              </Cat>
            ))}
          </Group>
          <Group title="클래스">
            <Cat active={cls === "all"} onClick={() => setCls("all")}>전체</Cat>
            {classes.map((id) => (
              <Cat key={id} active={cls === id} color={CLASS_INFO[id]?.color} onClick={() => setCls(cls === id ? "all" : id)}>{CLASS_INFO[id]?.name}</Cat>
            ))}
          </Group>
        </div>

        {/* 표 */}
        <div className={cn("no-scrollbar min-w-0 flex-1 overflow-y-auto rounded-md", over && "outline-1 outline-dashed outline-white/15")}>
          <div className="sticky top-0 z-[1] grid grid-cols-[28px_minmax(0,1fr)_auto_2.9em] items-center gap-x-2 rounded-t-md bg-[#151822] px-2 py-[.55em] text-center text-fl-2xs font-bold text-tx2">
            <span />
            <span>닉네임</span>
            <span className="w-[4.6em]">특성</span>
            <span>역할</span>
          </div>
          {placing && <div className="border-b border-line px-2 py-1.5 text-center text-fl-2xs font-bold text-[#ffd479]">선택한 칸에 넣을 길드원을 고르세요</div>}
          {list.map((m) => {
            const c = CLASS_INFO[m.classId];
            const gi = assigned.get(m.id);
            const key = specOf(m);
            const rg = roleGroup(specOption(m.classId, key)?.role);
            return (
              <div
                key={m.id}
                role="button"
                tabIndex={0}
                draggable={gi == null}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(m.id)); onDragMember(m); }}
                onClick={() => onPick(m)}
                onKeyDown={(e) => e.key === "Enter" && onPick(m)}
                className={cn(
                  "grid grid-cols-[28px_minmax(0,1fr)_auto_2.9em] items-center gap-x-2 border-b border-white/[.04] px-2 py-[.6em] text-fl-xs transition-colors",
                  gi != null ? "cursor-default opacity-[.38]" : "cursor-grab hover:bg-white/[.04] active:cursor-grabbing"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.avatar ?? classIcon(m.classId)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-7 w-7 rounded-full border-[1.5px] object-cover object-top"
                  style={{ borderColor: c?.color }}
                />
                <div className="min-w-0 leading-tight">
                  <FullName m={m} />
                  <div className="mt-px text-[.78em] font-semibold" style={{ color: c?.color }}>
                    {c?.name}
                    <span className="ml-1 font-normal tabular-nums text-tx3">Lv {m.level}{gi != null && ` · 파티 ${gi + 1}`}</span>
                  </div>
                </div>
                <SpecSelect classId={m.classId} value={key} onChange={(k) => onSpec(m, k)} />
                <RoleBadge group={rg} />
              </div>
            );
          })}
          {!list.length && <div className="py-8 text-center text-fl-2xs text-tx3">해당 조건의 멤버 없음</div>}
        </div>
      </div>
    </div>
  );
}

/** 특성 고르기 (WEB_PROJECT .rb-spec-dd-btn) — 끌기·클릭과 겹치지 않게 이벤트 막음 */
export function SpecSelect({ classId, value, onChange }: { classId: number; value?: string; onChange: (k: string) => void }) {
  const opts = SPEC_OPTIONS[classId] ?? [];
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      draggable={false}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
      aria-label="특성"
      className={cn(
        "w-[4.6em] cursor-pointer rounded-md border border-line2 bg-bg4 py-[.2em] pl-[.45em] text-[.92em] font-semibold outline-none hover:border-white/25 focus:border-white/40",
        value ? "text-tx1" : "text-[#e8a84a]"
      )}
    >
      {!value && <option value="">-</option>}
      {opts.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  );
}

export function RoleBadge({ group }: { group?: RoleGroup }) {
  if (!group) return <span className="text-center text-[.8em] text-tx3">-</span>;
  const r = ROLE_GROUP_INFO[group];
  return (
    <span className="justify-self-center whitespace-nowrap rounded px-[.35em] py-[.1em] text-center text-[.82em] font-bold" style={{ color: r.color, backgroundColor: `${r.color}2e` }}>
      {r.label}
    </span>
  );
}

/** 이름 + 성 — 줄임표 없이 전부 표시 (이름·성 사이에서 먼저 줄바꿈, 그래도 길면 글자 단위) */
export function FullName({ m }: { m: Member }) {
  return (
    <div className="break-keep font-bold text-tx1 [overflow-wrap:anywhere]">
      {m.name} <span className="font-semibold text-tx2">{m.surname}</span>
    </div>
  );
}
