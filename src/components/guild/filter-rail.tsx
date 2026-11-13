"use client";

import { cn } from "@/lib/utils";
import { RANK_COLOR, RANK_ICON } from "@/lib/wow";
import { WowBaseballMark } from "@/components/common/baseball-icon";

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
  hasUnknown?: boolean; // 선택한 클래스에 특성 정보 없는 길드원이 있을 때만 "알 수 없음" 표시
  value: Filters;
  onChange: (f: Filters) => void;
}

/** WEB_PROJECT .sidebar-filter-col / .sidebar-cat */
function Cat({ active, children, onClick, color, gold, legacy }: { active: boolean; children: React.ReactNode; onClick: () => void; color?: string; gold?: boolean; legacy?: boolean }) {
  // color: 직업 색 — 선택(클릭)했을 때만 글자·테두리·배경에 직업 색 적용
  // gold: 길드장 — 선택했을 때만 골드 글래스 + 오로라 (globals.css .gm-*), 선택 전은 일반 버튼과 동일
  if (gold && active) {
    return (
      <button
        onClick={onClick}
        className="gm-frame gm-on w-full break-keep rounded border px-[.5em] py-[.4em] text-center font-bold tracking-[.3px]"
      >
        <span className="gm-text">{children}</span>
      </button>
    );
  }
  // legacy: L70 — 선택했을 때만 진주빛 홀리 글래스 (globals.css .lg-*)
  if (legacy && active) {
    return (
      <button
        onClick={onClick}
        className="lg-frame lg-on w-full break-keep rounded border px-[.5em] py-[.4em] text-center font-bold tracking-[.3px] text-[#f1e8ff]"
      >
        {children}
      </button>
    );
  }
  const tint = active && color;
  return (
    <button
      onClick={onClick}
      style={tint ? { color, borderColor: color, backgroundColor: `${color}24` } : undefined}
      className={cn(
        "w-full break-keep rounded border px-[.5em] py-[.4em] text-center font-bold tracking-[.3px] transition-colors duration-100",
        tint
          ? ""
          : active
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
      {/* 섹션 제목 — 버튼과 구분되게 작은 골드 글자 + 양옆 가는 선 */}
      <div className="flex items-center gap-[.45em] px-0.5 pb-[.2em] pt-[.1em] text-[.78em] font-extrabold tracking-[.25em] text-gold before:h-px before:flex-1 before:bg-gold/30 after:h-px after:flex-1 after:bg-gold/30">{title}</div>
      {children}
    </div>
  );
}

export function FilterRail({ ranks, classes, rankLabel, specs, hasUnknown, value, onChange }: Props) {
  return (
    <div className="no-scrollbar flex w-[7em] shrink-0 flex-col text-fl-2xs gap-1.5 overflow-y-auto border-r border-line px-1.5 py-2">
      <Group title="길드">
        <Cat active={value.rank === "all"} onClick={() => onChange({ ...value, rank: "all" })}>전체</Cat>
        {ranks.map((r) => (
          /* 레거시 등급(L70·L60): 직업 버튼처럼 선택했을 때만 색 */
          <Cat key={r} color={RANK_COLOR[r]} gold={r === 0} legacy={r === 2} active={value.rank === r} onClick={() => onChange({ ...value, rank: r })}>
            {RANK_ICON[r] === "baseball" ? (
              <span title={rankLabel(r)}><WowBaseballMark /></span>
            ) : (
              rankLabel(r)
            )}
          </Cat>
        ))}
      </Group>

      <Group title="클래스">
        <Cat active={value.classId === "all"} onClick={() => onChange({ ...value, classId: "all", spec: "all" })}>전체</Cat>
        {classes.map((c) => (
          <Cat key={c.id} color={c.color} active={value.classId === c.id} onClick={() => onChange({ ...value, classId: c.id, spec: "all" })}>
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
            {hasUnknown && <Cat active={value.spec === "none"} onClick={() => onChange({ ...value, spec: "none" })}>알 수 없음</Cat>}
          </Group>
        </div>
      )}
    </div>
  );
}
