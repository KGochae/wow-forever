"use client";

import { useRouter } from "next/navigation";
import { CharacterSearch } from "@/components/common/character-search";
import { useGuildIndex } from "@/lib/use-guild-data";
import type { Member } from "@/lib/wow";
import { FAN_NOTICE } from "@/lib/config";

const NAV = [
  { label: "캐릭터 뷰어", href: "/viewer" },
  { label: "아이템 검색", disabled: true },
  { label: "길드 통계", disabled: true },
  { label: "⚔ 레이드 구성", disabled: true },
];

/** WEB_PROJECT #page-landing (.landing-nav / .landing-hero / .wow-search-wrap) */
export function Landing() {
  const router = useRouter();
  const { index, error } = useGuildIndex();
  const go = (m: Member) => router.push(`/viewer?c=${encodeURIComponent(m.slug)}`);

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden anim-fade">
      {/* 배경: Zephra's Isle in the Clouds (2560×1440) — 밝은 이미지라 가운데 타이틀·검색만 어둡게 */}
      <div className="absolute inset-0 bg-[url('/background/zephras.jpg')] bg-cover bg-[center_45%]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 42% at 50% 48%, rgba(5,10,20,.6) 0%, rgba(5,10,20,.3) 60%, rgba(5,10,20,0) 100%), linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(0,0,0,.12) 30%, rgba(0,0,0,.15) 65%, rgba(0,0,0,.7) 100%)",
        }}
      />

      {/* 상단 네비 */}
      <nav className="absolute inset-x-0 top-0 z-10 flex h-[52px] items-center justify-center whitespace-nowrap border-b border-white/[.06] bg-gradient-to-b from-black/60 to-transparent px-6 pt-2.5">
        {NAV.map((n, i) => (
          <div key={n.label} className="flex h-full items-center">
            {i > 0 && <span className="h-3.5 w-px bg-white/10" />}
            <button
              disabled={n.disabled}
              onClick={() => n.href && router.push(n.href)}
              className="h-full px-3 text-[13px] tracking-[.04em] text-tx2 transition-colors hover:text-white/95 disabled:cursor-not-allowed disabled:opacity-35 sm:px-5"
            >
              {n.label}
            </button>
          </div>
        ))}
      </nav>

      {/* 타이틀 + 검색 */}
      <div className="anim-up relative z-[2] flex w-full flex-col items-center gap-9 px-6 sm:px-12">
        <div className="text-center [filter:drop-shadow(0_4px_28px_rgba(0,0,0,.98))]">
          <div className="font-display mb-4 flex items-center justify-center gap-3 text-[10px] uppercase tracking-[6px] text-white before:h-px before:w-9 before:bg-white/20 after:h-px after:w-9 after:bg-white/20">
            WOW.FOREVER
          </div>
          <h1 className="text-[clamp(32px,3.4vw,54px)] font-black leading-[1.15] tracking-[.02em] text-tx1">
            {index?.guild.name ?? "같이와포하자"}
          </h1>
          <div className="font-display mt-1 text-[clamp(18px,1.6vw,26px)] font-black tracking-[clamp(4px,0.6vw,8px)] text-tx1/90">
            GUILD ARMORY
          </div>
        </div>

        <div className="w-full max-w-[520px]">
          <CharacterSearch members={index?.members ?? null} onPick={go} variant="landing" autoFocus />
          {error && <div className="mt-2 text-center text-[13px] text-[var(--red)]">데이터를 불러오지 못했습니다</div>}
          {index && (
            <div className="mt-5 text-center text-[12px] tracking-[.04em] text-tx3">
              길드원 {index.members.length}명 · {new Date(index.collectedAt).toLocaleString("ko-KR")} 기준
            </div>
          )}
        </div>
      </div>

      {/* 하단 고지 */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] px-6 pb-4 text-center text-[10.5px] leading-relaxed text-white/40 [text-shadow:0_1px_6px_rgba(0,0,0,.9)]">
        {FAN_NOTICE}
      </footer>
    </div>
  );
}
