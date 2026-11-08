"use client";

import Link from "next/link";
import { Megaphone, Swords } from "lucide-react";
import { CharacterSearch } from "@/components/common/character-search";
import type { Member } from "@/lib/wow";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "viewer", label: "캐릭터 뷰어" },
  { key: "items", label: "아이템 검색" },
  { key: "stats", label: "길드 통계" },
  { key: "raid", label: "레이드 구성", icon: Swords },
];

interface Props {
  active: string;
  onTab: (k: string) => void;
  members: Member[] | null;
  onPick: (m: Member) => void;
}

/**
 * WEB_PROJECT .v-header / .v-logo / .v-search-wrap / .v-tab
 * 좁은 화면: 줄바꿈 금지(nowrap) · 탭은 가로 스크롤 · 글자/여백 축소 · 공지사항은 아이콘만
 * 배경: 랜딩 상단처럼 투명 (위→아래 어둡게 그라데이션 + 얇은 하단선)
 */
export function TopNav({ active, onTab, members, onPick }: Props) {
  return (
    <header className="relative z-50 flex h-[52px] shrink-0 items-center gap-2 whitespace-nowrap border-b border-white/[.06] bg-gradient-to-b from-black/60 to-transparent px-3 md:gap-3 md:px-4">
      <Link href="/" className="font-display shrink-0 text-[14px] font-black tracking-[1.5px] text-tx1 md:text-[17px] md:tracking-[2px]">
        WOW.FOREVER
      </Link>
      <span className="hidden h-4 w-px shrink-0 bg-line2 md:block" />

      <div className="w-[190px] shrink-0 sm:w-[240px] lg:w-[300px]">
        <CharacterSearch members={members} onPick={onPick} />
      </div>

      {/* 탭: 공간 부족 시 가로 스크롤 (스크롤바 숨김) */}
      <nav className="no-scrollbar ml-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:ml-3">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onTab(key)}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded px-2 py-[5px] text-[14px] font-bold tracking-[.3px] transition-colors lg:px-3.5 lg:text-[16px]",
              active === key ? "text-white" : "text-tx3 hover:text-tx2"
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {label}
          </button>
        ))}
      </nav>

      <button
        className="flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-[15px] font-bold text-tx2 transition-colors hover:text-white"
        title="공지사항"
      >
        <Megaphone className="h-4 w-4 text-[#ff4d6d]" />
        <span className="hidden lg:inline">공지사항</span>
      </button>
    </header>
  );
}
