"use client";

import { spellIcon, type SynergyProvider } from "@/lib/raid-synergy";
import { cn } from "@/lib/utils";

/**
 * 스킬 아이콘 — 툴팁 없음 (스킬 이름·설명은 공대 스킬 요약에서 줄을 펼치면 모두 표시)
 */
export function SkillIcon({ p, className, dim }: { p: SynergyProvider; className?: string; dim?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={spellIcon(p.icon, "small")}
      alt={p.name}
      loading="lazy"
      className={cn("rounded-[3px] border border-black/70", dim && "opacity-50 grayscale", className)}
    />
  );
}
