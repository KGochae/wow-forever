"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone, Search, Swords, Users, X } from "lucide-react";
import { CharacterSearch } from "@/components/common/character-search";
import type { Member } from "@/lib/wow";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "viewer", label: "캐릭터 뷰어" },
  { key: "stats", label: "길드 통계" },
  { key: "raid", label: "레이드 구성", icon: Swords },
];

interface Props {
  active: string;
  onTab: (k: string) => void;
  members: Member[] | null;
  onPick: (m: Member) => void;
  /** 있으면 모바일·태블릿(< lg)에서 "길드원" 버튼 표시 → 길드원 목록 패널 열기 */
  onMembers?: () => void;
}

/**
 * 상단바 (WEB_PROJECT .v-header / .v-logo / .v-search-wrap / .v-tab)
 * - 모바일(< md): 2줄 — ① 로고 · 검색(아이콘 → 누르면 전체 폭으로 펼침) · 길드원 · 공지  ② 탭 3개 균등 폭
 * - 태블릿 이상: 1줄 — 로고 | 검색 | 탭 | 공지
 * - 크기: text-fl-* · clamp() — 화면이 커지면 같이 커짐
 * 배경: 랜딩 상단처럼 투명 (위→아래 어둡게 그라데이션 + 얇은 하단선)
 */
export function TopNav({ active, onTab, members, onPick, onMembers }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const pick = (m: Member) => { setSearchOpen(false); onPick(m); };

  const tabBtn = (mobile: boolean) =>
    TABS.map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        onClick={() => onTab(key)}
        className={cn(
          "relative flex shrink-0 items-center justify-center gap-[.3em] font-bold tracking-[.3px] transition-colors",
          mobile ? "h-full flex-1 text-fl-sm" : "rounded px-[.7em] py-[.3em] text-fl-sm",
          active === key ? "text-white" : "text-tx3 hover:text-tx2"
        )}
      >
        {Icon && <Icon className="h-[1em] w-[1em] shrink-0" />}
        {label}
        {mobile && active === key && <span className="absolute inset-x-[18%] bottom-0 h-[2px] rounded-full bg-white" />}
      </button>
    ));

  return (
    <header className="relative z-50 shrink-0 whitespace-nowrap border-b border-white/[.06] bg-gradient-to-b from-black/60 to-transparent">
      <div className="flex h-12 items-center gap-2 px-3 md:h-[clamp(52px,3.6vw,64px)] md:gap-[clamp(10px,1vw,20px)] md:px-[clamp(14px,1.4vw,28px)]">
        <Link
          href="/"
          className={cn(
            "font-display shrink-0 text-[clamp(14px,.7rem+.55vw,22px)] font-black tracking-[clamp(1.5px,.15vw,3px)] text-tx1",
            searchOpen && "max-md:hidden"
          )}
        >
          WOW.FOREVER
        </Link>
        <span className="hidden h-[1.1em] w-px shrink-0 bg-line2 text-fl-base md:block" />

        {/* 검색: 태블릿 이상 항상 · 모바일은 아이콘을 눌렀을 때만 전체 폭 */}
        <div className={cn("min-w-0 md:block md:w-[clamp(220px,21vw,380px)] md:flex-none", searchOpen ? "flex-1" : "hidden")}>
          {/* key: 모바일에서 펼칠 때 다시 마운트 → 입력창 자동 포커스 */}
          <CharacterSearch key={searchOpen ? "open" : "closed"} members={members} onPick={pick} autoFocus={searchOpen} />
        </div>

        <nav className="no-scrollbar hidden min-w-0 flex-1 items-center gap-[.2em] overflow-x-auto md:flex">{tabBtn(false)}</nav>

        <div className={cn("ml-auto flex shrink-0 items-center gap-1", searchOpen && "max-md:ml-0")}>
          {searchOpen ? (
            <IconBtn label="검색 닫기" onClick={() => setSearchOpen(false)} className="md:hidden"><X /></IconBtn>
          ) : (
            <IconBtn label="캐릭터 검색" onClick={() => setSearchOpen(true)} className="md:hidden"><Search /></IconBtn>
          )}
          {onMembers && !searchOpen && (
            <button
              onClick={onMembers}
              className="flex items-center gap-[.35em] rounded-md border border-white/15 bg-white/[.06] px-[.7em] py-[.35em] text-fl-xs font-bold text-tx1 transition-colors hover:bg-white/[.12] lg:hidden"
            >
              <Users className="h-[1.1em] w-[1.1em]" />
              길드원
            </button>
          )}
          <button
            className={cn(
              "flex shrink-0 items-center gap-[.35em] rounded px-[.5em] py-[.3em] text-fl-base font-bold text-tx2 transition-colors hover:text-white",
              searchOpen && "max-md:hidden"
            )}
            title="공지사항"
          >
            <Megaphone className="h-[1.05em] w-[1.05em] text-[#ff4d6d]" />
            <span className="hidden lg:inline">공지사항</span>
          </button>
        </div>
      </div>

      {/* 모바일 2번째 줄: 탭 균등 폭 */}
      <nav className="flex h-10 items-stretch border-t border-white/[.05] md:hidden">{tabBtn(true)}</nav>
    </header>
  );
}

function IconBtn({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn("flex h-9 w-9 items-center justify-center rounded-md text-tx2 transition-colors hover:bg-white/10 hover:text-white [&>svg]:h-[18px] [&>svg]:w-[18px]", className)}
    >
      {children}
    </button>
  );
}
