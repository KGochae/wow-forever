// 아이템 아이콘 · 3D displayId 확보 (영구 캐시 — displayId·아이콘은 바뀌지 않음)
//   1) Blizzard 공식: media/item → 아이콘(모든 아이템), item → appearances → item-appearance.item_display_info_id (기존 아이템)
//   2) Wowhead forever XML: 공식 static에 없는 Forever 신규 아이템의 displayId만 (아이템당 평생 1회, 초당 1회 이하)
// 캐시 항목: { icon, displayId, src: "blizzard" | "wowhead" | "era" | "none", at }
import { NS } from "./bnet.mjs";

const WOWHEAD_GAP_MS = 1100;   // Wowhead 요청 간격 (초당 1회 이하)
const RETRY_NONE_MS = 7 * 864e5; // displayId 못 찾은 아이템은 7일 뒤 재시도

let lastWowhead = 0;
async function wowheadDisplayId(id) {
  const wait = lastWowhead + WOWHEAD_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastWowhead = Date.now();
  try {
    const r = await fetch(`https://www.wowhead.com/forever/item=${id}&xml`, {
      headers: { "User-Agent": "wow-forever-guild-armory (fan site; cached, low volume)" },
    });
    if (!r.ok) return { status: r.status, displayId: null };
    const x = await r.text();
    return { status: 200, displayId: +(x.match(/displayId="(\d+)"/)?.[1] ?? 0) || null };
  } catch {
    return { status: 0, displayId: null };
  }
}

/** 캐시에 없거나(또는 displayId 미확보 후 7일 경과) 아이템만 조회해 cache를 채움 */
export async function resolveItems(ids, cache, bnet, { wowhead = true, log = () => {} } = {}) {
  const sns = NS.static(bnet.region);
  const need = [...new Set(ids)].filter((id) => {
    const c = cache[id];
    return !c || (!c.displayId && c.src !== "nonvisual" && Date.now() - (c.at ?? 0) > RETRY_NONE_MS);
  });
  const counts = { blizzard: 0, wowhead: 0, none: 0 };

  // 1단계: Blizzard (동시 처리 — bnet 세마포어가 제한)
  const pending = [];
  await Promise.all(need.map(async (id) => {
    const prev = cache[id] ?? {};
    const [media, item] = await Promise.all([bnet.get(`/data/wow/media/item/${id}`, sns), bnet.get(`/data/wow/item/${id}`, sns)]);
    const icon = media.data?.assets?.find((a) => a.key === "icon")?.value ?? prev.icon ?? null;
    let displayId = prev.displayId ?? null, src = prev.src ?? null;
    const appId = item.data?.appearances?.[0]?.id;
    if (!displayId && appId) {
      const ap = await bnet.get(`/data/wow/item-appearance/${appId}`, sns);
      displayId = ap.data?.item_display_info_id ?? null;
      if (displayId) { src = "blizzard"; counts.blizzard++; }
    }
    cache[id] = { icon, displayId, src: src ?? (displayId ? "blizzard" : "none"), at: Date.now() };
    if (!displayId && item.status === 404) pending.push(id); // 공식 static에 없는 신규 아이템
  }));

  // 2단계: Wowhead (신규 아이템 displayId만, 순차·저빈도)
  if (wowhead) {
    for (const id of pending) {
      const w = await wowheadDisplayId(id);
      if (w.displayId) { cache[id] = { ...cache[id], displayId: w.displayId, src: "wowhead", at: Date.now() }; counts.wowhead++; }
      else counts.none++;
      if (w.status === 403 || w.status === 429) { log(`  Wowhead ${w.status} → 남은 ${pending.length} 중단, 다음 회차로`); break; }
    }
  }
  return { checked: need.length, ...counts };
}
