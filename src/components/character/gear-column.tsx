"use client";

import { HelpCircle } from "lucide-react";
import { useItemTooltip } from "@/components/common/item-tooltip";
import { ModelViewer } from "@/components/character/model-viewer";
import { classColor, iconUrl, num, type CharacterDetail, type EquipItem } from "@/lib/wow";

// WEB_PROJECT 배치: 왼쪽 / 오른쪽 / 하단 무기
const LEFT = ["HEAD", "NECK", "SHOULDER", "BACK", "CHEST", "SHIRT", "TABARD", "WRIST"];
const RIGHT = ["HANDS", "WAIST", "LEGS", "FEET", "FINGER_1", "FINGER_2", "TRINKET_1", "TRINKET_2"];
const BOTTOM = ["MAIN_HAND", "OFF_HAND", "RANGED"];

/** WEB_PROJECT .slot (품질 테두리, hover scale + glow, 커서 툴팁) */
function Slot({ item, delay }: { item?: EquipItem; delay: number }) {
  const tt = useItemTooltip();
  return (
    <div
      className="slot anim-fade"
      data-q={item ? item.quality : "EMPTY"}
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={item ? (e) => tt.show(item, e) : undefined}
      onMouseMove={item ? tt.move : undefined}
      onMouseLeave={item ? tt.hide : undefined}
    >
      {item?.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl(item.icon)} alt="" />
      )}
      {item?.ilvl != null && (
        <span className="absolute right-[1px] top-[1px] rounded-[2px] border border-white/20 bg-black/70 px-[3px] text-[8px] font-black leading-[1.2] text-white">
          {item.ilvl}
        </span>
      )}
    </div>
  );
}

/** 레이더 (WEB_PROJECT radarIn 애니메이션) — 캐릭터 자신의 스탯 분포 */
function Radar({ values, color }: { values: { label: string; v: number }[]; color: string }) {
  const n = values.length, R = 44, cx = 80, cy = 64;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = (r: (i: number) => number) => values.map((_, i) => pt(i, r(i)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 160 128" className="h-full w-full">
      {[1, 0.66, 0.33].map((k) => (
        <polygon key={k} points={poly(() => R * k)} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="0.8" />
      ))}
      {values.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.05)" strokeWidth="0.6" />;
      })}
      <g className="anim-radar" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <polygon points={poly((i) => R * Math.max(0.06, Math.min(1, values[i].v)))} fill={`${color}55`} stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      {values.map((v, i) => {
        const [x, y] = pt(i, R + 11);
        return (
          <text key={v.label} x={x} y={y} fontSize="10" fontWeight="700" fill="#d1d1d1" textAnchor="middle" dominantBaseline="middle">
            {v.label}
          </text>
        );
      })}
    </svg>
  );
}

function Card({ label, value, help }: { label: string; value: React.ReactNode; help?: string }) {
  return (
    <div className="anim-count relative flex flex-1 flex-col justify-center rounded-[5px] border border-line bg-bg3 px-2.5 py-2">
      <div className="mb-0.5 flex items-center gap-1 text-fl-xs font-bold tracking-[1px] text-tx2">
        {label}
        {help && (
          <span tabIndex={0} aria-label={help} className="group relative inline-flex cursor-help rounded-full outline-none">
            <HelpCircle className="h-3 w-3 text-tx3 transition-colors group-hover:text-tx group-focus:text-tx" />
            <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden whitespace-nowrap rounded-[5px] border border-line bg-bg3 px-2 py-1.5 text-fl-xs font-medium tracking-normal text-tx shadow-lg group-hover:block group-focus:block">
              {help}
            </span>
          </span>
        )}
      </div>
      <div className="text-fl-lg font-extrabold tracking-[-.5px] text-tx">{value}</div>
    </div>
  );
}

export function GearColumn({ c }: { c?: CharacterDetail }) {
  const bySlot = new Map((c?.equipment ?? []).map((e) => [e.slot, e]));
  const col = classColor(c?.classId);
  // 레이더: 캐릭터 자신의 능력치 분포 (5개 중 최댓값 기준)
  const keys = ["attack_power", "strength_effective", "stamina_effective", "agility_effective", "intellect_effective"];
  const own = keys.map((k) => num(c?.stats, k) ?? 0);
  const ownMax = Math.max(1, ...own);
  const rv = (k: string) => (num(c?.stats, k) ?? 0) / ownMax;
  const radar = [
    { label: "전투력", v: rv("attack_power") },
    { label: "힘", v: rv("strength_effective") },
    { label: "체력", v: rv("stamina_effective") },
    { label: "민첩", v: rv("agility_effective") },
    { label: "지능", v: rv("intellect_effective") },
  ];

  return (
    <div className="glass-panel no-scrollbar min-w-0 overflow-y-auto px-2.5 pb-4">
      <div className="-mx-2.5 flex h-10 items-center border-b border-line px-4 text-fl-xs font-extrabold text-tx1">캐릭터</div>

      <div className="mt-3 grid grid-cols-[clamp(130px,10vw,210px)_1fr] gap-[5px]">
        <div className="flex flex-col gap-[5px]">
          <Card label="아이템 평균 레벨" value={c?.avgIlvl ?? "—"} />
          <Card label="기어스코어" value="—" help="Forever 산식 확정 후 측정 예정" />
        </div>
        <div className="rounded-[5px] border border-line bg-bg3 px-2 py-2">
          <div className="text-fl-xs font-bold tracking-[1px] text-tx2">장비 스탯</div>
          <div key={c?.id} className="h-[clamp(120px,9vw,190px)]"><Radar values={radar} color={col} /></div>
        </div>
      </div>

      {/* 장비 + 모델 (WEB_PROJECT .gear-cols / .model-wrap) */}
      <div className="mt-4 flex items-start justify-center gap-2.5">
        <div className="flex flex-col gap-[9px]">
          {LEFT.map((k, i) => <Slot key={k} item={bySlot.get(k)} delay={i * 25} />)}
        </div>
        <ModelViewer c={c} />
        <div className="flex flex-col gap-[9px]">
          {RIGHT.map((k, i) => <Slot key={k} item={bySlot.get(k)} delay={i * 25 + 12} />)}
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-12">
        {BOTTOM.map((k, i) => <Slot key={k} item={bySlot.get(k)} delay={220 + i * 30} />)}
      </div>
    </div>
  );
}
