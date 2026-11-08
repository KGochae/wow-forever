"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLASS_INFO, type Member } from "@/lib/wow";
import { searchMembers } from "@/lib/use-guild-data";

interface Props {
  members: Member[] | null; // null = index 로딩 중
  onPick: (m: Member) => void;
  variant?: "landing" | "nav";
  autoFocus?: boolean;
}

/**
 * 캐릭터 검색 (WEB_PROJECT .wow-search-wrap / .v-search-wrap)
 * - "이름 성", slug, 이름만, 부분 일치 → 후보 드롭다운
 */
export function CharacterSearch({ members, onPick, variant = "nav", autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [hi, setHi] = useState(0);
  const loading = !members;
  const res = useMemo(() => (members ? searchMembers(members, q) : { exact: null, candidates: [] }), [members, q]);
  const list = q.trim() ? res.candidates : [];

  const pick = (m: Member) => { setQ(`${m.name} ${m.surname}`); setOpen(false); setErr(""); onPick(m); };
  const submit = () => {
    if (!members || !q.trim()) return;
    const target = res.exact ?? (list.length === 1 ? list[0] : list[hi]);
    if (target && (res.exact || list.length >= 1)) pick(target);
    else setErr("해당 유저가 없습니다.");
  };

  const landing = variant === "landing";
  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className={cn(
          "flex items-center overflow-hidden transition-[border-color,box-shadow]",
          landing
            ? "rounded-xl border border-white/[.14] bg-white/[.06] focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,.05)] backdrop-blur-md"
            : "rounded-lg border border-white/[.14] bg-white/[.06] backdrop-blur-md focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,.05)]",
          loading && landing && "border-[rgba(200,168,74,.5)]"
        )}
      >
        {loading && landing ? (
          <span className="spin mx-3.5 my-3 !h-4 !w-4 shrink-0" />
        ) : (
          <Search className={cn("shrink-0 text-white/40", landing ? "mx-3.5 h-[18px] w-[18px]" : "ml-2.5 h-3.5 w-3.5")} />
        )}
        <input
          value={q}
          autoFocus={autoFocus}
          disabled={loading}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setErr(""); setHi(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={loading ? "데이터 로딩 중..." : landing ? "캐릭터 이름 성 (예: 우왁굳 파워도적)" : "이름 성"}
          aria-label="캐릭터 검색"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-tx outline-none placeholder:text-white/25",
            landing ? "px-1 py-3 text-[15px]" : "px-2 py-[6px] text-[14px] lg:text-[15px]"
          )}
        />
        <button
          disabled={loading}
          className={cn(
            "shrink-0 font-bold tracking-[.3px] text-white transition-colors",
            landing
              ? "border-l border-white/10 bg-white/[.12] px-6 py-[15px] text-[15px] hover:bg-white/[.22] active:bg-white/[.07]"
              : "border-l border-white/10 bg-white/[.12] px-3 py-[7px] text-[13px] hover:bg-white/[.22] active:bg-white/[.07] lg:px-3.5 lg:text-[14px]"
          )}
        >
          검색
        </button>
      </form>

      {open && list.length > 0 && (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-[60] overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] py-1 shadow-[0_25px_50px_-12px_rgba(0,0,0,.6)] backdrop-blur-xl">
          {list.map((m, i) => {
            const cls = CLASS_INFO[m.classId];
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pick(m); }}
                  onMouseEnter={() => setHi(i)}
                  className={cn("flex w-full items-center gap-2.5 px-3 py-1.5 text-left", i === hi && "bg-white/[.06]")}
                >
                  {m.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatar} alt="" className="h-6 w-6 rounded-full object-cover object-top" />
                  ) : (
                    <span className="h-6 w-6 rounded-full border" style={{ borderColor: `${cls?.color}66` }} />
                  )}
                  <span className="flex-1 truncate text-[13px] font-bold text-tx">{m.name} {m.surname}</span>
                  <span className="text-[11px] text-tx3">Lv {m.level}</span>
                  <span className="text-[11px] font-bold" style={{ color: cls?.color }}>{cls?.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {err && (
        <div className="mt-2 flex items-center gap-1.5 rounded-[5px] border border-[rgba(224,96,96,.25)] bg-[rgba(224,96,96,.08)] px-2.5 py-1.5 text-[14px] text-[var(--red)]">
          <span>⚠</span>{err}
        </div>
      )}
    </div>
  );
}
