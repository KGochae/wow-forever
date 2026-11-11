"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useItemTooltip } from "@/components/common/item-tooltip";
import { specBg, type CharacterDetail, type TalentNode, type TalentSpecTree } from "@/lib/wow";
import { useClassTalents } from "@/lib/use-guild-data";


// WEB_PROJECT .spec-tree-grid: 4열 × 46px, column-gap 3px, row-gap 14px
const CELL = 46, GX = 10, GY = 14, ROWS = 7, COLS = 4;
const W = COLS * CELL + (COLS - 1) * GX;
const H = ROWS * CELL + (ROWS - 1) * GY;
const cx = (col: number) => col * (CELL + GX) + CELL / 2;
const top = (row: number) => (row - 1) * (CELL + GY);

function NodeTip({ n, rank }: { n: TalentNode; rank: number }) {
  const cur = rank > 0 ? n.ranks[rank - 1] : null;
  const next = rank < n.maxRank ? n.ranks[rank] : null;
  return (
    <div className="text-fl-xs leading-[1.55]">
      <div className="text-fl-base font-extrabold text-tx1">{n.name}</div>
      <div className="mb-1 text-fl-xs font-bold text-gold">레벨 {rank}/{n.maxRank}</div>
      {n.castTime && <div className="text-fl-xs text-tx3">{n.castTime}</div>}
      {cur && <div className="mt-1 text-[#ffd100]">{cur}</div>}
      {next && (
        <>
          <div className="mt-2 text-fl-xs font-bold text-tx2">{rank > 0 ? "다음 레벨:" : ""}</div>
          <div className="text-[#ffd100]/90">{next}</div>
        </>
      )}
      {n.nameKoMissing && <div className="mt-1.5 text-fl-2xs text-tx3">※ 한국어 이름 미제공 (영문 표기)</div>}
    </div>
  );
}

function Node({ n, rank, delay }: { n: TalentNode; rank: number; delay: number }) {
  const tt = useItemTooltip();
  const maxed = rank >= n.maxRank;
  const active = rank > 0;
  return (
    <div
      className="anim-fade absolute"
      style={{ left: n.col * (CELL + GX), top: top(n.row), width: CELL, height: CELL, animationDelay: `${delay}ms` }}
      onMouseEnter={(e) => tt.showNode(`t${n.nodeId}`, <NodeTip n={n} rank={rank} />, e)}
      onMouseMove={tt.move}
      onMouseLeave={tt.hide}
    >
      <div
        className={cn(
          "h-full w-full overflow-hidden rounded border-2 transition-transform duration-100 hover:scale-110",
          maxed ? "border-[#ffd100] shadow-[0_0_8px_rgba(255,209,0,.35)]" : active ? "border-[#1eff00] shadow-[0_0_8px_rgba(30,255,0,.25)]" : "border-white/10"
        )}
      >
        {n.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={n.icon} alt="" className={cn("h-full w-full", !active && "opacity-35 grayscale")} />
        )}
      </div>
      <span
        className={cn(
          "absolute -bottom-1.5 -right-1.5 rounded-[3px] border bg-black/85 px-1 text-[10.5px] font-extrabold leading-[1.35]",
          maxed ? "border-[#ffd100]/60 text-[#ffd100]" : active ? "border-[#1eff00]/50 text-[#1eff00]" : "border-white/10 text-tx3"
        )}
      >
        {rank}/{n.maxRank}
      </span>
    </div>
  );
}

/** 선행 조건 화살표 (unlocks: 이 노드 → 대상 노드) */
function Arrows({ nodes, ranks }: { nodes: TalentNode[]; ranks: Map<number, number> }) {
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const lines: { d: string; on: boolean; key: string }[] = [];
  for (const a of nodes) {
    for (const id of a.unlocks) {
      const b = byId.get(id);
      if (!b) continue;
      const on = (ranks.get(a.talentId ?? -1) ?? 0) >= a.maxRank;
      const x1 = cx(a.col), y1 = top(a.row) + CELL, x2 = cx(b.col), y2 = top(b.row);
      const d = a.col === b.col
        ? `M${x1},${y1 + 2} L${x2},${y2 - 4}`
        : a.row === b.row
          ? `M${a.col < b.col ? a.col * (CELL + GX) + CELL : a.col * (CELL + GX)},${top(a.row) + CELL / 2} L${b.col > a.col ? b.col * (CELL + GX) - 4 : b.col * (CELL + GX) + CELL + 4},${top(b.row) + CELL / 2}`
          : `M${x1},${y1 + 2} L${x1},${y2 - GY / 2} L${x2},${y2 - GY / 2} L${x2},${y2 - 4}`;
      lines.push({ d, on, key: `${a.nodeId}-${id}` });
    }
  }
  return (
    <svg className="pointer-events-none absolute inset-0" width={W} height={H}>
      <defs>
        {["on", "off"].map((k) => (
          <marker key={k} id={`arr-${k}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 z" fill={k === "on" ? "#ffd100" : "rgba(255,255,255,.25)"} />
          </marker>
        ))}
      </defs>
      {lines.map((l) => (
        <path key={l.key} d={l.d} fill="none" stroke={l.on ? "#ffd100" : "rgba(255,255,255,.22)"} strokeWidth="2.5" markerEnd={`url(#arr-${l.on ? "on" : "off"})`} />
      ))}
    </svg>
  );
}

function Tree({ tree, points, ranks, classId }: { tree: TalentSpecTree; points: number; ranks: Map<number, number>; classId: number }) {
  const headIcon = tree.nodes[0]?.icon;
  const bg = specBg(classId, tree.name);
  return (
    <div
      className="anim-up overflow-hidden rounded border border-white/[.06] shadow-[inset_0_0_40px_rgba(0,0,0,.7)]"
      style={bg
        ? { backgroundImage: `linear-gradient(rgba(0,0,0,.75), rgba(0,0,0,.75)), url('${bg}')`, backgroundSize: "cover", backgroundPosition: "center" }
        : { background: "var(--panel)" }}
    >
      <div className="flex items-center gap-[7px] bg-black/50 px-[9px] py-[7px]">
        {headIcon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={headIcon} alt="" className="h-7 w-7 rounded-[3px] border border-white/15" />
        )}
        <span className="text-fl-sm font-bold text-tx1 [text-shadow:0_1px_4px_rgba(0,0,0,.8)]">{tree.name}</span>
        <span className={cn("ml-auto text-fl-2xs font-semibold", points > 0 ? "text-tx2" : "text-tx3")}>{points} pts</span>
      </div>
      <div className="relative mx-auto my-3" style={{ width: W, height: H }}>
        <Arrows nodes={tree.nodes} ranks={ranks} />
        {tree.nodes.map((n, i) => (
          <Node key={n.nodeId} n={n} rank={ranks.get(n.talentId ?? -1) ?? 0} delay={i * 15} />
        ))}
      </div>
    </div>
  );
}

export function TalentColumn({ c }: { c?: CharacterDetail }) {
  const [tab, setTab] = useState<"active" | "secondary">("active");
  const classTrees = useClassTalents(c?.classId);

  // talentId → rank, specId → points
  const { ranks, points } = useMemo(() => {
    const ranks = new Map<number, number>(), points = new Map<number, number>();
    for (const s of c?.talents ?? []) {
      points.set(s.specId, s.points);
      for (const p of s.picks) ranks.set(p.talentId, p.rank);
    }
    return { ranks, points };
  }, [c]);

  // 포인트 많은 트리부터 (WEB_PROJECT와 동일)
  const trees = useMemo(
    () => [...(classTrees?.specs ?? [])].sort((a, b) => (points.get(b.specId) ?? 0) - (points.get(a.specId) ?? 0)),
    [classTrees, points]
  );
  const activeName = c?.talents?.[0]?.specName;
  const total = [...points.values()].reduce((a, b) => a + b, 0);

  return (
    // 높이: 2xl(3열)에선 옆 열(능력치·캐릭터) 높이에 맞춰 absolute로 채움, 그 아래 폭에선 부모 고정 높이 → 내부 스크롤
    <div className="glass-panel flex h-full min-w-0 flex-col 2xl:absolute 2xl:inset-0">
      {/* WEB_PROJECT .tg-tabs */}
      <div className="flex h-10 shrink-0 items-end gap-1 border-b border-line px-2 pt-1.5">
        {(["active", "secondary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("relative rounded-t px-2.5 pb-2 pt-1 text-fl-sm font-bold transition-colors", tab === t ? "text-tx1" : "text-tx3 hover:text-tx2")}
          >
            {t === "active" ? "Active" : "Secondary"}
            {t === "active" && activeName && <span className="ml-1 text-fl-2xs font-semibold text-tx3">{activeName}</span>}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-tx1" />}
          </button>
        ))}
        {tab === "active" && total > 0 && <span className="mb-2 ml-auto pr-1 text-fl-2xs font-bold text-tx3">총 {total}pts</span>}
      </div>

      <div key={`${c?.id}-${tab}`} className="talent-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
        {tab === "secondary" ? (
          <Placeholder text="보조 특성 정보 없음 (API에 비활성 그룹 미제공)" />
        ) : !c ? (
          <Placeholder text="캐릭터 데이터 수집 전" />
        ) : !classTrees ? (
          <div className="flex h-24 items-center justify-center"><div className="spin" /></div>
        ) : (
          trees.map((t) => <Tree key={t.specId} tree={t} points={points.get(t.specId) ?? 0} ranks={ranks} classId={c.classId} />)
        )}
      </div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <div className="flex h-24 items-center justify-center rounded border border-dashed border-line2 text-fl-xs text-tx3">{text}</div>;
}
