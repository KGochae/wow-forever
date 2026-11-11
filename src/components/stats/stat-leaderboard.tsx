"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { CLASS_INFO, specsOf, type Member } from "@/lib/wow";
import { cn } from "@/lib/utils";
import type { RankStats } from "@/lib/use-rank-data";

/**
 * 직업별 스탯 리더보드 (WEB_PROJECT stats.js stRenderClassTable 구성)
 * - 값: 로그아웃 시점 최종수치 (장비·특성 포함)
 * - 컬럼: 직업별 주요 스탯 (첫 컬럼 = 기본 정렬) · 헤더 클릭 정렬 · 공동 순위 · 30명/페이지
 * - 크기: 고정 px 대신 text-fl-* (화면 폭 비례) + em 단위 여백/아바타 → 화면이 커지면 표 전체가 같이 커짐
 * - 필터: 위쪽 가로 칩 (왼쪽 고정 폭 열 제거 → 표가 전체 폭 사용)
 */
type Col = { k: string; l: string };
const L: Record<string, string> = {
  strength_effective: "힘", agility_effective: "민첩", intellect_effective: "지능", stamina_effective: "체력", spirit_effective: "정신력",
  health: "생명력", power: "마나", armor_effective: "방어도", defense_effective: "방어숙련", dodge: "회피", parry: "무기막기", block: "막기",
  attack_power: "공격력", main_hand_dps: "주무기 DPS", off_hand_dps: "보조무기 DPS", melee_crit: "근접 치명타",
  ranged_attack_power: "원거리 공격력", ranged_crit: "원거리 치명타",
  spell_power: "주문력", spell_healing: "치유량", spell_crit: "주문 치명타", mana_regen: "마나 재생",
};
const cols = (...ks: string[]): Col[] => ks.map((k) => ({ k, l: L[k] }));

export const CLASS_COLS: Record<number, Col[]> = {
  1: cols("attack_power", "strength_effective", "main_hand_dps", "off_hand_dps", "melee_crit", "health", "armor_effective", "defense_effective", "dodge", "parry", "block"),
  2: cols("attack_power", "strength_effective", "melee_crit", "spell_power", "spell_healing", "intellect_effective", "spell_crit", "power", "health", "armor_effective", "defense_effective", "block"),
  3: cols("ranged_attack_power", "agility_effective", "ranged_crit", "attack_power", "health", "power"),
  4: cols("attack_power", "agility_effective", "main_hand_dps", "off_hand_dps", "melee_crit", "dodge", "health"),
  5: cols("spell_healing", "spell_power", "intellect_effective", "spirit_effective", "spell_crit", "power", "mana_regen", "health"),
  7: cols("spell_power", "spell_healing", "intellect_effective", "spell_crit", "attack_power", "strength_effective", "melee_crit", "power", "mana_regen", "health"),
  8: cols("spell_power", "spell_crit", "intellect_effective", "spirit_effective", "power", "mana_regen", "health"),
  9: cols("spell_power", "stamina_effective", "intellect_effective", "spell_crit", "power", "health"),
  11: cols("attack_power", "strength_effective", "agility_effective", "melee_crit", "spell_power", "spell_healing", "intellect_effective", "spirit_effective", "power", "mana_regen", "armor_effective", "health"),
};

const PCT = new Set(["dodge", "parry", "block", "melee_crit", "ranged_crit", "spell_crit"]);
const fmt = (k: string, v: number | null | undefined) => {
  if (v == null) return "-";
  if (PCT.has(k)) return `${v.toFixed(1)}%`;
  if (k.endsWith("_dps")) return v.toFixed(1);
  return Math.round(v).toLocaleString();
};

const PAGE = 30;
const CLASS_ORDER = [1, 2, 3, 4, 5, 7, 8, 9, 11];

/* 고정 열(순위·캐릭터) — th/td 모두 같은 글자 크기(text-fl-base)라 em 기준 위치가 일치 */
const RANK_W = "w-[3.4em] min-w-[3.4em]";
const NAME_LEFT = "left-[3.4em]";
const CELL = "px-[.8em] py-[.55em]";

export function StatLeaderboard({ members, stats, onPick }: { members: Member[]; stats: RankStats; onPick: (m: Member) => void }) {
  const counts = useMemo(() => {
    const c = new Map<number, number>();
    members.forEach((m) => stats.has(m.id) && c.set(m.classId, (c.get(m.classId) ?? 0) + 1));
    return c;
  }, [members, stats]);
  const classes = CLASS_ORDER.filter((id) => counts.get(id));

  const [cls, setCls] = useState<number>(() => classes[0] ?? 1);
  const [spec, setSpec] = useState("all");
  const [sort, setSort] = useState<{ k: string; dir: "desc" | "asc" } | null>(null);
  const [page, setPage] = useState(0);

  const columns = CLASS_COLS[cls] ?? [];
  const sortKey = sort?.k ?? "level"; // 기본 정렬: 레벨
  const dir = sort?.dir ?? "desc";
  const specs = specsOf(cls);
  const inClass = members.filter((m) => m.classId === cls && stats.has(m.id));
  const hasUnknown = inClass.some((m) => !m.spec || !specs.includes(m.spec));

  const rows = useMemo(() => {
    const list = inClass.filter((m) => spec === "all" || (spec === "none" ? !m.spec || !specs.includes(m.spec) : m.spec === spec));
    const first = columns[0]?.k;
    const v = (m: Member) => (sortKey === "level" ? m.level : stats.get(m.id)?.[sortKey] ?? null);
    const tie = (m: Member) => (sortKey === "level" ? stats.get(m.id)?.[first] ?? 0 : m.level); // 동점 시 보조 정렬
    list.sort((a, b) => {
      const av = v(a), bv = v(b);
      if (av == null || bv == null) return av == null ? (bv == null ? 0 : 1) : -1; // 값 없음은 항상 뒤
      return dir === "desc" ? bv - av || tie(b) - tie(a) : av - bv || tie(a) - tie(b);
    });
    // 공동 순위 (dense: 1,1,2,3…)
    let r = 0, prev: number | null | undefined;
    return list.map((m) => {
      const x = v(m);
      if (x !== prev) { r++; prev = x; }
      return { m, rank: x == null ? null : r };
    });
  }, [inClass, spec, sortKey, dir, stats]); // eslint-disable-line react-hooks/exhaustive-deps

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const view = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const color = CLASS_INFO[cls]?.color ?? "#aaa";

  const pickClass = (id: number) => { setCls(id); setSpec("all"); setSort(null); setPage(0); };
  const pickSort = (k: string) => {
    setSort((s) => (s?.k === k || (!s && k === "level") ? { k, dir: dir === "desc" ? "asc" : "desc" } : { k, dir: "desc" }));
    setPage(0);
  };
  const Arrow = ({ on }: { on: boolean }) =>
    on ? (dir === "desc" ? <ChevronDown className="h-[.9em] w-[.9em]" /> : <ChevronUp className="h-[.9em] w-[.9em]" />) : null;

  return (
    <div className="flex flex-col gap-[clamp(10px,1vw,18px)]">
      {/* 필터: 위쪽 가로 칩 (줄바꿈) */}
      <div className="flex flex-col gap-[clamp(6px,.6vw,10px)]">
        <ChipRow title="클래스">
          {classes.map((id) => {
            const c = CLASS_INFO[id];
            return (
              <Chip key={id} on={id === cls} color={c.color} onClick={() => pickClass(id)} strong>
                {c.name}
              </Chip>
            );
          })}
        </ChipRow>
        <ChipRow title="특성" key={cls}>
          {[{ k: "all", l: "전체" }, ...specs.map((s) => ({ k: s, l: s })), ...(hasUnknown ? [{ k: "none", l: "알 수 없음" }] : [])].map(({ k, l }) => (
            <Chip key={k} on={spec === k} color={color} onClick={() => { setSpec(k); setPage(0); }}>
              {l}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {/* 표 */}
      <div className="no-scrollbar overflow-x-auto rounded-lg border border-white/[.06]">
        <table className="w-full border-collapse text-fl-base text-white">
          <thead>
            <tr className="border-b border-white/10 bg-white/[.03]">
              <th className={cn("sticky left-0 z-[1] bg-[#11131b] text-center font-bold text-white", RANK_W, CELL)}>
                <span className="text-[.88em]">순위</span>
              </th>
              <th className={cn("sticky z-[1] bg-[#11131b] text-left font-bold text-white", NAME_LEFT, CELL)}>
                <span className="text-[.88em]">캐릭터</span>
              </th>
              {[{ k: "level", l: "Lv" }, ...columns].map((c) => {
                const on = c.k === sortKey;
                return (
                  <th key={c.k} className={cn("text-center", CELL)}>
                    <button
                      onClick={() => pickSort(c.k)}
                      className={cn("inline-flex items-center justify-center gap-[.15em] whitespace-nowrap text-[.92em] font-extrabold text-white transition-opacity", !on && "hover:opacity-80")}
                    >
                      {c.l}
                      <Arrow on={on} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.map(({ m, rank }) => {
              const s = stats.get(m.id);
              const top3 = rank != null && rank <= 3 && dir === "desc";
              return (
                <tr key={m.id} onClick={() => onPick(m)} className="group cursor-pointer border-b border-white/[.04] transition-colors hover:bg-white/[.05]">
                  <td className={cn("sticky left-0 bg-[#0f1118] text-center group-hover:bg-[#171a23]", RANK_W, CELL)} style={top3 ? { boxShadow: `inset 3px 0 0 ${["#f7cd4f", "#c9d3df", "#d89d62"][rank - 1]}` } : undefined}>
                    <span className={cn("inline-flex h-[1.9em] min-w-[1.9em] items-center justify-center rounded-md px-[.25em] font-black tabular-nums", top3 ? `medal medal-${rank}` : "text-white")}>
                      {rank ?? "-"}
                    </span>
                  </td>
                  <td className={cn("sticky bg-[#0f1118] group-hover:bg-[#171a23]", NAME_LEFT, CELL)}>
                    <div className="flex items-center gap-[.6em]">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar} alt="" loading="lazy" className="h-[2.1em] w-[2.1em] shrink-0 rounded-full border border-white/20 object-cover object-top" />
                      ) : (
                        <span className="flex h-[2.1em] w-[2.1em] shrink-0 items-center justify-center rounded-full border text-[.85em] font-bold" style={{ borderColor: `${color}66`, color }}>{m.name[0]}</span>
                      )}
                      <div className="flex min-w-0 flex-col leading-tight">
                        <span className="max-w-[7.5em] truncate font-bold text-white md:max-w-[11em]" title={`${m.name} ${m.surname}`}>{m.name} {m.surname}</span>
                        <span className="text-[.8em] text-white/60">{m.spec ?? "알 수 없음"}</span>
                      </div>
                    </div>
                  </td>
                  <td className={cn("text-center tabular-nums text-white", CELL, sortKey === "level" && "font-extrabold")}>
                    {m.level}
                  </td>
                  {columns.map((c) => {
                    const on = c.k === sortKey;
                    return (
                      <td key={c.k} className={cn("whitespace-nowrap text-center tabular-nums text-white", CELL, on && "font-extrabold")}>
                        {fmt(c.k, s?.[c.k] ?? null)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!view.length && (
              <tr><td colSpan={columns.length + 3} className="py-10 text-center text-fl-sm text-white/60">해당 조건의 길드원이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지 */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-1 text-fl-sm">
          <PageBtn disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft className="h-[1.1em] w-[1.1em]" /></PageBtn>
          {Array.from({ length: pages }, (_, i) => (
            <PageBtn key={i} active={i === cur} onClick={() => setPage(i)}>{i + 1}</PageBtn>
          ))}
          <PageBtn disabled={cur === pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight className="h-[1.1em] w-[1.1em]" /></PageBtn>
        </div>
      )}
    </div>
  );
}

function ChipRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-[.75em] text-fl-sm">
      <span className="shrink-0 pt-[.45em] text-[.82em] font-extrabold tracking-[1.2px] text-white/60">{title}</span>
      <div className="flex flex-wrap gap-[.35em]">{children}</div>
    </div>
  );
}

function Chip({ on, color, strong, onClick, children }: { on: boolean; color: string; strong?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={on ? { color, borderColor: color, backgroundColor: `${color}24` } : undefined}
      className={cn(
        "rounded-md border px-[.85em] py-[.35em] text-center transition-colors",
        strong ? "font-extrabold" : "font-bold",
        !on && "border-white/15 text-white hover:bg-white/[.08]"
      )}
    >
      {children}
    </button>
  );
}

function PageBtn({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-[2.2em] min-w-[2.2em] items-center justify-center rounded-md px-[.5em] font-bold tabular-nums transition-colors disabled:opacity-30",
        active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/[.08] hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
