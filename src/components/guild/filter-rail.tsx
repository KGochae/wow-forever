"use client";

import { cn } from "@/lib/utils";

export interface Filters {
  rank: number | "all";
  classId: number | "all";
  spec: string | "all"; // 대표 특성(포인트 최다) / "none" = 특성 없음
}

interface Props {
  ranks: number[];
  classes: { id: number; name: string; color: string }[];
  rankLabel: (r: number) => string;
  specs: string[]; // 선택한 클래스의 특성 목록 (클래스 전체면 [])
  value: Filters;
  onChange: (f: Filters) => void;
}

/** WEB_PROJECT .sidebar-filter-col / .sidebar-cat */
function Cat({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full break-keep rounded border px-1.5 py-[5px] text-center text-[11px] font-bold tracking-[.3px] transition-colors duration-100",
        active
          ? "border-tx1 bg-[rgba(130,130,130,.14)] text-tx1"
          : "border-line2 bg-transparent text-tx2 hover:bg-[rgba(130,130,130,.08)] hover:text-tx"
      )}
    >
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-white/[.03] p-1.5">
      <div className="px-0.5 pb-0.5 text-[10px] font-extrabold uppercase tracking-[1.2px] text-tx2">{title}</div>
      {children}
    </div>
  );
}

export function FilterRail({ ranks, classes, rankLabel, specs, value, onChange }: Props) {
  return (
    <div className="no-scrollbar flex w-[88px] shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-line px-1.5 py-2">
      <Group title="길드">
        <Cat active={value.rank === "all"} onClick={() => onChange({ ...value, rank: "all" })}>전체</Cat>
        {ranks.map((r) => (
          <Cat key={r} active={value.rank === r} onClick={() => onChange({ ...value, rank: r })}>
            {rankLabel(r)}
          </Cat>
        ))}
      </Group>

      <Group title="클래스">
        <Cat active={value.classId === "all"} onClick={() => onChange({ ...value, classId: "all", spec: "all" })}>전체</Cat>
        {classes.map((c) => (
          <Cat key={c.id} active={value.classId === c.id} onClick={() => onChange({ ...value, classId: c.id, spec: "all" })}>
            {c.name}
          </Cat>
        ))}
      </Group>

      {/* 특성: 클래스를 선택했을 때만 해당 클래스의 특성 표시 (WEB_PROJECT .sidebar-spec-cats:empty 숨김과 동일) */}
      {specs.length > 0 && (
        <div key={String(value.classId)} className="anim-sidebar">
          <Group title="특성">
            <Cat active={value.spec === "all"} onClick={() => onChange({ ...value, spec: "all" })}>전체</Cat>
            {specs.map((sp) => (
              <Cat key={sp} active={value.spec === sp} onClick={() => onChange({ ...value, spec: sp })}>{sp}</Cat>
            ))}
            <Cat active={value.spec === "none"} onClick={() => onChange({ ...value, spec: "none" })}>없음</Cat>
          </Group>
        </div>
      )}
    </div>
  );
}
