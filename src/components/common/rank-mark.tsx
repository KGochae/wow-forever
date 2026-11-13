"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Crown, Video } from "lucide-react";
import { RANK_BADGE, RANK_COLOR, RANK_ICON, RANK_LABEL, RANK_TIP } from "@/lib/wow";
import { WowBaseballMark } from "@/components/common/baseball-icon";
import { cn } from "@/lib/utils";

/**
 * 등급 아이콘 (길드원 목록 아바타 배지와 같은 모양) — 마우스를 올리면 바로 등급 이름 툴팁
 * (브라우저 기본 title은 늦게 떠서 사용 안 함 · 표 스크롤 영역에 잘리지 않게 body로 portal)
 * 길드장 = 왕관 · L70 = 레거시 배지 · 그 외 = RANK_BADGE 글자 / 카메라 / WOW 야구공
 */
export function RankMark({ rank, className }: { rank: number; className?: string }) {
  const label = RANK_TIP[rank] ?? RANK_LABEL(rank);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const hover = {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setAt({ x: r.left + r.width / 2, y: r.top });
    },
    onPointerLeave: () => setAt(null),
    "aria-label": label,
  };
  const tip =
    at &&
    createPortal(
      <div
        role="tooltip"
        className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-[rgba(12,14,20,.96)] px-2 py-1 text-fl-2xs font-bold text-white shadow-[0_6px_18px_rgba(0,0,0,.5)]"
        style={{ left: at.x, top: at.y - 6 }}
      >
        {label}
      </div>,
      document.body
    );
  if (rank === 0) {
    return (
      <span {...hover} className={cn("inline-flex h-[1.5em] w-[1.5em] items-center justify-center rounded-full bg-[#1a140a] shadow-[0_0_0_1px_rgba(245,197,66,.45)]", className)}>
        <Crown className="h-[.95em] w-[.95em] text-[#f5c542]" />
        {tip}
      </span>
    );
  }
  const rc = RANK_COLOR[rank];
  const icon = RANK_ICON[rank];
  const text = RANK_BADGE[rank];
  if (!rc || (!icon && !text)) return <span {...hover} className={cn("text-white/40", className)}>-{tip}</span>;
  return (
    <span
      {...hover}
      style={{ "--rc": rc } as React.CSSProperties}
      className={cn("rank-badge cursor-default text-[.85em]", rank === 2 && "lg-badge", className)}
    >
      {icon === "camera" ? <Video className="h-[.95em] w-[.95em]" /> : icon === "baseball" ? <WowBaseballMark /> : text}
      {tip}
    </span>
  );
}
