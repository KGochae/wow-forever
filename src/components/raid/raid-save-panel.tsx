"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/lib/wow";
import type { Groups } from "@/lib/raid-synergy";
import { fromSlots, loadComps, toSlots, writeComps, type SavedComp } from "@/lib/raid-comp";
import { cn } from "@/lib/utils";

/**
 * 공대 저장 · 불러오기 (WEB_PROJECT #rbSaveContent) — 이 브라우저에만 저장
 * 불러온 공대를 고치면 "수정 저장"으로 덮어쓰기
 */
export function RaidSavePanel({ groups, byId, activeId, onLoad, onSaved }: {
  groups: Groups;
  byId: Map<number, Member>;
  activeId: string | null;
  onLoad: (g: Groups, c: SavedComp) => void;
  onSaved: (c: SavedComp) => void;
}) {
  const [list, setList] = useState<SavedComp[]>([]);
  const [name, setName] = useState("");
  useEffect(() => setList(loadComps()), []);

  const commit = (next: SavedComp[]) => { setList(next); writeComps(next); };
  const count = groups.flat().filter(Boolean).length;
  const active = list.find((c) => c.id === activeId);

  const saveNew = () => {
    const n = name.trim() || `공대 ${list.length + 1}`;
    const item: SavedComp = { id: crypto.randomUUID(), name: n, slots: toSlots(groups), updatedAt: Date.now() };
    commit([item, ...list]);
    setName("");
    onSaved(item);
  };
  const resave = (c: SavedComp) => {
    const item = { ...c, slots: toSlots(groups), updatedAt: Date.now() };
    commit(list.map((x) => (x.id === c.id ? item : x)));
    onSaved(item);
  };
  const del = (c: SavedComp) => confirm(`"${c.name}"을(를) 삭제할까요?`) && commit(list.filter((x) => x.id !== c.id));
  const sorted = [...list].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3.5 text-fl-2xs">
      <div className="flex flex-col gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && count && saveNew()}
          maxLength={30}
          placeholder="공대 이름"
          className="w-full rounded-md border border-line2 bg-bg2 px-2.5 py-[.55em] text-fl-xs text-tx1 outline-none placeholder:text-tx3 focus:border-[#79c0ff]"
        />
        <div className="grid auto-cols-fr grid-flow-col gap-1.5">
          <button onClick={saveNew} disabled={!count} className="rounded-md border border-[#3a6da8] bg-[#2a4d7a] py-[.6em] font-bold text-[#cfe3ff] transition-colors hover:bg-[#3a6da8] disabled:cursor-not-allowed disabled:opacity-40">
            새 이름으로 저장
          </button>
          {active && (
            <button onClick={() => resave(active)} className="rounded-md border border-[#5a8a3a] bg-[#3a5a2a] py-[.6em] font-bold text-[#d4eec0] transition-colors hover:bg-[#5a8a3a]">
              수정 저장
            </button>
          )}
        </div>
      </div>
      <div className="pt-1 font-extrabold tracking-[1px] text-tx3">저장된 공대 · 이 브라우저에만 보관</div>
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {sorted.length === 0 && <div className="py-6 text-center text-tx3">저장된 공대가 없습니다.</div>}
        {sorted.map((c) => {
          const n = c.slots.flat().filter(Boolean).length;
          const d = new Date(c.updatedAt);
          return (
            <div key={c.id} className={cn("flex items-center gap-2 rounded-md border bg-bg2 px-2.5 py-2", c.id === activeId ? "border-[#79c0ff]/60" : "border-line")}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-fl-xs font-semibold text-tx1" title={c.name}>{c.name}</div>
                <div className="text-tx3">{n}명 · {d.getMonth() + 1}/{d.getDate()} {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button onClick={() => onLoad(fromSlots(c.slots, byId), c)} className="rounded bg-[#2a4d7a] px-2 py-1 font-semibold text-[#cfe3ff] hover:bg-[#3a6da8]">불러오기</button>
                <button onClick={() => del(c)} className="rounded bg-[#5a2a2a] px-2 py-1 font-semibold text-[#ffcfcf] hover:bg-[#7a3a3a]">삭제</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
