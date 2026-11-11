"use client";

import { useEffect, useRef, useState } from "react";
import { CLASS_INFO } from "@/lib/wow";
import { cn } from "@/lib/utils";
import { ChartTip, useChartTip } from "@/components/stats/chart-tip";

/** WEB_PROJECT stats.js 길드 대시보드 이식 — 직업 비율 treemap + 분포도(더블 바) */

const BASE = "#7ec8a0"; // WEB_PROJECT _RANK_LINE_COL '전체'
const CLS_EN: Record<number, string> = { 1: "warrior", 2: "paladin", 3: "hunter", 4: "rogue", 5: "priest", 7: "shaman", 8: "mage", 9: "warlock", 11: "druid" };
const rgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

/* ── 직업 비율 treemap (WEB_PROJECT _treemapLayout / _buildGsTreemapSVG) ── */
export interface ClassCount { classId: number; cnt: number }
type Rect = { item: ClassCount; x: number; y: number; w: number; h: number };

function layout(items: ClassCount[], x: number, y: number, w: number, h: number, gap: number): Rect[] {
  if (!items.length) return [];
  if (items.length === 1) return [{ item: items[0], x, y, w, h }];
  const total = items.reduce((s, d) => s + d.cnt, 0);
  let acc = 0, split = items.length - 1;
  for (let i = 0; i < items.length - 1; i++) {
    acc += items[i].cnt;
    if (acc * 2 >= total) { split = i + 1; break; }
  }
  const frac = items.slice(0, split).reduce((s, d) => s + d.cnt, 0) / total;
  const L = items.slice(0, split), R = items.slice(split);
  if (w >= h) {
    const lw = Math.max(0, w * frac - gap / 2);
    return [...layout(L, x, y, lw, h, gap), ...layout(R, x + lw + gap, y, Math.max(0, w - lw - gap), h, gap)];
  }
  const lh = Math.max(0, h * frac - gap / 2);
  return [...layout(L, x, y, w, lh, gap), ...layout(R, x, y + lh + gap, w, Math.max(0, h - lh - gap), gap)];
}

export function ClassTreemap({ data, total, selected, onSelect }: { data: ClassCount[]; total: number; selected: number | null; onSelect: (id: number) => void }) {
  const { tip, show, hide } = useChartTip();
  // 실제 크기(px)로 분할 → 칸마다 글자가 들어갈 공간을 계산해 크기/배치 조절 (잘림 방지)
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!total) return <div className="p-4 text-[13px] text-tx3">데이터 없음</div>;
  const rects = box.w ? layout(data, 0, 0, box.w, box.h, 3) : [];
  return (
    <div ref={ref} className="relative h-full w-full" onPointerLeave={hide}>
      {rects.map(({ item, x, y, w, h }) => {
        const c = CLASS_INFO[item.classId];
        const name = c?.name ?? "";
        const pct = Math.round((item.cnt / total) * 100);
        const sel = selected === item.classId;
        const dim = selected != null && !sel;
        const f = fit(name.length, w, h);
        return (
          <button
            key={item.classId}
            onClick={() => onSelect(item.classId)}
            onPointerMove={(e) => show(e, <><div className="text-white/80">{name}</div><div className="font-extrabold text-white">{item.cnt}명 · {pct}%</div></>)}
            className={cn(
              "absolute flex overflow-hidden rounded-[7px] text-white transition-opacity [text-shadow:0_1px_3px_rgba(0,0,0,.6)]",
              f.mode === "row" ? "flex-col justify-between p-2" : "flex-col items-center justify-center gap-0.5 p-1 text-center",
              dim && "opacity-30"
            )}
            style={{
              left: x, top: y, width: w, height: h,
              background: rgba(BASE, Math.min(0.75, 0.1 + pct * 0.018)),
              boxShadow: sel ? `inset 0 0 0 2px ${c?.color}` : undefined,
            }}
          >
            {f.mode === "row" ? (
              <>
                <span className="flex items-center gap-1.5">
                  <Icon id={item.classId} size={f.icon} />
                  <span className="whitespace-nowrap font-extrabold tracking-[.3px]" style={{ fontSize: f.font }}>{name}</span>
                </span>
                <span className="self-end font-extrabold" style={{ fontSize: f.pct }}>{pct}%</span>
              </>
            ) : (
              <>
                {f.icon > 0 && <Icon id={item.classId} size={f.icon} />}
                {f.font > 0 && <span className="whitespace-nowrap font-extrabold leading-tight" style={{ fontSize: f.font }}>{name}</span>}
                {f.pct > 0 && <span className="font-extrabold leading-tight" style={{ fontSize: f.pct }}>{pct}%</span>}
              </>
            )}
          </button>
        );
      })}
      <ChartTip tip={tip} />
    </div>
  );
}

function Icon({ id, size }: { id: number; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://wow.zamimg.com/images/wow/icons/large/classicon_${CLS_EN[id] ?? "warrior"}.jpg`} alt="" className="shrink-0 rounded-md" style={{ width: size, height: size }} />
  );
}

/**
 * 칸 크기에 맞춘 글자/아이콘 크기 (한글 1자 ≈ 1em)
 * - row: [아이콘 이름] 위 + % 아래 오른쪽 (넓은 칸)
 * - stack: 아이콘 / 이름 / % 세로 가운데 (좁은 칸) — 그래도 안 되면 이름·%부터 생략 (툴팁으로 확인)
 */
function fit(len: number, w: number, h: number) {
  const icon = Math.round(Math.max(28, Math.min(44, Math.min(w, h) / 4)));
  const rowFont = Math.min(22, (w - 16 - icon - 6) / (len * 1.02));
  if (rowFont >= 12 && h >= 64) return { mode: "row" as const, icon, font: rowFont, pct: Math.min(26, rowFont + 3) };
  const font = Math.min(14, (w - 8) / (len * 1.02));
  const ic = Math.min(28, w - 10, h - 8);
  const okFont = font >= 10;
  const need = (okFont ? font * 1.25 : 0) + (okFont ? 14 : 0) + 8;
  const iconFits = ic >= 16 && ic + need <= h;
  return {
    mode: "stack" as const,
    icon: iconFits ? ic : 0,
    font: okFont && h >= need ? font : 0,
    pct: okFont && h >= need ? 12 : 0,
  };
}

/* ── 레벨 분포도 (WEB_PROJECT _buildGsBarSVG — 선택 시 회색 전체 + 직업색 더블 바) ── */
export function LevelDistChart({
  levels, all, sel, selColor, selLabel,
}: {
  levels: number[];
  all: Map<number, number>;
  sel?: Map<number, number> | null;
  selColor?: string;
  selLabel?: string;
}) {
  const { tip, show, hide } = useChartTip();
  const max = Math.max(1, ...levels.map((l) => all.get(l) ?? 0));
  return (
    <div className="flex h-full flex-col text-fl-2xs">
      <div className="relative min-h-0 flex-1 pl-[3em]">
        {/* 그리드 */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div key={v} className="pointer-events-none absolute left-[3em] right-0 h-px bg-white/[.06]" style={{ bottom: `${v * 100}%` }}>
            <span className="absolute -left-[3em] w-[2.4em] -translate-y-1/2 text-right tabular-nums text-white">{Math.round(v * max)}</span>
          </div>
        ))}
        <div className="relative flex h-full items-end" onPointerLeave={hide}>
          {levels.map((l) => {
            const n = all.get(l) ?? 0;
            const k = sel?.get(l) ?? 0;
            const h = (n / max) * 100;
            return (
              <div
                key={l}
                className="relative flex h-full flex-1 items-end justify-center"
                onPointerMove={(e) =>
                  show(e, (
                    <>
                      <div className="mb-1 text-fl-xs text-white/80">Lv {l}</div>
                      <hr className="border-white/10" />
                      {sel ? (
                        <>
                          <Row label="전체" v={`${n}명`} />
                          <Row label={selLabel ?? ""} v={`${k}명 (${n ? Math.round((k / n) * 100) : 0}%)`} />
                        </>
                      ) : (
                        <div className="mt-1 text-fl-base font-extrabold text-white">{n}명</div>
                      )}
                    </>
                  ))
                }
              >
                {sel ? (
                  <>
                    <div className="absolute bottom-0 w-[74%] rounded-t-[3px] bg-white/[.12]" style={{ height: `${h}%`, minHeight: n ? 1 : 0 }} />
                    <div className="relative w-[44%] rounded-t-[3px] opacity-90" style={{ height: `${(k / max) * 100}%`, minHeight: k ? 1 : 0, background: selColor }} />
                  </>
                ) : (
                  <div className="w-[74%] rounded-t-[3px]" style={{ height: `${h}%`, minHeight: n ? 1 : 0, background: rgba(BASE, 0.55 + 0.45 * (n / max)) }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex pl-[3em] pt-1.5">
        {levels.map((l, i) => (
          <span key={l} className={cn("flex-1 text-center tabular-nums text-white", i % 2 && i !== levels.length - 1 && "max-md:invisible")}>{l}</span>
        ))}
      </div>
      <ChartTip tip={tip} />
    </div>
  );
}

function Row({ label, v }: { label: string; v: string }) {
  return (
    <div className="mt-1 flex justify-between gap-4">
      <span className="text-fl-xs text-white/80">{label}</span>
      <span className="text-fl-sm font-extrabold text-white">{v}</span>
    </div>
  );
}
