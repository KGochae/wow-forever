"use client";

import { CLASS_INFO } from "@/lib/wow";
import { spellIcon, type SynergyProvider } from "@/lib/raid-synergy";
import { useItemTooltip } from "@/components/common/item-tooltip";
import { cn } from "@/lib/utils";

/**
 * 스킬 아이콘 — 마우스를 올리면 스킬 설명 툴팁 (캐릭터 뷰어 아이템 툴팁과 같은 모양)
 * GuildViewer의 ItemTooltipProvider 안에서 사용
 */
export function SkillIcon({ p, className, dim }: { p: SynergyProvider; className?: string; dim?: boolean }) {
  const tt = useItemTooltip();
  const c = CLASS_INFO[p.classId];
  const body = (
    <div className="text-[13px] leading-[1.45]">
      <div className="mb-1.5 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spellIcon(p.icon, "medium")} alt="" className="h-8 w-8 shrink-0 rounded-[3px] border border-white/10" />
        <div className="min-w-0">
          <div className="text-[14.5px] font-extrabold leading-tight text-white">{p.name}</div>
          <div className="text-[12px] font-semibold">
            <span style={{ color: c?.color }}>{c?.name}{p.spec ? ` · ${p.spec}` : ""}</span>
            <span className="text-tx3"> · {p.scope === "party" ? "파티 적용" : "공대 전체"}</span>
          </div>
        </div>
      </div>
      <p className="text-[#ffd100]">{p.desc}</p>
      {p.share && (p.slot ?? 1) > 1 && <p className="mt-1 text-[12px] text-tx3">{c?.name} {p.slot}명 이상일 때 함께 사용 가능</p>}
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spellIcon(p.icon, "small")}
      alt={p.name}
      loading="lazy"
      onMouseEnter={(e) => tt?.showNode(`skill-${p.classId}-${p.name}`, body, e)}
      onMouseMove={(e) => tt?.move(e)}
      onMouseLeave={() => tt?.hide()}
      className={cn("cursor-help rounded-[3px] border border-black/70 hover:border-white/40", dim && "opacity-50 grayscale", className)}
    />
  );
}
