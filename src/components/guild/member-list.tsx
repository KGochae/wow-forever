"use client";

import { ChevronLeft, Crown, Video } from "lucide-react";
import { CLASS_INFO, RANK_BADGE, RANK_COLOR, RANK_ICON, type Member } from "@/lib/wow";
import { WowBaseballMark } from "@/components/common/baseball-icon";
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
      <div className="mb-1.5 px-1 text-right text-fl-2xs font-bold tracking-[1px] text-white">{members.length}명</div>
      {members.map((m, i) => {
        const cls = CLASS_INFO[m.classId];
        const sel = m.id === selectedId;
        const none = missing?.has(m.id);
        const gm = m.rank === 0; // 길드장 — 골드 글래스 + 오로라 (globals.css .gm-*)
        const legacy = m.rank === 2; // L70 레거시 — 진주빛 홀리 글래스 (globals.css .lg-*)
        const rc = RANK_COLOR[m.rank]; // 스텝·L70·L60 — 등급 색 카드 + 배지 (globals.css .rank-*)
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            style={{ animationDelay: `${Math.min(i, 20) * 12}ms`, ...(rc && { "--rc": rc }) } as React.CSSProperties}
            className={cn(
              none && "[&>*]:opacity-45",
              "anim-row mb-1 grid w-full grid-cols-[2.3em_1fr_auto] items-center gap-x-[.65em] rounded-lg border px-[.75em] py-[.6em] text-left text-fl-sm transition-colors duration-100",
              gm
                ? cn("gm-frame", sel && "gm-on")
                : legacy
                  ? cn("lg-frame", sel && "lg-on")
                  : rc
                    ? cn("rank-frame", sel && "rank-on")
                    : sel
                      ? "border-white/[.18] bg-white/[.07]"
                      : "border-line bg-bg3 hover:border-line2 hover:bg-bg4"
            )}
          >
            {/* 아바타 + 왼쪽 위 등급 아이콘 (길드장 왕관 · S · L7 · L6) */}
            <div className="relative h-[2.3em] w-[2.3em]">
              {avatars[m.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatars[m.id]} alt="" loading="lazy" decoding="async" className={cn("h-full w-full rounded-full border-[1.5px] border-white/20 object-cover object-top", gm && "gm-ring", legacy && "lg-ring")} />
              ) : (
                <div
                  className={cn("flex h-full w-full items-center justify-center rounded-full border-[1.5px] font-bold", gm && "gm-ring", legacy && "lg-ring")}
                  style={{ borderColor: `${cls?.color}66`, color: cls?.color, background: `${cls?.color}12` }}
                >
                  {m.name[0]}
                </div>
              )}
              {gm && (
                <span className="absolute -left-[.4em] -top-[.45em] flex h-[1.15em] w-[1.15em] items-center justify-center rounded-full bg-[#1a140a] shadow-[0_0_0_1px_rgba(245,197,66,.45)]">
                  <Crown className="h-[.72em] w-[.72em] text-[#f5c542]" />
                </span>
              )}
              {RANK_BADGE[m.rank] && (
                <span className={cn("rank-badge rank-badge-avatar absolute -left-[.45em] -top-[.4em]", legacy && "lg-badge")}>{RANK_BADGE[m.rank]}</span>
              )}
              {RANK_ICON[m.rank] === "camera" && (
                <span className="rank-badge rank-badge-avatar absolute -left-[.45em] -top-[.4em]">
                  <Video className="h-[.95em] w-[.95em]" />
                </span>
              )}
              {RANK_ICON[m.rank] === "baseball" && (
                <span className="rank-badge rank-badge-avatar absolute -left-[.45em] -top-[.4em]"><WowBaseballMark /></span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-px">
              <span className="flex min-w-0 items-center font-bold text-tx1">
                <span className={cn("truncate", (gm || rc) && "text-white")}>{m.name} {m.surname}</span>
              </span>
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
              <span className="text-[.76em] text-white">Lv {m.level}</span>
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
