"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { CLASS_INFO } from "@/lib/wow";
import { classIcon, roleGroup, slotRole, type RaidSlot } from "@/lib/raid-synergy";
import { cn } from "@/lib/utils";
import { FullName, RoleBadge, SpecSelect } from "./raid-pool";

export type Pos = [number, number];

interface Props {
  gi: number;
  slots: (RaidSlot | null)[];
  target: Pos | null;
  dragging: boolean;
  onSlotClick: (p: Pos) => void;
  onDragSlot: (p: Pos) => void;
  onDrop: (p: Pos) => void;
  onRemove: (p: Pos) => void;
  onSpec: (p: Pos, key: string) => void;
}

/**
 * 파티 카드 (WEB_PROJECT .rb-group) — 파티 이름 · n/5 · 슬롯 5칸
 * 버프는 오른쪽 "공대 스킬 요약"의 파티 필터에서 확인 (카드 안 버프 패널 제거)
 */
export function RaidGroup({ gi, slots, target, dragging, onSlotClick, onDragSlot, onDrop, onRemove, onSpec }: Props) {
  const filled = slots.filter(Boolean).length;

  return (
    <div data-flip={gi}>
      <section className="relative overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] shadow-[0_2px_12px_rgba(0,0,0,.35),inset_0_1px_0_var(--glass-highlight)]">
        <div className="flex flex-col gap-1.5 p-3">
          <div className="flex items-center gap-1.5 text-fl-2xs font-extrabold tracking-[1.2px] text-tx1">
            파티 {gi + 1}
            <span className="ml-auto rounded-[3px] bg-bg4 px-[.6em] py-px font-semibold tracking-normal text-gold">{filled}/5</span>
          </div>
          <div className="flex flex-col gap-[3px]">
            {slots.map((s, si) => (
              <Slot
                key={si}
                index={si}
                slot={s}
                selected={target?.[0] === gi && target[1] === si}
                dragging={dragging}
                onClick={() => onSlotClick([gi, si])}
                onDragStart={() => onDragSlot([gi, si])}
                onDrop={() => onDrop([gi, si])}
                onRemove={() => onRemove([gi, si])}
                onSpec={(k) => onSpec([gi, si], k)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Slot({ index, slot, selected, dragging, onClick, onDragStart, onDrop, onRemove, onSpec }: {
  index: number; slot: RaidSlot | null; selected: boolean; dragging: boolean;
  onClick: () => void; onDragStart: () => void; onDrop: () => void; onRemove: () => void; onSpec: (k: string) => void;
}) {
  const [over, setOver] = useState(false);
  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setOver(false); onDrop(); },
  };
  const ring = selected ? "!border-white/60 bg-white/[.08]" : over ? "!border-gold bg-[rgba(180,180,180,.05)]" : "";

  if (!slot) {
    return (
      <button
        {...dropProps}
        onClick={onClick}
        className={cn(
          "flex min-h-12 items-center rounded-md border border-dashed px-2.5 text-left text-fl-2xs transition-colors",
          dragging ? "border-white/20" : "border-white/[.08] hover:border-white/20",
          ring
        )}
      >
        <span className={cn(selected ? "font-bold text-white" : "text-tx3/50")}>{selected ? "길드원을 고르세요" : `슬롯 ${index + 1}`}</span>
      </button>
    );
  }

  const m = slot.member;
  const c = CLASS_INFO[m.classId];
  return (
    <div
      {...dropProps}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(m.id)); onDragStart(); }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
      className={cn(
        "group/slot relative flex min-h-12 cursor-grab items-center gap-2 rounded-md border border-line2 bg-bg3 py-1 pl-2.5 pr-1 text-fl-xs transition-colors hover:bg-bg4 active:cursor-grabbing",
        ring
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={m.avatar ?? classIcon(m.classId)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-7 w-7 shrink-0 rounded-full border-[1.5px] object-cover object-top"
        style={{ borderColor: c?.color }}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <FullName m={m} />
        <div className="mt-px text-[.78em] font-semibold" style={{ color: c?.color }}>{c?.name}</div>
      </div>
      <SpecSelect classId={m.classId} value={slot.specKey} onChange={onSpec} />
      <span className="w-[2.9em] shrink-0 text-center"><RoleBadge group={roleGroup(slotRole(slot))} /></span>
      <span className="w-[2.6em] shrink-0 text-center text-[.88em] tabular-nums text-tx2"><span className="text-[.8em] text-tx3">Lv</span>{m.level}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="빼기"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-tx3 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
