"use client";

import { professionTier, type Profession } from "@/lib/wow";

/** 전문 기술 — 공식 아이콘 + 숙련도 막대 (주 전문기술 먼저, 보조는 아래) */
export function ProfessionSection({ list }: { list?: Profession[] | null }) {
  return (
    <section className="border-b border-line px-3 py-3.5">
      <div className="mb-2.5 truncate text-fl-2xs font-extrabold uppercase tracking-[1.8px] text-white">Professions · 전문 기술</div>
      {!list?.length ? (
        <div className="py-2 text-fl-xs text-tx3">
          {list === undefined ? "다음 수집 때 표시됩니다" : list === null ? "정보를 불러오지 못했습니다" : "배운 전문 기술이 없습니다"}
        </div>
      ) : (
        <div className="flex flex-col gap-[.7em] text-fl-xs">
          {list.map((p) => {
            const pct = p.max ? Math.min(100, (p.skill / p.max) * 100) : 0;
            return (
              <div key={p.id} className="flex items-center gap-[.7em]">
                {p.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.icon} alt={p.name} title={p.name} loading="lazy" className="h-[2.6em] w-[2.6em] shrink-0 rounded-[4px] border border-white/20 shadow-[0_1px_4px_rgba(0,0,0,.5)]" />
                ) : (
                  <span className="flex h-[2.6em] w-[2.6em] shrink-0 items-center justify-center rounded-[4px] border border-white/15 font-bold text-tx3">{p.name[0]}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold text-tx1">
                      {p.name}
                      <span className="ml-1.5 text-[.85em] font-medium text-tx3">{p.secondary ? "보조 · " : ""}{professionTier(p.max)}</span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-tx">
                      <span className="text-fl-sm font-bold">{p.skill}</span><span className="text-[.85em] font-medium text-tx3"> / {p.max}</span>
                    </span>
                  </div>
                  <div className="mt-[.35em] h-[5px] overflow-hidden rounded-full bg-white/[.08]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: p.secondary ? "linear-gradient(90deg,#5b7a99,#8fb3d9)" : "linear-gradient(90deg,#b8862e,#f2c75c)" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
