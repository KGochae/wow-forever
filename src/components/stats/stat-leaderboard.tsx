"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { byClassName, CLASS_INFO, RANK_COLOR, specsOf, timeAgo, type Member } from "@/lib/wow";
import { cn } from "@/lib/utils";
import type { RankStats } from "@/lib/use-rank-data";
import { RankMark } from "@/components/common/rank-mark";

/**
 * 직업별 스탯 리더보드 (WEB_PROJECT stats.js stRenderClassTable 구성)
 * - 값: 로그아웃 시점 최종수치 (장비·특성 포함)
 * - 컬럼: 직업별 주요 스탯 (첫 컬럼 = 기본 정렬) · 헤더 클릭 정렬 · 공동 순위 · 30명/페이지
 * - 크기: 고정 px 대신 text-fl-* (화면 폭 비례) + em 단위 여백/아바타 → 화면이 커지면 표 전체가 같이 커짐
 * - 필터: 모바일·태블릿 = 위쪽 가로 칩 / 데스크톱(lg↑) = 왼쪽 세로 사이드 (스크롤해도 따라옴)
 * - 연출 (WEB_PROJECT stRowSlideIn): 직업·특성·정렬·페이지가 바뀔 때마다 행이 아래→위로 순차 등장
 *   + 열별 최고값 = 직업 색 강조 / "기준" 열 = 마지막 접속 시각 (rank.json last_login)
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

/** 클래스 "전체" 보기 — 모든 직업에 공통으로 의미 있는 스탯 */
const ALL_COLS = cols("health", "power", "attack_power", "spell_power", "spell_healing", "melee_crit", "spell_crit", "armor_effective", "stamina_effective");

const PCT = new Set(["dodge", "parry", "block", "melee_crit", "ranged_crit", "spell_crit"]);
const fmt = (k: string, v: number | null | undefined) => {
  if (v == null) return "-";
  if (PCT.has(k)) return `${v.toFixed(1)}%`;
  if (k.endsWith("_dps")) return v.toFixed(1);
  return Math.round(v).toLocaleString();
};

const PAGE = 30;
const CLASS_ORDER = [1, 2, 3, 4, 5, 7, 8, 9, 11].sort(byClassName); // 이름순

/* 고정 열(순위·캐릭터) — th/td 모두 같은 글자 크기(text-fl-base)라 em 기준 위치가 일치 */
const RANK_W = "w-[3.4em] min-w-[3.4em]";
const NAME_LEFT = "left-[3.4em]";
const CELL = "px-[.8em] py-[.55em]";

export function StatLeaderboard({ members, stats, onPick }: { members: Member[]; stats: RankStats; onPick: (m: Member) => void }) {
  // 등급 필터 (복수 선택 · 비어 있으면 전체) — 클래스 인원수·표 모두 이 등급 안에서 계산 · 길드장(0)은 필터 없이 항상 포함
  const [rk, setRk] = useState<Set<number>>(() => new Set());
  const rankCounts = useMemo(() => {
    const c = new Map<number, number>();
    members.forEach((m) => stats.has(m.id) && c.set(m.rank, (c.get(m.rank) ?? 0) + 1));
    return c;
  }, [members, stats]);
  const ranks = [...rankCounts.keys()].filter((r) => r !== 0).sort((a, b) => a - b);
  const pool = useMemo(() => members.filter((m) => stats.has(m.id) && (rk.size === 0 || rk.has(m.rank) || m.rank === 0)), [members, stats, rk]);
  const counts = useMemo(() => {
    const c = new Map<number, number>();
    pool.forEach((m) => c.set(m.classId, (c.get(m.classId) ?? 0) + 1));
    return c;
  }, [pool]);
  const classes = CLASS_ORDER.filter((id) => counts.get(id));

  const [clsPick, setCls] = useState<number | "all">("all");
  const cls: number | "all" = clsPick !== "all" && classes.includes(clsPick) ? clsPick : "all"; // 고른 등급에 그 직업이 없으면 전체로
  const all = cls === "all";
  const [spec, setSpec] = useState("all");
  const [sort, setSort] = useState<{ k: string; dir: "desc" | "asc" } | null>(null);
  const [page, setPage] = useState(0);

  const columns = all ? ALL_COLS : CLASS_COLS[cls] ?? [];
  const sortKey = sort?.k ?? "level"; // 기본 정렬: 레벨
  const dir = sort?.dir ?? "desc";
  const specs = all ? [] : specsOf(cls);
  const inClass = all ? pool : pool.filter((m) => m.classId === cls);
  const hasUnknown = !all && inClass.some((m) => !m.spec || !specs.includes(m.spec));
  // 특성별 인원 (all = 직업 전체, none = 특성 정보 없음)
  const specCount = (k: string) =>
    k === "all" ? inClass.length : inClass.filter((m) => (k === "none" ? !m.spec || !specs.includes(m.spec) : m.spec === k)).length;

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
  const color = all ? "#f5c542" : CLASS_INFO[cls]?.color ?? "#aaa"; // 전체 = 골드 강조
  // 열별 최고값 (현재 필터 전체 기준, 페이지 무관)
  const maxOf = useMemo(() => {
    const o: Record<string, number> = {};
    columns.forEach((c) => {
      const vals = rows.map(({ m }) => stats.get(m.id)?.[c.k]).filter((v): v is number => v != null && v > 0);
      if (vals.length > 1) o[c.k] = Math.max(...vals);
    });
    return o;
  }, [rows, columns, stats]);
  const animKey = `${[...rk].sort().join()}|${cls}|${spec}|${sortKey}|${dir}|${cur}`; // 바뀌면 행 애니메이션 다시 재생
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [animKey]); // 조건이 바뀌면 표 맨 위로

  // 가로 스크롤 상태 — 열이 많아 넘칠 때만 좌우 버튼·오른쪽 흐림 표시
  // 위쪽 가로 스크롤바(topRef)와 표(scrollRef)의 가로 위치를 서로 맞춤
  const topRef = useRef<HTMLDivElement>(null);
  const [hx, setHx] = useState({ over: false, left: false, right: false, max: 0 });
  const syncX = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (topRef.current && Math.abs(topRef.current.scrollLeft - el.scrollLeft) > 1) topRef.current.scrollLeft = el.scrollLeft;
    const next = { over: max > 2, left: el.scrollLeft > 2, right: el.scrollLeft < max - 2, max };
    setHx((p) => (p.over === next.over && p.left === next.left && p.right === next.right && p.max === next.max ? p : next));
  };
  const onTopScroll = () => {
    const t = topRef.current, el = scrollRef.current;
    if (t && el && Math.abs(el.scrollLeft - t.scrollLeft) > 1) el.scrollLeft = t.scrollLeft;
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    syncX();
    const ro = new ResizeObserver(syncX);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [cls]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickClass = (id: number | "all") => { setCls(id); setSpec("all"); setSort(null); setPage(0); };
  const pickRank = (r: number | "all") => {
    setRk((prev) => {
      if (r === "all") return new Set();
      const n = new Set(prev);
      if (n.has(r)) n.delete(r); else n.add(r);
      return n.size === ranks.length ? new Set() : n; // 전부 고르면 = 전체
    });
    setSpec("all"); setPage(0);
  };
  const pickSort = (k: string) => {
    setSort((s) => (s?.k === k || (!s && k === "level") ? { k, dir: dir === "desc" ? "asc" : "desc" } : { k, dir: "desc" }));
    setPage(0);
  };
  const Arrow = ({ on }: { on: boolean }) =>
    on ? (dir === "desc" ? <ChevronDown className="h-[.9em] w-[.9em]" /> : <ChevronUp className="h-[.9em] w-[.9em]" />) : null;

  return (
    <div className="flex flex-col gap-[clamp(10px,1vw,18px)] lg:flex-row lg:items-stretch">
      {/* 필터: 모바일 = 위쪽 가로 칩 / lg↑ = 왼쪽 세로 사이드 — 이 사이드 높이가 곧 표 높이 */}
      <aside className="flex flex-col gap-[clamp(6px,.6vw,10px)] lg:w-[clamp(120px,7.5vw,150px)] lg:shrink-0 lg:gap-[clamp(14px,1.2vw,22px)]">
        <ChipRow title="클래스" alignRank>
          <Chip on={all} color="#f5c542" onClick={() => pickClass("all")} strong count={pool.length}>
            전체
          </Chip>
          {classes.map((id) => {
            const c = CLASS_INFO[id];
            return (
              <Chip key={id} on={id === cls} color={c.color} onClick={() => pickClass(id)} strong count={counts.get(id)}>
                {c.name}
              </Chip>
            );
          })}
        </ChipRow>
        {!all && <ChipRow title="특성" key={cls}>
          {[{ k: "all", l: "전체" }, ...specs.map((s) => ({ k: s, l: s })), ...(hasUnknown ? [{ k: "none", l: "알 수 없음" }] : [])].map(({ k, l }) => (
            <Chip key={k} on={spec === k} color={color} count={specCount(k)} onClick={() => { setSpec(k); setPage(0); }}>
              {l}
            </Chip>
          ))}
        </ChipRow>}
      </aside>

      {/* lg↑: 표 영역은 absolute → 높이는 사이드 필터에 맞추고, 행은 안에서 세로 스크롤 (머리글 고정) */}
      <div className="relative min-w-0 flex-1 lg:min-h-[clamp(560px,40vw,860px)]">
      <div className="flex flex-col gap-[clamp(10px,1vw,18px)] lg:absolute lg:inset-0">

      {/* 등급 필터 — 표 위 가로 한 줄 (아이콘 호버 시 등급 이름) */}
      <div className="flex shrink-0 flex-wrap items-center gap-[.35em] text-fl-sm">
        <span className="mr-[.35em] text-[.82em] font-extrabold tracking-[1.2px] text-white/60">등급</span>
        <RankChip on={rk.size === 0} color="#ffffff" onClick={() => pickRank("all")}>
          전체
        </RankChip>
        {ranks.map((r) => (
          <RankChip key={r} on={rk.has(r)} color={RANK_COLOR[r] ?? "#f5c542"} onClick={() => pickRank(r)}>
            <RankMark rank={r} />
          </RankChip>
        ))}
      </div>

      {/* 열이 넘칠 때: 표 위쪽 작은 가로 스크롤바 (표 폭 + 넘친 만큼의 빈 칸 → 표와 같은 비율로 연동) */}
      {hx.over && (
        <div ref={topRef} onScroll={onTopScroll} className="top-scroll -mb-[clamp(6px,.6vw,12px)] shrink-0 overflow-x-auto overflow-y-hidden">
          <div className="h-px" style={{ width: `calc(100% + ${hx.max}px)` }} />
        </div>
      )}

      {/* 표 (+ 오른쪽에 더 있으면 흐림) */}
      <div className="relative flex min-h-0 flex-col lg:flex-1">
      {hx.right && <div className="pointer-events-none absolute inset-y-0 right-0 z-[4] w-[clamp(28px,4vw,64px)] rounded-r-lg bg-gradient-to-l from-[#0b0d13] to-transparent" />}
      <div ref={scrollRef} onScroll={syncX} className="table-scroll no-hbar overflow-x-auto rounded-lg border border-white/[.06] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <table className="w-full border-collapse text-fl-base text-white">
          <thead>
            <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:bg-[#11131b] [&>th]:shadow-[inset_0_-1px_0_rgba(255,255,255,.1)]">
              <th className={cn("left-0 z-[3] text-center font-bold text-white", RANK_W, CELL)}>
                <span className="text-[.88em]">순위</span>
              </th>
              <th className={cn("z-[3] text-left font-bold text-white", NAME_LEFT, CELL)}>
                <span className="text-[.88em]">캐릭터</span>
              </th>
              <th className={cn("z-[2] whitespace-nowrap text-center font-bold text-white", CELL)}>
                <span className="text-[.88em]">등급</span>
              </th>
              <th className={cn("z-[2] whitespace-nowrap text-center font-bold text-white", CELL)}>
                <span className="text-[.88em]">기준</span>
              </th>
              {[{ k: "level", l: "Lv" }, ...columns].map((c) => {
                const on = c.k === sortKey;
                return (
                  <th key={c.k} className={cn("z-[2] text-center", CELL)}>
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
          <tbody key={animKey}>
            {view.map(({ m, rank }, i) => {
              const s = stats.get(m.id);
              const mc = CLASS_INFO[m.classId]?.color ?? color; // 이 길드원 직업 색 (전체 보기에서 직업 표시)
              const top3 = rank != null && rank <= 3 && dir === "desc";
              return (
                <tr
                  key={m.id}
                  onClick={() => onPick(m)}
                  className="group cursor-pointer border-b border-white/[.04] transition-colors hover:bg-white/[.05] motion-safe:animate-[stRowSlideIn_.8s_ease_both]"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <td className={cn("sticky left-0 bg-[#0f1118] text-center group-hover:bg-[#171a23]", RANK_W, CELL)}>
                    <span className={cn("inline-flex h-[1.9em] min-w-[1.9em] items-center justify-center px-[.25em] font-black tabular-nums", top3 ? `podium-${rank} podium-num text-[1.12em]` : "text-white" /* 1·2·3위 = 금·은·동 글자 */)}>
                      {rank ?? "-"}
                    </span>
                  </td>
                  <td className={cn("sticky bg-[#0f1118] group-hover:bg-[#171a23]", NAME_LEFT, CELL)}>
                    <div className="flex items-center gap-[.6em]">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatar} alt="" loading="lazy" className="h-[2.1em] w-[2.1em] shrink-0 rounded-full border border-white/20 object-cover object-top" />
                      ) : (
                        <span className="flex h-[2.1em] w-[2.1em] shrink-0 items-center justify-center rounded-full border text-[.85em] font-bold" style={{ borderColor: `${mc}66`, color: mc }}>{m.name[0]}</span>
                      )}
                      <div className="flex min-w-0 flex-col leading-tight">
                        <span className="max-w-[7.5em] truncate whitespace-nowrap font-bold text-white md:max-w-none md:overflow-visible" title={`${m.name} ${m.surname}`}>{m.name} {m.surname}</span>
                        <span className="text-[.8em] text-white/60">
                          {all && <span className="font-bold" style={{ color: mc }}>{CLASS_INFO[m.classId]?.name} · </span>}
                          {m.spec ?? "알 수 없음"}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* 등급 아이콘 — 호버 시 등급 이름 */}
                  <td className={cn("text-center", CELL)}>
                    <RankMark rank={m.rank} />
                  </td>
                  <td className={cn("whitespace-nowrap text-center text-[.78em] leading-[1.6] text-white/45", CELL)}>
                    {s?.last_login ? timeAgo(s.last_login) : "-"}
                  </td>
                  <td className={cn("text-center tabular-nums text-white", CELL, sortKey === "level" && "font-extrabold")}>
                    {m.level}
                  </td>
                  {columns.map((c) => {
                    const on = c.k === sortKey;
                    const v = s?.[c.k] ?? null;
                    const isMax = v != null && v === maxOf[c.k]; // 열 최고값 = 직업 색 강조 (WEB_PROJECT)
                    return (
                      <td
                        key={c.k}
                        className={cn("whitespace-nowrap text-center tabular-nums text-white", CELL, on && "bg-white/[.03] font-extrabold", isMax && "font-extrabold")}
                        style={isMax ? { color, backgroundColor: `${color}18`, outline: `1px solid ${color}33`, outlineOffset: "-1px" } : undefined}
                      >
                        {fmt(c.k, v)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {!view.length && (
              <tr><td colSpan={columns.length + 5} className="py-10 text-center text-fl-sm text-white/60">해당 조건의 길드원이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </div>

      {/* 페이지 */}
      {pages > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-1 text-fl-sm">
          <PageBtn disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronLeft className="h-[1.1em] w-[1.1em]" /></PageBtn>
          {Array.from({ length: pages }, (_, i) => (
            <PageBtn key={i} active={i === cur} onClick={() => setPage(i)}>{i + 1}</PageBtn>
          ))}
          <PageBtn disabled={cur === pages - 1} onClick={() => setPage(cur + 1)}><ChevronRight className="h-[1.1em] w-[1.1em]" /></PageBtn>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

/** alignRank: lg↑에서 제목을 오른쪽 "등급" 줄(칩 높이 ≈ 2.71em)과 같은 높이·세로 가운데로 → 두 제목이 한 줄에 맞음 */
function ChipRow({ title, alignRank, children }: { title: string; alignRank?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-[.75em] text-fl-sm lg:flex-col lg:gap-[.5em]">
      <span className={cn("shrink-0 pt-[.45em] text-[.82em] font-extrabold tracking-[1.2px] text-white/60 lg:pt-0", alignRank && "lg:-mb-[.3em] lg:flex lg:h-[2.713em] lg:items-center")}>{title}</span>
      <div className="flex flex-wrap gap-[.35em] lg:w-full lg:flex-col lg:gap-[.3em]">{children}</div>
    </div>
  );
}

/** 선택 전 칩: 마우스를 올리면 테마 색(직업·특성·등급)으로 미리 보기 */
const hoverTint = (color: string) => ({ "--c": color, "--cb": `${color}14` }) as React.CSSProperties;
const HOVER_TINT = "border-white/15 text-white hover:border-[var(--c)] hover:bg-[var(--cb)] hover:text-[var(--c)]";

function Chip({ on, color, strong, count, onClick, children }: { on: boolean; color: string; strong?: boolean; count?: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={on ? { color, borderColor: color, backgroundColor: `${color}24` } : hoverTint(color)}
      className={cn(
        "rounded-md border px-[.85em] py-[.35em] text-center transition-colors lg:flex lg:w-full lg:items-center lg:justify-between lg:py-[.45em] lg:text-left",
        strong ? "font-extrabold" : "font-bold",
        !on && HOVER_TINT
      )}
    >
      {children}
      {count != null && <span className="ml-[.45em] text-[.85em] font-semibold tabular-nums opacity-60 lg:ml-0">{count}</span>}
    </button>
  );
}

/** 등급 칩 — 표 위 가로 줄용 (아이콘만 · 복수 선택 토글) */
function RankChip({ on, color, onClick, children }: { on: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={on ? { color, borderColor: color, backgroundColor: `${color}24` } : hoverTint(color)}
      className={cn(
        "inline-flex items-center gap-[.45em] whitespace-nowrap rounded-md border px-[.65em] py-[.3em] font-bold transition-colors",
        !on && HOVER_TINT
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
