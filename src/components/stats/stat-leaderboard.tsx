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

  // 컬럼별 최고값 (현재 필터 기준) — 정렬 컬럼 막대용
  const maxOf = useMemo(() => {
    const o: Record<string, number> = {};
    for (const c of columns) o[c.k] = Math.max(0, ...rows.map(({ m }) => stats.get(m.id)?.[c.k] ?? 0));
    return o;
  }, [rows, columns, stats]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const view = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const color = CLASS_INFO[cls]?.color ?? "#aaa";

  const pickClass = (id: number) => { setCls(id); setSpec("all"); setSort(null); setPage(0); };
  const pickSort = (k: string) => {
    setSort((s) => (s?.k === k || (!s && k === "level") ? { k, dir: dir === "desc" ? "asc" : "desc" } : { k, dir: "desc" }));
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      {/* 왼쪽 필터 (좁은 화면: 위쪽 가로 스크롤) */}
      <aside className="flex shrink-0 flex-col gap-2 lg:sticky lg:top-0 lg:w-[148px]">
        <FilterGroup title="클래스">
          {classes.map((id) => {
            const c = CLASS_INFO[id];
            const on = id === cls;
            return (
              <button
                key={id}
                onClick={() => pickClass(id)}
                style={on ? { color: c.color, borderColor: c.color, backgroundColor: `${c.color}24` } : undefined}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1.5 text-center text-[13.5px] font-extrabold transition-colors",
                  !on && "border-white/15 text-white hover:bg-white/[.08]"
                )}
              >
                {c.name}
              </button>
            );
          })}
        </FilterGroup>

        <FilterGroup title="특성" key={cls}>
          {[{ k: "all", l: "전체" }, ...specs.map((s) => ({ k: s, l: s })), ...(hasUnknown ? [{ k: "none", l: "알 수 없음" }] : [])].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => { setSpec(k); setPage(0); }}
              style={spec === k ? { color, borderColor: color, backgroundColor: `${color}24` } : undefined}
              className={cn("shrink-0 rounded-md border px-2.5 py-1.5 text-center text-[13px] font-bold transition-colors", spec !== k && "border-white/15 text-white hover:bg-white/[.08]")}
            >
              {l}
            </button>
          ))}
        </FilterGroup>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* 표 */}
      <div className="no-scrollbar overflow-x-auto rounded-lg border border-white/[.06]">
        <table className="w-full border-collapse text-[15px] text-white">
          <thead>
            <tr className="border-b border-white/10 bg-white/[.03]">
              <th className="sticky left-0 z-[1] w-12 bg-[#11131b] px-2 py-2.5 text-center text-[13.5px] font-bold text-white/70">순위</th>
              <th className="sticky left-12 z-[1] w-[230px] min-w-[210px] bg-[#11131b] px-2 py-2.5 text-left text-[13.5px] font-bold text-white/70">캐릭터</th>
              <th className="w-[60px] px-3 py-2.5 text-right">
                <button
                  onClick={() => pickSort("level")}
                  className={cn("inline-flex items-center gap-0.5 text-[14px] font-extrabold transition-colors", sortKey === "level" ? "" : "text-white/70 hover:text-white")}
                  style={sortKey === "level" ? { color } : undefined}
                >
                  Lv
                  {sortKey === "level" ? (dir === "desc" ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />) : <span className="w-3.5" />}
                </button>
              </th>
              {columns.map((c) => {
                const on = c.k === sortKey;
                return (
                  <th key={c.k} className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => pickSort(c.k)}
                      className={cn("inline-flex items-center gap-0.5 whitespace-nowrap text-[14px] font-extrabold transition-colors", on ? "text-white" : "text-white/70 hover:text-white")}
                      style={on ? { color } : undefined}
                    >
                      {c.l}
                      {on ? (dir === "desc" ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />) : <span className="w-3.5" />}
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
                  <td className="sticky left-0 bg-[#0f1118] px-2 py-2 text-center group-hover:bg-[#171a23]" style={top3 ? { boxShadow: `inset 2px 0 0 ${["#f7cd4f", "#c9d3df", "#d89d62"][rank - 1]}` } : undefined}>
                    <span className={cn("inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1 text-[15px] font-black tabular-nums", top3 ? `medal medal-${rank}` : "text-white")}>
                      {rank ?? "-"}
                    </span>
                  </td>
                  <td className="sticky left-12 bg-[#0f1118] px-2 py-2 group-hover:bg-[#171a23]">
                    <div className="flex items-center gap-2">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar} alt="" loading="lazy" className="h-7 w-7 rounded-full border border-white/20 object-cover object-top" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-bold" style={{ borderColor: `${color}66`, color }}>{m.name[0]}</span>
                      )}
                      <div className="flex min-w-0 flex-col leading-tight">
                        <span className="max-w-[180px] truncate text-[15px] font-bold text-white" title={`${m.name} ${m.surname}`}>{m.name} {m.surname}</span>
                        <span className="text-[12.5px] text-white/60">{m.spec ?? "알 수 없음"}</span>
                      </div>
                    </div>
                  </td>
                  <td className={cn("px-3 py-2 pr-[26px] text-right tabular-nums", sortKey === "level" ? "font-extrabold text-white" : "text-white")}>{m.level}</td>
                  {columns.map((c) => {
                    const v = s?.[c.k] ?? null;
                    const on = c.k === sortKey;
                    return (
                      <td key={c.k} className={cn("whitespace-nowrap px-3 py-2 text-right tabular-nums", on ? "font-extrabold" : "text-white")}>
                        {on ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-white/[.08] sm:block">
                              <div className="h-full rounded-full" style={{ width: `${maxOf[c.k] ? ((v ?? 0) / maxOf[c.k]) * 100 : 0}%`, background: color }} />
                            </div>
                            <span>{fmt(c.k, v)}</span>
                          </div>
                        ) : fmt(c.k, v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!view.length && (
              <tr><td colSpan={columns.length + 3} className="py-10 text-center text-[13px] text-white/60">해당 조건의 길드원이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지 */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <PageBtn disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft className="h-4 w-4" /></PageBtn>
          {Array.from({ length: pages }, (_, i) => (
            <PageBtn key={i} active={i === cur} onClick={() => setPage(i)}>{i + 1}</PageBtn>
          ))}
          <PageBtn disabled={cur === pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight className="h-4 w-4" /></PageBtn>
        </div>
      )}
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-white/[.03] p-2">
      <div className="px-0.5 text-[11px] font-extrabold tracking-[1.2px] text-white/70">{title}</div>
      <div className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">{children}</div>
    </div>
  );
}

function PageBtn({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] font-bold tabular-nums transition-colors disabled:opacity-30",
        active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/[.08] hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
