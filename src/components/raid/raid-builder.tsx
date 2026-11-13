"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Link2, RotateCcw, Users, X } from "lucide-react";
import type { Member } from "@/lib/wow";
import { cn } from "@/lib/utils";
import {
  RAID_SIZE, ROLE_GROUPS, ROLE_GROUP_INFO, defaultSpecKey, evaluate, roleGroup, slotRole,
  type Groups, type RaidSlot, type RoleGroup,
} from "@/lib/raid-synergy";
import { decodeComp, emptyGroups, encodeComp, fromSlots, loadDraft, toSlots, writeDraft, type SavedComp } from "@/lib/raid-comp";
import { RaidPool } from "./raid-pool";
import { RaidGroup, type Pos } from "./raid-group";
import { RaidSynergyPanel } from "./raid-synergy-panel";
import { RaidSavePanel } from "./raid-save-panel";

interface Props {
  members: Member[];
  ranks: number[];
  rankLabel: (r: number) => string;
  /** 공유 링크로 들어온 구성 (?comp=…) */
  compParam: string | null;
  /** 모바일·태블릿 멤버 패널 (상단바 "길드원" 버튼과 공유) */
  drawer: boolean;
  setDrawer: (v: boolean) => void;
}

type Drag = { id: number; from: Pos | null } | null;
type Panel = "synergy" | "save" | null;

/**
 * 25인 레이드 구성 — WEB_PROJECT 레이드 빌더(.rb-layout) 구성 그대로
 *  왼쪽: 레이드 멤버(.rb-pool-col) / 가운데: 제목·인원·버튼, 파티 카드 2열(.rb-groups-grid, 카드 최대 520px)
 *  오른쪽: "공대 스킬 요약"(처음부터 열림)·"공대 저장 및 불러오기" 패널(.rb-save-col)
 * 반응형
 *  - lg 미만: 레이드 멤버는 왼쪽에서 밀려 나오는 패널(상단바 "길드원"), 오른쪽 패널은 화면 전체
 *  - 파티 카드 열 수는 남은 폭에 맞춰 자동(auto-fill) — 사이드바·스킬 요약을 접으면 빈 공간으로 이동
 *  - 조작: 끌어서 놓기(마우스) · 칸 누르고 길드원 고르기(터치) · 칸 두 개를 차례로 누르면 자리 바꾸기
 */
export function RaidBuilder({ members, ranks, rankLabel, compParam, drawer, setDrawer }: Props) {
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [groups, setGroups] = useState<Groups>(emptyGroups);
  const [specs, setSpecs] = useState<Record<number, string>>({}); // 목록에서 바꾼 특성 (배치 전)
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<Pos | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // 오른쪽 "공대 스킬 요약"은 처음부터 열림 (lg 미만은 화면을 덮으므로 닫힌 채 시작)
  const [panel, setPanel] = useState<Panel>(null);
  useEffect(() => { if (window.matchMedia("(min-width: 1024px)").matches) setPanel("synergy"); }, []);
  const [activeComp, setActiveComp] = useState<SavedComp | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const drag = useRef<Drag>(null);
  const [dragging, setDragging] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  useFlip(gridRef);

  // 처음: 공유 링크 → 없으면 이 기기에 남은 작업
  useEffect(() => {
    if (ready || !members.length) return;
    setGroups(fromSlots(compParam ? decodeComp(compParam) : loadDraft(), byId));
    setReady(true);
  }, [members, ready, compParam, byId]);
  useEffect(() => { if (ready) writeDraft(toSlots(groups)); }, [groups, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setTarget(null), setDrawer(false), setPanel(null));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDrawer]);
  useEffect(() => {
    const end = () => { drag.current = null; setDragging(false); };
    window.addEventListener("dragend", end);
    return () => window.removeEventListener("dragend", end);
  }, []);

  const states = useMemo(() => evaluate(groups), [groups]);
  const slotOf = useMemo(() => {
    const m = new Map<number, { pos: Pos; slot: RaidSlot }>();
    groups.forEach((g, gi) => g.forEach((s, si) => s && m.set(s.member.id, { pos: [gi, si], slot: s })));
    return m;
  }, [groups]);
  const assigned = useMemo(() => new Map([...slotOf].map(([id, v]) => [id, v.pos[0]])), [slotOf]);
  const specOf = (m: Member) => slotOf.get(m.id)?.slot.specKey ?? specs[m.id] ?? defaultSpecKey(m);

  // ── 조작 ──
  const update = (f: (g: Groups) => void) =>
    setGroups((prev) => {
      const g = prev.map((r) => [...r]);
      f(g);
      return g;
    });
  /** 길드원을 칸에 넣기 (이미 다른 칸에 있으면 자리 바꾸기) */
  const place = (m: Member, [gi, si]: Pos) =>
    update((g) => {
      const from = slotOf.get(m.id)?.pos;
      const slot: RaidSlot = from ? g[from[0]][from[1]]! : { member: m, specKey: specOf(m) };
      const occupant = g[gi][si];
      if (from) g[from[0]][from[1]] = occupant;
      g[gi][si] = slot;
    });
  const swap = (a: Pos, b: Pos) =>
    update((g) => {
      const t = g[a[0]][a[1]];
      g[a[0]][a[1]] = g[b[0]][b[1]];
      g[b[0]][b[1]] = t;
    });
  const remove = ([gi, si]: Pos) => update((g) => { g[gi][si] = null; });
  const setSpec = (m: Member, key: string) => {
    setSpecs((p) => ({ ...p, [m.id]: key }));
    const at = slotOf.get(m.id)?.pos;
    if (at) update((g) => { g[at[0]][at[1]] = { member: m, specKey: key }; });
  };

  const firstEmpty = (): Pos | null => {
    for (let gi = 0; gi < groups.length; gi++) {
      const si = groups[gi].findIndex((s) => !s);
      if (si >= 0) return [gi, si];
    }
    return null;
  };

  const onPoolPick = (m: Member) => {
    if (target) {
      place(m, target);
      setTarget(null);
      setDrawer(false);
      return;
    }
    const at = assigned.get(m.id);
    if (at != null) return setToast(`${m.name} · 이미 파티 ${at + 1}에 있습니다`);
    const p = firstEmpty();
    if (!p) return setToast("25칸이 모두 찼습니다");
    place(m, p);
    setToast(`${m.name} → 파티 ${p[0] + 1}`);
  };

  const onSlotClick = (p: Pos) => {
    const s = groups[p[0]][p[1]];
    if (target) {
      if (target[0] === p[0] && target[1] === p[1]) return setTarget(null);
      if (groups[target[0]][target[1]] || s) { swap(target, p); setTarget(null); return; }
      setTarget(p); // 빈 칸 → 빈 칸: 선택만 옮김
      return;
    }
    setTarget(p);
    if (!s && !window.matchMedia("(min-width: 1024px)").matches) setDrawer(true);
  };

  const onDrop = (p: Pos) => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (d.from) swap(d.from, p);
    else { const m = byId.get(d.id); if (m) place(m, p); }
    setTarget(null);
  };
  const onDropBack = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (d?.from) remove(d.from);
  };

  const clear = () => {
    if (!assigned.size || !confirm("배치한 길드원을 모두 뺄까요?")) return;
    setGroups(emptyGroups());
    setTarget(null);
    setActiveComp(null);
  };
  const copyLink = async () => {
    const url = `${location.origin}/viewer?tab=raid&comp=${encodeComp(groups)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("공유 링크를 복사했습니다");
    } catch {
      prompt("아래 링크를 복사하세요", url);
    }
  };
  const togglePanel = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));

  // ── 집계 ──
  const all = groups.flat().filter(Boolean) as RaidSlot[];
  const roleCount = Object.fromEntries(ROLE_GROUPS.map((r) => [r, 0])) as Record<RoleGroup, number>;
  all.forEach((s) => { const r = roleGroup(slotRole(s)); if (r) roleCount[r]++; });
  const dirty = !!activeComp && JSON.stringify(activeComp.slots) !== JSON.stringify(toSlots(groups));

  const targetFilled = target ? !!groups[target[0]][target[1]] : false;

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      {/* ── 레이드 멤버 (lg 미만: 떠 있는 패널 / lg 이상: 고정, 접기) ── */}
      {drawer && <div className="anim-fade fixed inset-0 z-[65] bg-black/60 lg:hidden" onClick={() => setDrawer(false)} />}
      <aside
        className={cn(
          "shrink-0 overflow-hidden border-r border-white/[.06]",
          "fixed inset-y-0 left-0 z-[70] w-[var(--rb-w)] bg-[rgba(12,14,21,.98)] shadow-[8px_0_40px_rgba(0,0,0,.6)] transition-transform duration-300 ease-[cubic-bezier(.2,.7,.2,1)]",
          drawer ? "translate-x-0" : "-translate-x-full",
          "lg:relative lg:inset-auto lg:z-auto lg:translate-x-0 lg:bg-[var(--glass-bg-subtle)] lg:shadow-none lg:transition-none",
          collapsed ? "lg:w-[46px]" : "lg:w-[var(--rb-w)]"
        )}
        style={{ "--rb-w": "min(94vw, clamp(380px, 24vw, 460px))" } as React.CSSProperties}
      >
        <div className={cn("h-full w-[var(--rb-w)]", collapsed && "lg:pointer-events-none lg:invisible")}>
          <RaidPool
            members={members}
            assigned={assigned}
            ranks={ranks}
            rankLabel={rankLabel}
            specOf={specOf}
            onSpec={setSpec}
            placing={!!target && !targetFilled}
            onPick={onPoolPick}
            onDragMember={(m) => { drag.current = { id: m.id, from: null }; setDragging(true); }}
            onDropBack={onDropBack}
            onCollapse={() => (window.matchMedia("(min-width: 1024px)").matches ? setCollapsed(true) : setDrawer(false))}
          />
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="anim-fade absolute inset-0 hidden w-[46px] flex-col items-center gap-2 pt-[18px] text-tx3 transition-colors hover:text-tx1 lg:flex"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line2 bg-bg3"><ChevronRight className="h-4 w-4" /></span>
            <span className="text-fl-2xs font-bold [writing-mode:vertical-rl]">레이드 멤버</span>
          </button>
        )}
      </aside>

      {/* ── 메인 (WEB_PROJECT .rb-main-col) ── */}
      <main
        className={cn(
          "no-scrollbar flex min-w-0 flex-1 flex-col gap-3.5 overflow-y-auto overflow-x-hidden px-[clamp(12px,1.6vw,36px)] py-[clamp(12px,1vw,20px)] transition-[padding] duration-200",
          panel && "lg:pr-[calc(min(400px,30vw)+16px)]"
        )}
      >
        {/* 제목 · 인원 · 버튼 (.rb-main-hd) */}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2.5">
          <div className="min-w-0">
            <h1 className="text-fl-base font-extrabold tracking-[.6px] text-tx1">25인 레이드 구성</h1>
            <p className="mt-1 text-fl-2xs text-tx3">
              <span className="hidden lg:inline">좌측 멤버를 각 공대 슬롯에 드래그 해 공대 시너지를 확인하세요!</span>
              <span className="lg:hidden">슬롯을 눌러 길드원을 넣고 공대 시너지를 확인하세요!</span>
            </p>
          </div>
          <Counts total={all.length} roles={roleCount} />
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <HdBtn onClick={() => setDrawer(true)} className="lg:hidden" tone="neutral"><Users className="h-[1.1em] w-[1.1em]" />길드원</HdBtn>
            {dirty && <HdBtn onClick={() => setPanel("save")} tone="orange">수정 저장</HdBtn>}
            <HdBtn onClick={() => togglePanel("synergy")} tone="green" active={panel === "synergy"}>공대 스킬 요약</HdBtn>
            <HdBtn onClick={() => togglePanel("save")} tone="blue" active={panel === "save"}>공대 저장 및 불러오기</HdBtn>
            <HdBtn onClick={copyLink} tone="neutral" label="링크 복사"><Link2 className="h-[1.1em] w-[1.1em]" /><span className="hidden xl:inline">링크 복사</span></HdBtn>
            <HdBtn onClick={clear} tone="neutral" label="초기화"><RotateCcw className="h-[1.05em] w-[1.05em]" /><span className="hidden xl:inline">초기화</span></HdBtn>
          </div>
        </div>

        {/* 칸 선택 안내 */}
        {target && (
          <div className="anim-fade sticky top-0 z-20 -mb-1 flex items-center gap-2 rounded-lg border border-white/15 bg-[rgba(22,25,36,.96)] px-3 py-2 text-fl-xs text-tx2 shadow-lg">
            <span className="min-w-0 flex-1">
              <b className="text-white">파티 {target[0] + 1} · 슬롯 {target[1] + 1}</b> 선택됨 —{" "}
              {targetFilled ? "옮길 슬롯을 누르면 자리를 바꿉니다" : <>길드원을 고르세요<span className="hidden lg:inline"> (좌측 목록)</span></>}
            </span>
            {!targetFilled && <button onClick={() => setDrawer(true)} className="shrink-0 rounded border border-white/20 px-2 py-1 font-bold text-white lg:hidden">목록 열기</button>}
            <button onClick={() => setTarget(null)} aria-label="선택 취소" className="shrink-0 rounded p-1 text-tx3 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* 파티 카드 (.rb-groups-grid) — 남은 폭에 들어가는 만큼 열을 채움 (사이드바·스킬 요약을 접으면 빈 공간으로 올라옴)
            열이 바뀌면 카드가 새 자리로 미끄러지듯 이동 (useFlip) */}
        <div>
          <div ref={gridRef} className="relative grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] items-start gap-[clamp(14px,1.6vw,30px)]">
            {groups.map((g, gi) => (
              <RaidGroup
                key={gi}
                gi={gi}
                slots={g}
                target={target}
                dragging={dragging}
                onSlotClick={onSlotClick}
                onDragSlot={(p) => { const s = groups[p[0]][p[1]]; if (s) { drag.current = { id: s.member.id, from: p }; setDragging(true); setTarget(null); } }}
                onDrop={onDrop}
                onRemove={(p) => { remove(p); setTarget(null); }}
                onSpec={(p, k) => { const s = groups[p[0]][p[1]]; if (s) setSpec(s.member, k); }}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ── 오른쪽 패널 (.rb-save-col) ── */}
      {panel && <div className="anim-fade fixed inset-0 z-[65] bg-black/50 lg:hidden" onClick={() => setPanel(null)} />}
      <aside
        aria-hidden={!panel}
        className={cn(
          "fixed inset-y-0 right-0 z-[70] flex w-full flex-col border-l border-[var(--glass-border)] bg-[rgba(16,18,27,.97)] shadow-[-12px_0_40px_rgba(0,0,0,.5)] transition-transform duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)] sm:w-[400px]",
          "lg:absolute lg:z-30 lg:w-[min(400px,30vw)]",
          panel ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line2 px-4 py-3">
          <span className="text-fl-xs font-bold text-tx1">{panel === "save" ? "공대 저장 및 불러오기" : "공대 스킬 요약"}</span>
          <button onClick={() => setPanel(null)} aria-label="닫기" className="rounded p-1 text-tx3 transition-colors hover:bg-white/10 hover:text-tx1"><X className="h-4 w-4" /></button>
        </div>
        {panel === "save" ? (
          <RaidSavePanel
            groups={groups}
            byId={byId}
            activeId={activeComp?.id ?? null}
            onLoad={(g, c) => { setGroups(g); setTarget(null); setActiveComp(c); setToast(`"${c.name}" 불러옴`); }}
            onSaved={(c) => { setActiveComp(c); setToast(`"${c.name}" 저장됨`); }}
          />
        ) : panel === "synergy" ? (
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
            <RaidSynergyPanel states={states} groups={groups} />
          </div>
        ) : null}
      </aside>

      {toast && (
        <div className="anim-up pointer-events-none fixed bottom-10 left-1/2 z-[90] -translate-x-1/2 rounded-lg border border-white/15 bg-[rgba(22,25,36,.96)] px-4 py-2 text-fl-xs font-bold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

/**
 * 그리드 열 수가 바뀌어 카드 자리가 크게 바뀌면(30px↑) 이전 자리에서 새 자리로 이동 애니메이션 (FLIP)
 * 대상: 그리드 안 [data-flip] 요소 · 그리드 폭이 바뀔 때(ResizeObserver)만 확인 · 동작 줄이기 설정이면 생략
 */
function useFlip(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const last = new Map<string, { x: number; y: number }>();
    const measure = (animate: boolean) => {
      el.querySelectorAll<HTMLElement>("[data-flip]").forEach((c) => {
        const k = c.dataset.flip!;
        const now = { x: c.offsetLeft, y: c.offsetTop };
        const prev = last.get(k);
        last.set(k, now);
        if (!animate || reduce || !prev) return;
        const dx = prev.x - now.x, dy = prev.y - now.y;
        if (Math.abs(dx) + Math.abs(dy) < 30) return;
        c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
          duration: 360,
          easing: "cubic-bezier(.2,.7,.2,1)",
        });
      });
    };
    measure(false);
    const ro = new ResizeObserver(() => measure(true));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}

/** 인원 카드 (.rb-cnt-card) — n/25 · 딜 · 힐 · 탱 */
function Counts({ total, roles }: { total: number; roles: Record<RoleGroup, number> }) {
  return (
    <div className="flex items-baseline gap-[5px] rounded-md border border-line2 bg-bg3 px-3 py-[5px] tabular-nums">
      <span className="text-fl-base font-extrabold leading-none text-tx1">{total}<span className="text-[11px] opacity-40">/{RAID_SIZE}</span></span>
      {ROLE_GROUPS.map((r) => (
        <span key={r} className="flex items-baseline gap-[5px]">
          <span className="h-3.5 w-px self-center bg-line2" />
          <span className="text-fl-base font-extrabold leading-none" style={{ color: ROLE_GROUP_INFO[r].color }}>{roles[r]}</span>
          <span className="text-[11px] text-tx3">{ROLE_GROUP_INFO[r].short}</span>
        </span>
      ))}
    </div>
  );
}

const TONE = {
  green: "border-[rgba(123,184,153,.35)] bg-[rgba(20,60,40,.25)] text-[#7bb899] hover:border-[#7bb899] hover:bg-[rgba(20,60,40,.5)] hover:text-[#a8d8b8]",
  blue: "border-[rgba(122,159,212,.4)] bg-[rgba(42,77,122,.25)] text-[#7a9fd4] hover:border-[#7a9fd4] hover:bg-[rgba(42,77,122,.5)] hover:text-[#cfe3ff]",
  orange: "border-[rgba(224,160,80,.45)] bg-[rgba(100,60,10,.3)] text-[#e0a050] hover:border-[#e0a050] hover:bg-[rgba(160,90,20,.45)]",
  neutral: "border-line2 bg-bg3 text-tx2 hover:bg-bg4 hover:text-tx1",
};
const TONE_ACTIVE = { green: "!border-[#7bb899] !bg-[rgba(20,60,40,.55)] !text-[#a8d8b8]", blue: "!border-[#79c0ff] !bg-[rgba(42,77,122,.55)] !text-[#cfe3ff]", orange: "", neutral: "" };

function HdBtn({ onClick, tone, active, label, className, children }: { onClick: () => void; tone: keyof typeof TONE; active?: boolean; label?: string; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn("flex shrink-0 items-center gap-[.35em] rounded-md border px-[1.2em] py-[.55em] text-[11px] font-bold transition-colors sm:text-fl-2xs", TONE[tone], active && TONE_ACTIVE[tone], className)}
    >
      {children}
    </button>
  );
}
