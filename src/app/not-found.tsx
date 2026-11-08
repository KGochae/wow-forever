import Link from "next/link";
import { FAN_NOTICE } from "@/lib/config";

export const metadata = { title: "페이지를 찾을 수 없습니다 — WOW FOREVER" };

/** 404 — 랜딩과 같은 배경·톤 */
export default function NotFound() {
  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden anim-fade">
      <div className="absolute inset-0 bg-[url('/background/zephras.jpg')] bg-cover bg-[center_45%]" />
      <div className="absolute inset-0 bg-[rgba(5,10,20,.72)]" />

      <div className="anim-up relative z-[2] flex flex-col items-center gap-5 px-6 text-center [filter:drop-shadow(0_4px_28px_rgba(0,0,0,.98))]">
        <div className="font-display text-[clamp(56px,8vw,96px)] font-black leading-none tracking-[.08em] text-tx1">404</div>
        <div className="text-[15px] text-tx2">길을 잃으셨군요. 요청하신 페이지가 없습니다.</div>
        <div className="mt-2 flex gap-3">
          <Link href="/" className="rounded-md border border-white/15 bg-white/[.06] px-5 py-2 text-[13px] text-tx1 transition-colors hover:bg-white/[.12]">
            처음으로
          </Link>
          <Link href="/viewer" className="rounded-md border border-white/15 bg-white/[.06] px-5 py-2 text-[13px] text-tx1 transition-colors hover:bg-white/[.12]">
            캐릭터 뷰어
          </Link>
        </div>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-[2] px-6 pb-4 text-center text-[10.5px] leading-relaxed text-white/40">
        {FAN_NOTICE}
      </footer>
    </div>
  );
}
