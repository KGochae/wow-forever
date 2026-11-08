"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type TipState = { x: number; y: number; body: ReactNode } | null;

/** 마우스를 따라다니는 차트 툴팁 (fixed · 화면 오른쪽 끝에서는 왼쪽으로 뒤집음) */
export function useChartTip() {
  const [tip, setTip] = useState<TipState>(null);
  const show = (e: React.PointerEvent | React.MouseEvent, body: ReactNode) => setTip({ x: e.clientX, y: e.clientY, body });
  const hide = () => setTip(null);
  return { tip, show, hide };
}

export function ChartTip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  const flip = typeof window !== "undefined" && tip.x > window.innerWidth - 220;
  // body로 portal — 카드의 backdrop-filter가 fixed 기준(containing block)을 바꿔 커서와 어긋나던 문제 방지
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[60] min-w-[120px] rounded-md border border-[var(--glass-border)] bg-[rgba(12,14,20,.96)] px-3 py-2 text-[13px] leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,.6)]"
      style={{ left: flip ? tip.x - 14 : tip.x + 14, top: tip.y + 14, transform: flip ? "translateX(-100%)" : undefined }}
    >
      {tip.body}
    </div>,
    document.body
  );
}
