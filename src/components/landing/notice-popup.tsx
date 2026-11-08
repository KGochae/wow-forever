"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

const KEY = "wf_notice_hide_until";
const HIDE_DAYS = 7;

/** 랜딩 진입 시 안내 팝업 — "7일간 보지 않기" (브라우저 localStorage, 실패해도 팝업만 다시 보일 뿐) */
export function NoticePopup() {
  const [open, setOpen] = useState(false);
  const [hide7, setHide7] = useState(false);

  useEffect(() => {
    let until = 0;
    try { until = +(localStorage.getItem(KEY) ?? 0); } catch {}
    if (Date.now() >= until) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const close = () => {
    if (hide7) {
      try { localStorage.setItem(KEY, String(Date.now() + HIDE_DAYS * 864e5)); } catch {}
    }
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        onClick={(e) => e.stopPropagation()}
        className="anim-up w-full max-w-[420px] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[rgba(12,14,20,.94)] shadow-[0_25px_60px_-12px_rgba(0,0,0,.7)]"
      >
        <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
          <Bell className="h-4 w-4 text-[var(--accent2)]" />
          <h2 id="notice-title" className="flex-1 text-[14px] font-extrabold text-tx1">안내</h2>
          <button onClick={close} aria-label="닫기" className="rounded p-1 text-tx3 transition-colors hover:bg-white/10 hover:text-tx1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4 text-[13px] leading-relaxed text-tx2">
          <p>
            해당 사이트는 오픈소스 API 데이터를 활용하고 있으며, <b className="text-tx1">로그아웃 이후</b> 데이터를 기준으로 1시간 마다 반영됩니다.😃
          </p>
          <p>
            ※ 블리자드 계정 옵션 - <b className="text-tx1">[게임 데이터 및 프로필 공개 설정]</b> 체크가 안 되어 있는 유저는 데이터 수집이 불가능합니다.
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] text-tx3 hover:text-tx2">
            <input type="checkbox" checked={hide7} onChange={(e) => setHide7(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
            7일간 보지 않기
          </label>
          <button onClick={close} className="rounded-md border border-white/15 bg-white/[.06] px-4 py-1.5 text-[12.5px] font-semibold text-tx1 transition-colors hover:bg-white/[.12]">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
