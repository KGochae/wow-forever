import { cn } from "@/lib/utils";

/**
 * 야구공 (크림색 공 + 실밥) — 실밥·외곽선 색은 currentColor
 */
export function BaseballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.2" fill="#f4f1e4" stroke="currentColor" strokeWidth="1.6" />
      {/* 솔기 */}
      <path d="M6.6 4.4c2.1 2.1 3.2 4.6 3.2 7.6s-1.1 5.5-3.2 7.6M17.4 4.4c-2.1 2.1-3.2 4.6-3.2 7.6s1.1 5.5 3.2 7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      {/* 바늘땀 (솔기 양옆 짧은 빗금) */}
      <path
        d="M7.4 6.3l1.6-.7M8.4 8.3l1.7-.4M9 10.6h1.8M9 13.4h1.8M8.4 15.7l1.7.4M7.4 17.7l1.6.7M16.6 6.3l-1.6-.7M15.6 8.3l-1.7-.4M15 10.6h-1.8M15 13.4h-1.8M15.6 15.7l-1.7.4M16.6 17.7l-1.6.7"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * "WOW" 마크 — 가운데 O 자리에 야구공 (등급 5)
 * 글자 높이(1em) 안에 들어가게 만들어 버튼·배지 크기를 키우지 않음
 */
export function WowBaseballMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center font-black italic leading-none tracking-[-.03em]", className)}>
      W
      {/* 이탤릭 W와 같은 기울기(-12°)로 눕힘. 이탤릭 W는 윗부분이 오른쪽으로 튀어나와 왼쪽 간격은 좁고 오른쪽은 넓어 보이므로 오른쪽만 당김 */}
      <BaseballIcon className="ml-[.07em] mr-[-.09em] h-[.82em] w-[.82em] shrink-0 -skew-x-12" />
      W
    </span>
  );
}
