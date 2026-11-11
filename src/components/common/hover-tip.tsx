"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * hover·키보드 포커스 툴팁 — body로 portal + fixed 위치
 * 카드 안 스크롤 영역(overflow)에 잘리지 않음. 트리거 오른쪽 끝에 맞춰 아래로 표시, 화면 밖이면 위치 보정.
 */
export function HoverTip({ label, tip, className, children, width = 230 }: { label: string; tip: ReactNode; className?: string; children: ReactNode; width?: number }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const open = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    const up = r.bottom + 140 > window.innerHeight; // 아래 공간이 부족하면 위로
    setPos({ x, y: up ? r.top - 6 : r.bottom + 6, up });
  };
  const close = () => setPos(null);

  return (
    <span
      tabIndex={0}
      aria-label={label}
      className={cn("group inline-flex shrink-0 cursor-help outline-none", className)}
      onMouseEnter={(e) => open(e.currentTarget)}
      onMouseLeave={close}
      onFocus={(e) => open(e.currentTarget)}
      onBlur={close}
    >
      {children}
      {pos &&
        createPortal(
          <span
            role="tooltip"
            className="anim-fade pointer-events-none fixed z-[80] block break-keep rounded-[5px] border border-line bg-bg3 px-2.5 py-2 text-fl-xs font-medium normal-case leading-snug tracking-normal text-tx2 shadow-lg"
            style={{ left: pos.x, top: pos.y, width, transform: pos.up ? "translateY(-100%)" : undefined }}
          >
            {tip}
          </span>,
          document.body
        )}
    </span>
  );
}
