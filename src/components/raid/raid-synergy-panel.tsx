"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CLASS_INFO } from "@/lib/wow";
import { CATS, classIcon, synergiesOf, synergyTitle, type SynergyState } from "@/lib/raid-synergy";
import { cn } from "@/lib/utils";
import { SkillIcon } from "./skill-icon";

/**
 * 공대 스킬 요약 (오른쪽 패널 내용)
 * 분류별 38개 효과 — 공대 전체 / 일부 파티 / 없음, 누르면 스킬 설명·제공자
 */
export function RaidSynergyPanel({ states }: { states: Map<string, SynergyState> }) {
  const [open, setOpen] = useState<string | null>(null);

  const all = [...states.values()];

  return (
    <div className="flex flex-col">
      <div className="border-b border-white/[.06] px-4 py-2.5">
        <span className="text-fl-2xs font-bold text-tx3">WOW Forever 기준 {all.length}개 효과</span>
      </div>

      <div className="flex flex-col">
        {CATS.map((cat) => {
          const rows = synergiesOf(cat.id).map((s) => states.get(s.id)!);
          if (!rows.length) return null;
          return (
            <div key={cat.id} className="border-b border-white/[.05] last:border-0">
              <div className="px-4 pb-1 pt-2.5 text-fl-2xs font-extrabold tracking-[1px] text-tx3">{cat.label}</div>
              <ul className="pb-1.5">
                {rows.map((st) => {
                  const key = `${cat.id}:${st.synergy.id}`;
                  return <Row key={key} st={st} open={open === key} onToggle={() => setOpen(open === key ? null : key)} />;
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ st, open, onToggle }: { st: SynergyState; open: boolean; onToggle: () => void }) {
  const { synergy: s, status } = st;
  const iconP = st.sources[0]?.provider ?? s.providers[0];
  const classes = [...new Set(s.providers.map((p) => p.classId))];
  const activeClasses = new Set(st.sources.map((x) => x.provider.classId));

  return (
    <li>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-[.32em] text-left text-fl-xs transition-colors hover:bg-white/[.04]"
      >
        <SkillIcon p={iconP} dim={status === "none"} className="h-[1.6em] w-[1.6em] shrink-0" />
        <span className={cn("min-w-0 flex-1 truncate font-semibold", status === "none" ? "text-tx3" : "text-tx1")}>
          {synergyTitle(s)}
          {s.core && status !== "raid" && <span className="ml-1 text-[#ffb36b]">•</span>}
        </span>
        <span className="flex shrink-0 gap-[2px]">
          {classes.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={classIcon(id)}
              alt={CLASS_INFO[id]?.name}
              title={CLASS_INFO[id]?.name}
              loading="lazy"
              className={cn("h-[1.15em] w-[1.15em] rounded-[2px]", !activeClasses.has(id) && "opacity-30 grayscale")}
            />
          ))}
        </span>
        <Status st={st} />
        <ChevronDown className={cn("h-[1em] w-[1em] shrink-0 text-tx3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="anim-fade mx-4 mb-2 mt-1 flex flex-col gap-2 rounded-lg bg-white/[.03] p-2.5 text-fl-2xs leading-relaxed">
          {s.providers.map((p) => {
            const src = st.sources.find((x) => x.provider === p);
            const c = CLASS_INFO[p.classId];
            return (
              <div key={p.name + p.classId} className="flex gap-2">
                <SkillIcon p={p} dim={!src} className="mt-[2px] h-[1.9em] w-[1.9em] shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-1.5">
                    <span className="font-bold text-tx1">{p.name}</span>
                    <span style={{ color: c?.color }} className="font-bold">{c?.name}{p.spec ? ` · ${p.spec}` : ""}</span>
                    <span className="text-tx3">{p.scope === "party" ? "파티" : "공대"}</span>
                    {p.share && (p.slot ?? 1) > 1 && <span className="text-tx3">({c?.name} {p.slot}명부터)</span>}
                  </div>
                  <p className="text-tx3">{p.desc}</p>
                  <p className={cn("mt-0.5 font-semibold", src ? "text-[#7ee0a1]" : "text-tx3/70")}>
                    {src ? src.members.map((m) => m.name).join(", ") : "제공자 없음"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
}

function Status({ st }: { st: SynergyState }) {
  if (st.status === "raid") return <span className="w-[4.6em] shrink-0 text-right text-fl-2xs font-bold text-[#7ee0a1]">공대 전체</span>;
  if (st.status === "party")
    return <span className="w-[4.6em] shrink-0 truncate text-right text-fl-2xs font-bold text-[#ffd479]">파티 {st.groups.map((g) => g + 1).join("·")}</span>;
  return <span className="w-[4.6em] shrink-0 text-right text-fl-2xs font-semibold text-tx3/70">없음</span>;
}
