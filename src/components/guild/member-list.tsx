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
      <div className="mb-1.5 px-1 text-fl-2xs font-bold tracking-[1px] text-tx3">{members.length}명</div>
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
              "anim-row mb-1 grid w-full grid-cols-[2.3em_1fr_auto] items-center gap-x-[.65em] rounded-lg border px-[.75em] py-[.6em] text-left text-fl-sm transition-colors duration-100",
              sel
                ? "border-white/[.18] bg-white/[.07]"
                : "border-line bg-bg3 hover:border-line2 hover:bg-bg4"
            )}
          >
            {avatars[m.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatars[m.id]} alt="" loading="lazy" decoding="async" className="h-[2.3em] w-[2.3em] rounded-full border-[1.5px] border-white/20 object-cover object-top" />
            ) : (
              <div
                className="flex h-[2.3em] w-[2.3em] items-center justify-center rounded-full border-[1.5px] font-bold"
                style={{ borderColor: `${cls?.color}66`, color: cls?.color, background: `${cls?.color}12` }}
              >
                {m.name[0]}
              </div>
            )}
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate font-bold text-tx1">{m.name} {m.surname}</span>
              <span className="truncate text-[.76em] text-tx3">
                {none ? (
                  <span className="text-tx3">데이터 수집 불가</span>
                ) : (
                  <>
                    <span className={specs?.get(m.id) ? "font-semibold text-tx2" : "text-tx3"}>{specs?.get(m.id) ?? "알 수 없음"}</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-px">
              <span className="text-[.76em] text-tx3">Lv {m.level}</span>
              <span className="text-[.82em] font-bold" style={{ color: cls?.color }}>{cls?.name}</span>
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
      className="group flex shrink-0 items-center justify-between border-b border-line px-3 pb-[7px] pt-[9px] text-fl-xs font-extrabold text-tx1 transition-colors hover:text-gold"
    >
      길드원 목록
      <ChevronLeft className="h-4 w-4 text-tx3 transition-colors group-hover:text-tx1" />
    </button>
  );
}
