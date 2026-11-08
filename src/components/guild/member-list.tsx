"use client";

import { ChevronLeft } from "lucide-react";
import { CLASS_INFO, type Member } from "@/lib/wow";
import { cn } from "@/lib/utils";

interface Props {
  members: Member[];
  selectedId?: number;
  avatars: Record<number, string>;
  missing?: Set<number>;
  specs?: Map<number, string | null>; // 대표 특성 (포인트 최다)
  onSelect: (m: Member) => void;
}

/** WEB_PROJECT .guild-row / .gr-* */
export function MemberList({ members, selectedId, avatars, missing, specs, onSelect }: Props) {
  return (
    <div className="no-scrollbar flex-1 overflow-y-auto px-1.5 py-2">
      <div className="mb-1.5 px-1 text-[10px] font-bold tracking-[1px] text-tx3">{members.length}명</div>
      {members.map((m, i) => {
        const cls = CLASS_INFO[m.classId];
        const sel = m.id === selectedId;
        const none = missing?.has(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            style={{ animationDelay: `${Math.min(i, 20) * 12}ms` }}
            className={cn(
              none && "[&>*]:opacity-45",
              "anim-row mb-1 grid w-full grid-cols-[32px_1fr_auto] items-center gap-x-2 rounded-lg border px-2.5 py-2 text-left transition-colors duration-100",
              sel
                ? "border-white/[.18] bg-white/[.07]"
                : "border-line bg-bg3 hover:border-line2 hover:bg-bg4"
            )}
          >
            {avatars[m.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatars[m.id]} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-full border-[1.5px] border-white/20 object-cover object-top" />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] text-[14px] font-bold"
                style={{ borderColor: `${cls?.color}66`, color: cls?.color, background: `${cls?.color}12` }}
              >
                {m.name[0]}
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[13px] font-bold text-tx">{m.name} {m.surname}</span>
              <span className="truncate text-[10px] text-tx2">
                {none ? (
                  <span className="text-tx3">데이터 없음</span>
                ) : (
                  <>
                    <span className={specs?.get(m.id) ? "font-semibold text-tx2" : "text-tx3"}>{specs?.get(m.id) ?? "알 수 없음"}</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-px">
              <span className="text-[10px] text-white">Lv {m.level}</span>
              <span className="text-[11px] font-bold" style={{ color: cls?.color }}>{cls?.name}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function MemberListHeader({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <button
      onClick={onCollapse}
      className="group flex shrink-0 items-center justify-between border-b border-line px-3 pb-[7px] pt-[9px] text-[12px] font-extrabold text-tx1 transition-colors hover:text-gold"
    >
      길드원 목록
      <ChevronLeft className="h-4 w-4 text-tx3 transition-colors group-hover:text-tx1" />
    </button>
  );
}
