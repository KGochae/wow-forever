"use client";

import { useEffect, useState } from "react";
import { Check, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAN_REFRESH } from "@/lib/config";
import { refreshCharacter } from "@/lib/use-guild-data";

type State = { k: "idle" } | { k: "loading" } | { k: "done" } | { k: "cooldown"; until: number } | { k: "error"; msg: string };

const fmtLeft = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`);

/**
 * Update 버튼 — Worker /forever/refresh 로 Blizzard 실시간 조회
 * 캐릭터당 10분 쿨다운(서버), 블리자드 API는 로그아웃 후 반영
 */
export function UpdateButton({ id, slug }: { id: number; slug: string }) {
  const [st, setSt] = useState<State>({ k: "idle" });
  const [, tick] = useState(0);

  // 쿨다운 카운트다운
  useEffect(() => {
    if (st.k !== "cooldown") return;
    const t = setInterval(() => {
      if (Date.now() >= st.until) setSt({ k: "idle" });
      else tick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [st]);
  useEffect(() => {
    if (st.k !== "done" && st.k !== "error") return;
    const t = setTimeout(() => setSt({ k: "idle" }), st.k === "done" ? 2500 : 4000);
    return () => clearTimeout(t);
  }, [st]);

  const run = async () => {
    if (!CAN_REFRESH || st.k === "loading" || st.k === "cooldown") return;
    setSt({ k: "loading" });
    const r = await refreshCharacter(id, slug);
    if (r.ok) setSt({ k: "done" });
    else if (r.reason === "cooldown") setSt({ k: "cooldown", until: Date.now() + r.retryAfter * 1000 });
    else setSt({ k: "error", msg: r.message });
  };

  const left = st.k === "cooldown" ? Math.max(0, Math.ceil((st.until - Date.now()) / 1000)) : 0;
  const label =
    st.k === "loading" ? "갱신 중…" : st.k === "done" ? "갱신 완료" : st.k === "cooldown" ? fmtLeft(left) : "Update";
  const title = !CAN_REFRESH
    ? "로컬 개발 환경: Worker 주소(NEXT_PUBLIC_API_BASE)가 없어 비활성"
    : "블리자드에서 이 캐릭터를 다시 불러옵니다 · 게임에서 로그아웃해야 반영 · 캐릭터당 10분에 1번";

  return (
    <div className="ml-auto flex flex-col items-end gap-1 self-start">
      <button
        onClick={run}
        disabled={!CAN_REFRESH || st.k === "loading" || st.k === "cooldown"}
        title={title}
        className={cn(
          "flex items-center gap-1 rounded-full border px-3 py-1 text-fl-xs font-bold transition-colors active:scale-95 disabled:cursor-not-allowed",
          st.k === "done" ? "border-[var(--green)]/50 bg-[var(--green)]/10 text-[var(--green)]"
            : st.k === "error" ? "border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)]"
            : "border-line2 bg-bg3 text-tx1 hover:border-white/25 hover:bg-bg4 disabled:opacity-60"
        )}
      >
        {st.k === "done" ? <Check className="h-[1em] w-[1em]" /> : <RotateCw className={cn("h-[1em] w-[1em]", st.k === "loading" && "animate-spin")} />}
        {label}
      </button>
      {(st.k === "error" || st.k === "cooldown") && (
        <span className="text-fl-2xs text-tx3">{st.k === "error" ? st.msg : "잠시 후 다시 갱신할 수 있습니다"}</span>
      )}
    </div>
  );
}
