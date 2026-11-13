"use client";

import { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { CLASS_INFO } from "@/lib/wow";
import { classIcon, groupProvides, roleGroup, slotRole, type GroupEffect, type RaidSlot } from "@/lib/raid-synergy";
import { cn } from "@/lib/utils";
import { FullName, RoleBadge, SpecSelect } from "./raid-pool";
import { SkillIcon } from "./skill-icon";

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
 * 파티 카드 (WEB_PROJECT .rb-group)
 * 왼쪽: 파티 이름 · n/5 · 슬롯 5칸 / 오른쪽(155px, 접기): 파티 버프 · 공대 전체 버프 · 적 디버프
 * 카드 폭이 좁으면(컨테이너 < 470px) 오른쪽 패널이 슬롯 아래로 내려감
 */
export function RaidGroup({ gi, slots, target, dragging, onSlotClick, onDragSlot, onDrop, onRemove, onSpec }: Props) {
  const [synOpen, setSynOpen] = useState(true);
  const filled = slots.filter(Boolean).length;
  const fx = groupProvides(slots);

  return (
    <div className="@container">
      <section
        className={cn(
          "relative overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] shadow-[0_2px_12px_rgba(0,0,0,.35),inset_0_1px_0_var(--glass-highlight)]",
          synOpen ? "@[470px]:pr-[155px]" : "@[470px]:pr-[22px]"
        )}
      >
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

        {/* 오른쪽 버프 패널 (WEB_PROJECT .rb-group-right) */}
        <aside
          className={cn(
            "relative border-t border-[var(--glass-border)] bg-[linear-gradient(90deg,transparent_0%,rgba(16,20,28,.22)_24%,rgba(12,15,24,.5)_62%,rgba(10,13,22,.66)_100%)]",
            "@[470px]:absolute @[470px]:inset-y-0 @[470px]:right-0 @[470px]:border-l @[470px]:border-t-0",
            synOpen ? "@[470px]:w-[155px]" : "@[470px]:w-[22px]"
          )}
        >
          <button
            onClick={() => setSynOpen((v) => !v)}
            aria-label="버프 패널 접기/펼치기"
            className="absolute right-1 top-1.5 z-[2] hidden h-[18px] w-[18px] items-center justify-center rounded-[3px] text-tx2 transition-colors hover:bg-white/10 hover:text-tx1 @[470px]:flex"
          >
            <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", !synOpen && "rotate-180")} />
          </button>
          <div className={cn("no-scrollbar flex h-full flex-col gap-1 overflow-y-auto p-2.5 text-fl-2xs transition-opacity", !synOpen && "@[470px]:pointer-events-none @[470px]:opacity-0")}>
            {filled === 0 ? (
              <div className="flex flex-1 items-center justify-center py-3 text-tx3/60">파티 버프/디버프</div>
            ) : (
              <>
                <Section title="파티 버프" items={fx.party} empty="파티 버프 없음" />
                <Section title="공대 전체 버프" items={fx.raid} />
                <Section title="적 디버프" items={fx.debuff} danger />
              </>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function Section({ title, items, empty = "없음", danger }: { title: string; items: GroupEffect[]; empty?: string; danger?: boolean }) {
  return (
    <div className="mb-1">
      <div className={cn("mb-1 border-b border-white/[.06] pb-1 text-[.92em] font-extrabold", danger ? "text-[#e05050]" : "text-tx1")}>{title}</div>
      {items.length ? (
        <div className="grid grid-cols-[max-content_1fr] gap-x-[5px] gap-y-[3px]">
          {items.map((e) => (
            <div key={e.short} className="contents">
              <span className="whitespace-nowrap pt-[2px] text-[.9em] text-tx3">{e.short}</span>
              <span className="flex flex-wrap gap-[2px]">
                {e.providers.map((p) => <SkillIcon key={p.name} p={p} className="h-[18px] w-[18px]" />)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-[.9em] italic text-tx3/40">{empty}</span>
      )}
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
