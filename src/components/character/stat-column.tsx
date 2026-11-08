"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/components/common/use-mounted";
import { classColor, num, type CharacterDetail } from "@/lib/wow";
import { fmtStat, statPages, type StatDef } from "@/lib/stats-config";

type Mode = "effective" | "base";

/** WEB_PROJECT .stats-section-title */
function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <span className="truncate text-[12px] font-extrabold uppercase tracking-[1.5px] text-tx1">{children}</span>
      {right}
    </div>
  );
}

/** WEB_PROJECT .stat-card */
function Card({ label, value, sub, delay = 0 }: { label: string; value: string; sub?: React.ReactNode; delay?: number }) {
  return (
    <div className="anim-count rounded-[5px] border border-line bg-bg3 px-2.5 py-2" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-0.5 truncate text-[12px] font-bold tracking-[1px] text-tx2">{label}</div>
      <div className="text-[20px] font-extrabold tracking-[-.5px] text-tx">{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-tx3">{sub}</div>}
    </div>
  );
}

/**
 * 막대 스케일 그룹 — 길드 비교 없이, 같은 탭 안에서 단위가 비슷한 항목끼리 최댓값 기준
 * (생명력처럼 큰 값이 민첩 같은 작은 값을 눌러버리지 않도록 분리)
 */
const POOL_KEYS = new Set(["health", "power", "armor_effective", "bonus_armor"]);
export const scaleGroup = (d: StatDef) => (d.f === "pct" ? "pct" : d.f === "dps" ? "dps" : POOL_KEYS.has(d.k) ? "pool" : "attr");

/**
 * WEB_PROJECT .stat-row: 라벨 | 막대 | 값 | 증가분
 * 최종 모드: [기본 구간(직업색)] + [장비·버프 증가 구간(초록)]
 * 기본 모드: 기본 구간만 (같은 스케일이라 줄어든 만큼이 장비·버프 효과)
 */
function StatRow({ def, c, mode, color, max, on }: { def: StatDef; c: CharacterDetail; mode: Mode; color: string; max: number; on: boolean }) {
  const eff = num(c.stats, def.k);
  const base = def.baseKey ? num(c.stats, def.baseKey) : null;
  const split = base != null && eff != null;
  const v = mode === "base" && split ? base : eff;
  const diff = split ? eff! - base! : 0;
  const w = (n: number | null) => (on && n != null && max > 0 ? Math.max(0, Math.min(100, (n / max) * 100)) : 0);

  // 최종 모드에서 기본·증가 구간 분리 (감소(디버프)면 최종값만)
  const baseW = mode === "effective" && split && diff > 0 ? w(base) : w(v);
  const bonusW = mode === "effective" && split && diff > 0 ? w(eff) - w(base) : 0;

  return (
    <div className="mb-[9px] flex items-center gap-2 last:mb-0">
      <span className="w-[86px] shrink-0 truncate text-[13px] font-bold text-tx2">{def.l}</span>
      <div className="stat-bar flex">
        <div className="stat-bar-fill shrink-0" style={{ width: `${baseW}%`, background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: bonusW > 0 ? "4px 0 0 4px" : undefined }} />
        <div
          className="stat-bar-fill shrink-0"
          style={{ width: `${bonusW}%`, background: "linear-gradient(90deg, #3d9a5c, #5fd68a)", borderRadius: "0 4px 4px 0" }}
        />
      </div>
      <span className="w-[58px] shrink-0 text-right text-[15px] font-bold tabular-nums" style={{ color: v ? "var(--text)" : "var(--text3)" }}>
        {fmtStat(v, def.f)}
      </span>
      <span className="w-[42px] shrink-0 text-right text-[11px] font-bold tabular-nums">
        {mode === "effective" && diff > 0 && <span className="text-[var(--green)]">+{fmtStat(diff, def.f)}</span>}
        {mode === "effective" && diff < 0 && <span className="text-[var(--red)]">{fmtStat(diff, def.f)}</span>}
      </span>
    </div>
  );
}

/** ❯ 기본 수치 | 최종 수치 */
function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex shrink-0 items-center rounded-md border border-line2 bg-bg3 p-0.5 text-[11px] font-bold">
      {(["base", "effective"] as const).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={cn("flex items-center gap-0.5 rounded px-1.5 py-[3px] transition-colors", mode === m ? "bg-white/10 text-tx1" : "text-tx3 hover:text-tx2")}
        >
          {mode === m && <ChevronRight className="h-3 w-3" />}
          {m === "base" ? "기본 수치" : "최종 수치"}
        </button>
      ))}
    </div>
  );
}

/** 좌우로 넘기는 능력치 페이지 (화살표 · 점 · 스와이프 · 좌우 방향키) */
function StatPager({ c }: { c: CharacterDetail }) {
  const pages = statPages(c.classId);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<Mode>("effective");
  const col = classColor(c.classId);
  const on = useMounted(c.id);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const [h, setH] = useState<number | undefined>();
  const drag = useRef<number | null>(null);

  useLayoutEffect(() => { setH(refs.current[idx]?.offsetHeight); }, [idx, c.id, mode]);
  const go = (d: number) => setIdx((i) => (i + d + pages.length) % pages.length);
  const page = pages[idx];

  return (
    <section
      className="border-b border-line px-3 py-3.5 outline-none"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}
    >
      <SectionTitle right={<ModeToggle mode={mode} onChange={setMode} />}>
        <span key={page.key} className="anim-fade inline-block">
          {page.title}
          {idx === 0 && <span style={{ color: col }}> · {c.className}</span>}
        </span>
      </SectionTitle>

      {/* 페이지 탭 (점 대신 이름 칩) */}
      <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
        {pages.map((p, i) => (
          <button
            key={p.key}
            onClick={() => setIdx(i)}
            className={cn(
              "shrink-0 rounded-full border px-2 py-[2px] text-[10.5px] font-bold transition-colors",
              i === idx ? "text-[#0a0b12]" : "border-line2 text-tx3 hover:text-tx2"
            )}
            style={i === idx ? { background: col, borderColor: col } : undefined}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div
        className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]"
        style={{ height: h }}
        onPointerDown={(e) => { drag.current = e.clientX; }}
        onPointerUp={(e) => {
          if (drag.current == null) return;
          const dx = e.clientX - drag.current; drag.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <div
          className="flex items-start transition-transform duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)]"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {pages.map((p, i) => {
            // 탭 안 그룹별 최댓값 (최종값 기준 → 기본 모드에서 줄어드는 만큼이 장비·버프 효과)
            const gmax: Record<string, number> = {};
            for (const d of p.defs) {
              const g = scaleGroup(d), e = num(c.stats, d.k) ?? 0, b = d.baseKey ? num(c.stats, d.baseKey) ?? 0 : 0;
              gmax[g] = Math.max(gmax[g] ?? 0, e, b);
            }
            return (
              <div key={p.key} ref={(el) => { refs.current[i] = el; }} className="w-full shrink-0" aria-hidden={i !== idx}>
                {p.defs.map((d) => (
                  <StatRow key={d.k} def={d} c={c} mode={mode} color={i === 0 ? col : d.c} max={gmax[scaleGroup(d)] ?? 0} on={on} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {/* 기본 / 최종 설명 — 현재 모드만 밝게 */}
      <div className="mt-3 space-y-1 rounded-md border border-line bg-white/[.02] px-2.5 py-2 text-[11px] leading-snug">
        <div className={cn("flex items-start gap-2 transition-opacity", mode === "base" ? "opacity-100" : "opacity-45")}>
          <span className="mt-[3px] h-1.5 w-3 shrink-0 rounded-full" style={{ background: `linear-gradient(90deg, ${col}66, ${col})` }} />
          <span className="w-[52px] shrink-0 font-bold text-tx1">기본 수치</span>
          <span className="text-tx2">종족·레벨로 정해진 값 (장비·버프 제외)</span>
        </div>
        <div className={cn("flex items-start gap-2 transition-opacity", mode === "effective" ? "opacity-100" : "opacity-45")}>
          <span className="mt-[3px] h-1.5 w-3 shrink-0 rounded-full bg-gradient-to-r from-[#3d9a5c] to-[#5fd68a]" />
          <span className="w-[52px] shrink-0 font-bold text-tx1">최종 수치</span>
          <span className="text-tx2">기본 수치에 장비·버프를 더한 값 <span className="text-[var(--green)]">(초록 = 늘어난 양)</span></span>
        </div>
      </div>
    </section>
  );
}

export function StatColumn({ c }: { c?: CharacterDetail }) {
  if (!c?.stats) {
    return (
      <div className="glass-panel min-w-0">
        <PanelHd />
        <div className="p-3"><Empty /></div>
      </div>
    );
  }
  const s = c.stats;
  const caster = [5, 8, 9].includes(c.classId);
  const hp = num(s, "health"), pw = num(s, "power"), main = num(s, caster ? "spell_power" : "attack_power"), ar = num(s, "armor_effective");
  const armorBonus = (num(s, "armor_effective") ?? 0) - (num(s, "armor_base") ?? 0);

  return (
    <div className="glass-panel no-scrollbar min-w-0 overflow-y-auto">
      <PanelHd />

      <section className="border-b border-line px-3 py-3.5">
        <div className="grid grid-cols-2 gap-[5px]">
          <Card label="생명력" value={fmtStat(hp)} />
          <Card label={String(s.power_type ?? "자원")} value={fmtStat(pw)} delay={40} />
          <Card label={caster ? "주문력" : "전투력"} value={fmtStat(main)} delay={80} />
          <Card label="방어도" value={fmtStat(ar)} delay={120}
            sub={armorBonus > 0 ? <span className="text-[var(--green)]">+{armorBonus}</span> : undefined} />
        </div>
      </section>

      {!caster && (
        <section className="border-b border-line px-3 py-3.5">
          <SectionTitle>Weapon</SectionTitle>
          <div className="grid grid-cols-2 gap-[5px]">
            {(["main_hand", "off_hand"] as const).map((k, i) => {
              const dps = num(s, `${k}_dps`), mn = num(s, `${k}_damage_min`), mx = num(s, `${k}_damage_max`), sp = num(s, `${k}_speed`);
              return (
                <div key={k} className="anim-count rounded-[5px] border border-line bg-bg3 px-2.5 py-2" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="text-[11px] font-bold uppercase tracking-[1px] text-tx3">{k === "main_hand" ? "Main Hand" : "Off Hand"}</div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[24px] font-extrabold tracking-[-.5px] text-[#ffa53a]">{dps ? dps.toFixed(1) : "—"}</span>
                    <span className="text-[11px] font-bold text-tx3">DPS</span>
                  </div>
                  <div className="text-[12px] text-tx3">{dps ? `${Math.round(mn ?? 0)}~${Math.round(mx ?? 0)} · ${sp}s` : "미착용"}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <StatPager key={c.id} c={c} />

    </div>
  );
}

function PanelHd() {
  return (
    <div className="flex h-10 items-center gap-1 border-b border-line px-4 text-[13px] font-extrabold text-tx1">
      능력치 <HelpCircle className="h-3 w-3 text-tx3" />
    </div>
  );
}

export function Empty({ text = "캐릭터 데이터 없음 (API 미조회)" }: { text?: string }) {
  return (
    <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line2 text-[12px] text-tx3">
      {text}
    </div>
  );
}
