"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { QUALITY_COLOR, copper, iconUrl, type EquipItem } from "@/lib/wow";

/**
 * WEB_PROJECT #tooltip 처럼 커서를 따라다니는 툴팁.
 * 아이템(EquipItem) 또는 임의 내용(ReactNode)을 표시.
 */
type Content = { kind: "item"; item: EquipItem } | { kind: "node"; key: string; node: ReactNode };
interface Ctx {
  show: (item: EquipItem, e: React.MouseEvent) => void;
  showNode: (key: string, node: ReactNode, e: React.MouseEvent) => void;
  move: (e: React.MouseEvent) => void;
  hide: () => void;
}
const TooltipCtx = createContext<Ctx | null>(null);
export const useItemTooltip = () => useContext(TooltipCtx)!;

export function ItemTooltipProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [height, setHeight] = useState(320);
  const boxRef = useRef<HTMLDivElement>(null);
  // 실제 툴팁 높이(세트 효과 등으로 길어짐)를 재서 화면 밖으로 넘치지 않게
  useLayoutEffect(() => {
    const h = boxRef.current?.offsetHeight;
    if (h && h !== height) setHeight(h);
  }, [content, height]);

  const place = (e: React.MouseEvent) => {
    const W = 290, pad = 16;
    let x = e.clientX + pad;
    const y = e.clientY + pad;
    if (x + W > window.innerWidth) x = e.clientX - W - pad;
    setPos({ x, y });
  };
  const top = typeof window === "undefined" ? pos.y : Math.max(8, Math.min(pos.y, window.innerHeight - height - 8));
  const show = useCallback((item: EquipItem, e: React.MouseEvent) => { setContent({ kind: "item", item }); place(e); }, []);
  const showNode = useCallback((key: string, node: ReactNode, e: React.MouseEvent) => { setContent({ kind: "node", key, node }); place(e); }, []);
  const move = useCallback((e: React.MouseEvent) => place(e), []);
  const hide = useCallback(() => setContent(null), []);

  return (
    <TooltipCtx.Provider value={{ show, showNode, move, hide }}>
      {children}
      {content && (
        <div
          key={content.kind === "item" ? content.item.itemId : content.key}
          ref={boxRef}
          className="wow-tooltip"
          style={{ left: pos.x, top, width: 290 }}
        >
          {content.kind === "item" ? <ItemBody item={content.item} /> : content.node}
        </div>
      )}
    </TooltipCtx.Provider>
  );
}

/** 게임 툴팁 순서: 이름 → 아이템레벨 → 귀속 → 부위/종류 → 무기/방어도 → 스탯 → 마법부여 → 내구도 → 요구레벨 → 판매가 */
function ItemBody({ item }: { item: EquipItem }) {
  const w = item.weapon;
  const price = item.sellPrice ? copper(item.sellPrice) : null;
  return (
    <div className="text-[13.5px] leading-[1.45]">
      <div className="mb-1 flex items-start gap-2">
        {item.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl(item.icon, "medium")} alt="" className="h-9 w-9 shrink-0 rounded-[3px] border border-white/10" />
        )}
        <div className="min-w-0">
          <div className="text-[16px] font-extrabold leading-tight" style={{ color: QUALITY_COLOR[item.quality] }}>{item.name}</div>
          <div className="text-[12.5px] font-semibold text-[#ffd100]">아이템 레벨 {item.ilvl ?? "?"}</div>
        </div>
      </div>
      {item.transmog && <div className="whitespace-pre-line text-[#ff80ff]">{item.transmog}</div>}
      {item.binding && <div className="text-tx">{item.binding}</div>}
      {item.unique && <div className="text-tx">{item.unique}</div>}
      <div className="flex justify-between text-tx">
        <span>{item.inventoryType ?? item.slotName}</span>
        {item.subclass && <span>{item.subclass}</span>}
      </div>
      {w && (
        <>
          <div className="flex justify-between text-tx">
            {w.min != null && <span>공격력 {w.min} - {w.max}</span>}
            {w.speed != null && <span>속도 {w.speed.toFixed(2)}</span>}
          </div>
          {w.dps != null && <div className="text-tx">(초당 공격력 {w.dps.toFixed(2)})</div>}
        </>
      )}
      {item.armor != null && <div className="text-tx">방어도 {item.armor}</div>}
      {item.shieldBlock && <div className="text-tx">{item.shieldBlock}</div>}
      {item.stats.filter((s) => !s.startsWith("방어도")).map((s) => (
        <div key={s} className="text-tx">{s}</div>
      ))}
      {item.enchants?.map((e) => (
        <div key={e} className="text-[#1eff00]">{e}</div>
      ))}
      {(item.durabilityText || item.durability != null) && (
        <div className="mt-1 text-tx">{item.durabilityText ?? `내구도 ${item.durability}`}</div>
      )}
      {item.classes && <div className="text-tx">{item.classes}</div>}
      {item.requiredLevel != null && <div className="text-tx">최소 요구 레벨 {item.requiredLevel}</div>}
      {item.bonusStats?.map((s) => (
        <div key={s} className="text-[#1eff00]">{s}</div>
      ))}
      {item.spells?.map((s, i) => (
        <div key={i} className="text-[#1eff00]">{s}</div>
      ))}
      {item.charges && <div className="text-tx">{item.charges}</div>}
      {item.description && <div className="text-[#ffd100]">&quot;{item.description}&quot;</div>}
      {item.set && (
        <div className="mt-1.5">
          <div className="text-[#ffd100]">{item.set.name}</div>
          {item.set.items.map((x, i) => (
            <div key={i} className={`pl-3 ${x.equipped ? "text-[#fff4a8]" : "text-tx3"}`}>{x.name}</div>
          ))}
          <div className="mt-1">
            {item.set.effects.map((x, i) => (
              <div key={i} className={x.active ? "text-[#1eff00]" : "text-tx3"}>
                {x.count != null && !/^\(\d+\)/.test(x.text) ? `(${x.count}) ` : ""}{x.text}
              </div>
            ))}
          </div>
        </div>
      )}
      {price && (
        <div className="mt-1 flex items-center gap-1 text-tx">
          판매 가격:
          {price.g > 0 && <span>{price.g}<Coin c="#ffd100" /></span>}
          {price.s > 0 && <span>{price.s}<Coin c="#c7c7cf" /></span>}
          <span>{price.c}<Coin c="#c47a3a" /></span>
        </div>
      )}
      <div className="mt-1.5 border-t border-line2 pt-1 text-[11px] text-tx3">아이템 ID {item.itemId}</div>
    </div>
  );
}

function Coin({ c }: { c: string }) {
  return <span className="ml-0.5 inline-block h-2.5 w-2.5 rounded-full align-[-1px]" style={{ background: c }} />;
}
